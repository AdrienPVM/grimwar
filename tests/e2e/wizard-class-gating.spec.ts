import { expect, test } from '@playwright/test';

import { waitForAppReady } from './fixtures';

/**
 * Gating wizard step Classe — toggle Suivant désactivé → actif (plan 13.9).
 *
 * **Pourquoi cette spec existe** :
 * Les 39 tests unitaires (`wizard-validation-class-sub-choices.test.ts` +
 * `submit-from-wizard-class-sub-choices.test.ts`) prouvent que `isClassValid`
 * et `buildCharacterFromWizard` rejettent les drafts incomplets. Mais ils ne
 * prouvent PAS que ces fonctions sont bien câblées au bouton Suivant rendu.
 *
 * C'est exactement le trou qui a coûté le bug Roublard plan 13.9 (cf.
 * CLAUDE.md « Couverture matricielle obligatoire... un test qui appelle
 * isClassValid() avec un draft fabriqué n'est pas pareil qu'un test qui
 * parcourt réellement le wizard et observe le bouton Suivant »).
 *
 * **Discipline rouge-avant-vert** : chaque cas assert d'abord `disabled` AVANT
 * de poser le sous-choix, puis `enabled` APRÈS. Un test qui n'asserte que
 * `enabled` à la fin laisserait passer un faux-vert si le bouton avait été
 * activé en permanence par une régression du câblage.
 *
 * **Couverture choisie** : 3 patterns représentatifs, pas 9 mirrors :
 *   - Magicien : sous-choix = liste de checkboxes (`wizardSpellbookL1`, 6 sorts).
 *   - Guerrier : combo radio + checkboxes (`fighterFightingStyle` ET
 *     `weaponMasteries` ≥ 3 — gating doit rester partiel tant que les deux
 *     n'ont pas fini d'être posés).
 *   - Clerc : radio simple (`clericDivineOrder`).
 * Barbare/Paladin/Rôdeur/Druide/Occultiste/Roublard sont des mirrors
 * structurels (radio simple ou liste seule) — couvrir 3 archétypes suffit.
 *
 * **Pas d'émulateur requis** : on s'arrête à la step Class, pas de submit
 * Firestore. Pattern identique à `wizard-modal.spec.ts`.
 */

test.describe('Wizard — gating Class step', () => {
  test('Magicien : Suivant désactivé tant que 6 sorts non inscrits, actif après', async ({
    page,
  }) => {
    await goToClassStep(page, 'Magicien Gating');

    // Pick Magicien — le chooser grimoire L1 apparaît.
    await page.getByRole('button', { name: /^Magicien( |$)/i }).first().click();

    // Suivant doit être DÉSACTIVÉ tant que < 6 inscrits.
    await expectNextDisabled(page);

    // Cocher 5 sorts ne suffit pas.
    const inscribed = page.locator('input[id^="wizard-inscribed-"]');
    await inscribed.first().waitFor({ state: 'attached', timeout: 5_000 });
    for (let i = 0; i < 5; i++) {
      await inscribed.nth(i).check({ force: true });
    }
    await expectNextDisabled(page);

    // Cocher le 6e bascule Suivant en ACTIF.
    await inscribed.nth(5).check({ force: true });
    await expectNextEnabled(page);
  });

  test('Guerrier : Suivant désactivé jusqu\'à Fighting Style + 3 Weapon Masteries', async ({
    page,
  }) => {
    await goToClassStep(page, 'Guerrier Gating');

    await page.getByRole('button', { name: /^Guerrier( |$)/i }).first().click();
    await expectNextDisabled(page);

    // Pose le Fighting Style → toujours désactivé (Weapon Masteries manquent).
    const fightingStyleRadios = page.locator(
      'input[name="classSubChoice-fighter-fighting-style"]',
    );
    await fightingStyleRadios.first().waitFor({ state: 'attached', timeout: 5_000 });
    await fightingStyleRadios.first().check({ force: true });
    await expectNextDisabled(page);

    // Pose 2 Weapon Masteries (sur 3 requis) → toujours désactivé.
    const weaponMasteries = page.locator('input[id^="weapon-mastery-fighter-"]');
    await weaponMasteries.first().waitFor({ state: 'attached', timeout: 5_000 });
    await weaponMasteries.nth(0).check({ force: true });
    await weaponMasteries.nth(1).check({ force: true });
    await expectNextDisabled(page);

    // Pose la 3e → ACTIF.
    await weaponMasteries.nth(2).check({ force: true });
    await expectNextEnabled(page);
  });

  test('Clerc : Suivant désactivé tant que Divine Order non posé, actif après', async ({
    page,
  }) => {
    await goToClassStep(page, 'Clerc Gating');

    await page.getByRole('button', { name: /^Clerc( |$)/i }).first().click();
    await expectNextDisabled(page);

    const divineOrderRadios = page.locator(
      'input[name="classSubChoice-cleric-divine-order"]',
    );
    await divineOrderRadios.first().waitFor({ state: 'attached', timeout: 5_000 });
    await divineOrderRadios.first().check({ force: true });
    await expectNextEnabled(page);
  });
});

/**
 * Va à la step Class (étape 2) en remplissant juste le nom à l'Identity step.
 * Pas besoin d'émulateur : aucune écriture Firestore avant Recap.
 */
async function goToClassStep(
  page: import('@playwright/test').Page,
  name: string,
): Promise<void> {
  await page.goto('/create');
  await waitForAppReady(page);
  await page.getByPlaceholder(/Nom de l['']aventurier/i).fill(name);
  await nextButton(page).click();
}

function nextButton(page: import('@playwright/test').Page) {
  return page
    .getByRole('button')
    .filter({ hasText: /^(Suivant\s+→?|→)$/ })
    .first();
}

async function expectNextDisabled(page: import('@playwright/test').Page): Promise<void> {
  await expect(
    nextButton(page),
    'Le bouton « Suivant » doit être DÉSACTIVÉ tant que les sous-choix de classe niveau 1 SRD ne sont pas tous posés. Si actif ici, isClassValid n\'est pas câblé au bouton (régression du wiring).',
  ).toBeDisabled({ timeout: 2_000 });
}

async function expectNextEnabled(page: import('@playwright/test').Page): Promise<void> {
  await expect(
    nextButton(page),
    'Le bouton « Suivant » doit être ACTIF dès que tous les sous-choix L1 sont posés. Si désactivé ici, areAllClassStepSubChoicesCompleted ne reconnaît pas la complétion.',
  ).toBeEnabled({ timeout: 2_000 });
}
