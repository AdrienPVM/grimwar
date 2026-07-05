import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * UAT JALON 23.2 — captures écran `/campaigns/:cid/sessions` pour
 * `uat-review/jalon-23/23.2/`.
 *
 * Plan UAT :
 *   01-sessions-empty-mj-desktop-1440.png   — liste vide MJ + CTA « Planifier une séance »
 *   02-create-modal-desktop-1440.png        — modale de planification (fullPage)
 *   02-create-modal-desktop-1440-viewport.png — idem en viewport (ressenti overlay)
 *   03-sessions-list-mj-desktop-1440.png    — liste avec 1 séance (chip statut + date)
 *   04-sessions-list-mj-mobile-375.png      — liste mobile
 *   05-sessions-list-mj-tablet-768.png      — liste tablet
 *
 * Émulateur Firestore requis (création de campagne + séance). Skip propre sans Java.
 * Captures écrites dans `uat-review/jalon-23/23.2/` (gitignored).
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review/jalon-23/23.2');

function ensureUatDir(): void {
  mkdirSync(UAT_DIR, { recursive: true });
}

async function captureFull(
  page: import('@playwright/test').Page,
  filename: string,
): Promise<void> {
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

test.describe('UAT 23.2 — captures /campaigns/:cid/sessions', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('01-05 — flow séances MJ (émulateur requis)', async ({ page }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — captures 23.2 skippées.');

    // ─── Crée une campagne puis ouvre son détail.
    await page.goto('/campaigns');
    await waitForAppReady(page);
    await page.getByRole('button', { name: /Créer une campagne/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel(/Nom de la campagne/i).fill('La Marche des Cendres');
    await page.getByRole('button', { name: /^Créer$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });

    await expect(
      page.getByRole('heading', { name: /La Marche des Cendres/i }),
    ).toBeVisible();

    // ─── Entrée MJ « Séances » → /campaigns/:cid/sessions.
    await page.getByRole('button', { name: /^Séances$/ }).click();
    await expect(page).toHaveURL(/\/campaigns\/[^/]+\/sessions$/);

    // ─── 01 — Liste vide MJ.
    await expect(page.getByText(/Aucune séance pour le moment/i)).toBeVisible();
    await captureFull(page, '01-sessions-empty-mj-desktop-1440.png');

    // ─── 02 — Modale de planification (fullPage + viewport).
    await page.getByRole('button', { name: /Planifier une séance/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await captureFull(page, '02-create-modal-desktop-1440.png');
    await captureViewport(page, '02-create-modal-desktop-1440-viewport.png');

    // ─── 03 — Remplit + soumet → liste avec 1 séance.
    await page.getByLabel(/Titre de la séance/i).fill('L’embuscade de la passe');
    await page.getByLabel(/Date prévue/i).fill('2026-07-10');
    await page.getByRole('button', { name: /^Planifier$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });
    await expect(page.getByText('L’embuscade de la passe')).toBeVisible();
    await expect(page.getByText('Planifiée')).toBeVisible();
    await captureFull(page, '03-sessions-list-mj-desktop-1440.png');

    // ─── 04 — Mobile 375.
    await page.setViewportSize({ width: 375, height: 812 });
    await captureViewport(page, '04-sessions-list-mj-mobile-375.png');

    // ─── 05 — Tablet 768.
    await page.setViewportSize({ width: 768, height: 1024 });
    await captureViewport(page, '05-sessions-list-mj-tablet-768.png');
  });
});
