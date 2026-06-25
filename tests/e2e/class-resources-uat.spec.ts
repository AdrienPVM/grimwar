import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { barbarianL3, fighterL3, seedCharacter } from './seed-character';

/**
 * UAT — carte « Réserves de classe » (mode Combat).
 *
 * Surface les réserves consommables dérivées de `classResourceProgression` :
 *  - Barbare L3 → Rage 3/3 (repos long), bonus de dégâts passif EXCLU ;
 *  - Guerrier L3 → Second souffle + Fougue (repos court).
 *
 * Captures écrites dans `uat-review/class-resources/` (gitignored), pleine
 * page (la fiche scrolle au niveau du document, pas d'overflow interne sur le
 * chemin Combat). Pré-requis : émulateur Firebase actif.
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review/class-resources');

async function captureFull(
  page: import('@playwright/test').Page,
  filename: string,
): Promise<void> {
  mkdirSync(UAT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(UAT_DIR, filename), fullPage: true });
}

test.describe('UAT — Réserves de classe (mode Combat)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Émulateur Firestore non joignable sur 127.0.0.1:8080 — `pnpm e2e:emulators` (Java/JRE 11+).',
    );
  });

  test('Barbare L3 → carte Réserves : Rage 3/3, repos long, dépense/récupère', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, barbarianL3);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(barbarianL3.name).first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole('tab', { name: /^Combat$/i }).click();
    const panel = page.locator('#sheet-mode-panel-combat');
    await expect(panel).toBeVisible();

    // Carte présente avec le libellé FR officiel.
    await expect(panel.getByText('Réserves de classe')).toBeVisible();
    await expect(panel.getByText('Rage', { exact: true })).toBeVisible();
    // Scoper à la ligne « Rage » : le badge « Repos long » + le ratio 3 / 3 du
    // dé de vie (3d12) existent aussi ailleurs (bouton Repos long, carte Dés
    // de vie) — on cible donc le <li> de la Rage.
    const rageRow = panel.locator('li', { hasText: 'Rage' });
    await expect(rageRow.getByText('Repos long', { exact: true })).toBeVisible();
    await captureFull(page, '01-barbare-rage-pleine.png');
    // Avant dépense : 3 / 3 (réserve pleine par défaut).
    await expect(rageRow.getByText('3 / 3')).toBeVisible();
    // Dépense une Rage → 2 / 3 après round-trip Firestore.
    await rageRow.getByRole('button', { name: 'Dépenser un point de Rage' }).click();
    await expect(rageRow.getByText('2 / 3')).toBeVisible();
    await captureFull(page, '02-barbare-rage-depensee.png');

    // ── Repos long : confirmation deux temps → Rage revient à 3 / 3 ─────────
    await panel.getByRole('button', { name: 'Repos long' }).click();
    await captureFull(page, '03-repos-long-confirmation.png');
    await panel.getByRole('button', { name: 'Confirmer le repos long ?' }).click();
    await expect(rageRow.getByText('3 / 3')).toBeVisible();
    await captureFull(page, '04-repos-long-applique.png');
  });

  test('Guerrier L3 → Réserves : Second souffle + Fougue (repos court)', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, fighterL3);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(fighterL3.name).first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole('tab', { name: /^Combat$/i }).click();
    const panel = page.locator('#sheet-mode-panel-combat');
    await expect(panel).toBeVisible();

    await expect(panel.getByText('Second souffle', { exact: true })).toBeVisible();
    await expect(panel.getByText('Fougue', { exact: true })).toBeVisible();
    await captureFull(page, '03-guerrier-second-souffle-fougue.png');
  });
});
