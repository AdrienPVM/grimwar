import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * UAT JALON 24.2 — captures écran `/campaigns/:cid/encounters` pour
 * `uat-review/jalon-24/24.2/`.
 *
 * Plan UAT :
 *   01-encounters-empty-mj-desktop-1440.png      — liste vide MJ + CTA « Créer une rencontre »
 *   02-create-modal-desktop-1440.png             — modale de création (fullPage) : party vide + section monstres
 *   02-create-modal-desktop-1440-viewport.png    — idem en viewport (ressenti overlay)
 *   03-create-modal-with-monster-1440.png        — modale avec une ligne de monstre remplie (nom + PV + nb)
 *   03b-bestiary-picker-empty-1440.png           — sélecteur « Depuis le bestiaire » (état vide → import de pack)
 *   03b-bestiary-picker-empty-1440-viewport.png  — idem viewport (ressenti overlay)
 *   04-encounters-list-mj-desktop-1440.png       — liste avec 1 rencontre (chip statut + nb participants)
 *   05-encounters-list-mj-mobile-375.png         — liste mobile
 *   06-encounters-list-mj-tablet-768.png         — liste tablet
 *
 * Campagne fraîche ⇒ aucun joueur lié : la section « Personnages de la table »
 * est vide, et la rencontre se crée via la SAISIE MANUELLE de monstre (le stopgap
 * acté tant que `monsters.json` est vide). C'est exactement le chemin à valider.
 *
 * Émulateur Firestore requis. Skip propre sans Java. Captures écrites dans
 * `uat-review/jalon-24/24.2/` (gitignored).
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review/jalon-24/24.2');

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

test.describe('UAT 24.2 — captures /campaigns/:cid/encounters', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('01-06 — flow rencontres MJ (émulateur requis)', async ({ page }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — captures 24.2 skippées.');

    // ─── Crée une campagne puis ouvre son détail.
    await page.goto('/campaigns');
    await waitForAppReady(page);
    await page.getByRole('button', { name: /Créer une campagne/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel(/Nom de la campagne/i).fill('Le Val des Brumes');
    await page.getByRole('button', { name: /^Créer$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });

    await expect(
      page.getByRole('heading', { name: /Le Val des Brumes/i }),
    ).toBeVisible();

    // ─── Entrée MJ « Rencontres » → /campaigns/:cid/encounters.
    await page.getByRole('button', { name: /^Rencontres$/ }).click();
    await expect(page).toHaveURL(/\/campaigns\/[^/]+\/encounters$/);

    // ─── 01 — Liste vide MJ.
    await expect(page.getByText(/Aucune rencontre pour le moment/i)).toBeVisible();
    await captureFull(page, '01-encounters-empty-mj-desktop-1440.png');

    // ─── 02 — Modale de création (fullPage + viewport).
    await page.getByRole('button', { name: /Créer une rencontre/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/Aucun personnage lié à la table/i)).toBeVisible();
    await captureFull(page, '02-create-modal-desktop-1440.png');
    await captureViewport(page, '02-create-modal-desktop-1440-viewport.png');

    // ─── 03 — Saisie manuelle d'une ligne de monstre (nom + PV) → formulaire rempli.
    await page.getByRole('button', { name: /Saisir à la main/i }).click();
    await page.getByPlaceholder('Ex. « Gobelin »').fill('Gobelin');
    await page.getByPlaceholder('PV').fill('7');
    await captureFull(page, '03-create-modal-with-monster-1440.png');

    // ─── 03b — Sélecteur « Depuis le bestiaire ». Campagne fraîche ⇒ bestiaire
    // vide : on valide l'état vide qui oriente vers l'import de pack d'extension.
    await page.getByRole('button', { name: /Depuis le bestiaire/i }).click();
    await expect(page.getByText(/Votre bestiaire est vide/i)).toBeVisible();
    await captureFull(page, '03b-bestiary-picker-empty-1440.png');
    await captureViewport(page, '03b-bestiary-picker-empty-1440-viewport.png');
    // Referme le sélecteur (Échap) avant de soumettre la rencontre.
    await page.keyboard.press('Escape');
    await expect(page.getByText(/Votre bestiaire est vide/i)).toHaveCount(0);

    // ─── 04 — Soumet → liste avec 1 rencontre.
    await page.getByLabel(/Nom de la rencontre/i).fill('L’embuscade des gobelins');
    await page.getByRole('button', { name: /^Créer$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });
    await expect(page.getByText('L’embuscade des gobelins')).toBeVisible();
    await expect(page.getByText('Préparée')).toBeVisible();
    await captureFull(page, '04-encounters-list-mj-desktop-1440.png');

    // ─── 05 — Mobile 375.
    await page.setViewportSize({ width: 375, height: 812 });
    await captureViewport(page, '05-encounters-list-mj-mobile-375.png');

    // ─── 06 — Tablet 768.
    await page.setViewportSize({ width: 768, height: 1024 });
    await captureViewport(page, '06-encounters-list-mj-tablet-768.png');
  });
});
