import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * UAT — bascule de langue FR ↔ Anglais (switcher du plan 34, écran « Mon
 * compte »). Prouve trois choses qu'aucun test unitaire ne peut établir en
 * navigateur réel :
 *  1. le switch repeint l'arbre EN TEMPS RÉEL (`t()` lit `getState()` sans
 *     souscrire — c'est l'abonnement racine dans `AppShell` qui déclenche le
 *     re-render) ;
 *  2. le choix est PERSISTÉ dans `users/{uid}.locale` (Firestore émulateur) ;
 *  3. il est RESTAURÉ au rechargement (même session anonyme → même uid).
 *
 * C'est aussi le premier test e2e qui pilote la locale EN dans le navigateur :
 * jusqu'ici EN n'était prouvé qu'en jsdom. Émulateur-gated (l'auth anonyme doit
 * réussir pour qu'un doc utilisateur existe) → se skippe proprement sans Java.
 */

test.describe('UAT — bascule de langue FR ↔ Anglais', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore/Auth emulator unreachable — start with `pnpm e2e:emulators` (Java/JRE 11+).',
    );
  });

  test('switch live + persistance + restauration au reload', async ({ page }) => {
    await page.goto('/account');
    await waitForAppReady(page);

    // État initial : FR (défaut verrouillé). Le heading et la section langue
    // sont rendus en français.
    await expect(page.getByRole('heading', { name: 'Mon compte' })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText('Langue', { exact: true })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Français' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await page.screenshot({
      path: 'uat-review/01-compte-fr-avant-switch.png',
      fullPage: true,
    });

    // Bascule en Anglais → l'arbre se repeint en direct (heading + libellés).
    await page.getByRole('radio', { name: 'Anglais' }).click();
    await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible();
    await expect(page.getByText('Preferences', { exact: true })).toBeVisible();
    // <html lang> reflète la locale (a11y/SEO).
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.screenshot({
      path: 'uat-review/02-compte-en-apres-switch.png',
      fullPage: true,
    });
    await page.screenshot({
      path: 'uat-review/03-section-langue-en-viewport.png',
      fullPage: false,
    });

    // Reload : la même session anonyme restaure `users/{uid}.locale = 'en'` →
    // l'app redémarre directement en anglais (preuve de persistance Firestore).
    await page.reload();
    await waitForAppReady(page);
    await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});
