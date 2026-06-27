import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * UAT + régression — la lumière NE TRAVERSE PAS les murs (exigence Adrien :
 * « attention à ce que les lumières ne passent pas au travers des murs dans les
 * maps VTT importées, bien prendre en compte les portes, fenêtres, murets,
 * murs »).
 *
 * Avant : `LightLayer` traçait un `<circle>` plein → la teinte débordait à
 * travers les murs. Désormais chaque source est DÉCOUPÉE par son polygone de
 * visibilité (raycasting, le même moteur que la LOS des tokens). Le parseur
 * `.dd2vtt` agrège déjà murs + mobilier (`objects_line_of_sight`) + portes/
 * fenêtres FERMÉES dans `walls` → tous occultent la lumière.
 *
 * Ce spec importe un donjon synthétique : une source juste à gauche d'un grand
 * mur vertical, portée volontairement large (déborderait loin derrière le mur
 * sans occlusion). On asserte que le `<circle>` de lumière re-émis par le
 * listener `useMap` porte un `clip-path` (= il est borné par la ligne de vue),
 * et on capture la galerie `uat-review/light-occlusion/`. Sans émulateur, skip.
 */
const OUT = path.resolve(process.cwd(), 'uat-review', 'light-occlusion');

/** Donjon synthétique : source à gauche d'un mur vertical pleine hauteur. */
function syntheticDd2vtt(): string {
  return JSON.stringify({
    format: 0.3,
    resolution: {
      map_origin: { x: 0, y: 0 },
      map_size: { x: 20, y: 14 }, // 50 px/case dans le viewBox 1000×700
      pixels_per_grid: 50,
    },
    line_of_sight: [
      // Grand mur vertical pleine hauteur à x=10 (viewBox x=500).
      [
        { x: 10, y: 0 },
        { x: 10, y: 14 },
      ],
    ],
    // Une porte FERMÉE plus à droite : doit aussi bloquer la lumière.
    portals: [
      {
        closed: true,
        bounds: [
          { x: 15, y: 0 },
          { x: 15, y: 14 },
        ],
      },
    ],
    // Source à gauche du mur (case 7,7 → viewBox 350,350), grande portée :
    // sans occlusion elle déborderait jusqu'à x≈850, bien au-delà du mur x=500.
    lights: [{ position: { x: 7, y: 7 }, range: 16, color: 'ffcc66' }],
    // Fond ardoise uni — la zone éclairée tranche nettement.
    image:
      'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGUlEQVR4nGPwcov4TwlmGDVg1IBRA4aLAQBddOcQFmErwgAAAABJRU5ErkJggg==',
  });
}

test.describe('UAT — la lumière ne traverse pas les murs (carte .dd2vtt)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(!ok, 'Firestore emulator unreachable — skipping light-occlusion UAT.');
    mkdirSync(OUT, { recursive: true });
  });

  test('une source importée est découpée par les murs (clip de visibilité)', async ({
    page,
  }) => {
    const stamp = Date.now().toString(36);
    const cid = `lightocc-${stamp}`;
    const slug = `donjon-${stamp}`;

    await page.goto(`/map-proto/cloud/${cid}/import`);
    await waitForAppReady(page);
    await page.waitForFunction(
      () => {
        const w = window as Window & { __e2eAuthUid?: string | null };
        return typeof w.__e2eAuthUid === 'string' && w.__e2eAuthUid.length > 0;
      },
      null,
      { timeout: 10_000 },
    );
    await expect(
      page.getByRole('heading', { name: 'Importer une carte' }),
    ).toBeVisible();

    await page.getByTestId('map-import-file').setInputFiles({
      name: `${slug}.dd2vtt`,
      mimeType: 'application/json',
      buffer: Buffer.from(syntheticDd2vtt()),
    });
    // 1 line_of_sight + 1 porte fermée = 2 murs ; 1 lumière.
    await expect(page.getByTestId('map-import-stat-walls')).toContainText('2');
    await expect(page.getByTestId('map-import-stat-lights')).toContainText('1');

    await expect(page.getByTestId('map-import-submit')).toBeEnabled({
      timeout: 10_000,
    });
    await page.getByTestId('map-import-submit').click();
    await expect(page).toHaveURL(
      new RegExp(`/map-proto/cloud/${cid}/maps/${slug}$`),
      { timeout: 10_000 },
    );
    await waitForAppReady(page);

    // L'import a posé lightingEnabled:true (lights>0) + losEnabled:true.
    await expect(page.getByTestId('map-live-walls-count')).toContainText('(2)', {
      timeout: 10_000,
    });

    // Le cercle de lumière re-émis par le listener porte un clip-path : il est
    // borné par la ligne de vue (occlusion par les murs), pas un cercle plein.
    const lightCircle = page.locator('[data-testid^="light-source-"]').first();
    await expect(lightCircle).toBeVisible({ timeout: 5000 });
    await expect
      .poll(async () => lightCircle.getAttribute('clip-path'), { timeout: 5000 })
      .toMatch(/^url\(#light-clip-/);

    // Le clipPath de visibilité existe dans le DOM.
    await expect(
      page.locator('clipPath[data-testid^="light-clip-"]').first(),
    ).toBeAttached();

    // 01 — pleine page : la teinte chaude s'arrête au mur (ne déborde pas droite).
    await page.screenshot({
      path: path.join(OUT, '01-lumiere-coupee-au-mur.png'),
      fullPage: true,
    });
  });
});
