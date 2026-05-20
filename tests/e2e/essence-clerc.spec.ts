import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { takeStepScreenshot } from './helpers/screenshot';
import {
  clericL1Protector,
  clericL1Thaumaturge,
  druidL1Magician,
  seedCharacter,
} from './seed-character';

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
    // Double-capture : viewport pour le ressenti d'overlay (backdrop +
    // ancrage `items-end` mobile) en plus de la pleine page. Acté
    // 2026-05-20 — cf. screenshot.ts.
    await takeStepScreenshot(page, testInfo, 'divine-order-modal-open', {
      viewport: true,
    });

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
    await takeStepScreenshot(page, testInfo, 'primal-order-modal-open', {
      viewport: true,
    });

    // Cat. 2 identité bundle : la fuite anglicisme « cantrip » a été corrigée
    // (hotfix 2026-05-20). Vérifier qu'aucune occurrence ne traîne sur l'UI
    // de la modale d'Ordre primordial Mage (cas porteur du bug initial).
    await expect(
      dialog,
      'Modale primale Mage ne doit pas contenir l\'anglicisme « cantrip » après hotfix bundle.',
    ).not.toContainText(/\bcantrip(s)?\b/i);
    // 2026-05-20 UAT 4c bis — bug post-hotfix : la 1ère correction avait
    // remplacé « cantrip » par « tour de magie » (terme non-officiel Baldur's
    // Gate 3) au lieu de « sort mineur » (traduction PHB FR officielle).
    await expect(
      dialog,
      'Modale primale Mage ne doit pas contenir le terme non-officiel « tour de magie » (cf. règle terminologique CLAUDE.md).',
    ).not.toContainText(/\btours? de magie\b/i);
    await expect(
      dialog.getByText(/sort mineur/),
      'Summary FR Mage doit utiliser « sort mineur » (PHB FR).',
    ).toBeVisible();
  });

  test('Clerc L1 Thaumaturge → onglet Essence → tap carte → modale (post-fix cantrip)', async ({ page }, testInfo) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, clericL1Thaumaturge);
    await page.goto(`/character/${charId}`);

    await expect(page.getByText(clericL1Thaumaturge.name).first()).toBeVisible({
      timeout: 10_000,
    });
    await takeStepScreenshot(page, testInfo, 'thaumaturge-sheet-loaded');

    await page.getByRole('tab', { name: /^Essence$/i }).click();
    await expect(page.locator('#sheet-mode-panel-essence')).toBeVisible();

    const trigger = page.getByRole('button', { name: /Ordre divin : Thaumaturge/ });
    await expect(trigger).toBeVisible();
    await trigger.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // Cat. 2 identité : le summary FR Thaumaturge du bundle s'affiche tel quel
    // (« Clerc érudit … 1 sort mineur Clerc supplémentaire … »).
    await expect(
      dialog.getByText(/Clerc érudit/),
      'Summary FR Thaumaturge doit être rendu à l\'identique.',
    ).toBeVisible();
    await expect(
      dialog,
      'Modale Thaumaturge ne doit pas contenir l\'anglicisme « cantrip » après hotfix bundle.',
    ).not.toContainText(/\bcantrip(s)?\b/i);
    // 2026-05-20 UAT 4c bis — bug post-hotfix : la 1ère correction avait
    // remplacé « cantrip » par « tour de magie » (terme non-officiel Baldur's
    // Gate 3) au lieu de « sort mineur » (traduction PHB FR officielle).
    await expect(
      dialog,
      'Modale Thaumaturge ne doit pas contenir le terme non-officiel « tour de magie » (cf. règle terminologique CLAUDE.md).',
    ).not.toContainText(/\btours? de magie\b/i);
    await expect(
      dialog.getByText(/sort mineur/),
      'Summary FR Thaumaturge doit utiliser « sort mineur » (PHB FR).',
    ).toBeVisible();
    await takeStepScreenshot(page, testInfo, 'thaumaturge-modal-open');
    await takeStepScreenshot(page, testInfo, 'thaumaturge-modal-open', {
      viewport: true,
    });
  });
});
