import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * Smoke central (plan 13.5 step 8) — chemin critique réel de bout en bout.
 *
 * Ce test est LE filet anti-régression contre la classe de bug « rien ne
 * s'affiche / app ne se rend pas » qui a frappé en plan 12.5 UAT (commit
 * `b45438e`, route `/` rendait un emblème Lyralei hardcodé au lieu de la
 * LibraryScreen). Si jamais quelqu'un réintroduit un placeholder sur `/`,
 * ce smoke casse en CI/local avant l'UAT humain.
 *
 * Step 9 du plan : commenter le contenu de `LibraryScreen` doit faire échouer
 * ce test. Vérifié manuellement une fois à la livraison du plan.
 *
 * Pré-requis : émulateur Firebase actif (Auth + Firestore). Sans l'émulateur,
 * la création de personnage échoue (Firestore inaccessible) — le test se
 * skippe alors proprement avec un message visible. Requiert Java/JRE 11+.
 */
test.describe('Smoke central — / → /create → /character/:id → /', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping smoke.',
    );
  });

  test('crée un Magicien minimal, l\'ouvre, retour à la library', async ({ page }) => {
    // 1. `/` rend la LibraryScreen — pas un placeholder.
    await page.goto('/');
    await waitForAppReady(page);

    // Empty state OU liste déjà peuplée — dans les deux cas le CTA « Créer un
    // personnage » doit être visible. C'est l'assert anti-régression principal.
    const createCta = page.getByRole('button', { name: /Créer un personnage/i }).first();
    await expect(
      createCta,
      "La LibraryScreen doit rendre le CTA « Créer un personnage » — si absent, c'est probablement que `/` rend un placeholder. Cf. DEBT.md > D2.",
    ).toBeVisible();

    // 2. Nav shell présent (marque GrimWar à gauche, avatar à droite).
    await expect(
      page.getByRole('navigation', { name: /Navigation principale/i }),
      'Le nav shell doit être visible sur toutes les routes principales.',
    ).toBeVisible();

    // 3. CTA Créer → /create → wizard rend.
    await createCta.click();
    await expect(page).toHaveURL(/\/create$/);
    await expect(
      page.getByRole('heading', { name: /Créer un personnage/i }).first(),
      'La route /create doit rendre le titre du wizard.',
    ).toBeVisible();

    // 4. Identity : nom obligatoire. Niveau 1 + alignement N par défaut, OK.
    await page.getByPlaceholder(/Nom de l['']aventurier/i).fill('Test Hero Smoke');
    await clickNext(page);

    // 5. Class : pick Magicien (id=wizard, name FR=Magicien).
    await page.getByRole('button', { name: /^Magicien( |$)/i }).first().click();
    await clickNext(page);

    // 6. Ancestry : pick Humain + sous-choix obligatoires (plan 13.8).
    //    Humain a 2 sous-choix REQUIS : `ancestrySize` + `ancestryExtraSkill`
    //    (cf. `use-ancestry-sub-choices.ts > REQUIREMENTS_BY_ANCESTRY.human`).
    //    Sans les 2, `isAncestryValid` retourne false → Suivant désactivé.
    //    Acrobaties = première carte du grid 18 (ordre EN-alphabétique du
    //    bundle), donc visible sans scroll même sur mobile-chromium.
    //    `force: true` : l'`<input type=radio>` est `sr-only` ; sans ce flag,
    //    Playwright voit le label visible « intercepter » le clic et retry à
    //    l'infini. Pattern canonique pour ce type d'input.
    await page.getByRole('button', { name: /^Humain( |$)/i }).first().click();
    const sizeMoyenne = page.getByRole('radio', { name: /^Moyenne/i }).first();
    await sizeMoyenne.scrollIntoViewIfNeeded();
    await sizeMoyenne.check({ force: true });
    const acrobaties = page.getByRole('radio', { name: /^Acrobaties$/i }).first();
    await acrobaties.scrollIntoViewIfNeeded();
    await acrobaties.check({ force: true });
    await clickNext(page);

    // 7. Abilities : auto-fill via le build de référence.
    await page.getByRole('button', { name: /Choisir pour moi/i }).first().click();
    await clickNext(page);

    // 8. Background : pick Acolyte (premier dans le bundle).
    await page.getByRole('button', { name: /^Acolyte( |$)/i }).first().click();
    await clickNext(page);

    // 9. Skills : auto-fill.
    await page.getByRole('button', { name: /Choisir pour moi/i }).first().click();
    await clickNext(page);

    // 10. Equipment : auto-fill.
    await page.getByRole('button', { name: /Choisir pour moi/i }).first().click();
    await clickNext(page);

    // 11. Spells : auto-fill (Magicien est lanceur — l'étape est visible).
    await page.getByRole('button', { name: /Choisir pour moi/i }).first().click();
    await clickNext(page);

    // 12. Recap : tap « Créer le personnage ». Soumet à Firestore (émulateur).
    const submitBtn = page.getByRole('button', { name: /^Créer le personnage$/i });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // 13. Atterrissage sur /character/:id — la fiche rend.
    await expect(page).toHaveURL(/\/character\/[A-Za-z0-9-]+$/, { timeout: 15_000 });
    await expect(
      page.getByText('Test Hero Smoke').first(),
      'Le nom du perso doit apparaître sur la fiche (hero card).',
    ).toBeVisible();

    // Status strip : 4 chips HP / CA / Init / Vit (variant `<StatusStrip>`).
    // On valide la présence d'au moins 2 stats (HP, CA) — le markup peut évoluer.
    await expect(page.getByText(/PV|HP/).first()).toBeVisible();
    await expect(page.getByText(/CA|AC/).first()).toBeVisible();

    // 5 onglets de mode sur la fiche (Combat / Essence / Magie / Avoir / Âme).
    // Le label exact dépend de l'i18n — on cherche au moins Combat + Magie.
    // Les onglets sont `role="tab"` (cf. ModeTabs) — pas `button`. Spec mise
    // à jour 2026-05-18 (auparavant skip masquait l'obsolescence).
    await expect(page.getByRole('tab', { name: /^Combat$/i }).first()).toBeVisible();
    await expect(page.getByRole('tab', { name: /^Magie$/i }).first()).toBeVisible();

    // 14. Retour à la library via le bouton du nav shell.
    await page.getByRole('link', { name: /Retour à la bibliothèque/i }).click();
    await expect(page).toHaveURL(/\/$/);

    // 15. La card du nouveau perso apparaît dans la liste.
    await expect(
      page.getByText('Test Hero Smoke').first(),
      "Après création + retour, la card du nouveau perso doit apparaître dans la library.",
    ).toBeVisible();
  });
});

/**
 * Le bouton « Suivant » a deux apparences :
 *  - desktop : `Suivant →` (label texte)
 *  - mobile (Pixel 7 dans cette config) : `→` seul
 *
 * On accepte les deux. `first()` car le bouton mobile fixe en bas + le bouton
 * inline desktop peuvent coexister (l'un caché par md:).
 */
async function clickNext(page: import('@playwright/test').Page): Promise<void> {
  const next = page
    .getByRole('button')
    .filter({ hasText: /^(Suivant\s+→?|→)$/ })
    .first();
  await expect(next).toBeEnabled({ timeout: 5_000 });
  await next.click();
}
