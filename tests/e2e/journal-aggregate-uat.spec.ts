import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { seedSession } from './seed-character';

/**
 * UAT JALON 25.4 (plan 25, step 8) — vue agrégée du journal de campagne +
 * export `.md`.
 *
 * On seede deux séances TERMINÉES avec leur `journalCompiled`. La page
 * `/campaigns/:cid/journal` les liste dans l'ordre chronologique ; on déplie une
 * séance (son récit s'affiche) et on déclenche l'export (Playwright capture
 * l'événement `download` → on vérifie le nom de fichier `.md`).
 *
 * Plan UAT (captures `uat-review/jalon-25/25.4/`) :
 *   01-journal-campagne.png   — liste des séances terminées + bouton Exporter
 *   02-seance-depliee.png     — une séance dépliée : son récit compilé
 *
 * Émulateur Firestore requis. Skip propre sans Java.
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review/jalon-25/25.4');

function ensureUatDir(): void {
  mkdirSync(UAT_DIR, { recursive: true });
}

async function captureFull(page: Page, filename: string): Promise<void> {
  ensureUatDir();
  await page.screenshot({ path: path.join(UAT_DIR, filename), fullPage: true });
}

test.describe('UAT 25.4 — vue agrégée du journal + export', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('liste des séances → déplier → exporter (.md) (émulateur requis)', async ({ page }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — captures 25.4 skippées.');

    // ─── Campagne (MJ).
    await page.goto('/campaigns');
    await waitForAppReady(page);
    await page.getByRole('button', { name: /Créer une campagne/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel(/Nom de la campagne/i).fill('La Couronne Brisée');
    await page.getByRole('button', { name: /^Créer$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });

    await expect(page).toHaveURL(/\/campaigns\/[^/]+$/);
    const cid = page.url().match(/\/campaigns\/([^/]+)$/)?.[1];
    expect(cid).toBeTruthy();

    // ─── Deux séances terminées avec leur journal compilé.
    await seedSession(cid!, {
      number: 1,
      title: 'Le départ',
      status: 'completed',
      journalCompiled: '## Exploration\n\n- La séance 1 — « Le départ » — commence.',
    });
    await seedSession(cid!, {
      number: 2,
      title: 'La crypte oubliée',
      status: 'completed',
      journalCompiled:
        '## Combat — Les gobelins\n\n- **Gobelin 1** subit 7 dégâts — PV : 7 → 0.\n\nIssue : victoire.',
    });

    // ─── Vue agrégée : accessible depuis le détail campagne (bouton « Journal »).
    await page.goto(`/campaigns/${cid}`);
    await waitForAppReady(page);
    await page.getByRole('button', { name: 'Journal' }).click();
    await expect(page).toHaveURL(/\/journal$/);

    // ─── 01 — Les deux séances listées (ordre chronologique) + Exporter.
    await expect(page.getByRole('heading', { name: 'Journal de campagne' })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText('Le départ')).toBeVisible();
    await expect(page.getByText('La crypte oubliée')).toBeVisible();
    const exportBtn = page.getByRole('button', { name: /Exporter/ });
    await expect(exportBtn).toBeVisible();
    await captureFull(page, '01-journal-campagne.png');

    // ─── 02 — Déplier « La crypte oubliée » → son récit compilé.
    await page.getByRole('button', { name: /La crypte oubliée/ }).click();
    await expect(
      page.getByRole('heading', { level: 2, name: /Combat — Les gobelins/ }),
    ).toBeVisible();
    await expect(page.getByText('Issue : victoire.')).toBeVisible();
    await captureFull(page, '02-seance-depliee.png');

    // ─── Export : Playwright capture le téléchargement → nom de fichier .md.
    const downloadPromise = page.waitForEvent('download');
    await exportBtn.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('la-couronne-brisee-journal.md');
  });
});
