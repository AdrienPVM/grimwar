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
  test('9 catégories : navigation + détail identité', async ({ page }) => {
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
});
