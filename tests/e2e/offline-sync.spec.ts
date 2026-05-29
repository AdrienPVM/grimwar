import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { takeStepScreenshot } from './helpers/screenshot';
import { fighterL3, readBackCharacter, seedCharacter } from './seed-character';

/**
 * JALON 1D.4a — offline-sync e2e.
 *
 * Vérifie le comportement de la chaîne offline-first complète sur le périmètre
 * d'écriture le plus critique du V1 : les modifications de fiche (HP). On
 * cible 2 scénarios issus de la spec MVP V1 1D.4 :
 *
 *   - (a) édition fiche en offline + reconnect → propagation Firestore
 *   - (d) écriture multiple en offline → toutes propagées dans l'ordre à reconnect
 *
 * Garde-fous OfflineBanner (JALON 1D.1 + 1D.2) :
 *   - `data-variant="offline"` quand `navigator.onLine === false`
 *   - `data-variant="syncing"` quand reconnect + `pendingWrites > 0`
 *   - bannière démontée (null) quand back online + queue vide
 *
 * Scénarios DIFFÉRÉS (cf. plans/MVP-V1-DECISIONS-PRISES.md > [JALON-1D.4]) :
 *   - (b) custom item offline : le flow `addItemToInventory` → `resolveContent`
 *     fait un round-trip Firestore qui peut se comporter de façon non-
 *     déterministe en offline (cache user vs. lecture fraîche). À tester
 *     séparément après audit du chemin offline de `resolveContent`.
 *   - (c) déplacement token map : map-proto est un prototype, ses sites
 *     d'écriture sont mouvants. À reprendre quand le mode VTT JALON 5 stabilise.
 *
 * Pré-requis : émulateur Firebase actif (`pnpm e2e:emulators`, Java/JRE 11+).
 * Sans émulateur, la suite skip proprement.
 *
 * Pourquoi un seul preset `fighterL3` : le scénario teste la PLOMBERIE
 * (offline write → reconnect → ack) — pas la sémantique de la fiche. Un
 * Guerrier L3 avec 28/28 PV donne tout le matos nécessaire (boutons − / +
 * Combat, marges large pour subir 3 dégâts sans déclencher death saves).
 */
test.describe('Offline-sync — édition fiche + reconnect + propagation', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping offline-sync.',
    );
  });

  test('(a) HP −1 en offline → reconnect → propagation Firestore visible Admin SDK', async ({
    context,
    page,
  }, testInfo) => {
    // 1. Boot + seed online.
    await page.goto('/');
    await waitForAppReady(page);
    const { uid, charId } = await seedCharacter(page, fighterL3);

    // 2. Navigation fiche + switch Combat (panel par défaut probable, on force).
    await page.goto(`/character/${charId}`);
    await expect(
      page.getByText(fighterL3.name).first(),
      'Fiche doit charger avec le nom seedé.',
    ).toBeVisible({ timeout: 10_000 });
    await page.getByRole('tab', { name: /^Combat$/i }).click();
    await expect(
      page.locator('#sheet-mode-panel-combat'),
      'Panel Combat doit être rendu après tap onglet.',
    ).toBeVisible();

    // 3. État initial : 28/28. Confirme que la fiche est bien hydratée AVANT
    //    de basculer offline (sinon le test mesurerait un cache vide, pas
    //    le comportement offline-first).
    const combatPanel = page.locator(
      '[role="tabpanel"]#sheet-mode-panel-combat',
    );
    await expect(
      combatPanel.getByText(/^28$/).first(),
      'PV courants attendus = 28 à l\'ouverture (preset fighterL3).',
    ).toBeVisible();
    await takeStepScreenshot(page, testInfo, '01-online-initial-28');

    // 4. Bascule offline.
    await context.setOffline(true);

    // 5. La bannière offline doit apparaître (`data-variant="offline"`).
    //    On laisse jusqu'à 3s — l'événement `offline` se propage via le
    //    listener `useOnlineStatus` qui peut être batch React.
    const banner = page.getByTestId('offline-banner');
    await expect(
      banner,
      'OfflineBanner doit s\'afficher quand context.setOffline(true).',
    ).toBeVisible({ timeout: 3_000 });
    await expect(
      banner,
      'OfflineBanner doit porter data-variant=offline en offline.',
    ).toHaveAttribute('data-variant', 'offline');
    await takeStepScreenshot(page, testInfo, '02-offline-banner-visible');

    // 6. Tap − en offline. Le SDK Firestore avec enableIndexedDbPersistence
    //    résout updateDoc localement → l'UI doit refléter 27 immédiatement
    //    (read-from-cache déclenché par onSnapshot du cache local).
    const minus = page.getByRole('button', { name: /^Subir 1 dégât/i });
    await minus.click();
    await expect(
      combatPanel.getByText(/^27$/).first(),
      'Après tap − en offline, l\'UI doit refléter 27 PV (lecture cache local Firestore).',
    ).toBeVisible({ timeout: 5_000 });
    await takeStepScreenshot(page, testInfo, '03-offline-hp-27-local-cache');

    // 7. Côté backend (lecture Admin SDK), le doc DOIT encore valoir 28 :
    //    aucun ack backend n'a pu transiter, le write est queueé localement.
    const backendDocBeforeReconnect = await readBackCharacter(uid, charId);
    expect(
      backendDocBeforeReconnect,
      'Le doc Firestore doit toujours exister côté Admin SDK pendant la déconnexion.',
    ).toBeDefined();
    const hpBefore = (
      backendDocBeforeReconnect as { hp?: { current?: number } }
    ).hp?.current;
    expect(
      hpBefore,
      'Backend HP doit rester à 28 tant que le client est offline (aucun ack possible).',
    ).toBe(28);

    // 8. Bascule online. La queue locale du SDK Firestore flushe automatiquement
    //    vers le backend. La bannière doit transitionner offline → syncing →
    //    rien (queue vide).
    await context.setOffline(false);

    // 9. Backend doit voir hp.current = 27 après propagation. On poll jusqu'à
    //    5s : la pénalité d'allers-retours émulateur est faible (~100ms) mais
    //    le SDK peut retarder l'ack par batching.
    await expect
      .poll(
        async () => {
          const doc = await readBackCharacter(uid, charId);
          return (doc as { hp?: { current?: number } } | undefined)?.hp?.current;
        },
        {
          message:
            'Backend HP doit passer à 27 après reconnect (write queueé pendant offline doit flusher).',
          timeout: 8_000,
          intervals: [200, 400, 800],
        },
      )
      .toBe(27);

    // 10. La bannière doit revenir au néant (queue vide, online). On laisse
    //     une fenêtre pour absorber le décrément asynchrone du pendingWrites.
    await expect(
      banner,
      'OfflineBanner doit se démonter quand back online ET queue vide.',
    ).not.toBeVisible({ timeout: 5_000 });
    await takeStepScreenshot(page, testInfo, '04-online-propagated-no-banner');
  });

  test('(d) 3 écritures offline successives → toutes propagées dans l\'ordre à reconnect', async ({
    context,
    page,
  }, testInfo) => {
    // 1. Boot + seed.
    await page.goto('/');
    await waitForAppReady(page);
    const { uid, charId } = await seedCharacter(page, fighterL3);

    // 2. Navigation fiche + Combat.
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(fighterL3.name).first()).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole('tab', { name: /^Combat$/i }).click();
    const combatPanel = page.locator(
      '[role="tabpanel"]#sheet-mode-panel-combat',
    );
    await expect(combatPanel.getByText(/^28$/).first()).toBeVisible();

    // 3. Bascule offline.
    await context.setOffline(true);
    const banner = page.getByTestId('offline-banner');
    await expect(banner).toHaveAttribute('data-variant', 'offline', {
      timeout: 3_000,
    });

    // 4. 3 tap − consécutifs : 28 → 27 → 26 → 25. On attend chaque transition
    //    UI pour s'assurer que les 3 writes sont bien enchaînées dans l'ordre
    //    et que le compteur local Firestore ne saute pas d'état.
    const minus = page.getByRole('button', { name: /^Subir 1 dégât/i });

    await minus.click();
    await expect(
      combatPanel.getByText(/^27$/).first(),
      'Write #1 offline : UI doit refléter 27.',
    ).toBeVisible({ timeout: 5_000 });

    await minus.click();
    await expect(
      combatPanel.getByText(/^26$/).first(),
      'Write #2 offline : UI doit refléter 26.',
    ).toBeVisible({ timeout: 5_000 });

    await minus.click();
    await expect(
      combatPanel.getByText(/^25$/).first(),
      'Write #3 offline : UI doit refléter 25.',
    ).toBeVisible({ timeout: 5_000 });
    await takeStepScreenshot(page, testInfo, '01-offline-3-writes-applied-ui');

    // 5. Backend doit toujours valoir 28 (aucun ack pendant offline).
    const beforeReconnect = await readBackCharacter(uid, charId);
    expect(
      (beforeReconnect as { hp?: { current?: number } } | undefined)?.hp?.current,
      'Backend HP doit rester à 28 pendant offline (aucun ack possible).',
    ).toBe(28);

    // 6. Reconnect. Le SDK flushe la queue dans l'ORDRE — la valeur finale
    //    backend doit être 25 (le dernier write), pas une valeur intermédiaire
    //    qui prouverait un drop ou un réordonnancement.
    await context.setOffline(false);

    await expect
      .poll(
        async () => {
          const doc = await readBackCharacter(uid, charId);
          return (doc as { hp?: { current?: number } } | undefined)?.hp?.current;
        },
        {
          message:
            'Backend HP doit converger vers 25 (dernier write) après reconnect — pas de drop ni de réordonnancement.',
          timeout: 10_000,
          intervals: [200, 400, 800],
        },
      )
      .toBe(25);

    // 7. Bannière démontée quand queue vide.
    await expect(
      banner,
      'OfflineBanner doit se démonter quand back online ET queue vide après les 3 propagations.',
    ).not.toBeVisible({ timeout: 5_000 });
    await takeStepScreenshot(page, testInfo, '02-online-converged-25');
  });
});
