import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * UAT JALON 24 (step 12) — e2e COMPLET du tracker de combat, bout en bout :
 * le MJ crée une rencontre de 3 gobelins → lance l'initiative → démarre →
 * fait tourner DEUX rounds entiers (fin du tour sur tout l'ordre, ×2) →
 * tue les 3 gobelins via le contrôle MJ (10 dégâts → 0/7 chacun) → clôture
 * sur « Victoire ».
 *
 * C'est le scénario d'acceptation littéral du step 12 du plan 24. Les specs
 * sœurs (`encounter-lifecycle-uat`, `encounter-monster-control-uat`,
 * `encounter-handoff-party-uat`) couvrent les briques isolément ; celle-ci
 * vérifie le parcours consolidé en une seule session — 2 rounds RÉELS + kill
 * ALL + victoire — qu'aucune autre ne couvrait d'un bout à l'autre.
 *
 * Toutes les transitions (create encounter, write PV + events `monster-hp-change`,
 * `encounter-start`/`turn-start`/`encounter-end`) passent par les VRAIES rules
 * Firestore de l'émulateur (MJ uniquement). Un échec d'écriture casserait une
 * transition de statut/PV visible à l'écran → rouge.
 *
 * Plan UAT (captures `uat-review/jalon-24/24-full/`) :
 *   01-rencontre-creee.png   — 3 gobelins, rencontre préparée
 *   02-initiative.png        — ordre d'initiative établi
 *   03-round1.png            — combat démarré, Round 1
 *   04-round2.png            — après un tour complet : Round 2
 *   05-tous-morts.png        — les 3 gobelins à 0/7 (kill all)
 *   06-victoire.png          — clôture sur Victoire, statut Terminée
 *
 * Émulateur Firestore requis. Skip propre sans Java (pas de faux-vert).
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review/jalon-24/24-full');

function ensureUatDir(): void {
  mkdirSync(UAT_DIR, { recursive: true });
}

async function captureFull(page: import('@playwright/test').Page, filename: string): Promise<void> {
  ensureUatDir();
  await page.screenshot({ path: path.join(UAT_DIR, filename), fullPage: true });
}

/** Tue un gobelin via le contrôle MJ : ouvre la modale, −10 PV (7 → 0), ferme. */
async function killGoblin(page: import('@playwright/test').Page, label: string): Promise<void> {
  await page.getByRole('button', { name: new RegExp(`PV / États — ${label}`) }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: label })).toBeVisible();
  await dialog.getByRole('button', { name: '−10' }).click();
  await expect(dialog.getByText('0/7')).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Fermer le contrôle' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

test.describe('UAT 24 (step 12) — combat complet bout en bout', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('3 gobelins → init → 2 rounds → kill all → victoire (émulateur requis)', async ({
    page,
  }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — captures 24 step 12 skippées.');

    // ─── Campagne + onglet Rencontres.
    await page.goto('/campaigns');
    await waitForAppReady(page);
    await page.getByRole('button', { name: /Créer une campagne/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel(/Nom de la campagne/i).fill('Les Profondeurs de Khalgûn');
    await page.getByRole('button', { name: /^Créer$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });

    await page.getByRole('button', { name: /Ouvrir/i }).first().click();
    await page.getByRole('button', { name: /^Rencontres$/ }).click();
    await expect(page).toHaveURL(/\/encounters$/);

    // ─── Rencontre de 3 gobelins (7 PV chacun).
    await page.getByRole('button', { name: /Créer une rencontre/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel(/Nom de la rencontre/i).fill('Le guet-apens du tunnel');
    // Saisie manuelle d'une ligne de monstre (libellé courant « Saisir à la main »).
    await page.getByRole('button', { name: /Saisir à la main/i }).click();
    await page.getByPlaceholder('Ex. « Gobelin »').fill('Gobelin');
    await page.getByPlaceholder('PV').fill('7');
    await page.getByLabel('Nombre').fill('3');
    await page.getByRole('button', { name: /^Créer$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });

    // ─── 01 — Rencontre préparée (3 gobelins).
    await page.getByRole('button', { name: /guet-apens du tunnel/i }).click();
    await expect(page).toHaveURL(/\/encounters\/[^/]+$/);
    await expect(page.getByRole('button', { name: 'Lancer l’initiative' })).toBeVisible();
    await captureFull(page, '01-rencontre-creee.png');

    // ─── 02 — Initiative : l'ordre s'établit.
    await page.getByRole('button', { name: 'Lancer l’initiative' }).click();
    await expect(page.getByText(/Lance l’initiative pour établir l’ordre/i)).toHaveCount(0, {
      timeout: 10_000,
    });
    await captureFull(page, '02-initiative.png');

    // ─── 03 — Démarrage : En cours + Round 1.
    await page.getByRole('button', { name: 'Démarrer le combat' }).click();
    await expect(page.getByText('En cours', { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Round\s*1/)).toBeVisible();
    await captureFull(page, '03-round1.png');

    // ─── 04 — Round complet : 3 participants → 3 « Fin du tour » repassent en
    // Round 2 (wrap après le dernier participant). On avance jusqu'à voir Round 2.
    const endTurn = page.getByRole('button', { name: 'Fin du tour' });
    for (let i = 0; i < 3; i++) {
      await endTurn.click();
    }
    await expect(page.getByText(/Round\s*2/)).toBeVisible({ timeout: 10_000 });
    await captureFull(page, '04-round2.png');

    // ─── 05 — Kill all : les 3 gobelins tombent à 0/7 via le contrôle MJ.
    await killGoblin(page, 'Gobelin 1');
    await killGoblin(page, 'Gobelin 2');
    await killGoblin(page, 'Gobelin 3');
    for (const label of ['Gobelin 1', 'Gobelin 2', 'Gobelin 3']) {
      const card = page.locator('li', { hasText: label }).first();
      await expect(card.getByText('0/7')).toBeVisible();
    }
    await captureFull(page, '05-tous-morts.png');

    // ─── 06 — Clôture sur Victoire → Terminée, plus de contrôle de tour.
    await page.getByRole('button', { name: 'Clôturer le combat' }).click();
    await expect(page.getByText('Issue du combat')).toBeVisible();
    await page.getByRole('button', { name: 'Victoire' }).click();
    await expect(page.getByText('Terminée')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Fin du tour' })).toHaveCount(0);
    await captureFull(page, '06-victoire.png');
  });
});
