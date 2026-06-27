import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * UAT + régression — optimisation d'image AVANT stockage (preuve mécanique).
 *
 * Adrien : « optimise résolution/compression AVANT base64, le moins de place
 * possible, pour TOUTES les images ». Ce spec en apporte la preuve dans un VRAI
 * navigateur (le recadrage/ré-encodage est une capacité chromium, pas jsdom) :
 * on génère une grande image bruitée 1500×1100 (que webp ne peut pas réduire à
 * néant), on l'upload comme portrait de jeton, puis on asserte que la sortie est
 *   1. RÉ-ENCODÉE (webp/jpeg — plus le PNG brut d'origine),
 *   2. PLAFONNÉE à 192×192 (recadrage carré « cover » + cap dimension),
 *   3. SOUS le budget d'empreinte (~32 Ko de chaîne, minuscule vs 1 Mio Firestore).
 *
 * Sans émulateur, se skip proprement. Produit `uat-review/image-optimize/`.
 */
const OUT = path.resolve(process.cwd(), 'uat-review', 'image-optimize');

/** Budget d'empreinte du preset portrait (cf. `image-optimize.ts`). */
const PORTRAIT_BUDGET_BYTES = 32 * 1024;
/** Côté max du portrait (cf. `PORTRAIT_PRESET.maxDim`). */
const PORTRAIT_MAX_DIM = 192;

test.describe('UAT — optimisation d’image avant stockage', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(!ok, 'Firestore emulator unreachable — skipping image-optimize UAT.');
    mkdirSync(OUT, { recursive: true });
  });

  test('une grande image uploadée est réduite, ré-encodée et bornée en poids', async ({
    page,
  }) => {
    const cid = `uat-imgopt-${Date.now().toString(36)}`;
    const mapSlug = `carte-${Date.now().toString(36)}`;
    const mapName = 'Optimisation image (UAT)';

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

    await page.getByTestId('map-live-add-pnj').click();
    const tokenG = page.locator('[data-testid^="map-live-token-"]').first();
    await expect(tokenG).toBeVisible();
    await tokenG.click();
    await expect(page.getByTestId('token-image-input')).toBeAttached();

    // Génère EN PAGE une grande image bruitée (1500×1100) et la pose sur l'input
    // fichier (DataTransfer + change natif → React relit `target.files`). PNG
    // volumineux et incompressible : prouve que la réduction agit vraiment.
    await page.evaluate(() => {
      const c = document.createElement('canvas');
      c.width = 1500;
      c.height = 1100;
      const ctx = c.getContext('2d');
      if (!ctx) throw new Error('no 2d context');
      const grad = ctx.createLinearGradient(0, 0, c.width, c.height);
      grad.addColorStop(0, '#3aa0ff');
      grad.addColorStop(1, '#ff5a3a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, c.width, c.height);
      for (let i = 0; i < 60_000; i += 1) {
        ctx.fillStyle = `rgba(${(i * 37) % 255},${(i * 53) % 255},${(i * 97) % 255},0.6)`;
        ctx.fillRect((i * 13) % c.width, (i * 29) % c.height, 3, 3);
      }
      const dataUrl = c.toDataURL('image/png');
      const base64 = dataUrl.split(',')[1] ?? '';
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
      const file = new File([bytes], 'grande.png', { type: 'image/png' });
      const input = document.querySelector<HTMLInputElement>(
        '[data-testid="token-image-input"]',
      );
      if (!input) throw new Error('no input');
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const preview = page.getByTestId('token-image-preview');
    await expect(preview).toBeVisible({ timeout: 15_000 });
    const src = await preview.getAttribute('src');
    expect(src).toBeTruthy();
    const optimized = src ?? '';

    // 1. Ré-encodé — webp (ou jpeg en repli), JAMAIS le PNG brut d'origine.
    expect(optimized).toMatch(/^data:image\/(webp|jpeg)/);
    // 2. Empreinte bornée (longueur de chaîne = coût de stockage réel).
    expect(optimized.length).toBeLessThan(PORTRAIT_BUDGET_BYTES);
    // 3. Plafonné à 192×192 (recadrage carré « cover »).
    const dims = await page.evaluate(
      (s) =>
        new Promise<{ w: number; h: number }>((resolve) => {
          const im = new Image();
          im.onload = () => resolve({ w: im.naturalWidth, h: im.naturalHeight });
          im.src = s;
        }),
      optimized,
    );
    expect(dims.w).toBeLessThanOrEqual(PORTRAIT_MAX_DIM);
    expect(dims.h).toBeLessThanOrEqual(PORTRAIT_MAX_DIM);
    expect(dims.w).toBe(PORTRAIT_MAX_DIM);
    expect(dims.h).toBe(PORTRAIT_MAX_DIM);

    await page.screenshot({
      path: path.join(OUT, '01-portrait-optimise.png'),
      fullPage: false,
    });
  });
});
