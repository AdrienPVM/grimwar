import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * UAT + régression — portrait (image) d'un jeton (carte live MJ + TV).
 *
 * Parcours bout-en-bout contre les VRAIES security rules de l'émulateur : un TAP
 * ouvre l'éditeur, l'upload d'une image la recadre (canvas chromium) et la stocke
 * en LOCAL (IndexedDB) sous l'id du jeton — AUCUN champ ajouté au doc Firestore.
 * Le jeton affiche alors un `<image>` détouré en disque, en vue live ET en vue TV
 * (même navigateur → même IndexedDB). La duplication recopie le portrait (meute).
 *
 * Produit la galerie `uat-review/token-image/`. Sans émulateur, se skip proprement.
 */
const OUT = path.resolve(process.cwd(), 'uat-review', 'token-image');

// PNG 32×32 valide, vert plein (teinte gobeline). Décodé + recadré (≤ 192²,
// budget d'octets) par l'optimiseur centralisé dans le vrai navigateur →
// ré-encodé en webp/jpeg. Un carré
// PLEIN (pas transparent) pour que le disque-portrait soit visible aux captures.
const PNG_SOLID_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAKklEQVR4nGPI2ehDU8QwasGoBaMWjFowasGoBaMWjFowasGoBaMWjFowasGoBaMWDBULAM0spEyJWQ8rAAAAAElFTkSuQmCC';

test.describe('UAT — portrait de jeton (carte live + TV)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(!ok, 'Firestore emulator unreachable — skipping token-image UAT.');
    mkdirSync(OUT, { recursive: true });
  });

  test('tap → upload image → portrait rendu (live + TV) + recopié au duplicata', async ({
    page,
  }) => {
    const cid = `uat-tokimg-${Date.now().toString(36)}`;
    const mapSlug = `carte-${Date.now().toString(36)}`;
    const mapName = 'Portrait gobelin (UAT)';

    // ── Création de la carte via l'écran cloud ───────────────────────────
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

    // ── Pose un PNJ, tap → éditeur ───────────────────────────────────────
    await page.getByTestId('map-live-add-pnj').click();
    const tokenG = page.locator('[data-testid^="map-live-token-"]').first();
    await expect(tokenG).toBeVisible();
    await tokenG.click();
    await expect(page.getByTestId('token-edit-save')).toBeVisible();
    // Sans image : pastille de repli, pas de vignette.
    await expect(page.getByTestId('token-image-placeholder')).toBeVisible();
    await expect(page.getByTestId('token-image-preview')).toBeHidden();

    // ── Upload d'une image → recadrage canvas → stockage local ───────────
    await page.getByTestId('token-image-input').setInputFiles({
      name: 'gobelin.png',
      mimeType: 'image/png',
      buffer: Buffer.from(PNG_SOLID_BASE64, 'base64'),
    });
    // La vignette ronde apparaît dans l'éditeur (data URL recadré).
    const preview = page.getByTestId('token-image-preview');
    await expect(preview).toBeVisible({ timeout: 10_000 });
    const previewSrc = await preview.getAttribute('src');
    expect(previewSrc).toMatch(/^data:image\/(webp|jpeg|png)/);

    // 01 — éditeur avec portrait (pleine page : contenu exhaustif).
    await page.screenshot({
      path: path.join(OUT, '01-editeur-avec-portrait.png'),
      fullPage: true,
    });
    // 02 — éditeur (viewport : ressenti overlay + vignette ronde + « Retirer »).
    await page.screenshot({
      path: path.join(OUT, '02-editeur-portrait-viewport.png'),
      fullPage: false,
    });

    // Ferme l'éditeur → le jeton porte désormais un <image> détouré en disque.
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('token-edit-save')).toBeHidden();
    const liveImage = page.locator('[data-testid^="map-live-token-image-"]');
    await expect(liveImage).toBeVisible({ timeout: 10_000 });
    const liveHref = await liveImage.getAttribute('href');
    expect(liveHref).toMatch(/^data:image\//);

    // 03 — le jeton-portrait sur la carte live (pleine page).
    await page.screenshot({
      path: path.join(OUT, '03-jeton-portrait-carte.png'),
      fullPage: true,
    });

    // ── Duplication → le clone hérite du portrait (meute) ────────────────
    await tokenG.click();
    await page.getByTestId('token-edit-duplicate').click();
    await expect(page.getByTestId('token-edit-save')).toBeHidden();
    await expect(
      page.locator('[data-testid^="map-live-token-"]'),
    ).toHaveCount(2, { timeout: 5000 });
    // Deux portraits rendus (l'original + le clone).
    await expect(
      page.locator('[data-testid^="map-live-token-image-"]'),
    ).toHaveCount(2, { timeout: 10_000 });

    // 04 — la paire de portraits (pose + duplication) sur la carte (pleine page).
    await page.screenshot({
      path: path.join(OUT, '04-meute-portraits.png'),
      fullPage: true,
    });

    // ── Vue TV : preuve de SYNCHRO via Firestore ─────────────────────────
    // Le portrait vit désormais sur le doc Firestore (base64 optimisé). La vue
    // TV ne lit PLUS du tout IndexedDB (le hook local a été retiré) : elle rend
    // exclusivement `token.imageDataUrl` reçu par le listener `useMap`. Donc si
    // le portrait s'affiche ici, il vient nécessairement de Firestore — et se
    // synchroniserait à l'identique sur un autre appareil membre de la campagne.
    await page.goto(`/map-proto/cloud/${cid}/maps/${mapSlug}/tv`);
    await waitForAppReady(page);
    const tvImage = page.locator('[data-testid^="map-tv-token-image-"]').first();
    await expect(tvImage).toBeVisible({ timeout: 10_000 });
    // Le href est bien un data URL base64 (le portrait du doc), pas un blob local.
    await expect(tvImage).toHaveAttribute('href', /^data:image\//, {
      timeout: 10_000,
    });

    // 05 — portraits projetés sur la vue présentation/TV (pleine page).
    await page.screenshot({
      path: path.join(OUT, '05-portraits-vue-tv.png'),
      fullPage: true,
    });
  });

  test('retirer l’image rétablit le disque coloré', async ({ page }) => {
    const cid = `uat-tokimgrm-${Date.now().toString(36)}`;
    const mapSlug = `carte-${Date.now().toString(36)}`;
    const mapName = 'Retrait portrait (UAT)';

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
    await tokenG.click();
    await page.getByTestId('token-image-input').setInputFiles({
      name: 'x.png',
      mimeType: 'image/png',
      buffer: Buffer.from(PNG_SOLID_BASE64, 'base64'),
    });
    await expect(page.getByTestId('token-image-preview')).toBeVisible({
      timeout: 10_000,
    });
    // Retire → la vignette redevient une pastille, et le jeton reperd son <image>.
    await page.getByTestId('token-image-remove').click();
    await expect(page.getByTestId('token-image-placeholder')).toBeVisible();
    await expect(page.getByTestId('token-image-preview')).toBeHidden();
    await page.keyboard.press('Escape');
    await expect(
      page.locator('[data-testid^="map-live-token-image-"]'),
    ).toHaveCount(0, { timeout: 10_000 });
  });
});
