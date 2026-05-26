import { expect, test } from '@playwright/test';

import { waitForAppReady } from './fixtures';
import { takeStepScreenshot } from './helpers/screenshot';

/**
 * CHANTIER F nuit 3 — UAT visuel lumière dynamique.
 *
 * Spécifique uat-review : captures clés du rendu lumière (torches
 * statiques, torches attachées aux tokens, interaction avec le fog).
 */
test.describe('UAT Lumière dynamique (CHANTIER F)', () => {
  test('contrôles présents au chargement', async ({ page }, testInfo) => {
    await page.goto('/map-proto');
    await waitForAppReady(page);

    await expect(
      page.getByRole('button', { name: /Lumière activée/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Placer torche/i }),
    ).toBeVisible();
    await expect(page.getByTestId('toggle-torch-t1')).toBeVisible();
    await expect(page.getByTestId('toggle-torch-t2')).toBeVisible();
    // Pas de bouton torche pour le PNJ (t3).
    await expect(page.getByTestId('toggle-torch-t3')).toHaveCount(0);

    await takeStepScreenshot(page, testInfo, '01-controles-lumiere-presents');
  });

  test('torche attachée au PJ-1 → halo chaud visible', async ({
    page,
  }, testInfo) => {
    await page.goto('/map-proto');
    await waitForAppReady(page);

    await page.getByTestId('toggle-torch-t1').click();
    // La couche lumière est rendue.
    await expect(page.getByTestId('light-layer')).toBeVisible();

    await takeStepScreenshot(page, testInfo, '02-torche-pj1-attachee');
  });

  test('placer torche statique au clic', async ({ page }, testInfo) => {
    await page.goto('/map-proto');
    await waitForAppReady(page);

    await page.getByRole('button', { name: /Placer torche/i }).click();

    // Scroll explicite jusqu'au SVG (page mobile, toolbar prend de la
    // place), puis clic en coordonnées locales du SVG. On vise le centre
    // pour éviter de tomber sur un token existant ou hors zone.
    const svg = page.getByTestId('map-proto-svg');
    await svg.scrollIntoViewIfNeeded();
    const box = await svg.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    const localX = Math.round(box.width * 0.6);
    const localY = Math.round(box.height * 0.55);
    await svg.click({ position: { x: localX, y: localY } });

    const sources = page.locator('[data-testid^="light-source-"]');
    await expect(sources).toHaveCount(1);

    await takeStepScreenshot(page, testInfo, '03-torche-statique-placee');
  });

  test('toggle lumière désactive le rendu', async ({ page }, testInfo) => {
    await page.goto('/map-proto');
    await waitForAppReady(page);

    // Attache une torche pour avoir au moins une source.
    await page.getByTestId('toggle-torch-t1').click();
    // Désactive la couche lumière.
    await page.getByRole('button', { name: /Lumière activée/i }).click();
    await expect(
      page.getByRole('button', { name: /Lumière désactivée/i }),
    ).toBeVisible();
    // light-layer absent quand toggle off.
    await expect(page.getByTestId('light-layer')).toHaveCount(0);

    await takeStepScreenshot(page, testInfo, '04-lumiere-desactivee');
  });
});
