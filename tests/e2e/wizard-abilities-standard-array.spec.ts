import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { takeStepScreenshot } from './helpers/screenshot';

/**
 * JALON 2E — méthode Standard Array (SRD : 15/14/13/12/10/8 distribués
 * exactement, sans doublon ni omission).
 *
 * Couvre :
 *   1. Standard Array est la méthode par défaut → la step expose 6 dropdowns
 *      `<select>` (un par caractéristique) plutôt que des NumberInputs.
 *   2. Le bouton « Choisir pour moi » distribue le tuple `standardArray` du
 *      build de référence Guerrier → `isAbilitiesValid` accepte (sorted ≡
 *      STANDARD_ARRAY sorted).
 *   3. Le bouton « Suivant » devient actif après autofill.
 *
 * Pré-requis : émulateur Firebase actif. Sans lui, la route `/create` peut
 * échouer côté chargement perso — on skip pour rester en lockstep avec les
 * autres specs e2e du projet.
 */
test.describe('Wizard abilities — méthode standard-array (JALON 2E)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping wizard-abilities-standard-array spec.',
    );
  });

  test('standard-array par défaut + autofill → Suivant actif', async ({
    page,
  }, testInfo) => {
    await page.goto('/create');
    await waitForAppReady(page);

    // Identité → Guerrier dwarf — chemin minimal et déterministe.
    await page.getByPlaceholder(/Nom de l['']aventurier/i).fill('Tableau 2E');
    await clickNext(page);

    await page.getByRole('button', { name: /^Guerrier( |$)/i }).first().click();
    // Sélecteurs alignés sur tests/e2e/wizard-class-gating.spec.ts.
    const fightingStyleRadios = page.locator(
      'input[name="classSubChoice-fighter-fighting-style"]',
    );
    await fightingStyleRadios.first().waitFor({ state: 'attached', timeout: 5_000 });
    await fightingStyleRadios.first().check({ force: true });
    // Weapon Masteries — 3 requises au L1 Guerrier.
    const masteries = page.locator('input[id^="weapon-mastery-fighter-"]');
    await masteries.first().waitFor({ state: 'attached', timeout: 5_000 });
    await masteries.nth(0).check({ force: true });
    await masteries.nth(1).check({ force: true });
    await masteries.nth(2).check({ force: true });
    await clickNext(page);

    await page.getByRole('button', { name: /^Nain( |$)/i }).first().click();
    await clickNext(page);

    // Étape Caractéristiques — méthode par défaut = standard-array.
    await expect(
      page.getByRole('radio', { name: /Tableau standard/i }),
    ).toBeChecked();
    // 6 dropdowns Select natifs (un par ability).
    await expect(page.locator('select')).toHaveCount(6);
    await takeStepScreenshot(page, testInfo, '01-standard-array-default');

    // Autofill avec le build de référence Guerrier → tuple standardArray
    // appliqué dans l'ordre FOR/DEX/CON/INT/SAG/CHA. `isAbilitiesValid`
    // exige le multiset {15,14,13,12,10,8} → validateur OK.
    await page.getByRole('button', { name: /Choisir pour moi/i }).click();
    await takeStepScreenshot(page, testInfo, '02-standard-array-autofilled');

    // Validation passée → le bouton Suivant doit être actif.
    const next = page
      .getByRole('button')
      .filter({ hasText: /^(Suivant\s+→?|→)$/ })
      .first();
    await expect(next).toBeEnabled({ timeout: 5_000 });
  });
});

async function clickNext(page: import('@playwright/test').Page): Promise<void> {
  // Le wizard rend 2 boutons « Next » : desktop (« Suivant → ») masqué <md, et
  // mobile (« → » seul) toujours visible. La regex matche les 2 — first() pioche
  // celui qui est actif au breakpoint courant. Pattern aligné sur
  // tests/e2e/wizard.spec.ts.
  const next = page
    .getByRole('button')
    .filter({ hasText: /^(Suivant\s+→?|→)$/ })
    .first();
  await expect(next).toBeEnabled({ timeout: 5_000 });
  await next.click();
}
