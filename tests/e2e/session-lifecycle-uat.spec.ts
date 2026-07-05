import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * UAT JALON 23.4 — cycle de vie d'une séance (démarrer → clore) + vérification
 * que les events `session-start` / `session-end` sont journalisés ET rendus dans
 * le feed MJ avec leur libellé FR. Captures pour `uat-review/jalon-23/23.4/`.
 *
 * C'est aussi la vérification runtime « rouge avant vert » : la création d'event
 * passe par les VRAIES rules Firestore de l'émulateur (create events : DM peut
 * tout logguer). Un échec d'écriture serait visible (le feed resterait vide).
 *
 * Plan UAT :
 *   01-planned-start-button.png   — séance planifiée + bouton « Démarrer »
 *   02-active-end-button.png      — après démarrage : statut En cours + « Clore »
 *   03-feed-session-start.png     — feed campagne MJ montrant « Séance démarrée »
 *   04-completed.png              — après clôture : statut Terminée, pas de bouton
 *   05-feed-session-end.png       — feed montrant « Séance terminée »
 *
 * Émulateur Firestore requis. Skip propre sans Java. NB step 12 « players join »
 * (multi-user) reste hors de cette spec single-MJ — déféré comme la promotion
 * MJ de campaigns-detail-uat (nécessite un second compte).
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review/jalon-23/23.4');

function ensureUatDir(): void {
  mkdirSync(UAT_DIR, { recursive: true });
}

async function captureFull(page: import('@playwright/test').Page, filename: string): Promise<void> {
  ensureUatDir();
  await page.screenshot({ path: path.join(UAT_DIR, filename), fullPage: true });
}

test.describe('UAT 23.4 — cycle de vie séance', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('démarrer → clore + events journalisés (émulateur requis)', async ({ page }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — captures 23.4 skippées.');

    // ─── Crée une campagne, planifie une séance, ouvre-la.
    await page.goto('/campaigns');
    await waitForAppReady(page);
    await page.getByRole('button', { name: /Créer une campagne/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel(/Nom de la campagne/i).fill('La Couronne Brisée');
    await page.getByRole('button', { name: /^Créer$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });

    await page.getByRole('button', { name: /^Séances$/ }).click();
    await page.getByRole('button', { name: /Planifier une séance/i }).click();
    await page.getByLabel(/Titre de la séance/i).fill('Le siège de la citadelle');
    await page.getByRole('button', { name: /^Planifier$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });
    await page.getByRole('button', { name: /Le siège de la citadelle/i }).click();
    await expect(page).toHaveURL(/\/sessions\/[^/]+$/);

    // ─── 01 — Planifiée + bouton Démarrer.
    await expect(page.getByText('Planifiée')).toBeVisible();
    await captureFull(page, '01-planned-start-button.png');

    // ─── 02 — Démarre → En cours + bouton Clore.
    await page.getByRole('button', { name: 'Démarrer la séance' }).click();
    await expect(page.getByText('En cours')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Clore la séance' })).toBeVisible();
    await captureFull(page, '02-active-end-button.png');

    // ─── 03 — Le feed MJ montre « Séance démarrée ».
    await page.goBack(); // → liste séances
    await page.goBack(); // → détail campagne
    await expect(page.getByRole('heading', { name: /La Couronne Brisée/i })).toBeVisible();
    await expect(page.getByText(/Séance démarrée/i)).toBeVisible({ timeout: 10_000 });
    await captureFull(page, '03-feed-session-start.png');

    // ─── 04 — Retourne sur la séance, clôt → Terminée.
    await page.getByRole('button', { name: /^Séances$/ }).click();
    await page.getByRole('button', { name: /Le siège de la citadelle/i }).click();
    await page.getByRole('button', { name: 'Clore la séance' }).click();
    await expect(page.getByText('Terminée')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Clore la séance' })).toHaveCount(0);
    await captureFull(page, '04-completed.png');

    // ─── 05 — Le feed montre « Séance terminée ».
    await page.goBack();
    await page.goBack();
    await expect(page.getByText(/Séance terminée/i)).toBeVisible({ timeout: 10_000 });
    await captureFull(page, '05-feed-session-end.png');
  });
});
