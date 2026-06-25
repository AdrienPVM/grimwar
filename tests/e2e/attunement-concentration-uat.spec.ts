import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { seedCharacter, wizardL3, type SeedPreset } from './seed-character';

/**
 * UAT — carte « Harmonisation » (mode Avoir) + bouton « Jet de Constitution »
 * sur la carte « Concentration » (mode Combat).
 *
 *  - Avoir : un personnage avec 2 amulettes harmonisées voit une carte résumé
 *    « 2 / 3 objets liés » + les deux noms (SRD 5.2.1, cap 3).
 *  - Combat : un personnage concentré sur un sort voit la carte Concentration
 *    avec le rappel de règle + le bouton de jet de sauvegarde Con + Rompre.
 *
 * Captures dans `uat-review/attunement-concentration/` (gitignored), pleine page.
 * Pré-requis : émulateur Firebase actif.
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review/attunement-concentration');

async function captureFull(
  page: import('@playwright/test').Page,
  filename: string,
): Promise<void> {
  mkdirSync(UAT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(UAT_DIR, filename), fullPage: true });
}

// Magicien L3 enrichi : 2 amulettes harmonisées + concentration active sur
// Agrandissement/rapetissement (L2, concentration). IDs vérifiés contre
// public/data/{magic-items,spells}.json SRD 5.2.1.
const wizardAttuned: SeedPreset = {
  ...wizardL3,
  name: 'Vex l’Harmonisé',
  inventory: {
    items: [
      { contentId: 'amulette-de-bonne-sante', equipped: true, attuned: true },
      { contentId: 'amulette-de-cicatrisation', equipped: true, attuned: true },
    ],
  },
  currentConcentration: { spellId: 'agrandissement-rapetissement', slotLevel: 2 },
};

test.describe('UAT — Harmonisation (Avoir) + jet de Concentration (Combat)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Émulateur Firestore non joignable sur 127.0.0.1:8080 — `pnpm e2e:emulators` (Java/JRE 11+).',
    );
  });

  test('Avoir : carte Harmonisation 2 / 3 + noms des objets liés', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, wizardAttuned);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(wizardAttuned.name).first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole('tab', { name: /^(Avoir|Inv\.)$/i }).click();
    const panel = page.locator('#sheet-mode-panel-avoir');
    await expect(panel).toBeVisible();

    // Carte présente, libellé FR officiel « Harmonisation ». On scope les
    // assertions à la carte Harmonisation (les noms d'objets réapparaissent
    // dans la liste d'inventaire en dessous).
    const card = panel
      .locator('div.rounded-card', { has: page.getByRole('heading', { name: 'Harmonisation' }) })
      .first();
    await expect(card.getByRole('heading', { name: 'Harmonisation' })).toBeVisible();
    await expect(card.getByText('2 / 3 objets liés')).toBeVisible();
    // Les deux objets liés apparaissent dans la carte.
    await expect(card.getByText('Amulette de bonne santé')).toBeVisible();
    await expect(card.getByText('Amulette de cicatrisation')).toBeVisible();
    await captureFull(page, '01-avoir-harmonisation-2-sur-3.png');
  });

  test('Combat : carte Concentration avec jet de Constitution + Rompre', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, wizardAttuned);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(wizardAttuned.name).first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole('tab', { name: /^Combat$/i }).click();
    const panel = page.locator('#sheet-mode-panel-combat');
    await expect(panel).toBeVisible();

    // Carte Concentration rendue (concentration active).
    await expect(panel.getByRole('heading', { name: 'Concentration' })).toBeVisible();
    // Les deux boutons : jet de sauvegarde + rompre.
    await expect(panel.getByRole('button', { name: 'Jet de Constitution' })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Rompre la concentration' })).toBeVisible();
    await captureFull(page, '02-combat-concentration-jet-save.png');
  });
});
