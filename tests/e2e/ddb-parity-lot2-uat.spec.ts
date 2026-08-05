import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { rogueL1Expertise, seedCharacter, wizardL5DamageD1 } from './seed-character';

/**
 * UAT — lot 2 de parité : ossature de chargement et bascule entre personnages.
 *
 * L'ossature est par nature FUGACE : elle disparaît dès que les données
 * arrivent, ce qui la rend impossible à capturer par un simple `goto`. On
 * retarde donc délibérément la réponse réseau du contenu public le temps de la
 * photographier — c'est le seul moyen de juger une silhouette d'attente.
 */

async function uatShot(
  page: Page,
  name: string,
  opts: { viewport?: boolean } = {},
): Promise<void> {
  const dir = 'uat-review';
  mkdirSync(dir, { recursive: true });
  await page.screenshot({
    path: path.join(dir, `${name}.png`),
    fullPage: !opts.viewport,
    animations: 'disabled',
  });
}

test.describe('UAT — ossature de chargement et bascule de personnage', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(!ok, 'Firestore emulator unreachable. Run `pnpm e2e:emulators`.');
  });

  test('le Codex montre la silhouette de ses rangées pendant qu’il charge', async ({
    page,
  }) => {
    // On retient les bundles pour figer l'écran d'attente sous l'objectif.
    await page.route('**/data/spells.json', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      await route.continue();
    });
    await page.goto('/codex');
    await waitForAppReady(page);

    const skeleton = page.locator('.skeleton').first();
    await expect(skeleton).toBeVisible();
    // L'attente est NOMMÉE pour les lecteurs d'écran, pas seulement dessinée.
    await expect(
      page.getByText('Invocation du contenu…', { exact: true }),
    ).toHaveCount(1);
    await uatShot(page, '05-ossature-codex', { viewport: true });
  });

  test('le nom du personnage ouvre les autres fiches', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, rogueL1Expertise);
    await seedCharacter(page, wizardL5DamageD1);

    await page.goto(`/character/${charId}`);
    await expect(page.getByText(rogueL1Expertise.name).first()).toBeVisible({
      timeout: 10_000,
    });

    const trigger = page.getByTestId('character-switcher-trigger');
    await expect(trigger).toBeVisible();
    await uatShot(page, '06-nom-devenu-bascule');

    await trigger.click();
    const options = page.getByTestId('character-switcher-option');
    await expect(options).toHaveCount(1);
    await uatShot(page, '07-choix-de-personnage', { viewport: true });

    await options.first().click();
    // On arrive bien sur l'AUTRE fiche.
    await expect(page.getByText(wizardL5DamageD1.name).first()).toBeVisible({
      timeout: 10_000,
    });
    expect(page.url()).not.toContain(charId);
  });
});
