import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * UAT + régression — pose d'une torche à l'échelle réelle de la carte.
 *
 * Bug corrigé : la torche live écrivait ses rayons en PIEDS (20) alors que
 * `LightLayer` trace le rayon BRUT en px viewBox (comme l'import .dd2vtt et les
 * presets proto) → torche rendue comme un point de 40 px. Désormais la torche
 * convertit les pieds SRD en px à l'échelle de la carte (gridSize/feetPerSquare).
 *
 * Ce spec ASSERTE le round-trip via les vraies security rules : le `<circle>`
 * de lumière re-émis par le listener `useMap` porte un rayon = 560 px sur une
 * carte par défaut (gridSize 70, feetPerSquare 5 → 14 px/ft ; le cercle trace
 * le rayon TOTAL bright+dim = 20 ft + 20 ft = 40 ft × 14 = 560 px). Produit
 * aussi la galerie `uat-review/torch/`. Sans émulateur, il se skip proprement.
 */
const OUT = path.resolve(process.cwd(), 'uat-review', 'torch');

test.describe('UAT — torche à l’échelle de la carte (carte live)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(!ok, 'Firestore emulator unreachable — skipping torch UAT.');
    mkdirSync(OUT, { recursive: true });
  });

  test('pose une torche → rayon de lumière à l’échelle (280 px)', async ({
    page,
  }) => {
    const cid = `uat-torch-${Date.now().toString(36)}`;
    const mapSlug = `carte-${Date.now().toString(36)}`;
    const mapName = 'Crypte obscure (UAT)';

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

    // Pose une torche au centre.
    await page.getByTestId('map-live-add-torch').click();
    await expect(page.getByTestId('map-live-lights-count')).toContainText('(1)', {
      timeout: 5000,
    });

    // Round-trip via les vraies rules : le cercle de lumière porte le rayon
    // TOTAL mis à l'échelle (bright 280 + dim 280 = 560 px), pas le brut 40.
    const lightCircle = page.locator('[data-testid^="light-source-"]').first();
    await expect(lightCircle).toBeVisible({ timeout: 5000 });
    await expect
      .poll(async () => lightCircle.getAttribute('r'), { timeout: 5000 })
      .toBe('560');

    // 01 — la torche éclaire une vraie zone (≈ 8 cases de diamètre), pleine page.
    await page.screenshot({
      path: path.join(OUT, '01-torche-a-l-echelle.png'),
      fullPage: true,
    });
  });

  test('pose plusieurs presets de lumière (tailles SRD distinctes)', async ({
    page,
  }) => {
    const cid = `uat-lights-${Date.now().toString(36)}`;
    const mapSlug = `carte-${Date.now().toString(36)}`;
    const mapName = 'Sanctuaire (UAT lumières)';

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

    // 02 — le sélecteur de lumière : 5 presets (bougie → lumière du jour) avec
    // pastille de teinte (viewport pour le ressenti de la barre d'outils).
    await expect(page.getByTestId('map-live-add-light-candle')).toBeVisible();
    await expect(page.getByTestId('map-live-add-light-lantern')).toBeVisible();
    await expect(page.getByTestId('map-live-add-light-sunlight')).toBeVisible();
    await page.screenshot({
      path: path.join(OUT, '02-selecteur-presets-viewport.png'),
      fullPage: false,
    });

    // Pose bougie (10 ft total → 140 px) puis lumière du jour (120 ft → 1680 px)
    // au centre : deux rayons radicalement différents, round-trip via les rules.
    await page.getByTestId('map-live-add-light-candle').click();
    await expect(page.getByTestId('map-live-lights-count')).toContainText('(1)', {
      timeout: 5000,
    });
    await page.getByTestId('map-live-add-light-sunlight').click();
    await expect(page.getByTestId('map-live-lights-count')).toContainText('(2)', {
      timeout: 5000,
    });

    // Les deux rayons (totaux mis à l'échelle 14 px/ft) sont présents dans le DOM.
    const radii = await page
      .locator('[data-testid^="light-source-"]')
      .evaluateAll((nodes) =>
        nodes.map((n) => n.getAttribute('r')).filter((r): r is string => r != null),
      );
    expect(radii).toContain('140'); // bougie : (5+5) ft × 14
    expect(radii).toContain('1680'); // lumière du jour : (60+60) ft × 14

    // 03 — bougie minuscule au cœur d'un vaste halo « lumière du jour » (pleine page).
    await page.screenshot({
      path: path.join(OUT, '03-presets-tailles-distinctes.png'),
      fullPage: true,
    });
  });
});
