import { expect, test } from '@playwright/test';

import { waitForAppReady } from './fixtures';

/**
 * Régression D2 — `/` doit rendre la LibraryScreen, pas un placeholder
 * (plan 13.5 critère central).
 *
 * Cette spec est la **garde anti-régression principale** du plan 13.5. Elle
 * tourne SANS émulateur Firebase :
 *   - Quand l'auth anonyme échoue (pas d'émulateur joignable), le hook
 *     `useCharactersList` court-circuite avec `user=null` et la LibraryScreen
 *     rend son **empty state**. L'empty state expose le CTA « Créer un
 *     personnage » — exactement le marqueur qu'on cherche.
 *   - Si jamais quelqu'un réintroduit un placeholder Lyralei sur `/` (cf.
 *     `plans/DEBT.md > D2`), ce test casse en CI/local immédiatement, sans
 *     dépendre de Java/JRE.
 *
 * Step 9 du plan 13.5 (sanity-check) : commenter le contenu de
 * `LibraryScreen` doit faire échouer ce test. À vérifier une fois
 * manuellement à la livraison.
 */
test.describe('Library — régression D2 (anti-placeholder sur /)', () => {
  test('/ rend la LibraryScreen avec CTA Créer + nav shell', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    // 1. CTA « Créer un personnage » visible — c'est l'assert critique. Présent
    //    aussi bien en empty state qu'en liste peuplée. Si absent, `/` rend
    //    probablement un placeholder (régression D2).
    const createCta = page.getByRole('button', { name: /Créer un personnage/i }).first();
    await expect(
      createCta,
      "La LibraryScreen doit rendre le CTA « Créer un personnage » sur /. Régression D2 si absent.",
    ).toBeVisible();

    // 2. Nav shell présent et accessible.
    await expect(
      page.getByRole('navigation', { name: /Navigation principale/i }),
      'Le nav shell doit être visible sur toutes les routes principales.',
    ).toBeVisible();

    // 3. Tap CTA → navigation vers /create OK (route câblée, wizard accessible).
    await createCta.click();
    await expect(page).toHaveURL(/\/create$/);
    await expect(
      page.getByRole('heading', { name: /Créer un personnage/i }).first(),
    ).toBeVisible();
  });
});
