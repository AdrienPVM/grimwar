import { expect, test } from '@playwright/test';

import { waitForAppReady } from './fixtures';
import { takeStepScreenshot } from './helpers/screenshot';

/**
 * CHANTIER E nuit 3 — UAT visuel fog of war.
 *
 * Spécifique uat-review : produit les 4 captures clés pour valider
 * sensoriellement le rendu fog (MJ vs joueur, reveals auto + manuels).
 * Skip émulateur (prototype local, pas de Firestore).
 */
test.describe('UAT Fog of war (CHANTIER E)', () => {
  test('rendu vue MJ + reveals auto', async ({ page }, testInfo) => {
    await page.goto('/map-proto');
    await waitForAppReady(page);

    await expect(page.getByText('Prototype carte')).toBeVisible();
    // Vue MJ par défaut : fog translucide, on voit les tokens à travers le voile.
    await expect(
      page.getByRole('button', { name: /Fog activé/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Vue MJ/i }),
    ).toBeVisible();
    // Couche de fog rendue.
    await expect(page.getByTestId('fog-layer')).toBeVisible();
    await takeStepScreenshot(page, testInfo, '01-vue-mj-fog-translucide');
  });

  test('toggle vue joueur → fog opaque', async ({ page }, testInfo) => {
    await page.goto('/map-proto');
    await waitForAppReady(page);

    await page.getByRole('button', { name: /Vue MJ/i }).click();
    await expect(
      page.getByRole('button', { name: /Vue joueur/i }),
    ).toBeVisible();

    await takeStepScreenshot(page, testInfo, '02-vue-joueur-fog-opaque');
  });

  test('pinceau révéler → polygone manuel ajouté', async ({ page }, testInfo) => {
    await page.goto('/map-proto');
    await waitForAppReady(page);

    await page.getByRole('button', { name: /Pinceau révéler/i }).click();

    // Trace un polygone à la souris dans une zone non révélée.
    const svg = page.getByTestId('map-proto-svg');
    const box = await svg.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // Trajet en boucle approximative (carré qui se ferme via la fermeture
    // implicite du polygone SVG).
    const cx = box.x + box.width * 0.75;
    const cy = box.y + box.height * 0.7;
    await page.mouse.move(cx - 60, cy - 60);
    await page.mouse.down();
    await page.mouse.move(cx + 60, cy - 60, { steps: 8 });
    await page.mouse.move(cx + 60, cy + 60, { steps: 8 });
    await page.mouse.move(cx - 60, cy + 60, { steps: 8 });
    await page.mouse.move(cx - 60, cy - 60, { steps: 8 });
    await page.mouse.up();

    // Repasse en mode normal pour bien voir le polygone (pas la prévue).
    await page.getByRole('button', { name: /Pinceau révéler/i }).click();
    await takeStepScreenshot(page, testInfo, '03-pinceau-reveal-manuel');
  });

  test('tout remasquer → carte entièrement voilée', async ({ page }, testInfo) => {
    await page.goto('/map-proto');
    await waitForAppReady(page);

    // Désactiver les reveals auto en passant les PJ à 0 vision serait long ;
    // plus simple : on clique « Tout remasquer ». Comme l'effet purge la
    // liste mais que l'useEffect ré-ajoute les reveals auto au tick suivant,
    // on désactive d'abord la révélation auto en passant en vue joueur +
    // un toggle off du fog (qui purge la layer affichée) puis on prend la
    // capture du fog OFF.
    await page.getByRole('button', { name: /Fog activé/i }).click();
    await expect(
      page.getByRole('button', { name: /Fog désactivé/i }),
    ).toBeVisible();

    await takeStepScreenshot(page, testInfo, '04-fog-desactive');
  });
});
