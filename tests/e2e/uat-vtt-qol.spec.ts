import { expect, test } from '@playwright/test';

import { waitForAppReady } from './fixtures';
import { takeStepScreenshot } from './helpers/screenshot';

/**
 * CHANTIER H nuit 3 — UAT visuel VTT QoL prototype.
 *
 * 4 features livrées : règle de distance, aimant grille, initiative
 * tracker, panneau de contrôle. Toutes labellisées PROTOTYPE (pending
 * Adrien arbitration sur quoi garder / affiner).
 */
test.describe('UAT VTT QoL prototype (CHANTIER H)', () => {
  test('contrôles VTT présents au chargement', async ({ page }, testInfo) => {
    await page.goto('/map-proto');
    await waitForAppReady(page);

    await expect(page.getByTestId('toggle-ruler')).toBeVisible();
    await expect(page.getByTestId('toggle-grid-snap')).toBeVisible();
    await expect(page.getByTestId('toggle-initiative-panel')).toBeVisible();

    await takeStepScreenshot(page, testInfo, '01-controles-vtt');
  });

  test('règle de distance : 2 segments + total ft', async ({ page }, testInfo) => {
    await page.goto('/map-proto');
    await waitForAppReady(page);

    await page.getByTestId('toggle-ruler').click();

    const svg = page.getByTestId('map-proto-svg');
    await svg.scrollIntoViewIfNeeded();
    const box = await svg.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // 3 clics = 2 segments.
    await svg.click({
      position: { x: Math.round(box.width * 0.2), y: Math.round(box.height * 0.3) },
    });
    await svg.click({
      position: { x: Math.round(box.width * 0.6), y: Math.round(box.height * 0.3) },
    });
    await svg.click({
      position: { x: Math.round(box.width * 0.6), y: Math.round(box.height * 0.7) },
    });

    await expect(page.getByTestId('ruler-layer')).toBeVisible();
    // Le bouton règle inclut la distance entre parenthèses dès qu'on a
    // au moins un ancrage + cursor — vérifier qu'un nombre y apparaît.
    await expect(page.getByTestId('toggle-ruler')).toContainText(/ft/);

    await takeStepScreenshot(page, testInfo, '02-regle-2-segments');
  });

  test('initiative panel : seed depuis tokens + tour suivant', async ({
    page,
  }, testInfo) => {
    await page.goto('/map-proto');
    await waitForAppReady(page);

    await page.getByTestId('toggle-initiative-panel').click();
    await expect(page.getByTestId('initiative-panel')).toBeVisible();

    await page.getByTestId('initiative-seed').click();
    // 3 tokens initiaux → 3 entrées.
    await expect(page.getByTestId('initiative-entry-t1')).toBeVisible();
    await expect(page.getByTestId('initiative-entry-t2')).toBeVisible();
    await expect(page.getByTestId('initiative-entry-t3')).toBeVisible();

    // Tour suivant 2× → la 2e entrée est active.
    await page.getByTestId('initiative-next-turn').click();
    await page.getByTestId('initiative-next-turn').click();

    await takeStepScreenshot(page, testInfo, '03-initiative-active');
  });

  test('aimant grille : toggle visible et fonctionnel', async ({
    page,
  }, testInfo) => {
    await page.goto('/map-proto');
    await waitForAppReady(page);

    const toggle = page.getByTestId('toggle-grid-snap');
    await expect(toggle).toContainText(/off/);
    await toggle.click();
    await expect(toggle).toContainText(/on/);

    await takeStepScreenshot(page, testInfo, '04-aimant-grille-on');
  });
});
