import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * UAT — formulaire de MONSTRE dans l'éditeur de pack (directive Adrien
 * 2026-06-27 : bestiaire d'extension importable). Ouvre l'éditeur, déploie le
 * formulaire « Monstres », remplit un gobelin minimal et capture la galerie
 * `uat-review/monster-form/`. Sans émulateur, skip propre.
 */
const OUT = path.resolve(process.cwd(), 'uat-review', 'monster-form');

test.describe('UAT — formulaire monstre (éditeur de pack)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(!ok, 'Firestore emulator unreachable — skipping monster form UAT.');
    mkdirSync(OUT, { recursive: true });
  });

  test('ouvre la section Monstres et remplit un monstre', async ({ page }) => {
    await page.goto('/account/content/new');
    await waitForAppReady(page);
    await page.waitForFunction(
      () => {
        const w = window as Window & { __e2eAuthUid?: string | null };
        return typeof w.__e2eAuthUid === 'string' && w.__e2eAuthUid.length > 0;
      },
      null,
      { timeout: 10_000 },
    );

    await expect(page.getByTestId('pack-editor-monsters')).toBeVisible({
      timeout: 10_000,
    });

    await page.getByTestId('pack-editor-add-monster').click();
    await expect(page.getByTestId('monster-form')).toBeVisible();

    await page.getByTestId('monster-form-id').fill('gobelin-eclaireur');
    await page.getByTestId('monster-form-name-fr').fill('Gobelin éclaireur');
    await page.getByTestId('monster-form-type').fill('humanoïde');
    await page
      .getByTestId('monster-form-alignment-fr')
      .fill('Neutre mauvais');
    await page.getByTestId('monster-form-hp-formula').fill('2d6');

    // 01 — pleine page : le bloc de stats complet est rendu et lisible.
    await page.screenshot({
      path: path.join(OUT, '01-formulaire-monstre.png'),
      fullPage: true,
    });
  });
});
