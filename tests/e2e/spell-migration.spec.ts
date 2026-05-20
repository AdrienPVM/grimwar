import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { takeStepScreenshot } from './helpers/screenshot';
import { readBackCharacter, seedCharacter, wizardL1Migration } from './seed-character';

/**
 * Migration des IDs de sort « PHB 2014 (AideDD) » → « SRD 5.2.1 » à la lecture
 * d'une fiche (plan 13.10 commit 4).
 *
 * **Périmètre** : un Magicien L1 est seedé dans Firestore avec des IDs 2014
 * (`main-de-mage`, `armure-de-mage`) + un sort retiré du SRD (`amis`). À
 * l'ouverture de la fiche, `use-character.ts` doit :
 *   1. remapper les IDs → la fiche affiche les noms 2024 (« Main du mage »,
 *      « Armure du mage ») ;
 *   2. retirer `amis` (hors SRD) ;
 *   3. ré-écrire le doc Firestore migré (one-shot upgrade).
 *
 * **Pourquoi ça a de la valeur** : sans migration, un perso créé avant 13.10
 * porte des IDs que le bundle régénéré ne résout plus → sorts fantômes muets
 * sur la fiche. Ce test prouve le câblage seed(2014) → UI(2024) → Firestore(2024).
 *
 * **Pré-requis** : émulateur Firebase actif. Sans émulateur, skip propre.
 */
test.describe('Migration sorts 2014 → SRD 5.2.1 (golden path Magicien L1)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping spell-migration.',
    );
  });

  test('seed IDs 2014 → fiche affiche les noms 2024 + doc Firestore ré-écrit migré', async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { uid, charId } = await seedCharacter(page, wizardL1Migration);
    await page.goto(`/character/${charId}`);

    // 1. Fiche chargée.
    await expect(
      page.getByText(wizardL1Migration.name).first(),
      'Le nom du PJ doit apparaître sur la fiche après seed + nav.',
    ).toBeVisible({ timeout: 10_000 });

    // 2. Onglet Magie.
    await page.getByRole('tab', { name: /^Magie$/i }).click();
    const panel = page.locator('#sheet-mode-panel-magie');
    await expect(panel, 'Le panel Magie doit être rendu.').toBeVisible();

    // 3. Les noms 2024 (post-migration) sont rendus. Si la migration n'avait
    //    pas tourné, les IDs 2014 ne résoudraient dans aucune entrée du bundle
    //    SRD régénéré → aucun de ces noms ne s'afficherait.
    await expect(
      panel.getByText(/Armure du mage/i).first(),
      '« Armure du mage » (armure-de-mage 2014 → armure-du-mage) doit apparaître après migration.',
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      panel.getByText(/Main du mage/i).first(),
      '« Main du mage » (main-de-mage 2014 → main-du-mage) doit apparaître après migration.',
    ).toBeVisible();
    await takeStepScreenshot(page, testInfo, 'wizard-l1-migrated-spells');

    // 4. Le doc Firestore est ré-écrit migré (one-shot, fire-and-forget après
    //    le snapshot → on poll jusqu'à voir la version migrée).
    await expect
      .poll(
        async () => {
          const doc = await readBackCharacter(uid, charId);
          const known = (doc?.knownSpells as Record<string, string[]> | undefined)?.wizard;
          return known ? [...known].sort() : null;
        },
        {
          message:
            'knownSpells.wizard doit être ré-écrit en IDs SRD 2024 (amis retiré).',
          timeout: 10_000,
        },
      )
      .toEqual(['armure-du-mage', 'main-du-mage']);

    const migratedDoc = await readBackCharacter(uid, charId);
    expect(
      (migratedDoc?.preparedSpells as Record<string, string[]> | undefined)?.wizard,
      'preparedSpells.wizard doit aussi être migré (armure-de-mage → armure-du-mage).',
    ).toEqual(['armure-du-mage']);
  });
});
