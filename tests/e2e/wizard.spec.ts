import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * Wizard — création d'un perso en < 2min (plan 13.5 step 10, dette e2e plan 05 step 24).
 *
 * On reprend le parcours du smoke central en y ajoutant l'assert de durée :
 * la création d'un perso minimal doit rester sous 120 secondes en local
 * (cible UAT plan 05 — « Lyralei créée en < 2min »).
 *
 * Pré-requis : émulateur Firebase actif (skip propre sinon).
 */
test.describe('Wizard — création rapide', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping wizard spec.',
    );
  });

  test('< 2 minutes pour créer un Magicien minimal', async ({ page }) => {
    const start = Date.now();

    await page.goto('/create');
    await waitForAppReady(page);

    await page.getByPlaceholder(/Nom de l['']aventurier/i).fill('Wizard Speed');
    await clickNext(page);

    await page.getByRole('button', { name: /^Magicien( |$)/i }).first().click();
    await clickNext(page);

    await page.getByRole('button', { name: /^Humain( |$)/i }).first().click();
    await clickNext(page);

    // Auto-fill abilities
    await page.getByRole('button', { name: /Auto.*remplir|✨.*Auto/i }).first().click();
    await clickNext(page);

    await page.getByRole('button', { name: /^Acolyte( |$)/i }).first().click();
    await clickNext(page);

    await page.getByRole('button', { name: /Auto.*remplir|✨.*Auto/i }).first().click();
    await clickNext(page);

    await page.getByRole('button', { name: /Auto.*remplir|✨.*Auto/i }).first().click();
    await clickNext(page);

    await page.getByRole('button', { name: /Auto.*remplir|✨.*Auto/i }).first().click();
    await clickNext(page);

    await page.getByRole('button', { name: /^Créer le personnage$/i }).click();
    await expect(page).toHaveURL(/\/character\/[A-Za-z0-9]+$/, { timeout: 15_000 });

    const durationMs = Date.now() - start;
    expect(
      durationMs,
      `Création d'un perso minimal doit rester < 120s (mesuré ${durationMs}ms). Si dépassé : régression UX (clics ajoutés, attentes async, etc.).`,
    ).toBeLessThan(120_000);
  });
});

async function clickNext(page: import('@playwright/test').Page): Promise<void> {
  const next = page
    .getByRole('button')
    .filter({ hasText: /^(Suivant\s+→?|→)$/ })
    .first();
  await expect(next).toBeEnabled({ timeout: 5_000 });
  await next.click();
}
