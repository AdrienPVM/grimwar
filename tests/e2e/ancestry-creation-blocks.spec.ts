import { expect, test } from '@playwright/test';

import { waitForAppReady } from './fixtures';

/**
 * Plan 13.8 step 41 — anti-régression : le wizard refuse d'avancer
 * tant qu'un sous-choix d'ascendance requis reste en sentinelle.
 *
 * Spec UI-only : aucune écriture Firestore — pas besoin de l'émulateur.
 * Couvre le scénario rouge-puis-vert documenté dans
 * `wizard-validation-ancestry-sub-choices.test.ts` (unit) mais ici
 * dans un navigateur réel pour valider le wiring complet du
 * « Suivant » désactivé.
 */
test.describe('Wizard — blocage avancement sans sous-choix d\'ascendance', () => {
  test('Drakéide sans dragonAncestry → Suivant désactivé', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    // Lancer le wizard depuis la library.
    await page.getByRole('link', { name: /Créer/i }).first().click();
    await expect(page).toHaveURL(/\/create/);

    // Étape 1 — Identité minimale.
    await page.getByLabel(/^Nom/i).fill('Test Drakéide Block');
    await page.getByRole('button', { name: /^Suivant$/i }).click();

    // Étape 2 — Classe : choisir Guerrier (premier disponible).
    await page.getByRole('button', { name: /Guerrier/i }).first().click();
    await page.getByRole('button', { name: /^Suivant$/i }).click();

    // Étape 3 — Ascendance : choisir Drakéide.
    await page.getByRole('button', { name: /^Drakéide$/i }).first().click();

    // La section sous-choix doit apparaître avec le RadioCardGroup
    // « Type de dragon ».
    await expect(
      page.getByRole('radiogroup', { name: /Type de dragon/i }),
    ).toBeVisible();

    // Le bouton « Suivant » doit être désactivé tant que le type n'est pas choisi.
    const next = page.getByRole('button', { name: /^Suivant$/i });
    await expect(
      next,
      'Le bouton Suivant doit rester désactivé tant que dragonAncestry est en sentinelle.',
    ).toBeDisabled();

    // Choisir un type → bouton Suivant débloqué.
    await page.getByRole('radio', { name: /Rouge/ }).click();
    await expect(
      next,
      'Le bouton Suivant doit être réactivé une fois dragonAncestry posé.',
    ).toBeEnabled();
  });
});
