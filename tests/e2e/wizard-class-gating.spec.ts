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

  /**
   * Roublard — subtilité « Option B » de 13.9 (plan + UAT 2026-05-18).
   *
   * Le chooser Expertise du Roublard est rendu à l'étape **Compétences**,
   * PAS à l'étape Classe. Raison : le pool des compétences éligibles dépend
   * du background + ancestry-extra-skill + picks-de-classe, dont aucun
   * n'est encore arrêté à l'étape Classe. Mettre le chooser à Classe ferait
   * une bannière « panne » trompeuse (pool vide structurel).
   *
   * NB pour le gating Class step : le Roublard a quand même un sous-choix
   * de classe à L1 — Weapon Mastery (2 armes, parité Guerrier). C'est ce
   * sous-choix qui gate Suivant ici, PAS l'Expertise. La subtilité Option
   * B porte uniquement sur l'Expertise, qui doit être absente du Class
   * step et ne bloque rien tant qu'on n'a pas avancé à Compétences.
   *
   * Le gating réel de l'Expertise (Skills step) est couvert par les
   * tests jsdom de `rogue-expertise-flow.test.tsx` (notamment `isSkillsValid :
   * Roublard est INVALIDE tant que expertiseSkills.length < 2`) — ce qui
   * évite un e2e long traversant 6 étapes du wizard juste pour atterrir
   * à Compétences. La couverture matricielle est complète : e2e ici pour
   * la subtilité Class-step (présence Weapon Mastery + absence Expertise),
   * jsdom là-bas pour le gating Skills-step.
   */
  test('Roublard : gate sur Weapon Mastery (2 armes) à Classe, AUCUN chooser Expertise à Classe (subtilité Option B)', async ({
    page,
  }) => {
    await goToClassStep(page, 'Roublard Gating');

    await page.getByRole('button', { name: /^Roublard( |$)/i }).first().click();
    await expectNextDisabled(page);

    // Test négatif (subtilité Option B) : AUCUN input rogue-expertise-*
    // n'est rendu à l'étape Classe — c'est précisément ce qui distingue ce
    // chooser des autres et constitue la subtilité. Si une régression
    // réintroduisait le chooser Expertise ici, les locators matcheraient
    // et la spec rougit.
    await expect(
      page.locator('input[id^="rogue-expertise-"]'),
      'Aucun input rogue-expertise-* ne doit exister à l\'étape Classe (Option B — chooser vit à Compétences, là où le pool est calculable).',
    ).toHaveCount(0);
    // L'étape Classe affiche au plus un `ChooserDependencyHint` (texte
    // explicatif), pas le vrai `<RogueExpertiseChooser>` (qui rendrait un
    // `<input>`). Locator générique sur le mot « Expertise » NON suffisant
    // (les autres choosers peuvent le mentionner via help/labels) — c'est
    // la présence des inputs qui prouve le rendu actif du chooser.

    // Pose les 2 Weapon Masteries du Roublard → Suivant doit s'activer
    // (parité Guerrier : Weapon Mastery est un sous-choix de Classe step,
    // 2 armes pour le Roublard vs 3 pour le Guerrier).
    const weaponMasteries = page.locator('input[id^="weapon-mastery-rogue-"]');
    await weaponMasteries
      .first()
      .waitFor({ state: 'attached', timeout: 5_000 });
    await weaponMasteries.nth(0).check({ force: true });
    await expectNextDisabled(page);
    await weaponMasteries.nth(1).check({ force: true });
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
