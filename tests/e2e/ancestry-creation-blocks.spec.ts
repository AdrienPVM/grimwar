import { expect, test, type Page, type Locator } from '@playwright/test';

import { waitForAppReady, wizardNext } from './fixtures';

/**
 * Mobile : la barre nav rend un bouton `→` sans label texte ; desktop : `Suivant →`.
 * On accepte les deux formes pour rester device-agnostic.
 * Mirror de `wizardNext()` pour les assertions disabled/enabled (qui ne cliquent pas).
 */
function nextButton(page: Page): Locator {
  return page
    .getByRole('button')
    .filter({ hasText: /^(Suivant|→)/ })
    .first();
}

/**
 * Plan 13.8 step 41 — anti-régression : le wizard refuse d'avancer
 * tant qu'un sous-choix d'ascendance requis reste en sentinelle.
 *
 * Spec UI-only : aucune écriture Firestore — pas besoin de l'émulateur.
 * Couvre le scénario rouge-puis-vert documenté dans
 * `wizard-validation-ancestry-sub-choices.test.ts` (unit) mais ici
 * dans un navigateur réel pour valider le wiring complet du
 * « Suivant » désactivé.
 *
 * Ajout UAT 13.8 (2026-05-17, 2e passe) : la spec vérifie aussi le COMPTAGE
 * des options de chaque chooser de sous-choix. Le bug Drakéide/Goliath vide
 * silencieux qui a slip past UAT n'aurait pas pu se reproduire avec ces
 * assertions `toHaveCount(n)` en place. Voir
 * `chooser-coverage-from-bundle.test.tsx` pour l'équivalent unit (plus rapide
 * + tourne sans navigateur).
 */
async function navigateToAncestryStep(page: Page, opts: { name: string }) {
  await page.goto('/');
  await waitForAppReady(page);

  // LibraryScreen empty state rend un <Button onClick={navigate('/create')}>,
  // pas un <Link>. On laisse Playwright accepter les deux rôles pour rester
  // robuste si le rendu populé (au-dessus, avec personnages) bascule un jour
  // en <Link>.
  await page
    .getByRole('button', { name: /Créer/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/create/);

  // Étape 1 — Identité minimale.
  await page.getByLabel(/^Nom/i).fill(opts.name);
  await wizardNext(page);

  // Étape 2 — Classe : choisir Barde (aucun sous-choix de classe L1 SRD —
  // contrairement au Guerrier qui exige Fighting Style + 3 Weapon Masteries
  // depuis le gating plan 13.9). Le Barde laisse `isClassValid` passer dès
  // que la classe est posée → on peut filer direct à la step Ancestry pour
  // tester le gating ascendance que cette spec couvre.
  await page.getByRole('button', { name: /^Barde\b/i }).first().click();
  await wizardNext(page);
}

test.describe('Wizard — blocage avancement sans sous-choix d\'ascendance', () => {
  test('Drakéide sans dragonAncestry → Suivant désactivé', async ({ page }) => {
    await navigateToAncestryStep(page, { name: 'Test Drakéide Block' });

    // Étape 3 — Ascendance : choisir Drakéide.
    await page.getByRole('button', { name: /^Drakéide\b/i }).first().click();

    // La section sous-choix doit apparaître avec le RadioCardGroup
    // « Type de dragon ».
    await expect(
      page.getByRole('radiogroup', { name: /Type de dragon/i }),
    ).toBeVisible();

    // Le bouton « Suivant » doit être désactivé tant que le type n'est pas choisi.
    const next = nextButton(page);
    await expect(
      next,
      'Le bouton Suivant doit rester désactivé tant que dragonAncestry est en sentinelle.',
    ).toBeDisabled();

    // Choisir un type → bouton Suivant débloqué. `RadioCard` rend l'input
    // radio en `peer sr-only` (visuellement caché — la carte parent est ce
    // que l'utilisateur voit/clique). `force: true` permet à Playwright de
    // cibler l'input sans exiger sa visibilité (sinon le test exige `display`
    // qui n'est pas vrai sur sr-only).
    await page.getByRole('radio', { name: /Rouge/ }).click({ force: true });
    await expect(
      next,
      'Le bouton Suivant doit être réactivé une fois dragonAncestry posé.',
    ).toBeEnabled();
  });
});

/**
 * Garde « path le plus évident » — pour chaque ascendance à sub-choice, on
 * vérifie que le chooser RENDS EFFECTIVEMENT N options issues du bundle. Une
 * section vide muette (le bug UAT 13.8) ferait planter ces assertions immédiatement.
 *
 * Les chiffres viennent du bundle disque actuel (SRD 5.2.1) ; si l'extraction
 * évolue, ajustez ici ET dans `chooser-coverage-from-bundle.test.tsx`.
 */
test.describe('Wizard — comptage des options de sous-choix d\'ascendance (path évident)', () => {
  test('Drakéide → 10 cartes "type de dragon"', async ({ page }) => {
    await navigateToAncestryStep(page, { name: 'Test Drakéide Count' });
    await page.getByRole('button', { name: /^Drakéide\b/i }).first().click();
    const group = page.getByRole('radiogroup', { name: /Type de dragon/i });
    await expect(group).toBeVisible();
    await expect(group.getByRole('radio')).toHaveCount(10);
  });

  test('Goliath → 6 cartes "ascendance gigante"', async ({ page }) => {
    await navigateToAncestryStep(page, { name: 'Test Goliath Count' });
    await page.getByRole('button', { name: /^Goliath\b/i }).first().click();
    const group = page.getByRole('radiogroup', { name: /Ascendance gigante/i });
    await expect(group).toBeVisible();
    await expect(group.getByRole('radio')).toHaveCount(6);
  });

  test('Elfe → 3 cartes "lignage elfique"', async ({ page }) => {
    await navigateToAncestryStep(page, { name: 'Test Elfe Count' });
    await page.getByRole('button', { name: /^Elfe\b/i }).first().click();
    const group = page.getByRole('radiogroup', { name: /Lignage elfique/i });
    await expect(group).toBeVisible();
    await expect(group.getByRole('radio')).toHaveCount(3);
  });

  test('Gnome → 2 cartes "lignage gnome"', async ({ page }) => {
    await navigateToAncestryStep(page, { name: 'Test Gnome Count' });
    await page.getByRole('button', { name: /^Gnome\b/i }).first().click();
    const group = page.getByRole('radiogroup', { name: /Lignage gnome/i });
    await expect(group).toBeVisible();
    await expect(group.getByRole('radio')).toHaveCount(2);
  });

  test('Tieffelin → 3 cartes "héritage fiélon"', async ({ page }) => {
    await navigateToAncestryStep(page, { name: 'Test Tieffelin Count' });
    await page.getByRole('button', { name: /^Tieffelin\b/i }).first().click();
    const group = page.getByRole('radiogroup', { name: /Héritage fiélon/i });
    await expect(group).toBeVisible();
    await expect(group.getByRole('radio')).toHaveCount(3);
  });

  test('Humain → 18 cartes "compétence supplémentaire"', async ({ page }) => {
    await navigateToAncestryStep(page, { name: 'Test Humain Count' });
    await page.getByRole('button', { name: /^Humain\b/i }).first().click();
    const group = page.getByRole('radiogroup', { name: /Compétence supplémentaire/i });
    await expect(group).toBeVisible();
    await expect(group.getByRole('radio')).toHaveCount(18);
  });
});
