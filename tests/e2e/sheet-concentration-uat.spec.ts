import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { clericL1Protector, seedCharacter, type SeedPreset } from './seed-character';

/**
 * Clerc concentré sur Bénédiction (sort de niveau 1, concentration). La carte
 * « Concentration » du mode Combat n'apparaît QUE quand une concentration est
 * active — on seed donc `currentConcentration` directement.
 */
const CONCENTRATING_CLERIC: SeedPreset = {
  ...clericL1Protector,
  name: 'Astrid la Concentrée',
  currentConcentration: { spellId: 'benediction', slotLevel: 1 },
};

/** Concentrée mais à 1 PV : un seul « −1 » la fait tomber à 0 (Inconscient). */
const DYING_CONCENTRATING_CLERIC: SeedPreset = {
  ...CONCENTRATING_CLERIC,
  name: 'Astrid à l’Agonie',
  hp: { current: 1, max: 10 },
};

/**
 * UAT visuel — carte « Concentration » (mode Combat). `currentConcentration`
 * était POSÉ au lancement d'un sort à concentration mais affiché nulle part, et
 * impossible à rompre volontairement sans relancer un autre sort.
 *
 * La spec asserte le CONTENU (identité — cat. 2 : « Bénédiction » = name.fr du
 * slug benediction, pas « contient ») et le comportement de rupture. Captures
 * pleine page dans `uat-review/concentration/`.
 */

test.describe('UAT — Concentration (mode Combat)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+).',
    );
  });

  test('Clerc concentré : carte Concentration (Bénédiction · niv. 1) en Combat', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, CONCENTRATING_CLERIC);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(CONCENTRATING_CLERIC.name).first()).toBeVisible({
      timeout: 10_000,
    });

    const combat = page.locator('#sheet-mode-panel-combat');
    await expect(combat).toBeVisible();

    // Identité du contenu : nom EXACT + niveau de lancement + rappel de règle.
    await expect(combat.getByText('Concentration', { exact: true })).toBeVisible();
    await expect(combat.getByText('Bénédiction', { exact: true })).toBeVisible();
    await expect(combat.getByText('Lancé au niveau 1', { exact: true })).toBeVisible();
    await expect(
      combat.getByText(/jet de sauvegarde de Constitution, DD 10 ou la moitié des dégâts subis/),
    ).toBeVisible();

    await page.screenshot({
      path: 'uat-review/concentration/01-concentration-benediction.png',
      fullPage: true,
    });
  });

  test('Rompre la concentration → la carte disparaît', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, CONCENTRATING_CLERIC);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(CONCENTRATING_CLERIC.name).first()).toBeVisible({
      timeout: 10_000,
    });

    const combat = page.locator('#sheet-mode-panel-combat');
    await expect(combat).toBeVisible();

    const breakButton = combat.getByRole('button', { name: 'Rompre la concentration' });
    await expect(breakButton).toBeVisible();
    await page.screenshot({
      path: 'uat-review/concentration/02-avant-rupture.png',
      fullPage: true,
    });

    await breakButton.click();

    // Après rupture : la carte n'est plus rendue (currentConcentration → null).
    await expect(combat.getByText('Bénédiction', { exact: true })).toHaveCount(0);
    await expect(breakButton).toHaveCount(0);
    await page.screenshot({
      path: 'uat-review/concentration/03-apres-rupture.png',
      fullPage: true,
    });
  });

  test('Subir des dégâts en concentration → rappel du jet de Constitution', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, CONCENTRATING_CLERIC);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(CONCENTRATING_CLERIC.name).first()).toBeVisible({
      timeout: 10_000,
    });

    const combat = page.locator('#sheet-mode-panel-combat');
    await expect(combat).toBeVisible();

    // Tap « −1 » (10 → 9 PV, non létal) → toast de rappel du jet (DD 10, plancher).
    await page.getByRole('button', { name: /^Subir 1 dégât/i }).click();
    await expect(
      page.getByText('Jet de sauvegarde de Constitution pour la maintenir.'),
    ).toBeVisible();
    await page.screenshot({
      path: 'uat-review/concentration/04-rappel-jet-constitution.png',
      fullPage: true,
    });
  });

  test('Tomber à 0 PV en concentration → la concentration prend fin', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, DYING_CONCENTRATING_CLERIC);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(DYING_CONCENTRATING_CLERIC.name).first()).toBeVisible({
      timeout: 10_000,
    });

    const combat = page.locator('#sheet-mode-panel-combat');
    await expect(combat).toBeVisible();
    await expect(combat.getByText('Bénédiction', { exact: true })).toBeVisible();

    // Tap « −1 » : 1 → 0 PV. Inconscient → la concentration prend fin (SRD).
    await page.getByRole('button', { name: /^Subir 1 dégât/i }).click();

    // La carte Concentration disparaît (currentConcentration → null).
    await expect(combat.getByText('Bénédiction', { exact: true })).toHaveCount(0);
  });
});
