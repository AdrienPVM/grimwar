import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * UAT — écran « Mon compte » (amorce plan 35). Destination du losange avatar.
 * Profil (utilisateur anonyme via l'auth émulateur) + préférences de mode de
 * dés écrites sur le chemin EXISTANT `users/{uid}.settings.*`.
 *
 * Émulateur-gated : l'auth anonyme doit réussir pour qu'un utilisateur existe.
 * Sans émulateur (pas de Java), la spec se skippe proprement.
 */

test.describe('UAT — Mon compte', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore/Auth emulator unreachable — start with `pnpm e2e:emulators` (Java/JRE 11+).',
    );
  });

  test('profil + préférences de mode de dés', async ({ page }) => {
    await page.goto('/account');
    await waitForAppReady(page);

    // Profil anonyme (auth émulateur) + section préférences. Défaut : suivre
    // la campagne → les boutons de mode perso sont verrouillés (dimmés).
    await expect(page.getByRole('heading', { name: 'Mon compte' })).toBeVisible();
    await expect(page.getByText('Aventurier anonyme')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Mode de dés', { exact: true })).toBeVisible();
    await expect(page.getByRole('radio', { name: /Physique/ })).toBeDisabled();
    await page.screenshot({ path: 'uat-review/account/01-compte-suivre-campagne.png', fullPage: true });

    // Décocher « suivre la campagne » → les boutons de mode s'activent.
    await page.getByRole('checkbox', { name: /Suivre le mode de la campagne/ }).uncheck();
    await expect(page.getByRole('radio', { name: /Physique/ })).toBeEnabled();

    // Bascule en mode physique → la préférence est persistée + l'UI réagit.
    await page.getByRole('radio', { name: /Physique/ }).click();
    await expect(page.getByRole('radio', { name: /Physique/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await page.screenshot({ path: 'uat-review/account/02-mode-physique-full.png', fullPage: true });
    await page.screenshot({ path: 'uat-review/account/02-mode-physique-viewport.png', fullPage: false });

    // Déconnexion : confirmation à deux temps.
    await page.getByRole('button', { name: 'Se déconnecter' }).click();
    await expect(
      page.getByRole('button', { name: 'Confirmer la déconnexion' }),
    ).toBeVisible();
    await page.screenshot({ path: 'uat-review/account/03-deconnexion-confirm.png', fullPage: true });
  });

  test('carte « Contenu personnalisé » → écran d’import (route jusqu’ici orpheline)', async ({
    page,
  }) => {
    await page.goto('/account');
    await waitForAppReady(page);

    // La carte est le point d'entrée nav vers /account/content (jusqu'ici
    // atteignable seulement par URL directe). Elle est tappable, avec un CTA.
    const card = page.getByRole('button', { name: /Contenu personnalisé/ });
    await expect(card).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Gérer mes packs')).toBeVisible();
    await page.screenshot({ path: 'uat-review/01-compte-carte-contenu.png', fullPage: true });

    // Le clic mène bien à l'écran d'import de packs (route désorphelinée).
    await card.click();
    await expect(page).toHaveURL(/\/account\/content$/);
    await expect(
      page.getByRole('heading', { name: 'Contenu personnalisé' }),
    ).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: 'uat-review/02-ecran-import-atteint.png', fullPage: true });
  });
});
