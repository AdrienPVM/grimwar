import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { takeStepScreenshot } from './helpers/screenshot';
import {
  readBackCharacter,
  seedCharacter,
  wizardL1Grimoire,
} from './seed-character';

/**
 * JALON 2B.6b — e2e parcours level-up Wizard L1 → L4.
 *
 * Persona « full caster » — couvre les steps spécifiques aux incantateurs
 * que la spec Fighter n'expose pas :
 *
 *  - Step `spells` : à chaque niveau Wizard, la progression `spellsKnownOrPrepared`
 *    incrémente de 1 (4 → 5 → 6 → 7). Le picker doit afficher uniquement les
 *    sorts wizard de niveau ≤ ceil(newLevel/2).
 *  - Step `cantrips` : à L4 la progression `cantripsKnown` passe de 3 → 4
 *    (`computeDelta = 1`).
 *  - Step `subclass` : à L3 (Évocateur), comme Fighter mais sur une classe
 *    incantatrice (vérifie que le choix coexiste avec les pickers de sorts).
 *  - Step `asi-or-feat` : à L4 sur Wizard, on choisit explicitement +2 INT
 *    (vs le défaut +2 FOR posé par la modale) pour exercer le picker complet.
 *
 * Vérifications de bout-en-bout côté Firestore :
 *
 *  1. `totalLevel` = 4 après les 3 confirmations.
 *  2. `classes[0].subclassId` = `'evoker'` après L2→L3.
 *  3. `abilities.int` = 18 (16 + 2 ASI) après L3→L4.
 *  4. `knownSpells.wizard` contient les 3 nouveaux sorts choisis (en plus des
 *     6 préposés au seed).
 *
 * Pré-requis : émulateur Firebase actif (`pnpm e2e:emulators`). Sans
 * émulateur, la spec skip proprement (Java/JRE 11+ requis).
 *
 * Gotcha capture (cf. spec Fighter) : ne pas appeler `takeStepScreenshot`
 * entre deux steps d'une modale ouverte — le `fullPage` resize ferme la
 * modale sur mobile-chromium.
 */
test.describe('Level-up Wizard L1 → L4 (HP + sorts + cantrip + sous-classe + ASI INT)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping level-up Wizard.',
    );
  });

  test('Wizard L1 → L4 : sorts + cantrip + Évocateur + ASI INT + persistance reload', async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { uid, charId } = await seedCharacter(page, wizardL1Grimoire);
    await page.goto(`/character/${charId}`);

    await expect(
      page.getByText(wizardL1Grimoire.name).first(),
      'Hero card doit afficher le nom du Wizard seedé.',
    ).toBeVisible({ timeout: 10_000 });
    await takeStepScreenshot(page, testInfo, '00-sheet-l1-loaded');

    // ── L1 → L2 : HP + 1 sort L1 ───────────────────────────────────────
    await page.getByRole('button', { name: /Monter au niveau 2/ }).click();
    let dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/Niveau 1 → 2/)).toBeVisible();
    await expect(dialog.getByText(/Étape 1 \/ 2/)).toBeVisible();

    await dialog.getByRole('button', { name: /Moyenne/i }).click();
    await dialog.getByRole('button', { name: /^Suivant$/i }).click();

    // Step 2 : sorts. On pioche « Mains brûlantes » — sort L1 evocation
    // wizard, garanti hors du spellbook seedé (preset = bouclier, projectile-
    // magique, armure-du-mage, graisse, alarme, appel-de-familier).
    await expect(dialog.getByText(/Étape 2 \/ 2/)).toBeVisible();
    await dialog.getByRole('checkbox', { name: /Mains brûlantes/i }).click();
    await dialog.getByRole('button', { name: /^Confirmer$/i }).click();
    await expect(dialog).toBeHidden({ timeout: 5_000 });

    await expect
      .poll(
        async () => {
          const doc = await readBackCharacter(uid, charId);
          return doc?.totalLevel;
        },
        { message: 'totalLevel doit passer à 2 après L1→L2.', timeout: 5_000 },
      )
      .toBe(2);

    // ── L2 → L3 : HP + sous-classe Évocateur + 1 sort L1 ──────────────
    await page.getByRole('button', { name: /Monter au niveau 3/ }).click();
    dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/Niveau 2 → 3/)).toBeVisible();
    // 3 steps : HP + subclass + spells.
    await expect(dialog.getByText(/Étape 1 \/ 3/)).toBeVisible();

    await dialog.getByRole('button', { name: /Moyenne/i }).click();
    await dialog.getByRole('button', { name: /^Suivant$/i }).click();

    await expect(dialog.getByText(/Étape 2 \/ 3/)).toBeVisible();
    await dialog.getByRole('radio', { name: /Évocateur/i }).click();
    await dialog.getByRole('button', { name: /^Suivant$/i }).click();

    await expect(dialog.getByText(/Étape 3 \/ 3/)).toBeVisible();
    // « Identification » — sort wizard L1 divination hors spellbook seedé.
    await dialog.getByRole('checkbox', { name: /^Identification$/i }).click();
    await dialog.getByRole('button', { name: /^Confirmer$/i }).click();
    await expect(dialog).toBeHidden({ timeout: 5_000 });

    await expect
      .poll(
        async () => {
          const doc = await readBackCharacter(uid, charId);
          const classes = (doc?.classes as Array<{ subclassId: string | null }>) ?? [];
          return { level: doc?.totalLevel, subclassId: classes[0]?.subclassId };
        },
        { message: 'L2→L3 doit poser subclass=evoker.', timeout: 5_000 },
      )
      .toEqual({ level: 3, subclassId: 'evoker' });

    // ── L3 → L4 : HP + ASI INT + 1 sort + 1 cantrip ───────────────────
    await page.getByRole('button', { name: /Monter au niveau 4/ }).click();
    dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/Niveau 3 → 4/)).toBeVisible();
    // 4 steps : HP + ASI + cantrips + spells.
    await expect(dialog.getByText(/Étape 1 \/ 4/)).toBeVisible();

    await dialog.getByRole('button', { name: /Moyenne/i }).click();
    await dialog.getByRole('button', { name: /^Suivant$/i }).click();

    // Step 2 : ASI/feat — on bascule sur Amélioration puis sélectionne INT
    // explicitement (vs le défaut FOR posé par la modale).
    await expect(dialog.getByText(/Étape 2 \/ 4/)).toBeVisible();
    await dialog.getByRole('radio', { name: /Amélioration/i }).click();
    await dialog
      .getByLabel(/Caractéristique principale/i)
      .selectOption('int');
    await dialog.getByRole('button', { name: /^Suivant$/i }).click();

    // Step 3 : cantrips (1 à piocher). « Lumière » — cantrip wizard non
    // présent au seed.
    await expect(dialog.getByText(/Étape 3 \/ 4/)).toBeVisible();
    await dialog.getByRole('checkbox', { name: /^Lumière$/i }).click();
    await dialog.getByRole('button', { name: /^Suivant$/i }).click();

    // Step 4 : sorts (1 à piocher) — on pioche un nouveau L1 wizard.
    // « Compréhension des langues ».
    await expect(dialog.getByText(/Étape 4 \/ 4/)).toBeVisible();
    await dialog
      .getByRole('checkbox', { name: /Compréhension des langues/i })
      .click();
    await dialog.getByRole('button', { name: /^Confirmer$/i }).click();
    await expect(dialog).toBeHidden({ timeout: 5_000 });

    await expect
      .poll(
        async () => {
          const doc = await readBackCharacter(uid, charId);
          const abilities = doc?.abilities as Record<string, number> | undefined;
          const known = doc?.knownSpells as Record<string, string[]> | undefined;
          return {
            level: doc?.totalLevel,
            int: abilities?.int,
            spellsCount: known?.wizard?.length,
          };
        },
        { message: 'L3→L4 doit poser totalLevel=4 + INT=18 + 3 sorts ajoutés.', timeout: 5_000 },
      )
      // Seed = 6 sorts wizard. Ajouts L1→L2 = +1, L2→L3 = +1, L3→L4 = +1.
      // Total attendu = 9.
      .toEqual({ level: 4, int: 18, spellsCount: 9 });

    // ── Reload : la fiche doit lire le doc Firestore à L4 ─────────────
    await page.reload();
    await waitForAppReady(page);
    await expect(
      page.getByText(wizardL1Grimoire.name).first(),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole('button', { name: /Monter au niveau 5/ }),
      'Après reload, le bouton doit cibler L5.',
    ).toBeVisible({ timeout: 10_000 });
    await takeStepScreenshot(page, testInfo, '01-sheet-l4-after-reload');
  });
});
