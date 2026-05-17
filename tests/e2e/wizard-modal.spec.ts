import { expect, test } from '@playwright/test';

import {
  expectBodyScrollRestored,
  expectModalInViewport,
  waitForAppReady,
} from './fixtures';

/**
 * Modale du wizard — invariant viewport + scroll (plan 13.5 step 10).
 *
 * Cette spec est le FILET e2e qui aurait attrapé en jsdom le bug post-plan 05
 * « modale rendue inline en bas de page au lieu du portal vers body »
 * (cf. DEBT.md > D3, leçon de process). La classe de défaut est :
 *   - un ancêtre du composant qui ouvre la modale applique `backdrop-filter`
 *     ou `transform` (cf. <GlassPanel>) → cela crée un containing block pour
 *     `position: fixed` → la modale, même rendue avec `fixed inset-0`, se
 *     localise relativement au panel et non au viewport.
 *
 * `expectModalInViewport` valide simultanément :
 *   - dialog visible
 *   - bounding box ⊂ viewport (modale visible sans scroller)
 *   - body.overflow = hidden (scroll de la page bloqué derrière)
 *
 * **Ne nécessite PAS l'émulateur Firebase** : le wizard lit ses contenus depuis
 * `public/data/*.json` (cache Dexie côté client). Sans émulateur, l'auth anon
 * échoue silencieusement et l'app boote en empty state — le wizard reste
 * accessible via /create directement (la route n'est pas auth-guardée). Cette
 * spec tourne donc CHEZ ADRIEN même sans Java/JRE installé.
 */
test.describe('Wizard — invariant modale dans le viewport', () => {
  test('tap « ? » sur une carte de classe ouvre la modale dans le viewport + verrouille le scroll, ferme restaure', async ({
    page,
  }) => {
    // 1. Aller directement à /create — pas besoin de la library.
    await page.goto('/create');
    await waitForAppReady(page);

    // 2. Naviguer jusqu'à l'étape Classe (étape 2). On clique « Suivant » sur
    //    Identity en passant par un nom rapide.
    await page.getByPlaceholder(/Nom de l['']aventurier/i).fill('Modal Test');
    await page
      .getByRole('button')
      .filter({ hasText: /^(Suivant\s+→?|→)$/ })
      .first()
      .click();

    // 3. On est sur l'étape Classe. Trouver le « ? » d'une carte de classe.
    //    aria-label = "Voir le détail · Magicien" (cf. wizard.helpPanel.viewDetail).
    const helpButton = page.getByRole('button', { name: /Voir le détail.*Magicien/i }).first();
    await expect(
      helpButton,
      "Le bouton « ? » de la carte Magicien doit être visible sur l'étape Classe.",
    ).toBeVisible();

    // 4. Tap « ? » → modale s'ouvre.
    await helpButton.click();

    // 5. Invariants critiques : dialog visible + dans viewport + scroll page bloqué.
    await expectModalInViewport(page);

    // 6. La modale contient bien la description de la classe (title resolved).
    await expect(page.getByRole('dialog').getByText(/Magicien/i).first()).toBeVisible();

    // 7. Fermeture par la croix → dialog démonté + body.overflow restauré.
    const closeButton = page.getByRole('dialog').getByRole('button', { name: /Fermer/i });
    await closeButton.click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expectBodyScrollRestored(page);

    // 8. Bonus : ré-ouvrir + fermer via Échap → même invariant.
    await helpButton.click();
    await expectModalInViewport(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expectBodyScrollRestored(page);

    // 9. Bonus : ré-ouvrir + clic backdrop → ferme.
    await helpButton.click();
    await expectModalInViewport(page);
    // Clic sur la zone du backdrop (top-left, en dehors du panneau centré).
    const dialog = page.getByRole('dialog');
    const box = await dialog.boundingBox();
    if (!box) throw new Error('Dialog bbox introuvable pour le clic backdrop.');
    await page.mouse.click(10, 10); // hors du panneau (qui est centré)
    await expect(dialog).toBeHidden();
    await expectBodyScrollRestored(page);
  });
});
