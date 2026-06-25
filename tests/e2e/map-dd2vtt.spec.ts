import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { takeStepScreenshot } from './helpers/screenshot';

/**
 * Spec e2e — import `.dd2vtt` (plan 29) + ligne de vue (plan 31) + vue
 * présentation/TV (plan 33), contre l'émulateur Firestore.
 *
 * Parcours MJ :
 *   1. `/map-proto/cloud/:cid/import` → uploader un `.dd2vtt` synthétique.
 *   2. L'aperçu affiche dimensions / murs / lumières / image + le canvas de
 *      prévisualisation (murs en or superposés).
 *   3. « Importer » → crée la carte (murs/lumières/grille persistés, image en
 *      local) → redirige vers la vue live.
 *   4. La vue live affiche le compteur de murs > 0 + les toggles voile / LOS.
 *   5. Activer le voile → le veil de fog se rend (atténué côté MJ).
 *   6. Ouvrir la vue présentation/TV → plein écran, lecture seule.
 *
 * Génère aussi la galerie UAT pleine page dans `uat-review/plan-svg-map/`.
 *
 * Sans émulateur, la spec se skip proprement (message visible).
 */

/** Dungeon synthétique : pièce rectangulaire + cloison + pilier + 2 lumières + porte. */
function syntheticDd2vtt(): string {
  return JSON.stringify({
    format: 0.3,
    resolution: {
      map_origin: { x: 0, y: 0 },
      map_size: { x: 20, y: 14 }, // sx = sy = 50 px/case dans le viewBox
      pixels_per_grid: 50,
    },
    line_of_sight: [
      // Mur extérieur de la salle (polyligne fermée).
      [
        { x: 2, y: 2 },
        { x: 18, y: 2 },
        { x: 18, y: 12 },
        { x: 2, y: 12 },
        { x: 2, y: 2 },
      ],
      // Cloison intérieure verticale.
      [
        { x: 10, y: 2 },
        { x: 10, y: 8 },
      ],
      // Pilier carré au centre-gauche.
      [
        { x: 6, y: 6 },
        { x: 7, y: 6 },
        { x: 7, y: 7 },
        { x: 6, y: 7 },
        { x: 6, y: 6 },
      ],
    ],
    portals: [
      {
        closed: true,
        bounds: [
          { x: 10, y: 8 },
          { x: 10, y: 10 },
        ],
      },
    ],
    lights: [
      { position: { x: 5, y: 5 }, range: 4, color: 'ffcc66' },
      { position: { x: 15, y: 9 }, range: 3, color: '66ccff' },
    ],
    // PNG 16×16 ardoise opaque (#4a4658) — fond uni : rend la révélation de
    // ligne de vue VISIBLE (le trou éclairé tranche sur le voile sombre), et
    // exerce le chemin de persistance image locale (Dexie).
    image:
      'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGUlEQVR4nGPwcov4TwlmGDVg1IBRA4aLAQBddOcQFmErwgAAAABJRU5ErkJggg==',
  });
}

/** Écrit une capture pleine page dans la galerie UAT (gitignored). */
async function uatShot(page: Page, name: string): Promise<void> {
  const dir = path.join('uat-review', 'plan-svg-map');
  mkdirSync(dir, { recursive: true });
  await page.screenshot({
    path: path.join(dir, `${name}.png`),
    fullPage: true,
    animations: 'disabled',
  });
}

test.describe('Mode carte — import .dd2vtt + LOS + vue présentation', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+).',
    );
  });

  test('importe un .dd2vtt, vérifie murs/LOS, ouvre la vue présentation', async ({
    page,
  }, testInfo) => {
    const stamp = Date.now().toString(36);
    const cid = `dd2vtt-uat-${stamp}`;
    const slug = `donjon-${stamp}`;

    // 1. Écran d'import.
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

    // 2. Upload du fichier synthétique → aperçu.
    await page.getByTestId('map-import-file').setInputFiles({
      name: `${slug}.dd2vtt`,
      mimeType: 'application/json',
      buffer: Buffer.from(syntheticDd2vtt()),
    });

    // Stats de parse — vérité du contenu : valeurs exactes attendues.
    await expect(page.getByTestId('map-import-stat-size')).toContainText(
      '20 × 14 cases',
    );
    // 3 polylignes line_of_sight + 1 porte fermée = 4 murs.
    await expect(page.getByTestId('map-import-stat-walls')).toContainText('4');
    await expect(page.getByTestId('map-import-stat-lights')).toContainText('2');
    await expect(page.getByTestId('map-import-stat-image')).toContainText(
      'Incluse',
    );
    await expect(page.getByTestId('map-import-preview')).toBeVisible();
    await expect(page.getByTestId('map-import-walls')).toBeVisible();

    await takeStepScreenshot(page, testInfo, 'import-apercu');
    await uatShot(page, '01-import-apercu');

    // 3. Importer → vue live.
    await expect(page.getByTestId('map-import-submit')).toBeEnabled({
      timeout: 10_000,
    });
    await page.getByTestId('map-import-submit').click();

    await expect(page).toHaveURL(
      new RegExp(`/map-proto/cloud/${cid}/maps/${slug}$`),
      { timeout: 10_000 },
    );
    await waitForAppReady(page);

    // 4. Vue live : murs importés + toggles.
    await expect(page.getByTestId('map-live-walls-count')).toContainText('(4)', {
      timeout: 10_000,
    });
    // Import pose losEnabled:true et fogEnabled:false.
    await expect(page.getByTestId('map-live-toggle-los')).toContainText('ON');
    await expect(page.getByTestId('map-live-toggle-fog')).toContainText('OFF');
    await expect(page.getByTestId('map-scene-walls')).toBeVisible();

    await takeStepScreenshot(page, testInfo, 'live-importee');
    await uatShot(page, '02-live-importee');

    // 5. Poser un token PJ → il alimente la ligne de vue.
    await page.getByTestId('map-live-add-pj').click();
    await expect(page.getByTestId('map-live-tokens-count')).toContainText('(1)', {
      timeout: 5000,
    });

    // 6. Activer le voile → la LOS du token perce un trou de visibilité dans le
    // voile (occlusion par les murs). Le fog mask doit contenir ≥ 1 reveal.
    await page.getByTestId('map-live-toggle-fog').click();
    await expect(page.getByTestId('map-live-toggle-fog')).toContainText('ON', {
      timeout: 5000,
    });
    await expect(page.getByTestId('fog-layer')).toBeVisible();
    // FogLayer rend les reveals (manuels + LOS) en <polygon fill="black"> dans
    // le <mask>. Avec 1 token + losEnabled, il y a ≥ 1 polygone de visibilité.
    await expect
      .poll(() => page.locator('mask polygon[fill="black"]').count(), {
        timeout: 5000,
      })
      .toBeGreaterThanOrEqual(1);

    await takeStepScreenshot(page, testInfo, 'live-los');
    await uatShot(page, '03-live-los');

    // 6. Vue présentation / TV.
    await page.getByTestId('map-live-open-tv').click();
    await expect(page).toHaveURL(
      new RegExp(`/map-proto/cloud/${cid}/maps/${slug}/tv$`),
      { timeout: 10_000 },
    );
    await waitForAppReady(page);
    await expect(page.getByTestId('map-tv-root')).toBeVisible();
    await expect(page.getByTestId('map-tv-name')).toBeVisible();
    await expect(page.getByTestId('map-tv-svg')).toBeVisible();

    await takeStepScreenshot(page, testInfo, 'vue-tv');
    await uatShot(page, '04-vue-tv');
  });
});
