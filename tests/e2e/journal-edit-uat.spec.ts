import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { seedSession } from './seed-character';

/**
 * UAT JALON 25.3 (plan 25, steps 6 + 7) — édition manuelle du journal + bouton
 * « Re-compiler » avec confirmation.
 *
 * On seede une séance avec un `journalCompiled` déjà présent. Le MJ : (1) édite
 * le journal à la main (textarea Markdown) et enregistre → le rendu reflète
 * l'édition ; (2) clique « Re-compiler » → un écran de confirmation prévient que
 * l'édition sera écrasée. Les écritures passent par les vraies rules
 * (update session `isDMOf`).
 *
 * Plan UAT (captures `uat-review/jalon-25/25.3/`) :
 *   01-edition-ouverte.png   — mode édition : textarea pré-remplie + Enregistrer/Annuler
 *   02-edition-enregistree.png — après enregistrement : la prose éditée est rendue
 *   03-confirm-recompile.png — « Re-compiler » → écran de confirmation (écrasement)
 *
 * Émulateur Firestore requis. Skip propre sans Java.
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review/jalon-25/25.3');

function ensureUatDir(): void {
  mkdirSync(UAT_DIR, { recursive: true });
}

async function captureFull(page: Page, filename: string): Promise<void> {
  ensureUatDir();
  await page.screenshot({ path: path.join(UAT_DIR, filename), fullPage: true });
}

test.describe('UAT 25.3 — édition manuelle + re-compilation confirmée', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('éditer le journal → enregistrer → confirmer re-compile (émulateur requis)', async ({
    page,
  }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — captures 25.3 skippées.');

    // ─── Campagne (MJ).
    await page.goto('/campaigns');
    await waitForAppReady(page);
    await page.getByRole('button', { name: /Créer une campagne/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel(/Nom de la campagne/i).fill('Le Codex des Murmures');
    await page.getByRole('button', { name: /^Créer$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });

    await expect(page).toHaveURL(/\/campaigns\/[^/]+$/);
    const cid = page.url().match(/\/campaigns\/([^/]+)$/)?.[1];
    expect(cid).toBeTruthy();

    // ─── Séance avec un journal déjà compilé.
    const { sessionId } = await seedSession(cid!, {
      number: 2,
      title: 'Le marché aux ombres',
      status: 'completed',
      journalCompiled: '## Exploration\n\n- La séance 2 — « Le marché aux ombres » — commence.',
    });

    await page.goto(`/campaigns/${cid}/sessions/${sessionId}`);
    await waitForAppReady(page);
    await page.getByRole('tab', { name: 'Journal' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Exploration' })).toBeVisible({
      timeout: 10_000,
    });

    // ─── 01 — Éditer : textarea pré-remplie.
    await page.getByRole('button', { name: 'Éditer' }).click();
    const textarea = page.getByRole('textbox');
    await expect(textarea).toHaveValue(/marché aux ombres/);
    await captureFull(page, '01-edition-ouverte.png');

    // ─── 02 — Modifier + enregistrer → la prose éditée est rendue.
    await textarea.fill(
      '## Exploration\n\n- Les héros entrent dans le **marché aux ombres**, le cœur battant.',
    );
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByText(/Les héros entrent dans le/)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('textbox')).toHaveCount(0);
    await captureFull(page, '02-edition-enregistree.png');

    // ─── 03 — Re-compiler → écran de confirmation (écrasement de l'édition).
    await page.getByRole('button', { name: 'Re-compiler depuis les événements' }).click();
    await expect(page.getByText('Re-compiler le journal ?')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Re-compiler et écraser' })).toBeVisible();
    await captureFull(page, '03-confirm-recompile.png');
  });
});
