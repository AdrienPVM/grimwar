import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { takeStepScreenshot } from './helpers/screenshot';
import { rogueL1Expertise, seedCharacter } from './seed-character';

/**
 * Class Rogue — render Essence des compétences avec Expertise (plan 13.9
 * commit 5 — couverture par classe matricielle, suite à 4e).
 *
 * Plan 13.9 step 36 — render Expertise sur la fiche. La structure de données
 * est : `characterClasses[rogue].expertiseSkills: string[]` (les slugs choisis
 * au wizard à l'étape Compétences, sous-choix optionB) + `character.skills`
 * (Record<skillId, 0 | 1 | 2>) calculé via `buildSkillProficiencies` qui
 * écrit `2` pour les slugs Expertise et `1` pour la maîtrise simple.
 *
 * Ce que la spec vérifie côté fiche (cat. 2 + 4 + 6 de la testing policy
 * 2026-05-19) :
 *   - Cat. 2 (identité) : chaque compétence avec Expertise rend un
 *     indicateur `aria-label="Expertise"` (losange), distinct de
 *     `aria-label="Maîtrise"` (cercle).
 *   - Cat. 4 (calculs de règles) : les modificateurs affichés sont
 *     EXACTEMENT ceux attendus par le SRD : `+6` Discrétion/Escamotage
 *     (Dex+2 + Expertise PB×2 = +6), `+4` Acrobaties (Dex+2 + PB = +4),
 *     `+2` Perception (Sag 0 + PB = +2). Bonus de maîtrise L1 = +2.
 *   - Cat. 6 (cas-limite) : le background `criminal` donne Discrétion
 *     ET Escamotage en maîtrise simple. Le Roublard L1 pose Expertise
 *     sur ces 2 mêmes compétences (overlap volontaire). Le résultat
 *     final est `2` (Expertise), pas `3` — le système ne stacke pas
 *     les sources, il prend le max. Si un bug réintroduisait le stacking,
 *     l'indicateur ou le chiffre changerait et la spec rougit.
 *
 * Pré-requis : émulateur Firebase actif (`pnpm e2e:emulators`). Sans
 * émulateur, le test skip proprement.
 */
test.describe('Class Rogue — render Essence (Expertise sur compétences)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping class-rogue-expertise.',
    );
  });

  test('Roublard L1 → Essence → Discrétion + Escamotage marquées Expertise (losange), Acrobaties + Perception en maîtrise simple', async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, rogueL1Expertise);
    await page.goto(`/character/${charId}`);

    await expect(
      page.getByText(rogueL1Expertise.name).first(),
      'Hero card doit afficher le nom du Roublard seedé.',
    ).toBeVisible({ timeout: 10_000 });
    await takeStepScreenshot(page, testInfo, 'sheet-loaded');

    // Switch Essence.
    await page.getByRole('tab', { name: /^Essence$/i }).click();
    const panel = page.locator('#sheet-mode-panel-essence');
    await expect(panel, 'Panel Essence doit être rendu.').toBeVisible();
    await takeStepScreenshot(page, testInfo, 'essence-tab');

    // ──────────────────────────────────────────────────────────────────
    // Cat. 6 (cas-limite) — Discrétion + Escamotage portent l'Expertise
    // (losange), pas la maîtrise simple. Background `criminal` les avait
    // donnés en maîtrise simple, l'Expertise du Roublard surclasse à 2 —
    // pas de stacking 1 + 2 = 3.
    // ──────────────────────────────────────────────────────────────────

    // Récupérer les <li> de Discrétion + Escamotage (uniques par nom FR).
    const stealthRow = panel
      .getByRole('button')
      .filter({ hasText: /^Discrétion/ })
      .first();
    const sleightRow = panel
      .getByRole('button')
      .filter({ hasText: /^Escamotage/ })
      .first();
    await expect(stealthRow, 'Ligne Discrétion doit être présente.').toBeVisible();
    await expect(sleightRow, 'Ligne Escamotage doit être présente.').toBeVisible();

    // Indicateur Expertise = losange, aria-label="Expertise".
    await expect(
      stealthRow.locator('[aria-label="Expertise"]'),
      'Discrétion doit porter l\'indicateur Expertise (losange).',
    ).toBeVisible();
    await expect(
      sleightRow.locator('[aria-label="Expertise"]'),
      'Escamotage doit porter l\'indicateur Expertise (losange).',
    ).toBeVisible();
    // Test négatif : pas d'indicateur Maîtrise simple sur ces 2 lignes
    // (sinon ça voudrait dire que le rendu mélange les deux).
    await expect(stealthRow.locator('[aria-label="Maîtrise"]')).toHaveCount(0);
    await expect(sleightRow.locator('[aria-label="Maîtrise"]')).toHaveCount(0);

    // ──────────────────────────────────────────────────────────────────
    // Cat. 2 (identité) — Acrobaties + Perception portent maîtrise simple
    // (cercle, aria-label="Maîtrise"). Pas Expertise (sinon le rendu
    // mélange les sources).
    // ──────────────────────────────────────────────────────────────────
    const acroRow = panel
      .getByRole('button')
      .filter({ hasText: /^Acrobaties/ })
      .first();
    const percRow = panel
      .getByRole('button')
      .filter({ hasText: /^Perception/ })
      .first();
    await expect(
      acroRow.locator('[aria-label="Maîtrise"]'),
      'Acrobaties doit porter l\'indicateur Maîtrise (cercle).',
    ).toBeVisible();
    await expect(
      percRow.locator('[aria-label="Maîtrise"]'),
      'Perception doit porter l\'indicateur Maîtrise (cercle).',
    ).toBeVisible();

    // ──────────────────────────────────────────────────────────────────
    // Cat. 4 (calculs de règles) — chiffres EXACTS vérifiés contre le SRD.
    //   Dex 14 → +2, Sag 10 → 0, PB L1 → +2.
    //   Stealth / sleight-of-hand = +2 + 2×2 (Expertise) = +6.
    //   Acrobatics = +2 + 2 (maîtrise) = +4.
    //   Perception = 0 + 2 (maîtrise) = +2.
    // ──────────────────────────────────────────────────────────────────
    await expect(stealthRow).toContainText('+6');
    await expect(sleightRow).toContainText('+6');
    await expect(acroRow).toContainText('+4');
    await expect(percRow).toContainText('+2');

    await takeStepScreenshot(page, testInfo, 'skills-list-expertise');
  });
});
