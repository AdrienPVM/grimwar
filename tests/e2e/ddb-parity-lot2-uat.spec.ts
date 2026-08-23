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

  test('un filtre actif du Codex porte son anneau entier', async ({ page }) => {
    // Bug d'UAT : l'anneau `ring-1` d'un chip actif était coupé net en haut et
    // en bas. Cause : poser `overflow-x: auto` fait recalculer l'autre axe par
    // la spec, et la rangée se mettait à rogner verticalement.
    await page.goto('/codex');
    await waitForAppReady(page);
    await page.getByRole('tab', { name: /Sorts/i }).click();

    const chip = page.getByRole('button', { name: /^Niveau 1$/i }).first();
    await chip.click();
    // L'anneau vit HORS de la boîte : sa présence se vérifie en constatant que
    // la rangée réserve de la place au-dessus et en dessous du chip.
    const room = await chip.evaluate((el) => {
      const row = el.parentElement!;
      const rowBox = row.getBoundingClientRect();
      const chipBox = el.getBoundingClientRect();
      return {
        top: chipBox.top - rowBox.top,
        bottom: rowBox.bottom - chipBox.bottom,
      };
    });
    expect(room.top).toBeGreaterThanOrEqual(2);
    expect(room.bottom).toBeGreaterThanOrEqual(2);
    await uatShot(page, '01-codex-filtre-actif-anneau-entier');
  });

  test('l’assistant ne laisse plus de bande vide à droite', async ({ page }) => {
    // Bug d'UAT : la capture pleine page montrait une bande vide à droite.
    // 466 px de contenu défilable pour un viewport de 412 px, à cause d'une
    // infobulle fermée mais toujours dans le flux.
    await page.goto('/create');
    await waitForAppReady(page);
    const width = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scrollable: document.body.scrollWidth,
    }));
    expect(width.scrollable).toBeLessThanOrEqual(width.client + 1);
    await uatShot(page, '02-assistant-sans-bande-vide');
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
    await uatShot(page, '07-ossature-codex', { viewport: true });
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
    await uatShot(page, '08-nom-devenu-bascule');

    await trigger.click();
    const options = page.getByTestId('character-switcher-option');
    await expect(options).toHaveCount(1);
    await uatShot(page, '09-choix-de-personnage', { viewport: true });

    await options.first().click();
    // On arrive bien sur l'AUTRE fiche.
    await expect(page.getByText(wizardL5DamageD1.name).first()).toBeVisible({
      timeout: 10_000,
    });
    expect(page.url()).not.toContain(charId);
  });
});
