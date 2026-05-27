import { expect, test } from '@playwright/test';

import { waitForAppReady } from './fixtures';
import { takeStepScreenshot } from './helpers/screenshot';

/**
 * CHANTIER G nuit 3 — UAT visuel AoE templates.
 *
 * Spécifique uat-review : captures clés des 4 formes (sphère, cône,
 * ligne, cube) posées sur le prototype carte. Pas d'intégration sort →
 * AoE (différée, cf. PR description).
 */
test.describe('UAT AoE templates (CHANTIER G)', () => {
  test('contrôles présents au chargement', async ({ page }, testInfo) => {
    await page.goto('/map-proto');
    await waitForAppReady(page);

    for (const id of ['sphere', 'cone', 'line', 'cube']) {
      await expect(page.getByTestId(`aoe-shape-${id}`)).toBeVisible();
    }
    await expect(page.getByTestId('aoe-rotate-cw')).toBeVisible();

    await takeStepScreenshot(page, testInfo, '01-controles-aoe');
  });

  async function placeShape(
    page: import('@playwright/test').Page,
    shape: 'sphere' | 'cone' | 'line' | 'cube',
    posX: number,
    posY: number,
  ): Promise<void> {
    await page.getByTestId(`aoe-shape-${shape}`).click();
    const svg = page.getByTestId('map-proto-svg');
    await svg.scrollIntoViewIfNeeded();
    const box = await svg.boundingBox();
    if (!box) throw new Error('no svg bbox');
    await svg.click({
      position: {
        x: Math.round(box.width * posX),
        y: Math.round(box.height * posY),
      },
    });
  }

  test('poser une sphère, un cône, une ligne, un cube', async ({
    page,
  }, testInfo) => {
    await page.goto('/map-proto');
    await waitForAppReady(page);

    await placeShape(page, 'sphere', 0.5, 0.4);
    await placeShape(page, 'cone', 0.3, 0.6);
    await placeShape(page, 'line', 0.7, 0.5);
    await placeShape(page, 'cube', 0.5, 0.7);

    // Les AoE rendus ont un test-id `aoe-aoe-{shape}-…` (préfixe `aoe-`
    // ajouté par AoeLayer + id `aoe-{shape}-…` du store).
    const aoes = page.locator('[data-testid^="aoe-aoe-"]');
    await expect(aoes).toHaveCount(4);

    await takeStepScreenshot(page, testInfo, '02-4-formes-posees');
  });

  test('rotation de la dernière AoE via bouton', async ({ page }, testInfo) => {
    await page.goto('/map-proto');
    await waitForAppReady(page);

    await placeShape(page, 'cone', 0.5, 0.5);
    // 6 clics ↻ +15° = 90°.
    for (let i = 0; i < 6; i += 1) {
      await page.getByTestId('aoe-rotate-cw').click();
    }

    await takeStepScreenshot(page, testInfo, '03-cone-rotation-90');
  });

  test('cliquer sur une AoE la retire', async ({ page }, testInfo) => {
    await page.goto('/map-proto');
    await waitForAppReady(page);

    await placeShape(page, 'sphere', 0.5, 0.5);
    const sphereLocator = page.locator('[data-testid^="aoe-aoe-sphere-"]');
    await expect(sphereLocator).toHaveCount(1);

    // Désactiver le fog pour que la sphère ne soit pas obscurcie au clic.
    await page.getByRole('button', { name: /Fog activé/i }).click();
    await sphereLocator.first().click();
    await expect(sphereLocator).toHaveCount(0);

    await takeStepScreenshot(page, testInfo, '04-aoe-retire');
  });
});
