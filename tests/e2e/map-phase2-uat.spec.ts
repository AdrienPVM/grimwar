import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { takeStepScreenshot } from './helpers/screenshot';

/**
 * Spec e2e dédiée — CHANTIER D phase 2 (tracer D.6).
 *
 * Couvre le parcours MJ end-to-end contre Firestore émulateur :
 *   1. Aller sur `/map-proto/cloud/:cid` (cid unique par run pour éviter les
 *      collisions inter-runs sur l'émulateur partagé).
 *   2. Vérifier que `ensureCampaignExists` crée la campagne stub (pas d'erreur
 *      ensure-error affiché).
 *   3. Voir l'empty state initial.
 *   4. Créer une carte via le formulaire (slug + name).
 *   5. La carte apparaît dans la liste.
 *   6. Naviguer vers `/map-proto/cloud/:cid/maps/:mid` (la vue live).
 *   7. Ajouter un fog (reveal) → compte = 1.
 *   8. Ajouter une lumière (torche) → compte = 1.
 *   9. Ajouter un AoE (sphère) → compte = 1.
 *   10. Effacer le fog → compte = 0.
 *   11. Effacer les lumières → compte = 0.
 *   12. Effacer les AoE → compte = 0.
 *   13. Retour à la liste → la carte est toujours là.
 *   14. Supprimer la carte.
 *
 * Pré-requis : émulateur Firebase actif (Auth + Firestore).
 * Sans l'émulateur, la spec se skip proprement avec un message visible.
 *
 * cid unique : `phase2-uat-{timestamp}` — chaque run d'e2e crée sa propre
 * campagne stub. Les rules autorisent tout signed-in à créer une campagne
 * dont il devient DM.
 */
test.describe('Map phase 2 — parcours MJ end-to-end (D.6)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping D.6 spec.',
    );
  });

  test('crée une campagne stub, une carte, manipule fog/light/AoE, supprime', async ({
    page,
  }, testInfo) => {
    // cid unique par run — évite la collision entre lancers répétés contre
    // le même émulateur (ex : 2 runs Playwright successifs).
    const cid = `phase2-uat-${Date.now().toString(36)}`;
    const mapSlug = `donjon-${Date.now().toString(36)}`;
    const mapName = "Donjon de l'Aube (UAT)";

    // 1-3. Navigation vers la route prototype cloud + vérif empty state.
    await page.goto(`/map-proto/cloud/${cid}`);
    await waitForAppReady(page);

    // Wait for anonymous sign-in to complete — sans user.uid signé,
    // `ensureCampaignExists` ne sera jamais déclenché et le bouton Créer
    // reste désactivé. Hook posé par auth-provider quand
    // VITE_USE_FIREBASE_EMULATOR=true (cf. tests/e2e/seed-character.ts).
    await page.waitForFunction(
      () => {
        const w = window as Window & { __e2eAuthUid?: string | null };
        return typeof w.__e2eAuthUid === 'string' && w.__e2eAuthUid.length > 0;
      },
      null,
      { timeout: 10_000 },
    );

    // Titre identifié par rôle pour éviter le strict-mode conflict avec
    // « Chargement des cartes… » qui contient aussi « Cartes ».
    await expect(page.getByRole('heading', { name: 'Cartes' })).toBeVisible();
    await expect(page.getByTestId('maps-cloud-cid')).toContainText(cid);
    // L'ensureCampaignExists doit avoir réussi (pas de message d'erreur).
    await expect(page.getByTestId('maps-cloud-ensure-error')).toHaveCount(0);
    // Bouton Créer doit s'activer une fois ensureDone (qui se débloque à la fin
    // du setDoc campagne stub).
    await expect(page.getByTestId('maps-cloud-create-submit')).toBeEnabled({
      timeout: 10000,
    });
    // Empty state une fois useMapsList isLoading=false. Le listener Firestore
    // résout en quelques centaines de ms contre l'émulateur ; on laisse 10s.
    await expect(page.getByTestId('maps-cloud-empty')).toBeVisible({ timeout: 10000 });

    await takeStepScreenshot(page, testInfo, 'cloud-empty');

    // 4. Création d'une carte via le formulaire.
    await page.getByTestId('maps-cloud-create-id').fill(mapSlug);
    await page.getByTestId('maps-cloud-create-name').fill(mapName);
    await page.getByTestId('maps-cloud-create-submit').click();

    // 5. La carte apparaît dans la liste (real-time listener).
    await expect(page.getByTestId(`maps-cloud-card-${mapSlug}`)).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText(mapName)).toBeVisible();

    await takeStepScreenshot(page, testInfo, 'cloud-list');

    // 6. Navigation vers la vue live.
    await page.goto(`/map-proto/cloud/${cid}/maps/${mapSlug}`);
    await waitForAppReady(page);

    await expect(page.getByRole('heading', { name: mapName })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByTestId('map-live-meta')).toContainText(cid);
    await expect(page.getByTestId('map-live-meta')).toContainText(mapSlug);

    // Vérification des compteurs initiaux.
    await expect(page.getByTestId('map-live-fog-count')).toContainText('(0)');
    await expect(page.getByTestId('map-live-lights-count')).toContainText('(0)');
    await expect(page.getByTestId('map-live-aoe-count')).toContainText('(0)');

    await takeStepScreenshot(page, testInfo, 'live-empty');

    // 7. Ajout d'un fog reveal → compte = 1.
    await page.getByTestId('map-live-add-fog-reveal').click();
    await expect(page.getByTestId('map-live-fog-count')).toContainText('(1)', {
      timeout: 5000,
    });

    // 8. Ajout d'une torche → compte = 1.
    await page.getByTestId('map-live-add-torch').click();
    await expect(page.getByTestId('map-live-lights-count')).toContainText('(1)', {
      timeout: 5000,
    });

    // 9. Ajout d'un AoE sphère → compte = 1.
    await page.getByTestId('map-live-add-sphere-aoe').click();
    await expect(page.getByTestId('map-live-aoe-count')).toContainText('(1)', {
      timeout: 5000,
    });

    await takeStepScreenshot(page, testInfo, 'live-populated');

    // Pas d'erreur d'écriture surfacée.
    await expect(page.getByTestId('map-live-write-error')).toHaveCount(0);

    // 10-12. Effacer fog / lumières / AoE.
    await page.getByTestId('map-live-clear-fog').click();
    await expect(page.getByTestId('map-live-fog-count')).toContainText('(0)', {
      timeout: 5000,
    });
    await page.getByTestId('map-live-clear-lights').click();
    await expect(page.getByTestId('map-live-lights-count')).toContainText('(0)', {
      timeout: 5000,
    });
    await page.getByTestId('map-live-clear-aoe').click();
    await expect(page.getByTestId('map-live-aoe-count')).toContainText('(0)', {
      timeout: 5000,
    });

    // 13-14. Retour à la liste + suppression de la carte.
    await page.goto(`/map-proto/cloud/${cid}`);
    await waitForAppReady(page);
    const card = page.getByTestId(`maps-cloud-card-${mapSlug}`);
    await expect(card).toBeVisible({ timeout: 5000 });
    await page.getByTestId(`maps-cloud-delete-${mapSlug}`).click();
    await expect(card).toHaveCount(0, { timeout: 5000 });

    await takeStepScreenshot(page, testInfo, 'cloud-after-delete');
  });
});
