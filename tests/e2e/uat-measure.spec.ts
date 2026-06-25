import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * Capture UAT dédiée — mesure de distance (règle) sur la carte live MJ.
 *
 * NON une gate de régression (le wiring de la règle est prouvé par les tests
 * unitaires `ruler-state` + `map-live-screen` et le parcours e2e
 * `map-phase2-uat`). Ce spec ne sert qu'à produire la galerie `uat-review/`
 * qu'Adrien valide à l'œil : barre Mesure lisible, tracé doré pointillé +
 * étiquette en pieds correcte, ressenti général de l'outil.
 *
 * Sans émulateur, il se skip proprement.
 */
const OUT = path.resolve(process.cwd(), 'uat-review');

test.describe('UAT — mesure de distance (carte live)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(!ok, 'Firestore emulator unreachable — skipping UAT capture.');
    mkdirSync(OUT, { recursive: true });
  });

  test('capture barre Mesure + règle tracée + étiquette en pieds', async ({ page }) => {
    const cid = `uat-measure-${Date.now().toString(36)}`;
    const mapSlug = `carte-${Date.now().toString(36)}`;
    const mapName = 'Salle du Trône (UAT)';

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

    // Active la mesure → barre Mesure : ON + total à 0 ft + consigne.
    await page.getByTestId('map-live-toggle-measure').click();
    await expect(page.getByTestId('map-live-toggle-measure')).toContainText('ON');
    await expect(page.getByTestId('map-live-ruler-total')).toContainText('0 ft');

    // 01 — barre d'outils avec le mode mesure actif (pleine page).
    await page.screenshot({
      path: path.join(OUT, '01-barre-mesure-on.png'),
      fullPage: true,
    });

    // Trace une règle à 2 segments sur le fond SVG : clic, clic, déplacement.
    const svg = page.getByTestId('map-live-svg');
    await svg.scrollIntoViewIfNeeded();
    const sBox = await svg.boundingBox();
    expect(sBox).not.toBeNull();
    if (!sBox) return;
    const ax = sBox.x + sBox.width * 0.25;
    const ay = sBox.y + sBox.height * 0.6;
    const bx = sBox.x + sBox.width * 0.5;
    const by = sBox.y + sBox.height * 0.35;
    const cx = sBox.x + sBox.width * 0.72;
    const cy = sBox.y + sBox.height * 0.55;
    // Ancre 1.
    await page.mouse.move(ax, ay);
    await page.mouse.down();
    await page.mouse.up();
    // Ancre 2.
    await page.mouse.move(bx, by, { steps: 6 });
    await page.mouse.down();
    await page.mouse.up();
    // Curseur vivant vers le 3ᵉ point.
    await page.mouse.move(cx, cy, { steps: 8 });

    await expect(page.getByTestId('map-live-ruler-label')).toBeVisible();
    await expect(page.getByTestId('map-live-ruler-total')).toContainText(/\b[1-9]\d* ft\b/, {
      timeout: 5000,
    });

    // 02 — règle tracée sur la carte (pleine page).
    await page.screenshot({
      path: path.join(OUT, '02-regle-tracee-pleine-page.png'),
      fullPage: true,
    });

    // 03 — zoom sur le tracé pour juger la lisibilité de l'étiquette en pieds.
    // viewBox 1000x700 projeté sous xMidYMid meet → on cadre autour du milieu
    // du tracé (ancre 2, point haut).
    const midPx = (ax + bx) / 2;
    const midPy = (ay + by) / 2;
    const half = 180;
    await page.screenshot({
      path: path.join(OUT, '03-regle-zoom.png'),
      clip: {
        x: Math.max(0, midPx - half),
        y: Math.max(0, midPy - half),
        width: half * 2,
        height: half * 2,
      },
    });
  });
});
