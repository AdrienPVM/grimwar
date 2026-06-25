import { expect, test } from '@playwright/test';

import { waitForAppReady } from './fixtures';

/**
 * UAT — hub de navigation de l'accueil. Les anciens liens texte discrets
 * (Codex / Campagnes / Vue MJ) deviennent des cartes glass avec icône. Spec
 * UI-only : l'accueil rend son empty state (avec hub) que l'auth réussisse ou
 * non.
 */
test.describe('UAT — Hub d’accueil', () => {
  test('cartes de navigation visibles + cibles', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    // Le CTA primaire reste, le hub apparaît dessous/à côté.
    await expect(
      page.getByRole('button', { name: /Créer un personnage/i }).first(),
    ).toBeVisible();
    const hub = page.getByRole('navigation', { name: 'Explorer' });
    await expect(hub.getByRole('button', { name: /Le Codex/ })).toBeVisible();
    await expect(hub.getByRole('button', { name: /Mes campagnes/ })).toBeVisible();
    await expect(hub.getByRole('button', { name: /Tableau du meneur/ })).toBeVisible();

    await page.screenshot({ path: 'uat-review/home-hub/01-accueil-hub.png', fullPage: true });

    // Le Codex est atteignable d'un tap depuis l'accueil.
    await hub.getByRole('button', { name: /Le Codex/ }).click();
    await expect(page).toHaveURL(/\/codex$/);
    await expect(page.getByRole('heading', { name: 'Le Codex' })).toBeVisible();
  });
});
