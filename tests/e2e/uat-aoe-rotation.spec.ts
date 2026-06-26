import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * Capture UAT dédiée — pose des 4 formes d'AoE (sphère/cône/ligne/cube) +
 * rotation ±15° du gabarit sélectionné (carte live MJ).
 *
 * NON une gate de régression (le wiring est prouvé par les tests unitaires
 * `maps` + `map-live-screen` et le parcours e2e `map-phase2-uat`). Ce spec ne
 * produit que la galerie `uat-review/aoe-rotation/` pleine page : lisibilité des
 * 4 boutons de forme, contrôles de rotation révélés à la sélection, et cône
 * effectivement pivoté.
 *
 * Sans émulateur, il se skip proprement.
 */
const OUT = path.resolve(process.cwd(), 'uat-review', 'aoe-rotation');

test.describe('UAT — formes AoE + rotation (carte live)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(!ok, 'Firestore emulator unreachable — skipping UAT capture.');
    mkdirSync(OUT, { recursive: true });
  });

  test('capture boutons de forme + rotation du cône', async ({ page }) => {
    const cid = `uat-aoe-rot-${Date.now().toString(36)}`;
    const mapSlug = `carte-${Date.now().toString(36)}`;
    const mapName = 'Salle du Rituel (UAT)';

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

    // 01 — la barre AoE expose désormais les 4 formes SRD (en mètres FR).
    await expect(page.getByTestId('map-live-add-sphere-aoe')).toContainText('6 m');
    await expect(page.getByTestId('map-live-add-cone-aoe')).toContainText('4,5 m');
    await expect(page.getByTestId('map-live-add-line-aoe')).toContainText('18 m');
    await expect(page.getByTestId('map-live-add-cube-aoe')).toContainText('4,5 m');
    await page.screenshot({
      path: path.join(OUT, '01-barre-formes-aoe.png'),
      fullPage: true,
    });

    // Pose un cône au centre.
    await page.getByTestId('map-live-add-cone-aoe').click();
    await expect(page.getByTestId('map-live-aoe-count')).toContainText('(1)', {
      timeout: 5000,
    });
    const conePoly = page.locator('[data-testid="aoe-layer"] polygon').first();
    await expect(conePoly).toBeVisible({ timeout: 5000 });

    // Sélection : `click()` (actionability-checked) dispatche un pointerdown au
    // centre du gabarit → `selectedAoeId` posé, plus robuste qu'un mouse.move
    // manuel sur une page fraîche (où le pointerdown peut rater la cible).
    await conePoly.click();

    // 02 — le cône sélectionné (contour épaissi) + contrôles de rotation
    // révélés, badge « Cône · 0° ».
    await expect(page.getByTestId('map-live-aoe-selection')).toContainText('Cône');
    await expect(page.getByTestId('map-live-aoe-selection')).toContainText('0°');
    await page.screenshot({
      path: path.join(OUT, '02-cone-selectionne-controles.png'),
      fullPage: true,
    });

    // Pivote 3× +15° = 45°.
    const rotateCw = page.getByTestId('map-live-rotate-cw');
    await rotateCw.click();
    await rotateCw.click();
    await rotateCw.click();
    await expect
      .poll(async () => await conePoly.getAttribute('transform'), {
        timeout: 5000,
      })
      .toContain('rotate(45)');
    await expect(page.getByTestId('map-live-aoe-selection')).toContainText('45°');

    // 03 — le cône a visiblement pivoté (badge 45°), pleine page. La rotation
    // est nettement lisible en pleine page (le cône bascule de ~45°), pas besoin
    // d'un zoom dédié (qui, sur viewport mobile letterboxé, cadrait à vide).
    await page.screenshot({
      path: path.join(OUT, '03-cone-pivote-45.png'),
      fullPage: true,
    });

    // ── Suppression DU SEUL gabarit sélectionné (≠ « Effacer AoE ») ───────
    // Le bouton « Supprimer » du bloc de sélection retire ce cône via
    // removeAoeTemplate (filtre par id). Round-trip par le listener `useMap` :
    // le compteur retombe à (0) et la couche AoE se vide.
    await page.getByTestId('map-live-delete-aoe').click();
    await expect(page.getByTestId('map-live-aoe-count')).toContainText('(0)', {
      timeout: 5000,
    });
    await expect(
      page.locator('[data-testid="aoe-layer"] polygon'),
    ).toHaveCount(0, { timeout: 5000 });
    // Les contrôles de sélection disparaissent (plus rien de sélectionné).
    await expect(page.getByTestId('map-live-aoe-selection')).toBeHidden();

    // 04 — carte vidée du cône après suppression ciblée (pleine page).
    await page.screenshot({
      path: path.join(OUT, '04-cone-supprime.png'),
      fullPage: true,
    });
  });
});
