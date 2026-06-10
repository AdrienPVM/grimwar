import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import {
  isEmulatorReachable,
  waitForAppReady,
} from './fixtures';

/**
 * UAT JALON 4.0.4 — captures écran /campaigns pour `uat-review/jalon-4/4.0.4/`.
 *
 * Plan UAT (cf. user spec 4.0.4) :
 *   01-empty-state-desktop-1440.png       — desktop sans campagne (sans émulateur)
 *   02-with-campaigns-desktop-1440.png    — desktop avec 2-3 campagnes (émulateur requis)
 *   03-create-modal-desktop-1440.png      — modale create ouverte (fullPage + viewport)
 *   04-leave-confirm-desktop-1440.png     — modale leave ouverte (fullPage + viewport)
 *   05-with-campaigns-mobile-375.png      — viewport mobile
 *   06-with-campaigns-tablet-768.png      — viewport tablet
 *   07-with-campaigns-lg-1024.png         — viewport lg
 *
 * Pour 02 / 04..07 : on a besoin de campagnes seedées dans Firestore. On utilise
 * l'UI réelle (createCampaign via la modale) pour cela — ça exerce le flow
 * complet et c'est plus simple à maintenir qu'un seedCampaign Admin SDK
 * dédié pour 4.0.4. Si l'émulateur est down, les captures 02+ sont skippées
 * proprement ; 01 + 03 (UI-only) restent.
 *
 * Captures écrites dans `uat-review/jalon-4/4.0.4/` (gitignored, cf.
 * CLAUDE.md règle « captures UAT par commit »). Les viewports modales ont
 * une seconde capture viewport-only pour le ressenti overlay (cf. règle UAT
 * 2026-05-20 sur les modales).
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review/jalon-4/4.0.4');

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

test.describe('UAT 4.0.4 — captures /campaigns', () => {
  // Override le viewport mobile par défaut (Pixel 7) — la spec UAT cible
  // les rendus desktop / tablet / lg / mobile explicitement.
  test.use({ viewport: { width: 1440, height: 900 } });

  test('01 — empty state desktop 1440', async ({ page }) => {
    await page.goto('/campaigns');
    await waitForAppReady(page);

    await expect(
      page.getByRole('heading', { name: /Aucune campagne/i }),
    ).toBeVisible();
    await captureFull(page, '01-empty-state-desktop-1440.png');
  });

  test('02..07 — états avec campagnes (émulateur requis)', async ({ page }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — captures 02..07 skippées.');

    // Boot desktop 1440.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/campaigns');
    await waitForAppReady(page);

    // ─── 03 — capture modale CREATE (fullPage + viewport)
    // On la fait AVANT de créer des campagnes pour conserver une vue épurée
    // sans cards en arrière-plan.
    await page.getByRole('button', { name: /Créer une campagne/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await captureFull(page, '03-create-modal-desktop-1440.png');
    await captureViewport(page, '03-create-modal-desktop-1440-viewport.png');

    // Crée 3 campagnes via l'UI pour le shot « with campaigns ».
    const campaignsToCreate = [
      { name: "L'Ombre de Caer Dûn", description: 'Une campagne urbaine brumeuse, intrigues de cour et meurtres rituels.' },
      { name: 'Le Sceau Brisé', description: 'Sept fragments à retrouver avant que les sept rois ne se réveillent.' },
      { name: 'Voyage aux Étoiles Mortes', description: 'Un vaisseau interplanaire échoué sur un astre éteint.' },
    ];

    for (let i = 0; i < campaignsToCreate.length; i++) {
      const camp = campaignsToCreate[i]!;
      if (i === 0) {
        // La modale est déjà ouverte (capture 03).
      } else {
        await page.getByRole('button', { name: /Créer une campagne/i }).first().click();
        await expect(page.getByRole('dialog')).toBeVisible();
      }
      await page.getByLabel(/Nom de la campagne/i).fill(camp.name);
      await page.getByLabel(/Description/i).fill(camp.description);
      await page.getByRole('button', { name: /^Créer$/ }).click();
      // Attendre la fermeture de la modale.
      await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });
    }

    // Attendre que les 3 cards soient affichées.
    await expect(page.getByText("L'Ombre de Caer Dûn")).toBeVisible();
    await expect(page.getByText('Le Sceau Brisé')).toBeVisible();
    await expect(page.getByText('Voyage aux Étoiles Mortes')).toBeVisible();

    // ─── 02 — capture liste desktop 1440.
    await captureFull(page, '02-with-campaigns-desktop-1440.png');

    // ─── 04 — modale LEAVE (fullPage + viewport).
    // On clique sur le « Quitter » de la 1re carte.
    await page.getByRole('button', { name: 'Quitter' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await captureFull(page, '04-leave-confirm-desktop-1440.png');
    await captureViewport(page, '04-leave-confirm-desktop-1440-viewport.png');

    // Ferme la modale leave.
    await page.getByRole('button', { name: 'Rester' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // ─── 05 — mobile 375.
    await page.setViewportSize({ width: 375, height: 812 });
    await captureViewport(page, '05-with-campaigns-mobile-375.png');

    // ─── 06 — tablet 768.
    await page.setViewportSize({ width: 768, height: 1024 });
    await captureViewport(page, '06-with-campaigns-tablet-768.png');

    // ─── 07 — lg 1024.
    await page.setViewportSize({ width: 1024, height: 768 });
    await captureViewport(page, '07-with-campaigns-lg-1024.png');
  });
});
