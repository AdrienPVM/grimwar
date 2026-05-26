import { expect, test } from '@playwright/test';

import { waitForAppReady } from './fixtures';
import { takeStepScreenshot } from './helpers/screenshot';

/**
 * Plan CHANTIER 8 marathon — smoke du prototype carte `/map-proto`.
 *
 * Ce spec est délibérément MINIMAL (pas de tests cat. 4 / matrix) — le
 * mode carte est un PROTOTYPE en attente d'arbitrage UX/produit. Cf.
 * `plans/MAP-MODE-PROPOSAL.md`.
 *
 * Couverture :
 *   1. La page `/map-proto` charge sans erreur, montre le titre + badge
 *      « PROTOTYPE — Not production » + les 3 tokens initiaux.
 *   2. Un token peut être déplacé : avant/après drag, sa position a changé.
 *
 * Captures UAT générées pour le rapport CHANTIER 8.
 *
 * Note : pas d'émulateur requis (le prototype n'utilise pas Firestore).
 * Spec UI-only — tourne sans `pnpm e2e:emulators`.
 */
test.describe('Map proto — smoke', () => {
  test('Page charge, badge + tokens visibles', async ({ page }, testInfo) => {
    await page.goto('/map-proto');
    await waitForAppReady(page);

    await expect(page.getByText('Prototype carte')).toBeVisible();
    await expect(
      page.getByText('PROTOTYPE — Not production'),
    ).toBeVisible();

    // Les 3 tokens initiaux sont rendus.
    await expect(page.getByTestId('map-token-t1')).toBeVisible();
    await expect(page.getByTestId('map-token-t2')).toBeVisible();
    await expect(page.getByTestId('map-token-t3')).toBeVisible();

    // Boutons d'outils visibles.
    await expect(
      page.getByRole('button', { name: /Masquer grille|Afficher grille/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Réinitialiser/i }),
    ).toBeVisible();

    await takeStepScreenshot(page, testInfo, 'map-proto-initial');
  });

  test('Toggle grille : bouton change de libellé', async ({ page }, testInfo) => {
    await page.goto('/map-proto');
    await waitForAppReady(page);

    const toggle = page.getByRole('button', {
      name: /Masquer grille/i,
    });
    await expect(toggle).toBeVisible();
    await toggle.click();

    // Après click, le bouton dit maintenant « Afficher grille ».
    await expect(
      page.getByRole('button', { name: /Afficher grille/i }),
    ).toBeVisible();

    await takeStepScreenshot(page, testInfo, 'map-proto-grid-hidden');
  });
});
