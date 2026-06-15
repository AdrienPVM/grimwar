import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * UAT JALON 4.0.5 — captures écran `/campaigns/:cid` + `/campaigns/join` pour
 * `uat-review/jalon-4/4.0.5/`.
 *
 * Plan UAT (cf. spec 4.0.5) :
 *   01-join-empty-desktop-1440.png         — join screen vide (UI-only)
 *   02-join-code-too-short-desktop-1440.png — join avec saisie 3 chars + erreur
 *   03-join-code-unknown-desktop-1440.png  — join avec code valide format mais inconnu (émulateur requis)
 *   04-detail-mj-desktop-1440.png          — détail MJ : invite + roster + Quitter (émulateur requis)
 *   05-promote-confirm-desktop-1440.png    — modale Promouvoir ouverte (fullPage + viewport)
 *     [SKIP — nécessiterait un second user ; cf. rapport UAT 4.0.5]
 *   05-leave-confirm-desktop-1440.png      — modale Quitter ouverte (fullPage + viewport)
 *   06-detail-mj-mobile-375.png            — détail MJ mobile
 *   07-detail-mj-tablet-768.png            — détail MJ tablet
 *
 * Captures écrites dans `uat-review/jalon-4/4.0.5/` (gitignored).
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review/jalon-4/4.0.5');

function ensureUatDir(): void {
  mkdirSync(UAT_DIR, { recursive: true });
}

async function captureFull(
  page: import('@playwright/test').Page,
  filename: string,
): Promise<void> {
  ensureUatDir();
  await page.screenshot({
    path: path.join(UAT_DIR, filename),
    fullPage: true,
  });
}

async function captureViewport(
  page: import('@playwright/test').Page,
  filename: string,
): Promise<void> {
  ensureUatDir();
  await page.screenshot({
    path: path.join(UAT_DIR, filename),
    fullPage: false,
  });
}

test.describe('UAT 4.0.5 — captures /campaigns detail + join', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('01-02 — join screen vide + erreur de longueur (UI-only)', async ({ page }) => {
    await page.goto('/campaigns/join');
    await waitForAppReady(page);

    await expect(
      page.getByRole('heading', { name: /Rejoindre une campagne/i }),
    ).toBeVisible();
    await captureFull(page, '01-join-empty-desktop-1440.png');

    // Trigger erreur de longueur (3 chars).
    await page.getByLabel(/Code d['']invitation/i).fill('ABC');
    await page.getByRole('button', { name: 'Rejoindre' }).click();
    await expect(page.getByText(/6 caractères/i)).toBeVisible();
    await captureFull(page, '02-join-code-too-short-desktop-1440.png');
  });

  test('03-07 — flow détail campagne + modales (émulateur requis)', async ({ page }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — captures 03-07 skippées.');

    // ─── 03 — Code inconnu (valide format, ne matche rien en base).
    await page.goto('/campaigns/join');
    await waitForAppReady(page);
    await page.getByLabel(/Code d['']invitation/i).fill('Z9Z9Z9');
    await page.getByRole('button', { name: 'Rejoindre' }).click();
    await expect(page.getByText(/Aucune campagne ne correspond/i)).toBeVisible({
      timeout: 10_000,
    });
    await captureFull(page, '03-join-code-unknown-desktop-1440.png');

    // ─── 04 — Crée une campagne puis navigue sur son détail.
    await page.goto('/campaigns');
    await waitForAppReady(page);
    await page.getByRole('button', { name: /Créer une campagne/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel(/Nom de la campagne/i).fill("L'Ombre de Caer Dûn");
    await page
      .getByLabel(/Description/i)
      .fill('Une campagne urbaine brumeuse, intrigues de cour et meurtres rituels.');
    await page.getByRole('button', { name: /^Créer$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });

    // Ouvre le détail de la campagne créée.
    await page.getByRole('button', { name: /Ouvrir/i }).first().click();
    await expect(
      page.getByRole('heading', { name: /L'Ombre de Caer Dûn/i }),
    ).toBeVisible();
    await expect(page.getByText(/Inviter à la table/i)).toBeVisible();
    await captureFull(page, '04-detail-mj-desktop-1440.png');

    // ─── 05 — Modale Quitter ouverte (fullPage + viewport).
    // Note : un MJ unique recevra l'erreur "last-gm-cannot-leave" en confirmant ;
    // on capture la modale avant ce clic pour montrer le layout.
    await page.getByRole('button', { name: /Quitter la campagne/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await captureFull(page, '05-leave-confirm-desktop-1440.png');
    await captureViewport(page, '05-leave-confirm-desktop-1440-viewport.png');
    await page.getByRole('button', { name: 'Rester' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // ─── 06 — Mobile 375.
    await page.setViewportSize({ width: 375, height: 812 });
    await captureViewport(page, '06-detail-mj-mobile-375.png');

    // ─── 07 — Tablet 768.
    await page.setViewportSize({ width: 768, height: 1024 });
    await captureViewport(page, '07-detail-mj-tablet-768.png');
  });
});
