import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { takeStepScreenshot } from './helpers/screenshot';
import { clericL1Protector, druidL1Magician, seedCharacter } from './seed-character';

/**
 * Essence mode e2e (plan 13.9 commit 4c).
 *
 * Périmètre : la carte « Ordre divin » du Clerc et la carte « Ordre
 * primordial » du Druide sont rendues et **cliquables**. Un tap ouvre une
 * modale détail (parité avec sorts + maîtrises d'armes).
 *
 * Captures e2e systématiques : à chaque étape du parcours, un screenshot
 * est archivé comme artefact dans `test-results/screenshots/` ET attaché
 * au rapport HTML Playwright. Pas de diff d'images automatique (décision
 * commit 4c — tests d'identité = DOM, screenshots = galerie humaine).
 */
test.describe('Essence — Clerc Ordre divin (tap → modale)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping essence Clerc.',
    );
  });

  test('Clerc L1 Protecteur → onglet Essence → tap carte → modale détail visible', async ({ page, browserName }, testInfo) => {
    await page.goto('/');
    await waitForAppReady(page);
    await takeStepScreenshot(page, testInfo, 'app-ready');

    const { charId } = await seedCharacter(page, clericL1Protector);
    await page.goto(`/character/${charId}`);

    await expect(
      page.getByText(clericL1Protector.name).first(),
      'Hero card doit afficher le nom du Clerc seedé.',
    ).toBeVisible({ timeout: 10_000 });
    await takeStepScreenshot(page, testInfo, 'sheet-loaded');

    await page.getByRole('tab', { name: /^Essence$/i }).click();
    const panel = page.locator('#sheet-mode-panel-essence');
    await expect(panel, 'Le panel Essence doit être rendu après tap tab.').toBeVisible();
    await takeStepScreenshot(page, testInfo, 'essence-tab');

    // Carte « Ordre divin : Protecteur » présente.
    const trigger = page.getByRole('button', { name: /Ordre divin : Protecteur/ });
    await expect(
      trigger,
      'Carte Ordre divin Protecteur doit être un bouton cliquable.',
    ).toBeVisible();
    await takeStepScreenshot(page, testInfo, 'divine-order-card');

    await trigger.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog, 'Modale détail Ordre divin doit s\'ouvrir au tap.').toBeVisible();
    // Contenu identité (cat. 2) : le summary du bundle est visible.
    await expect(
      dialog.getByText(/Clerc de première ligne/),
      'Summary FR du bundle classes.json doit être rendu à l\'identique.',
    ).toBeVisible();
    await takeStepScreenshot(page, testInfo, 'divine-order-modal-open');

    // Échap ferme.
    await page.keyboard.press('Escape');
    await expect(dialog, 'Échap doit fermer la modale.').toBeHidden();
    await takeStepScreenshot(page, testInfo, 'divine-order-modal-closed');

    // browserName est utilisé pour rendre le test name déterministe en CI.
    expect(browserName).toBeTruthy();
  });

  test('Druide L1 Mage → onglet Essence → tap carte Ordre primordial → modale', async ({ page }, testInfo) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, druidL1Magician);
    await page.goto(`/character/${charId}`);

    await expect(page.getByText(druidL1Magician.name).first()).toBeVisible({
      timeout: 10_000,
    });
    await takeStepScreenshot(page, testInfo, 'druid-sheet-loaded');

    await page.getByRole('tab', { name: /^Essence$/i }).click();
    await expect(page.locator('#sheet-mode-panel-essence')).toBeVisible();
    await takeStepScreenshot(page, testInfo, 'druid-essence-tab');

    const trigger = page.getByRole('button', { name: /Ordre primordial : Mage/ });
    await expect(trigger).toBeVisible();
    await trigger.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText(/Druide-sorcier/),
      'Summary FR Mage doit être rendu à l\'identique.',
    ).toBeVisible();
    await takeStepScreenshot(page, testInfo, 'primal-order-modal-open');
  });
});
