import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { seedCharacter, wizardL5DamageD1 } from './seed-character';

/**
 * UAT — palette de commandes (⌘K).
 *
 * Ce que seul un navigateur peut dire ici : que le raccourci répond vraiment
 * (jsdom ne connaît pas la touche ⌘ du système), que le panneau ne déborde pas
 * du viewport d'un téléphone, et à quoi tout cela ressemble.
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

/** Le raccourci système, tapé pour de vrai. */
async function pressShortcut(page: Page): Promise<void> {
  const isMac = process.platform === 'darwin';
  await page.keyboard.press(isMac ? 'Meta+k' : 'Control+k');
}

test.describe('UAT — palette de commandes', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(!ok, 'Firestore emulator unreachable. Run `pnpm e2e:emulators`.');
  });

  test('le raccourci ouvre la palette depuis n’importe quel écran', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await seedCharacter(page, wizardL5DamageD1);
    await page.reload();
    await waitForAppReady(page);

    await pressShortcut(page);

    const field = page.getByRole('combobox');
    await expect(field).toBeVisible();
    // Le focus atterrit dans le champ : la première lettre tapée compte.
    await expect(field).toBeFocused();

    await uatShot(page, '01-palette-a-l-ouverture', { viewport: true });

    // Le raccourci referme aussi.
    await pressShortcut(page);
    await expect(page.getByRole('combobox')).toHaveCount(0);
  });

  test('le bouton du bandeau ouvre la même palette', async ({ page }) => {
    await page.goto('/codex');
    await waitForAppReady(page);

    await page.getByRole('button', { name: /Rechercher partout/i }).click();
    await expect(page.getByRole('combobox')).toBeVisible();
  });

  test('chercher une règle depuis la fiche, sans la quitter', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, wizardL5DamageD1);
    await page.goto(`/character/${charId}`);
    await waitForAppReady(page);

    await pressShortcut(page);
    await page.getByRole('combobox').fill('entrave');

    const hit = page.getByRole('option', { name: /Entravé/ }).first();
    await expect(hit).toBeVisible({ timeout: 15_000 });
    await uatShot(page, '02-palette-recherche-codex', { viewport: true });

    await hit.click();
    // La règle s'ouvre PAR-DESSUS la palette, et l'URL n'a pas bougé : on
    // consulte sans perdre ni sa fiche ni sa recherche.
    await expect(page.getByRole('dialog').last()).toBeVisible();
    await uatShot(page, '03-palette-regle-par-dessus', { viewport: true });
    expect(page.url()).toContain(`/character/${charId}`);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('combobox')).toBeVisible();
  });

  test('⏎ ouvre le personnage sélectionné', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, wizardL5DamageD1);
    await page.reload();
    await waitForAppReady(page);

    await pressShortcut(page);
    await page.getByRole('combobox').fill(wizardL5DamageD1.name.slice(0, 5));
    await expect(page.getByRole('option').first()).toBeVisible();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(new RegExp(`/character/${charId}`));
  });

  test('sur un téléphone étroit, le panneau tient dans l’écran', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/');
    await waitForAppReady(page);

    await pressShortcut(page);
    await expect(page.getByRole('combobox')).toBeVisible();

    const panel = page.getByRole('dialog').locator('> div[tabindex="-1"]').first();
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(-1);
    expect(box!.x + box!.width).toBeLessThanOrEqual(321);

    await uatShot(page, '04-palette-telephone-etroit', { viewport: true });
  });

  test('sur desktop, la palette s’ancre haut et annonce son raccourci', async ({ page }) => {
    // ⌘K est d'abord un geste de clavier : c'est sur grand écran que la palette
    // se juge, et c'est là que le rappel « ↑↓ ⏎ Échap » a un sens.
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await waitForAppReady(page);
    await seedCharacter(page, wizardL5DamageD1);
    await page.reload();
    await waitForAppReady(page);

    await expect(page.getByRole('button', { name: /Rechercher partout/i })).toContainText('⌘K');

    await pressShortcut(page);
    await expect(page.getByRole('combobox')).toBeVisible();
    await uatShot(page, '05-palette-desktop', { viewport: true });
  });

  test('le bandeau ne déborde pas malgré le bouton ajouté', async ({ page }) => {
    // Le bandeau est la barre la plus contrainte de l'app : marque, retour,
    // rail desktop, recherche, avatar. Y ajouter un bouton est exactement le
    // genre de geste qui pousse un voisin hors cadre.
    for (const width of [320, 375, 412]) {
      await page.setViewportSize({ width, height: 720 });
      await page.goto('/codex');
      await waitForAppReady(page);
      const nav = page.getByRole('navigation').first();
      const box = await nav.boundingBox();
      expect(box, `bandeau mesurable à ${width}px`).not.toBeNull();
      expect(box!.x + box!.width, `bandeau dans le cadre à ${width}px`).toBeLessThanOrEqual(
        width + 1,
      );
      const overflow = await page.evaluate(() => document.body.scrollWidth - document.body.clientWidth);
      expect(overflow, `aucun débordement horizontal à ${width}px`).toBeLessThanOrEqual(1);
    }
  });
});
