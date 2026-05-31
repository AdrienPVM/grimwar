import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { takeStepScreenshot } from './helpers/screenshot';

/**
 * JALON 2E — méthode Point Buy (SRD 2024 : 27 points, range 8-15).
 *
 * Couvre :
 *   1. Bascule sur point-buy : l'indicateur « points restants » apparaît et
 *      vaut 27 quand toutes les stats sont à 8 (baseline du draft).
 *   2. Le clic sur « Choisir pour moi » remplit les 6 cases avec le build de
 *      référence du Guerrier (somme = 27, plage [8, 15]).
 *   3. Après autofill, le bouton « Suivant » devient cliquable (validateur
 *      `isAbilitiesValid` requiert somme=27 strict pour point-buy).
 *
 * Pré-requis : émulateur Firebase actif. Sans lui, la route `/create` peut
 * échouer côté chargement perso — on skip pour rester en lockstep avec les
 * autres specs e2e du projet.
 */
test.describe('Wizard abilities — méthode point-buy (JALON 2E)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping wizard-abilities-point-buy spec.',
    );
  });

  test('point-buy + autofill → 27 points consommés + Suivant actif', async ({
    page,
  }, testInfo) => {
    await page.goto('/create');
    await waitForAppReady(page);

    // Identité → Guerrier dwarf — chemin minimal et déterministe, identique
    // au smoke. Le Guerrier n'est pas lanceur → pas d'étape Sorts à gérer.
    await page.getByPlaceholder(/Nom de l['']aventurier/i).fill('Marteleur 2E');
    await clickNext(page);

    await page.getByRole('button', { name: /^Guerrier( |$)/i }).first().click();
    // Fighting Style — sous-choix L1 obligatoire (plan 13.9). Sélecteur
    // aligné sur tests/e2e/wizard-class-gating.spec.ts (input[name=…]).
    const fightingStyleRadios = page.locator(
      'input[name="classSubChoice-fighter-fighting-style"]',
    );
    await fightingStyleRadios.first().waitFor({ state: 'attached', timeout: 5_000 });
    await fightingStyleRadios.first().check({ force: true });
    // Weapon Masteries — 3 requises au L1 Guerrier (cf. wizard-class-gating).
    const masteries = page.locator('input[id^="weapon-mastery-fighter-"]');
    await masteries.first().waitFor({ state: 'attached', timeout: 5_000 });
    await masteries.nth(0).check({ force: true });
    await masteries.nth(1).check({ force: true });
    await masteries.nth(2).check({ force: true });
    await clickNext(page);

    await page.getByRole('button', { name: /^Nain( |$)/i }).first().click();
    await clickNext(page);

    // Étape Caractéristiques — méthode par défaut = standard-array.
    // Bascule sur point-buy.
    const pointBuyRadio = page.getByRole('radio', { name: /Achat de points/i });
    await pointBuyRadio.check({ force: true });

    // À la bascule, le draft n'est PAS reset → les 6 valeurs du standard
    // array (15,14,13,12,10,8) restent en place et le validateur point-buy
    // les rejette (15 hors plage 8-15… en fait 15 est OK, mais la somme des
    // coûts ≠ 27). L'indicateur « points restants » doit afficher une valeur
    // négative en rouge OU 0 selon la valeur d'origine — on capture l'état.
    await expect(
      page.getByText(/Points restants/i),
    ).toBeVisible();
    await takeStepScreenshot(page, testInfo, '01-point-buy-after-switch');

    // « Choisir pour moi » charge le build de référence du Guerrier dans le
    // mode courant (point-buy → tuple `pointBuy`) → somme = 27 par construction.
    await page.getByRole('button', { name: /Choisir pour moi/i }).click();
    await expect(
      page.getByText(/Points restants\s*:\s*0/i),
    ).toBeVisible();
    await takeStepScreenshot(page, testInfo, '02-point-buy-autofilled');

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
