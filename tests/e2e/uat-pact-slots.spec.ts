import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { takeStepScreenshot } from './helpers/screenshot';
import { seedCharacter, warlockL1ArmorOfShadows } from './seed-character';

/**
 * Magie de pacte de l'Occultiste (point c) — spec e2e contre Firestore
 * émulateur + vraies security rules.
 *
 * Prouve bout-en-bout qu'un Occultiste fraîchement seedé (donc `classResources`
 * potentiellement vide) voit sa carte « Magie de pacte » dans le mode Magie,
 * avec ses emplacements DÉRIVÉS du niveau (L1 → 1 emplacement de niveau 1), et
 * qu'un tap consomme l'emplacement (écriture persistée → lecture « 0/1 »), puis
 * « Restaurer » le recharge (« 1/1 »).
 *
 * Couvre les catégories « Vérité du contenu » Cat. 4 (chiffres exacts dérivés
 * de la table SRD) + Cat. 5 (cohérence : le niveau d'Occultiste seedé pilote
 * l'affichage des emplacements).
 *
 * Pré-requis : émulateur Firebase actif. Sans lui, skip propre.
 */
test.describe('Magie de pacte — Occultiste (emplacements de pacte)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping pact-slots spec.',
    );
  });

  test('Occultiste L1 → carte Magie de pacte (1 empl. niv.1) → consommer → restaurer', async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, warlockL1ArmorOfShadows);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(warlockL1ArmorOfShadows.name).first()).toBeVisible({
      timeout: 10_000,
    });

    // Mode Magie.
    await page.getByRole('tab', { name: /^Magie$/i }).click();
    const panel = page.locator('#sheet-mode-panel-magie');
    await expect(panel).toBeVisible();

    // La carte Magie de pacte est rendue avec ses emplacements dérivés.
    await expect(panel.getByText('Magie de pacte')).toBeVisible();
    await expect(
      panel.getByText('Emplacements de niveau 1 · récupérés au repos court.'),
    ).toBeVisible();
    await expect(page.getByTestId('pact-slots-readout')).toHaveText('1/1');
    await expect(
      page.getByTestId('pact-slots-row').locator('button'),
    ).toHaveCount(1);

    await takeStepScreenshot(page, testInfo, 'pacte-plein');

    // Tap l'emplacement → consommation persistée → « 0/1 ».
    await page.getByTestId('pact-slots-row').locator('button').first().click();
    await expect(page.getByTestId('pact-slots-readout')).toHaveText('0/1', {
      timeout: 5_000,
    });

    await takeStepScreenshot(page, testInfo, 'pacte-consomme');

    // « Restaurer » (repos court simulé) → « 1/1 ». `exact` pour ne pas matcher
    // l'aria-label d'un emplacement vide (« Restaurer un emplacement… »).
    await page.getByRole('button', { name: 'Restaurer', exact: true }).click();
    await expect(page.getByTestId('pact-slots-readout')).toHaveText('1/1', {
      timeout: 5_000,
    });

    await takeStepScreenshot(page, testInfo, 'pacte-restaure');
  });
});
