import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * UAT JALON 24.3 — cycle de vie d'une rencontre de combat sur le tracker
 * (`EncounterScreen`) : créer → lancer l'initiative → démarrer → fin de tour →
 * clôturer (victoire). Vérifie aussi la VÉRITÉ RUNTIME « rouge avant vert » : la
 * transition de statut + l'écriture des events `encounter-start`/`turn-start`/
 * `encounter-end` passent par les VRAIES rules Firestore de l'émulateur (create
 * encounter + create events : DM uniquement). Un échec d'écriture casserait la
 * transition de statut visible à l'écran.
 *
 * Plan UAT (captures `uat-review/jalon-24/24.3/`) :
 *   01-tracker-planned.png    — rencontre préparée : « Lancer l'initiative » + « Démarrer »
 *   02-initiative-rolled.png  — après le jet : ordre établi, init affichée
 *   03-active-round1.png      — combat démarré : « En cours » + « Round 1 » + tour surligné
 *   04-after-end-turn.png     — après « Fin du tour » : le tour a avancé
 *   05-outcome-selector.png   — « Clôturer » : sélecteur d'issue
 *   06-completed.png          — après « Victoire » : statut « Terminée », plus de contrôle de tour
 *
 * Émulateur Firestore requis. Skip propre sans Java (pas de faux-vert). NB le
 * rendu des events de combat dans le FEED de campagne relève du plan 25
 * (compilateur de journal) — hors scope de cette spec, qui valide le tracker.
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review/jalon-24/24.3');

function ensureUatDir(): void {
  mkdirSync(UAT_DIR, { recursive: true });
}

async function captureFull(page: import('@playwright/test').Page, filename: string): Promise<void> {
  ensureUatDir();
  await page.screenshot({ path: path.join(UAT_DIR, filename), fullPage: true });
}

test.describe('UAT 24.3 — cycle de vie rencontre de combat', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('créer → init → démarrer → fin de tour → clôturer (émulateur requis)', async ({ page }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — captures 24.3 skippées.');

    // ─── Crée une campagne, ouvre l'onglet Rencontres.
    await page.goto('/campaigns');
    await waitForAppReady(page);
    await page.getByRole('button', { name: /Créer une campagne/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel(/Nom de la campagne/i).fill('La Couronne Brisée');
    await page.getByRole('button', { name: /^Créer$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });

    await page.getByRole('button', { name: /^Rencontres$/ }).click();
    await expect(page).toHaveURL(/\/encounters$/);

    // ─── Crée une rencontre de 3 gobelins (saisie manuelle).
    await page.getByRole('button', { name: /Créer une rencontre/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel(/Nom de la rencontre/i).fill('L’embuscade des gobelins');
    // Saisie manuelle d'une ligne de monstre (libellé courant « Saisir à la main »).
    await page.getByRole('button', { name: /Saisir à la main/i }).click();
    await page.getByPlaceholder('Ex. « Gobelin »').fill('Gobelin');
    await page.getByPlaceholder('PV').fill('7');
    await page.getByLabel('Nombre').fill('3');
    await page.getByRole('button', { name: /^Créer$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });

    // ─── Ouvre le tracker.
    // Ancré au début : le bouton « Gérer la rencontre — … » porte aussi le nom (M7).
    await page.getByRole('button', { name: /^L.embuscade des gobelins/i }).click();
    await expect(page).toHaveURL(/\/encounters\/[^/]+$/);

    // ─── 01 — Préparée : contrôles d'initiative + démarrage.
    await expect(page.getByRole('button', { name: 'Lancer l’initiative' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Démarrer le combat' })).toBeVisible();
    await captureFull(page, '01-tracker-planned.png');

    // ─── 02 — Jet d'initiative : l'ordre s'établit (le hint « vide » disparaît).
    await page.getByRole('button', { name: 'Lancer l’initiative' }).click();
    await expect(page.getByText(/Lance l’initiative pour établir l’ordre/i)).toHaveCount(0, {
      timeout: 10_000,
    });
    await captureFull(page, '02-initiative-rolled.png');

    // ─── 03 — Démarrage → En cours + Round 1 + Fin du tour. `exact` pour ne pas
    // capturer aussi le libellé « Tour en cours » du participant actif.
    await page.getByRole('button', { name: 'Démarrer le combat' }).click();
    await expect(page.getByText('En cours', { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Round\s*1/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Fin du tour' })).toBeVisible();
    await captureFull(page, '03-active-round1.png');

    // ─── 04 — Fin du tour : le pointeur avance (toujours En cours).
    await page.getByRole('button', { name: 'Fin du tour' }).click();
    await expect(page.getByText('En cours', { exact: true })).toBeVisible();
    await captureFull(page, '04-after-end-turn.png');

    // ─── 05 — Clôturer → sélecteur d'issue.
    await page.getByRole('button', { name: 'Clôturer le combat' }).click();
    await expect(page.getByText('Issue du combat')).toBeVisible();
    await captureFull(page, '05-outcome-selector.png');

    // ─── 06 — Victoire → Terminée, plus de contrôle de tour.
    await page.getByRole('button', { name: 'Victoire' }).click();
    await expect(page.getByText('Terminée')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Fin du tour' })).toHaveCount(0);
    await captureFull(page, '06-completed.png');
  });
});
