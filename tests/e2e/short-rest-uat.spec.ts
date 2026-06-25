import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { fighterL3, seedCharacter } from './seed-character';

/**
 * UAT — bouton « Repos court » (mode Combat).
 *
 * SRD 5.2.1 : un repos court réinitialise les réserves `restoresOn: 'short'`
 * (Second souffle, Fougue pour le Guerrier) sans rendre de PV automatiquement.
 * Le scénario : Guerrier L3 → dépenser le Second souffle (carte Réserves) →
 * Repos court (confirmation deux temps) → Second souffle revient à 1 / 1.
 *
 * Captures dans `uat-review/short-rest/` (gitignored), pleine page (la fiche
 * scrolle au niveau du document, pas d'overflow interne sur le chemin Combat).
 * Pré-requis : émulateur Firebase actif.
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review/short-rest');

async function captureFull(
  page: import('@playwright/test').Page,
  filename: string,
): Promise<void> {
  mkdirSync(UAT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(UAT_DIR, filename), fullPage: true });
}

test.describe('UAT — Repos court (mode Combat)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Émulateur Firestore non joignable sur 127.0.0.1:8080 — `pnpm e2e:emulators` (Java/JRE 11+).',
    );
  });

  test('Guerrier L3 → dépenser Second souffle, Repos court le recharge', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, fighterL3);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(fighterL3.name).first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole('tab', { name: /^Combat$/i }).click();
    const panel = page.locator('#sheet-mode-panel-combat');
    await expect(panel).toBeVisible();

    // Bouton Repos court présent, distinct du Repos long.
    await expect(panel.getByRole('button', { name: 'Repos court' })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Repos long' })).toBeVisible();
    await captureFull(page, '01-combat-repos-court-et-long.png');

    // Dépenser la Fougue (réserve short-rest, 1 / 1) → 0 / 1.
    const fougueRow = panel.locator('li', { hasText: 'Fougue' });
    await expect(fougueRow.getByText('1 / 1')).toBeVisible();
    await fougueRow.getByRole('button', { name: 'Dépenser un point de Fougue' }).click();
    await expect(fougueRow.getByText('0 / 1')).toBeVisible();
    await captureFull(page, '02-fougue-depensee.png');

    // Repos court : confirmation deux temps.
    await panel.getByRole('button', { name: 'Repos court' }).click();
    await captureFull(page, '03-repos-court-confirmation.png');
    await panel.getByRole('button', { name: 'Confirmer le repos court ?' }).click();

    // Fougue rechargée à 1 / 1 par le repos court.
    await expect(fougueRow.getByText('1 / 1')).toBeVisible();
    await captureFull(page, '04-repos-court-applique.png');
  });
});
