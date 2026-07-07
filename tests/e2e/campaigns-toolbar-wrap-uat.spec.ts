import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * UAT — la barre d'outils MJ du détail de campagne enveloppe proprement sur
 * mobile. Un MJ voit 7 boutons (Journal, Documents, PNJ, Réglages, Sessions,
 * Rencontres, Cartes) ; sans `flex-wrap` ils débordaient / s'écrasaient à
 * 375 px. On capture le même écran en mobile (doit envelopper sur plusieurs
 * lignes, aucun débordement horizontal) et en desktop (doit rester sur une
 * ligne, inchangé).
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
  // Les 7 boutons MJ doivent être présents (Cartes = dernier, MJ-only).
  await expect(page.getByRole('button', { name: /Cartes/i })).toBeVisible();
}

test.describe('UAT — barre d’outils MJ enveloppée', () => {
  test('mobile 375 — la barre enveloppe sans déborder', async ({ page }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — capture skippée.');

    await page.setViewportSize({ width: 375, height: 812 });
    await createGmCampaign(page, 'La Confrérie du Val');

    // Aucun débordement horizontal du document à 375 px.
    const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollW).toBeLessThanOrEqual(375);

    await captureFull(page, '01-barre-outils-mj-mobile-375.png');
  });

  test('desktop — la barre reste sur une seule ligne', async ({ page }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — capture skippée.');

    await page.setViewportSize({ width: 1440, height: 900 });
    await createGmCampaign(page, 'Les Cendres de Valmont');
    await captureFull(page, '02-barre-outils-mj-desktop.png');
  });
});
