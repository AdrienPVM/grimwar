import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * UAT JALON 24.4 (step 7) — contrôle MJ des PV / états d'un monstre sur le
 * tracker (`EncounterScreen` + `ParticipantControlModal`). Couvre aussi la
 * partie « kill » du step 12 (e2e complet) : on droppe un gobelin à 0 PV via le
 * contrôle MJ.
 *
 * Parcours : créer une rencontre 3 gobelins → init → démarrer → ouvrir le
 * contrôle d'un gobelin → 10 dégâts (7 → 0) → poser l'état « Empoisonné » →
 * fermer → la carte reflète 0/7 + chip d'état. Les écritures (PV via
 * `applyParticipantHpDelta` + event `monster-hp-change`, états via
 * `setParticipantCondition`) passent par les VRAIES rules Firestore de
 * l'émulateur (write encounter + create event : DM uniquement).
 *
 * Plan UAT (captures `uat-review/jalon-24/24.4/`) :
 *   01-tracker-actif.png        — combat en cours : cartes monstres avec bouton « PV / États »
 *   02-controle-modale.png      — modale ouverte (pleine page : PV + montant + états)
 *   02-controle-modale-viewport.png — idem en viewport (ressenti d'overlay)
 *   03-degats-appliques.png     — après 10 dégâts : 0/7 dans la modale (barre crimson)
 *   04-etat-applique.png        — après « Empoisonné » : état actif (modale)
 *   05-carte-monstre-ko.png     — modale fermée : la carte montre 0/7 + chip « Empoisonné »
 *
 * Émulateur Firestore requis. Skip propre sans Java (pas de faux-vert).
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review/jalon-24/24.4');

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

test.describe('UAT 24.4 — contrôle MJ des PV / états monstres', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('créer → init → démarrer → dégâts + état sur un monstre (émulateur requis)', async ({
    page,
  }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — captures 24.4 skippées.');

    // ─── Campagne + onglet Rencontres.
    await page.goto('/campaigns');
    await waitForAppReady(page);
    await page.getByRole('button', { name: /Créer une campagne/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel(/Nom de la campagne/i).fill('Le Val des Cendres');
    await page.getByRole('button', { name: /^Créer$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });

    await page.getByRole('button', { name: /Ouvrir/i }).first().click();
    await page.getByRole('button', { name: /^Rencontres$/ }).click();
    await expect(page).toHaveURL(/\/encounters$/);

    // ─── Rencontre de 3 gobelins (7 PV chacun).
    await page.getByRole('button', { name: /Créer une rencontre/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel(/Nom de la rencontre/i).fill('Patrouille gobeline');
    // Bouton de saisie manuelle d'une ligne de monstre (libellé courant :
    // « Saisir à la main » ; l'ancien « Ajouter un monstre » n'existe plus).
    await page.getByRole('button', { name: /Saisir à la main/i }).click();
    await page.getByPlaceholder('Ex. « Gobelin »').fill('Gobelin');
    await page.getByPlaceholder('PV').fill('7');
    await page.getByLabel('Nombre').fill('3');
    await page.getByRole('button', { name: /^Créer$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });

    // ─── Tracker → init → démarrer.
    await page.getByRole('button', { name: /Patrouille gobeline/i }).click();
    await expect(page).toHaveURL(/\/encounters\/[^/]+$/);
    await page.getByRole('button', { name: 'Lancer l’initiative' }).click();
    await page.getByRole('button', { name: 'Démarrer le combat' }).click();
    await expect(page.getByText('En cours', { exact: true })).toBeVisible({ timeout: 10_000 });

    // ─── 01 — Les cartes monstres portent le bouton « PV / États » (MJ).
    const controlButton = page.getByRole('button', { name: /PV \/ États — Gobelin 1/ });
    await expect(controlButton).toBeVisible();
    await captureFull(page, '01-tracker-actif.png');

    // ─── 02 — Ouvre la modale de contrôle.
    await controlButton.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Gobelin 1' })).toBeVisible();
    await expect(dialog.getByText('7/7')).toBeVisible();
    await captureFull(page, '02-controle-modale.png');
    await captureViewport(page, '02-controle-modale-viewport.png');

    // ─── 03 — 10 dégâts : 7 → 0 (clamp). La modale reflète le live doc.
    await dialog.getByRole('button', { name: '−10' }).click();
    await expect(dialog.getByText('0/7')).toBeVisible({ timeout: 10_000 });
    await captureFull(page, '03-degats-appliques.png');

    // ─── 04 — Pose l'état « Empoisonné » (aria-pressed bascule à true).
    await dialog.getByRole('button', { name: 'Empoisonné' }).click();
    await expect(dialog.getByRole('button', { name: 'Empoisonné', pressed: true })).toBeVisible({
      timeout: 10_000,
    });
    await captureFull(page, '04-etat-applique.png');

    // ─── 05 — Ferme : la carte du monstre montre 0/7 + chip d'état.
    await page.getByRole('button', { name: 'Fermer le contrôle' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const goblinCard = page.locator('li', { hasText: 'Gobelin 1' }).first();
    await expect(goblinCard.getByText('0/7')).toBeVisible();
    await expect(goblinCard.getByText('Empoisonné')).toBeVisible();
    await captureFull(page, '05-carte-monstre-ko.png');
  });
});
