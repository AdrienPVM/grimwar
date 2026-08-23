import { expect, test } from '@playwright/test';

import { waitForAppReady } from './fixtures';

/**
 * UAT — Le Codex (plan 19), navigateur de contenu SRD. Spec UI-only : le Codex
 * lit ses bundles depuis `public/data/*.json` (aucune écriture Firestore,
 * aucun `character`), donc elle tourne SANS l'émulateur Firebase / sans Java.
 *
 * Asserte l'IDENTITÉ du contenu (pas la présence) : entrées précises du bundle
 * SRD avec leurs champs exacts (niveau, rareté, dégâts chiffrés, taille/vitesse,
 * dé de vie…). Captures pleine page + viewport (modales) dans
 * `uat-review/codex/`, dans l'ordre des onglets.
 */

test.describe('UAT — Le Codex', () => {
  test('10 catégories : navigation + détail identité', async ({ page }) => {
    await page.goto('/codex');
    await waitForAppReady(page);
    await expect(page.getByRole('heading', { name: 'Le Codex' })).toBeVisible();

    // ── 1. Sorts ─────────────────────────────────────────────────────
    await expect(page.getByText(/\d+ · résultats/)).toBeVisible({
      timeout: 15_000,
    });
    await page.screenshot({ path: 'uat-review/codex/01-sorts-liste.png', fullPage: true });
    await page.getByPlaceholder('Rechercher un sort…').fill('boule de feu');
    await page.getByText('Boule de feu', { exact: true }).click();
    let dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Niveau 3 · Évocation')).toBeVisible();
    await page.screenshot({ path: 'uat-review/codex/02-sort-detail-full.png', fullPage: true });
    await page.screenshot({ path: 'uat-review/codex/02-sort-detail-viewport.png', fullPage: false });
    await page.keyboard.press('Escape');

    // ── 2. Objets magiques ───────────────────────────────────────────
    await page.getByRole('tab', { name: /Objets magiques/ }).click();
    await page.getByPlaceholder('Rechercher un objet magique…').fill('amulette de bonne santé');
    await page.getByText('Amulette de bonne santé', { exact: true }).click();
    dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Équipement · Peu commun')).toBeVisible();
    await expect(dialog.getByText('Harmonisation requise')).toBeVisible();
    await page.screenshot({ path: 'uat-review/codex/03-objet-magique-detail-full.png', fullPage: true });
    await page.screenshot({ path: 'uat-review/codex/03-objet-magique-detail-viewport.png', fullPage: false });
    await page.keyboard.press('Escape');

    // ── 3. Équipement ────────────────────────────────────────────────
    await page.getByRole('tab', { name: /Équipement/ }).click();
    await page.getByPlaceholder('Rechercher un équipement…').fill('dague');
    await page.getByText('Dague', { exact: true }).click();
    dialog = page.getByRole('dialog');
    await expect(dialog.getByText('1d4 perforants')).toBeVisible();
    await expect(dialog.getByText('1 kg')).toBeVisible();
    await page.screenshot({ path: 'uat-review/codex/04-equipement-detail-full.png', fullPage: true });
    await page.screenshot({ path: 'uat-review/codex/04-equipement-detail-viewport.png', fullPage: false });
    await page.keyboard.press('Escape');

    // ── 4. Espèces ───────────────────────────────────────────────────
    await page.getByRole('tab', { name: /Espèces/ }).click();
    await expect(page.getByText('Elfe', { exact: true })).toBeVisible();
    await page.screenshot({ path: 'uat-review/codex/05-especes-liste.png', fullPage: true });
    await page.getByText('Elfe', { exact: true }).click();
    dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Moyenne')).toBeVisible();
    await expect(dialog.getByText('9 m')).toBeVisible(); // 30 ft → 9 m (5 ft = 1,50 m)
    await expect(dialog.getByText('Ascendance féerique')).toBeVisible();
    await page.screenshot({ path: 'uat-review/codex/06-espece-detail-full.png', fullPage: true });
    await page.screenshot({ path: 'uat-review/codex/06-espece-detail-viewport.png', fullPage: false });
    await page.keyboard.press('Escape');

    // ── 5. Historiques ───────────────────────────────────────────────
    await page.getByRole('tab', { name: /Historiques/ }).click();
    await expect(page.getByText('Acolyte', { exact: true })).toBeVisible();
    await page.screenshot({ path: 'uat-review/codex/07-historiques-liste.png', fullPage: true });
    await page.getByText('Acolyte', { exact: true }).click();
    dialog = page.getByRole('dialog');
    // Compétences EN→FR (Insight → Perspicacité).
    await expect(dialog.getByText(/Perspicacité/)).toBeVisible();
    await page.screenshot({ path: 'uat-review/codex/08-historique-detail-full.png', fullPage: true });
    await page.screenshot({ path: 'uat-review/codex/08-historique-detail-viewport.png', fullPage: false });
    await page.keyboard.press('Escape');

    // ── 6. Classes ───────────────────────────────────────────────────
    await page.getByRole('tab', { name: /Classes/ }).click();
    await expect(page.getByText('Guerrier', { exact: true })).toBeVisible();
    await page.screenshot({ path: 'uat-review/codex/09-classes-liste.png', fullPage: true });
    await page.getByText('Guerrier', { exact: true }).click();
    dialog = page.getByRole('dialog');
    // « d10 » exact = la valeur du champ Dé de vie (les descriptions d'aptitude
    // mentionnent aussi « d10 » en sous-chaîne — d'où l'exactitude).
    await expect(dialog.getByText('d10', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Force, Constitution')).toBeVisible();
    await page.screenshot({ path: 'uat-review/codex/10-classe-detail-full.png', fullPage: true });
    await page.screenshot({ path: 'uat-review/codex/10-classe-detail-viewport.png', fullPage: false });
    await page.keyboard.press('Escape');

    // ── 7. Dons ──────────────────────────────────────────────────────
    await page.getByRole('tab', { name: /Dons/ }).click();
    await expect(page.getByText('Vigilant', { exact: true })).toBeVisible();
    await page.screenshot({ path: 'uat-review/codex/11-dons-liste.png', fullPage: true });

    // ── 8. Invocations ───────────────────────────────────────────────
    await page.getByRole('tab', { name: /Invocations/ }).click();
    await expect(page.getByText('Décharge déchirante', { exact: true })).toBeVisible();
    await page.screenshot({ path: 'uat-review/codex/12-invocations-liste.png', fullPage: true });

    // ── 9. États ─────────────────────────────────────────────────────
    await page.getByRole('tab', { name: /États/ }).click();
    await expect(page.getByText('Aveuglé', { exact: true })).toBeVisible();
    await page.screenshot({ path: 'uat-review/codex/13-etats-liste.png', fullPage: true });
    await page.getByText('Aveuglé', { exact: true }).click();
    dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/vous ne voyez rien/)).toBeVisible();
    await page.screenshot({ path: 'uat-review/codex/14-etat-detail-full.png', fullPage: true });
    await page.screenshot({ path: 'uat-review/codex/14-etat-detail-viewport.png', fullPage: false });
  });

  /**
   * Recherche transverse — l'onglet qu'on ouvre quand on ne sait pas dans quelle
   * catégorie chercher. Asserte contre le VRAI bundle SRD (pas des fixtures) que
   * le même terme ressort de plusieurs catégories, et qu'ouvrir un résultat rend
   * la fiche complète de sa catégorie.
   */
  test('recherche transverse : un terme, plusieurs catégories', async ({ page }) => {
    await page.goto('/codex');
    await waitForAppReady(page);
    await page.getByRole('tab', { name: /Recherche/ }).click();

    // État initial : le seuil de deux caractères est expliqué, pas subi.
    await expect(page.getByText(/Saisis au moins deux lettres/)).toBeVisible();
    await page.screenshot({
      path: 'uat-review/codex/15-recherche-transverse-vide.png',
      fullPage: true,
    });

    // « poison » traverse le SRD : des sorts, des états, de l'équipement.
    await page.getByPlaceholder('Rechercher dans tout le Codex…').fill('poison');
    await expect(page.getByText(/\d+ · résultats/)).toBeVisible({ timeout: 15_000 });

    const headings = page.getByRole('heading', { name: / · \d+$/ });
    await expect(headings.first()).toBeVisible();
    // Au moins deux catégories distinctes répondent — sinon l'onglet n'apporte
    // rien de plus qu'une recherche dans un onglet dédié.
    expect(await headings.count()).toBeGreaterThanOrEqual(2);
    await page.screenshot({
      path: 'uat-review/codex/16-recherche-transverse-resultats.png',
      fullPage: true,
    });

    // Ouvrir un sort trouvé par la recherche globale rend SA fiche de sort,
    // méta complète — pas une fiche générique appauvrie.
    await page.getByPlaceholder('Rechercher dans tout le Codex…').fill('rayon empoisonné');
    await page.getByText('Rayon empoisonné', { exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Rayon empoisonné' })).toBeVisible();
    await expect(dialog.getByText(/Niveau \d+ ·/)).toBeVisible();
    await page.screenshot({
      path: 'uat-review/codex/17-recherche-detail-full.png',
      fullPage: true,
    });
    await page.screenshot({
      path: 'uat-review/codex/17-recherche-detail-viewport.png',
      fullPage: false,
    });
    await page.keyboard.press('Escape');

    // Mobile 375 : la rangée de onze onglets scrolle, le champ tient.
    await page.setViewportSize({ width: 375, height: 812 });
    await page.getByPlaceholder('Rechercher dans tout le Codex…').fill('poison');
    await expect(page.getByText(/\d+ · résultats/)).toBeVisible();
    await page.screenshot({
      path: 'uat-review/codex/18-recherche-mobile-375.png',
      fullPage: true,
    });
  });
});
