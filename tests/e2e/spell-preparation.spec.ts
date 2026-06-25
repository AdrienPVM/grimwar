import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { takeStepScreenshot } from './helpers/screenshot';
import { clericL1Protector, seedCharacter } from './seed-character';

/**
 * Préparation des sorts e2e — golden path Clerc niv. 1.
 *
 * **Pourquoi ce test a une vraie valeur** : un Clerc L1 reçoit 0 sort de niveau
 * 1 au wizard (il « prépare depuis sa liste de classe »). Avant ce slice, son
 * `preparedSpells.cleric` était vide et AUCUNE UI ne permettait de le remplir —
 * sa fiche était cassée côté sorts de niveau 1. Ce test prouve le parcours
 * complet : ouvrir l'éditeur → préparer un sort de la liste de classe → le
 * compteur et l'état « Préparé » se mettent à jour (round-trip Firestore).
 *
 * **Pré-requis** : émulateur Firebase actif. Sans émulateur, skip propre.
 */
test.describe('Préparation des sorts — golden path Clerc niv. 1', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping spell-preparation.',
    );
  });

  test('Clerc L1 → onglet Magie → préparer « Bénédiction » → 1/4 préparés', async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, clericL1Protector);
    await page.goto(`/character/${charId}`);

    await expect(
      page.getByText(clericL1Protector.name).first(),
      'Le nom du Clerc doit apparaître sur la fiche après seed + nav.',
    ).toBeVisible({ timeout: 10_000 });

    // Onglet Magie.
    await page.getByRole('tab', { name: /^Magie$/i }).click();
    const panel = page.locator('#sheet-mode-panel-magie');
    await expect(panel).toBeVisible();

    // 1. Carte de préparation présente, plafond Clerc L1 = 4, rien de préparé.
    await expect(
      panel.getByText('Préparation · Clerc'),
      'La carte de préparation doit être rendue pour un Clerc.',
    ).toBeVisible();
    await expect(
      panel.getByText('0 / 4 préparés'),
      'Plafond Clerc L1 = 4 (colonne Prepared Spells SRD 2024), 0 préparé au départ.',
    ).toBeVisible();
    await takeStepScreenshot(page, testInfo, 'cleric-magie-prep-vide');

    // 2. Ouvrir l'éditeur — la liste de classe apparaît.
    await panel.getByRole('button', { name: 'Modifier' }).click();
    const benediction = panel.getByRole('button', { name: /Bénédiction/ }).first();
    await expect(
      benediction,
      '« Bénédiction » (sort de Clerc niv. 1) doit apparaître dans la liste de préparation.',
    ).toBeVisible({ timeout: 5_000 });
    await takeStepScreenshot(page, testInfo, 'cleric-prep-editeur-ouvert');

    // 3. Préparer Bénédiction → round-trip Firestore → compteur 1/4 + état Préparé.
    await benediction.click();
    await expect(
      panel.getByText('1 / 4 préparés'),
      'Après préparation de Bénédiction, le compteur passe à 1 / 4.',
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      panel.getByText('Préparé').first(),
      'Le sort préparé porte le libellé « Préparé ».',
    ).toBeVisible();
    await takeStepScreenshot(page, testInfo, 'cleric-prep-benediction-preparee');
  });
});
