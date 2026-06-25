import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * UAT JALON 23.3 — captures écran `/campaigns/:cid/sessions/:sid` (SessionScreen)
 * pour `uat-review/jalon-23/23.3/`.
 *
 * Plan UAT :
 *   01-notes-empty-mj-desktop-1440.png      — onglet Notes vide (éditeur MJ)
 *   02-notes-filled-mj-desktop-1440.png     — Notes avec texte saisi + indicateur de save
 *   03-attendance-mj-desktop-1440.png       — onglet Présence (roster cochable)
 *   04-events-empty-desktop-1440.png        — onglet Événements (liste réelle, plan 26)
 *   05-journal-placeholder-desktop-1440.png — onglet Journal (placeholder plan 25)
 *   06-notes-mj-mobile-375.png              — Notes mobile
 *
 * Émulateur Firestore requis. Skip propre sans Java.
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review/jalon-23/23.3');

function ensureUatDir(): void {
  mkdirSync(UAT_DIR, { recursive: true });
}

async function captureFull(page: import('@playwright/test').Page, filename: string): Promise<void> {
  ensureUatDir();
  await page.screenshot({ path: path.join(UAT_DIR, filename), fullPage: true });
}

async function captureViewport(
  page: import('@playwright/test').Page,
  filename: string,
): Promise<void> {
  ensureUatDir();
  await page.screenshot({ path: path.join(UAT_DIR, filename), fullPage: false });
}

test.describe('UAT 23.3 — captures SessionScreen', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('01-06 — onglets séance MJ (émulateur requis)', async ({ page }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — captures 23.3 skippées.');

    // ─── Crée une campagne, planifie une séance, ouvre-la.
    await page.goto('/campaigns');
    await waitForAppReady(page);
    await page.getByRole('button', { name: /Créer une campagne/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel(/Nom de la campagne/i).fill('Le Concile des Ombres');
    await page.getByRole('button', { name: /^Créer$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });

    await page.getByRole('button', { name: /Ouvrir/i }).first().click();
    await page.getByRole('button', { name: /^Séances$/ }).click();
    await expect(page).toHaveURL(/\/sessions$/);
    await page.getByRole('button', { name: /Planifier une séance/i }).click();
    await page.getByLabel(/Titre de la séance/i).fill('La nuit des longs couteaux');
    await page.getByRole('button', { name: /^Planifier$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });

    // Ouvre la séance (ligne cliquable).
    await page.getByRole('button', { name: /La nuit des longs couteaux/i }).click();
    await expect(page).toHaveURL(/\/sessions\/[^/]+$/);
    await expect(page.getByRole('heading', { name: /La nuit des longs couteaux/i })).toBeVisible();

    // ─── 01 — Notes vides.
    await expect(page.getByRole('textbox')).toBeVisible();
    await captureFull(page, '01-notes-empty-mj-desktop-1440.png');

    // ─── 02 — Notes avec texte.
    await page
      .getByRole('textbox')
      .fill('Les PJ infiltrent le palais. Dame Veyra trahit le duc au troisième acte.');
    await captureFull(page, '02-notes-filled-mj-desktop-1440.png');

    // ─── 03 — Présence.
    await page.getByRole('tab', { name: 'Présence' }).click();
    await expect(page.getByText(/Présence à la séance/i)).toBeVisible();
    await captureFull(page, '03-attendance-mj-desktop-1440.png');

    // ─── 04 — Événements (onglet réel depuis plan 26 : liste + filtre audit).
    await page.getByRole('tab', { name: 'Événements' }).click();
    await expect(page.getByText(/Aucun événement enregistré/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Éditions MJ' })).toBeVisible();
    await captureFull(page, '04-events-empty-desktop-1440.png');

    // ─── 05 — Journal (placeholder).
    await page.getByRole('tab', { name: 'Journal' }).click();
    await expect(page.getByText(/journal compilé/i)).toBeVisible();
    await captureFull(page, '05-journal-placeholder-desktop-1440.png');

    // ─── 06 — Notes mobile.
    await page.getByRole('tab', { name: 'Notes' }).click();
    await page.setViewportSize({ width: 375, height: 812 });
    await captureViewport(page, '06-notes-mj-mobile-375.png');
  });
});
