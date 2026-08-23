import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { seedCharacter, wizardL1Grimoire } from './seed-character';

/**
 * Lot « parité D&D Beyond » — les quatre manques structurels d'UI/UX relevés
 * en comparant notre app à la leur.
 *
 * Ce que la spec prouve, dans l'ordre où on veut le juger :
 *   1. **Barre de navigation basse** — les trois espaces à portée de pouce, et
 *      son effacement sur les écrans immersifs (fiche, assistant, carte).
 *   2. **Rail desktop** — les mêmes destinations en haut à `lg+`, la barre
 *      basse effacée.
 *   3. **Restauration du défilement** — on quitte une liste défilée, on revient,
 *      on retrouve sa place.
 *   4. **Carte « En dehors de ton action »** — l'action Bonus et la Réaction
 *      visibles depuis le mode Combat.
 *
 * Sans émulateur, la spec se skip proprement.
 */

async function uatShot(page: Page, name: string, opts: { viewport?: boolean } = {}): Promise<void> {
  const dir = 'uat-review';
  mkdirSync(dir, { recursive: true });
  await page.screenshot({
    path: path.join(dir, `${name}.png`),
    fullPage: !opts.viewport,
    animations: 'disabled',
  });
}

test.describe('UAT — parité D&D Beyond : navigation et économie d’action', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+).',
    );
  });

  test('la barre basse porte les trois espaces et s’efface là où elle gênerait', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForAppReady(page);

    const bottomNav = page.getByRole('navigation', { name: 'Espaces principaux' });
    await expect(bottomNav).toBeVisible();
    await expect(bottomNav.getByRole('link', { name: /Personnages/ })).toBeVisible();
    await expect(bottomNav.getByRole('link', { name: /Campagnes/ })).toBeVisible();
    await expect(bottomNav.getByRole('link', { name: /Codex/ })).toBeVisible();
    // La destination courante est annoncée, pas seulement colorée.
    await expect(bottomNav.getByRole('link', { name: /Personnages/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await uatShot(page, '01-accueil-barre-basse');

    // Elle suit d'un espace à l'autre, sans repasser par l'accueil.
    await bottomNav.getByRole('link', { name: /Codex/ }).click();
    await expect(page).toHaveURL(/\/codex$/);
    await expect(bottomNav.getByRole('link', { name: /Codex/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await uatShot(page, '02-codex-barre-basse', { viewport: true });

    // Assistant de création : tâche tunnélisée, la barre disparaît.
    await page.goto('/create');
    await waitForAppReady(page);
    await expect(page.getByRole('navigation', { name: 'Espaces principaux' })).toHaveCount(0);
    await uatShot(page, '03-assistant-sans-barre');
  });

  test('la fiche garde son menu radial seul en bas', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, wizardL1Grimoire);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(wizardL1Grimoire.name).first()).toBeVisible({ timeout: 10_000 });

    // Deux surfaces flottantes au pouce, c'est un tap sur deux qui part
    // ailleurs — la barre s'efface donc au profit du menu radial.
    await expect(page.getByRole('navigation', { name: 'Espaces principaux' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Ouvrir le menu/i })).toBeVisible();
    await uatShot(page, '04-fiche-menu-radial-seul', { viewport: true });
  });

  test('« En dehors de ton action » remonte l’action Bonus et la Réaction', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, wizardL1Grimoire);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(wizardL1Grimoire.name).first()).toBeVisible({ timeout: 10_000 });

    const card = page.getByRole('heading', { name: 'En dehors de ton action' });
    await expect(card).toBeVisible();
    // L'attaque d'Opportunité est là pour tout le monde — terme du SRD FR.
    await expect(page.getByText('Attaque d’Opportunité')).toBeVisible();
    await uatShot(page, '05-combat-en-dehors-de-ton-action');
  });

  test('le rail desktop remplace la barre basse à lg+', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await waitForAppReady(page);

    // Une seule des deux surfaces est dans l'arbre d'accessibilité à la fois :
    // `lg:hidden` retire la barre basse du rendu, `hidden lg:flex` révèle le rail.
    await expect(page.getByRole('navigation', { name: 'Espaces principaux' })).toHaveCount(0);
    await page.goto('/codex');
    await waitForAppReady(page);
    await expect(page.getByRole('link', { name: /^Campagnes$/ })).toBeVisible();
    await uatShot(page, '06-rail-desktop', { viewport: true });
  });

  test('le retour retrouve la place qu’on avait dans la liste', async ({ page }) => {
    // Navigation INTERNE de bout en bout : `page.goto` direct puis `goBack`
    // sortirait de l'application (about:blank), la remonterait à neuf, et ne
    // mesurerait rien du comportement qu'on veut prouver.
    await page.goto('/');
    await waitForAppReady(page);
    const bottomNav = page.getByRole('navigation', { name: 'Espaces principaux' });
    await bottomNav.getByRole('link', { name: /Codex/ }).click();
    await expect(page).toHaveURL(/\/codex$/);
    await page.waitForTimeout(600);

    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(400);
    const before = await page.evaluate(() => window.scrollY);
    test.skip(before < 200, 'Vue trop courte dans cet environnement pour mesurer le retour.');

    // On part ailleurs (push) : l'écran neuf doit s'ouvrir en haut.
    await bottomNav.getByRole('link', { name: /Personnages/ }).click();
    await expect(page).toHaveURL(/\/$/);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    // Puis on revient (pop) : c'est TOUTE la valeur du correctif.
    await page.goBack();
    await expect(page).toHaveURL(/\/codex$/);
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => window.scrollY);
    // Tolérance large : le contenu peut se re-résoudre en asynchrone et borner
    // la position restaurée à la hauteur du document au moment du retour.
    expect(after).toBeGreaterThan(before * 0.5);
  });
});
