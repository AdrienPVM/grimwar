import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * Capture UAT dédiée — aimantage des jetons sur la grille (carte live MJ).
 *
 * NON une gate de régression (le wiring du snap est prouvé par les tests
 * unitaires `grid-snap` + `map-live-screen` et le parcours e2e
 * `map-phase2-uat`). Ce spec ne sert qu'à produire la galerie `uat-review/`
 * pleine page qu'Adrien valide à l'œil : présence et lisibilité des nouveaux
 * contrôles Grille/Aimant, et jeton effectivement aligné sur la grille.
 *
 * Sans émulateur, il se skip proprement.
 */
const OUT = path.resolve(process.cwd(), 'uat-review');

test.describe('UAT — aimantage grille (carte live)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(!ok, 'Firestore emulator unreachable — skipping UAT capture.');
    mkdirSync(OUT, { recursive: true });
  });

  test('capture barre Grille/Aimant + jeton aimanté', async ({ page }) => {
    const cid = `uat-snap-${Date.now().toString(36)}`;
    const mapSlug = `carte-${Date.now().toString(36)}`;
    const mapName = 'Crypte du Sépulcre (UAT)';

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

    // 01 — barre d'outils avec les chips Grille : ON / Aimant : ON.
    await expect(page.getByTestId('map-live-toggle-grid')).toContainText('ON');
    await expect(page.getByTestId('map-live-toggle-snap')).toContainText('ON');
    await page.screenshot({
      path: path.join(OUT, '01-barre-outils-grille-aimant.png'),
      fullPage: true,
    });

    // Pose un jeton puis le drague hors-grille → il s'aligne au centre de case.
    await page.getByTestId('map-live-add-pj').click();
    const tokenG = page.locator('[data-testid^="map-live-token-"]').first();
    await expect(tokenG).toBeVisible();
    const circle = tokenG.locator('circle');
    await tokenG.scrollIntoViewIfNeeded();
    const tBox = await tokenG.boundingBox();
    expect(tBox).not.toBeNull();
    if (!tBox) return;
    const sx = tBox.x + tBox.width / 2;
    const sy = tBox.y + tBox.height / 2;
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    await page.mouse.move(sx + 8, sy + 8);
    await page.mouse.move(sx + 90, sy - 64, { steps: 12 });
    await page.mouse.up();

    // Attend la position aimantée (centre de case ≡ 35 mod 70).
    await expect
      .poll(
        async () => {
          const cx = await circle.getAttribute('cx');
          return cx === null ? null : Math.round(Number(cx)) % 70;
        },
        { timeout: 5000 },
      )
      .toBe(35);

    // 02 — jeton posé sur le centre de sa case (pleine page).
    await page.screenshot({
      path: path.join(OUT, '02-jeton-aimante-pleine-page.png'),
      fullPage: true,
    });

    // 03 — zoom sur la zone du jeton (le snap est subtil en pleine page).
    const svgBox = await page.getByTestId('map-live-svg').boundingBox();
    if (svgBox) {
      const cxAttr = Number(await circle.getAttribute('cx'));
      const cyAttr = Number(await circle.getAttribute('cy'));
      // viewBox 1000x700 projeté dans svgBox sous xMidYMid meet — on cadre
      // large autour du jeton pour montrer l'alignement à la grille.
      const scale = Math.min(svgBox.width / 1000, svgBox.height / 700);
      const offX = svgBox.x + (svgBox.width - 1000 * scale) / 2;
      const offY = svgBox.y + (svgBox.height - 700 * scale) / 2;
      const px = offX + cxAttr * scale;
      const py = offY + cyAttr * scale;
      const half = 150;
      await page.screenshot({
        path: path.join(OUT, '03-jeton-aimante-zoom.png'),
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
