import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * Capture UAT dédiée — rendu des templates AoE sur la carte live MJ.
 *
 * NON une gate de régression (le rendu est prouvé par `aoe-state` +
 * `map-scene` unitaires et le parcours `map-phase2-uat`). Ce spec produit la
 * galerie `uat-review/` qu'Adrien valide à l'œil : la sphère AoE posée par le
 * MJ est bien DESSINÉE sur la carte (avant ce fix, le bouton incrémentait le
 * compteur sans rien afficher), à la bonne taille (20 ft → 280 px).
 *
 * Sans émulateur, il se skip proprement.
 */
const OUT = path.resolve(process.cwd(), 'uat-review', 'aoe');

test.describe('UAT — rendu AoE (carte live)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(!ok, 'Firestore emulator unreachable — skipping UAT capture.');
    mkdirSync(OUT, { recursive: true });
  });

  test('capture sphère AoE dessinée sur la carte', async ({ page }) => {
    const cid = `uat-aoe-${Date.now().toString(36)}`;
    const mapSlug = `carte-${Date.now().toString(36)}`;
    const mapName = 'Crypte Ardente (UAT)';

    await page.goto(`/map-proto/cloud/${cid}`);
    await waitForAppReady(page);
    await page.waitForFunction(
      () => {
        const w = window as Window & { __e2eAuthUid?: string | null };
        return typeof w.__e2eAuthUid === 'string' && w.__e2eAuthUid.length > 0;
      },
      null,
      { timeout: 10_000 },
    );

    await expect(page.getByTestId('maps-cloud-create-submit')).toBeEnabled({
      timeout: 10_000,
    });
    await page.getByTestId('maps-cloud-create-id').fill(mapSlug);
    await page.getByTestId('maps-cloud-create-name').fill(mapName);
    await page.getByTestId('maps-cloud-create-submit').click();
    await expect(page.getByTestId(`maps-cloud-card-${mapSlug}`)).toBeVisible({
      timeout: 5000,
    });

    await page.goto(`/map-proto/cloud/${cid}/maps/${mapSlug}`);
    await waitForAppReady(page);
    await expect(page.getByRole('heading', { name: mapName })).toBeVisible({
      timeout: 10_000,
    });

    // Voile OFF pour que la sphère ressorte nettement sur le fond.
    await page.getByTestId('map-live-toggle-fog').click();
    await expect(page.getByTestId('map-live-toggle-fog')).toContainText('OFF');

    // Pose une sphère AoE au centre → elle doit être dessinée.
    await page.getByTestId('map-live-add-sphere-aoe').click();
    await expect(page.getByTestId('map-live-aoe-count')).toContainText('(1)', {
      timeout: 5000,
    });
    const aoeLayer = page.locator('[data-testid="aoe-layer"]');
    await expect(aoeLayer).toBeVisible({ timeout: 5000 });
    const circle = aoeLayer.locator('circle').first();
    await expect(circle).toBeVisible();

    // 01 — la carte avec la sphère rose tracée (pleine page).
    await page.screenshot({
      path: path.join(OUT, '01-aoe-sphere-rendu.png'),
      fullPage: true,
    });

    // 02 — zoom sur la sphère pour juger taille + lisibilité du fill/stroke.
    const svgBox = await page.getByTestId('map-live-svg').boundingBox();
    if (svgBox) {
      const cx = Number(await circle.getAttribute('cx'));
      const cy = Number(await circle.getAttribute('cy'));
      const r = Number(await circle.getAttribute('r'));
      const scale = Math.min(svgBox.width / 1000, svgBox.height / 700);
      const offX = svgBox.x + (svgBox.width - 1000 * scale) / 2;
      const offY = svgBox.y + (svgBox.height - 700 * scale) / 2;
      const px = offX + cx * scale;
      const py = offY + cy * scale;
      const half = Math.max(120, r * scale + 40);
      await page.screenshot({
        path: path.join(OUT, '02-aoe-sphere-zoom.png'),
        clip: {
          x: Math.max(0, px - half),
          y: Math.max(0, py - half),
          width: half * 2,
          height: half * 2,
        },
      });
    }
  });
});
