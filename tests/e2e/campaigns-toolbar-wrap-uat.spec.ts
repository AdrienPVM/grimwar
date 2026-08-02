import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * UAT — les espaces de la campagne tiennent sur mobile sans déborder.
 *
 * Historique : cet écran affichait 7 boutons identiques sur UNE barre, AU-DESSUS
 * du titre ; la spec vérifiait alors qu'ils enveloppaient sans déborder à 375 px.
 * Ils sont désormais regroupés sous le titre en deux sections nommées, « Jouer »
 * et « Mémoire de la table » (cf. `plans/UX-AUDIT-2026-08.md > M2`). L'invariant
 * qui compte reste le même — **aucun débordement horizontal** — et il vaut
 * maintenant pour la nouvelle structure.
 *
 * Skip propre si l'émulateur Firestore n'est pas joignable (création de
 * campagne → besoin de l'émulateur).
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review');

async function captureFull(page: Page, filename: string): Promise<void> {
  mkdirSync(UAT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(UAT_DIR, filename), fullPage: true });
}

async function createGmCampaign(page: Page, name: string): Promise<void> {
  await page.goto('/campaigns');
  await waitForAppReady(page);
  await page
    .getByRole('button', { name: /Créer une campagne/i })
    .first()
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel(/Nom de la campagne/i).fill(name);
  await page.getByRole('button', { name: /^Créer$/ }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });
  await expect(page.getByRole('heading', { name: new RegExp(name, 'i') })).toBeVisible();
  // Les deux groupes d'espaces sont rendus, et « Cartes » (MJ-only) s'y trouve.
  await expect(page.getByRole('heading', { name: /^Jouer$/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Mémoire de la table/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Cartes/i })).toBeVisible();
}

test.describe('UAT — barre d’outils MJ enveloppée', () => {
  test('mobile 375 — les espaces tiennent sans débordement horizontal', async ({ page }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — capture skippée.');

    await page.setViewportSize({ width: 375, height: 812 });
    await createGmCampaign(page, 'La Confrérie du Val');

    // Aucun débordement horizontal du document à 375 px.
    const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollW).toBeLessThanOrEqual(375);

    await captureFull(page, '16-espaces-campagne-mobile-375.png');
  });

  test('desktop — les deux groupes d’espaces sont lisibles', async ({ page }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — capture skippée.');

    await page.setViewportSize({ width: 1440, height: 900 });
    await createGmCampaign(page, 'Les Cendres de Valmont');
    await captureFull(page, '17-espaces-campagne-desktop-1440.png');
  });
});
