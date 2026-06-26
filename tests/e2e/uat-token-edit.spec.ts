import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * UAT + régression — édition d'un jeton (carte live MJ).
 *
 * À la différence des specs purement « galerie », celui-ci ASSERTE le parcours
 * de bout en bout contre les VRAIES security rules de l'émulateur : un TAP sur
 * un jeton ouvre l'éditeur, et « Enregistrer » écrit nom + couleur, dont le
 * round-trip est re-émis par le listener `useMap` (le `<text>` et le `fill` du
 * jeton changent réellement). Une suppression unitaire retire ensuite le jeton.
 *
 * Produit aussi la galerie `uat-review/token-edit/` (pleine page + viewport).
 * Sans émulateur, il se skip proprement.
 */
const OUT = path.resolve(process.cwd(), 'uat-review', 'token-edit');

const NEW_LABEL = 'Gobelin chef';
// Vert de la palette (`token-color-4ade80`) — distinct du rouge PNJ par défaut.
const NEW_COLOR = '#4ade80';

test.describe('UAT — édition de jeton (carte live)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(!ok, 'Firestore emulator unreachable — skipping token-edit UAT.');
    mkdirSync(OUT, { recursive: true });
  });

  test('tap → éditer nom + couleur → supprimer', async ({ page }) => {
    const cid = `uat-tokedit-${Date.now().toString(36)}`;
    const mapSlug = `carte-${Date.now().toString(36)}`;
    const mapName = 'Embuscade gobeline (UAT)';

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

    // ── Pose un PNJ (rouge, libellé « PNJ ») ─────────────────────────────
    await page.getByTestId('map-live-add-pnj').click();
    const tokenG = page.locator('[data-testid^="map-live-token-"]').first();
    await expect(tokenG).toBeVisible();
    const circle = tokenG.locator('circle');
    const tokenText = tokenG.locator('text');
    await expect(tokenText).toHaveText('PNJ');

    // ── TAP (clic sans déplacement) → l'éditeur s'ouvre ──────────────────
    // `.click()` (actionability-checked) = down+up centrés sans move = TAP.
    await tokenG.click();
    await expect(page.getByTestId('token-edit-save')).toBeVisible();
    // L'éditeur reflète le nom courant.
    await expect(page.getByTestId('token-edit-label')).toHaveValue('PNJ');

    // 01 — éditeur ouvert (pleine page : contenu exhaustif).
    await page.screenshot({
      path: path.join(OUT, '01-editeur-ouvert.png'),
      fullPage: true,
    });
    // 02 — éditeur ouvert (viewport : ressenti d'overlay bottom-sheet).
    await page.screenshot({
      path: path.join(OUT, '02-editeur-ouvert-viewport.png'),
      fullPage: false,
    });

    // ── Renomme + recolore + Enregistrer ─────────────────────────────────
    await page.getByTestId('token-edit-label').fill(NEW_LABEL);
    await page.getByTestId(`token-color-${NEW_COLOR.slice(1)}`).click();
    await page.getByTestId('token-edit-save').click();

    // La modale se ferme.
    await expect(page.getByTestId('token-edit-save')).toBeHidden();
    // Round-trip via les vraies rules : le jeton porte le nouveau nom + couleur.
    await expect(tokenText).toHaveText(NEW_LABEL);
    await expect.poll(async () => circle.getAttribute('fill')).toBe(NEW_COLOR);

    // 03 — jeton renommé + recoloré sur la carte (pleine page).
    await page.screenshot({
      path: path.join(OUT, '03-jeton-renomme-recolore.png'),
      fullPage: true,
    });

    // ── Portée de vision : sélection → round-trip via les vraies rules ────
    // Le PNJ porte une vision (défaut 30 ft = « 9 m » présélectionné). On la
    // passe à 60 ft (« 18 m », Vision dans le noir). La valeur n'a pas d'effet
    // DOM sur cette carte sans murs (pas de LOS) — on prouve la persistance en
    // ré-ouvrant l'éditeur après le passage par le listener `useMap`.
    await tokenG.click();
    await expect(page.getByTestId('token-vision-30')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    // 04 — section vision (viewport : les 4 portées, 9 m présélectionné).
    await page.screenshot({
      path: path.join(OUT, '04-section-vision-viewport.png'),
      fullPage: false,
    });
    await page.getByTestId('token-vision-60').click();
    await expect(page.getByTestId('token-vision-60')).toContainText('18 m');
    await page.getByTestId('token-edit-save').click();
    await expect(page.getByTestId('token-edit-save')).toBeHidden();

    // Ré-ouverture : la portée 60 ft est revenue du snapshot (round-trip réel).
    await tokenG.click();
    await expect(page.getByTestId('token-vision-60')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(page.getByTestId('token-vision-30')).toHaveAttribute(
      'aria-checked',
      'false',
    );
    // 05 — éditeur rouvert : « 18 m » désormais sélectionné (pleine page).
    await page.screenshot({
      path: path.join(OUT, '05-vision-persistee.png'),
      fullPage: true,
    });
    // Referme pour restaurer la précondition du bloc suppression (re-tap).
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('token-edit-save')).toBeHidden();

    // ── Suppression unitaire ─────────────────────────────────────────────
    await tokenG.click();
    await expect(page.getByTestId('token-edit-delete')).toBeVisible();
    await page.getByTestId('token-edit-delete').click();
    // Le jeton disparaît de la carte (deleteToken via vraies rules).
    await expect(
      page.locator('[data-testid^="map-live-token-"]'),
    ).toHaveCount(0, { timeout: 5000 });
  });
});
