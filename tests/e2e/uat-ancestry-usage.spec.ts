import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { dragonbornL1Red, goliathL1Storm, seedCharacter } from './seed-character';

/**
 * Capture UAT dédiée — compteurs d'utilisation des aptitudes de combat
 * d'ascendance (Souffle draconique + Ascendance gigante).
 *
 * NON une gate (couvert par les tests unitaires + `ancestry-dragonborn` /
 * `ancestry-goliath`). Produit la galerie `uat-review/ancestry-usage/` :
 * Adrien valide que le compteur « − N / M + » est lisible et bien intégré
 * dans chaque carte, et qu'il décrémente.
 *
 * Sans émulateur, il se skip proprement.
 */
const OUT = path.resolve(process.cwd(), 'uat-review', 'ancestry-usage');

test.describe('UAT — compteurs aptitudes d\'ascendance', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(!ok, 'Firestore emulator unreachable — skipping UAT capture.');
    mkdirSync(OUT, { recursive: true });
  });

  test('Souffle draconique — compteur avant/après dépense', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, dragonbornL1Red);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(dragonbornL1Red.name).first()).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole('tab', { name: /^Combat$/i }).click();

    const card = page.locator('[aria-label*="Souffle draconique"]').first();
    await expect(card).toBeVisible();
    await expect(card.getByTestId('usage-counter-value')).toContainText('2 / 2');

    // 01 — carte Souffle avec compteur plein « 2 / 2 ».
    await card.screenshot({ path: path.join(OUT, '01-souffle-compteur-plein.png') });

    await card.getByLabel(/Dépenser une utilisation de Souffle draconique/).click();
    await expect(card.getByTestId('usage-counter-value')).toContainText('1 / 2');

    // 02 — carte Souffle après une dépense « 1 / 2 ».
    await card.screenshot({ path: path.join(OUT, '02-souffle-apres-depense.png') });
  });

  test('Ascendance gigante — compteur', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, goliathL1Storm);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(goliathL1Storm.name).first()).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole('tab', { name: /^Combat$/i }).click();

    const card = page.locator('[aria-label*="Ascendance gigante"]').first();
    await expect(card).toBeVisible();
    await expect(card.getByTestId('usage-counter-value')).toContainText('2 / 2');

    // 03 — carte Ascendance gigante avec compteur.
    await card.screenshot({ path: path.join(OUT, '03-ascendance-gigante-compteur.png') });
  });
});
