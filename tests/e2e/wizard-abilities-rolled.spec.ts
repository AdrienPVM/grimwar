import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { takeStepScreenshot } from './helpers/screenshot';

/**
 * JALON 2E — méthode 4d6 (garde les 3 meilleurs) avec sub-toggle « L'app
 * lance » vs « Je lance avec mes dés (IRL) ».
 *
 * Couvre :
 *   1. La 4ème méthode existe dans le wizard et déclenche l'apparition du
 *      sub-toggle de source.
 *   2. App-rolled : le bouton « Lancer 4d6… » peuple les 6 caractéristiques
 *      avec un score dans la plage [3, 18] et affiche le détail du jet.
 *   3. Manuel : le bouton « Lancer » disparaît et les 6 inputs deviennent
 *      éditables (le joueur saisit ses propres dés).
 *
 * Pré-requis : émulateur Firebase actif. Sans lui, la route `/create`
 * peut échouer côté chargement perso — on skip pour rester en lockstep
 * avec les autres specs e2e du projet.
 */
test.describe('Wizard abilities — méthode rolled (JALON 2E)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping wizard-abilities-rolled spec.',
    );
  });

  test('4d6 app-rolled puis bascule manuel — capture UAT jalon 2E', async ({
    page,
  }, testInfo) => {
    await page.goto('/create');
    await waitForAppReady(page);

    // On remonte rapidement jusqu'à la step Caractéristiques. Le parcours
    // identité → classe → ascendance est volontairement minimal et identique
    // au smoke (Magicien + Humain) pour rester déterministe.
    await page.getByPlaceholder(/Nom de l['']aventurier/i).fill('Tireur 2E');
    await clickNext(page);

    await page.getByRole('button', { name: /^Magicien( |$)/i }).first().click();
    const inscribedCheckboxes = page.locator('input[id^="wizard-inscribed-"]');
    await inscribedCheckboxes.first().waitFor({ state: 'attached', timeout: 5_000 });
    for (let i = 0; i < 6; i++) {
      await inscribedCheckboxes.nth(i).check({ force: true });
    }
    await clickNext(page);

    await page.getByRole('button', { name: /^Humain( |$)/i }).first().click();
    const sizeMoyenne = page.getByRole('radio', { name: /^Moyenne/i }).first();
    await sizeMoyenne.scrollIntoViewIfNeeded();
    await sizeMoyenne.check({ force: true });
    const acrobaties = page.getByRole('radio', { name: /^Acrobaties$/i }).first();
    await acrobaties.scrollIntoViewIfNeeded();
    await acrobaties.check({ force: true });
    await clickNext(page);

    // Étape Caractéristiques — méthode par défaut = standard-array. On
    // capture cet état initial pour comparer le before/after avec rolled.
    await expect(
      page.getByRole('radio', { name: /4d6 \(garde les 3 meilleurs\)/i }),
    ).toBeVisible();
    await takeStepScreenshot(page, testInfo, '01-abilities-default');

    // Bascule sur la méthode rolled : le sub-toggle de source doit apparaître.
    await page
      .getByRole('radio', { name: /4d6 \(garde les 3 meilleurs\)/i })
      .check({ force: true });
    await expect(
      page.getByRole('radio', { name: /L['']app lance les dés/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('radio', { name: /Je lance avec mes dés/i }),
    ).toBeVisible();
    await takeStepScreenshot(page, testInfo, '02-rolled-app-empty');

    // App-rolled : lancer les 4d6. Les 6 caractéristiques doivent recevoir
    // un score dans [3, 18] + le breakdown doit s'afficher 6 fois.
    await page.getByRole('button', { name: /Lancer 4d6/i }).click();
    const breakdowns = page.getByText(/Détail du jet/i);
    await expect(breakdowns).toHaveCount(6);
    await takeStepScreenshot(page, testInfo, '03-rolled-app-after-roll');

    // Reroll : le bouton bascule en « Relancer ».
    await expect(page.getByRole('button', { name: /Relancer/i })).toBeVisible();

    // Bascule sur manuel : le bouton de roll disparaît, les NumberInputs
    // deviennent éditables (3-18).
    await page
      .getByRole('radio', { name: /Je lance avec mes dés/i })
      .check({ force: true });
    await expect(page.getByRole('button', { name: /Lancer 4d6/i })).toHaveCount(0);
    const forceInput = page.getByRole('spinbutton', { name: /^Force$/i }).first();
    await expect(forceInput).toBeVisible();
    await expect(forceInput).toHaveAttribute('min', '3');
    await expect(forceInput).toHaveAttribute('max', '18');
    await takeStepScreenshot(page, testInfo, '04-rolled-manual');
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
