import { expect, test } from '@playwright/test';

import { waitForAppReady } from './fixtures';

/**
 * UAT — Le Codex (plan 19), navigateur de contenu SRD. Spec UI-only : le Codex
 * lit ses bundles depuis `public/data/*.json` (aucune écriture Firestore,
 * aucun `character`), donc elle tourne SANS l'émulateur Firebase / sans Java.
 *
 * Asserte l'IDENTITÉ du contenu (pas la présence) : sorts/objets/états précis du
 * bundle SRD avec leurs champs exacts (niveau, école, rareté, dégâts chiffrés,
 * description). Captures pleine page + viewport (modales) dans
 * `uat-review/codex/`, dans l'ordre des onglets.
 */

test.describe('UAT — Le Codex', () => {
  test('6 catégories : navigation + détail identité', async ({ page }) => {
    await page.goto('/codex');
    await waitForAppReady(page);

    await expect(page.getByRole('heading', { name: 'Le Codex' })).toBeVisible();

    // ── 1. Sorts ─────────────────────────────────────────────────────
    await expect(page.getByRole('tab', { name: /Sorts/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByText(/\d+ · résultats/)).toBeVisible({
      timeout: 15_000,
    });
    await page.screenshot({
      path: 'uat-review/codex/01-sorts-liste.png',
      fullPage: true,
    });

    await page.getByPlaceholder('Rechercher un sort…').fill('boule de feu');
    await page.getByText('Boule de feu', { exact: true }).click();
    let dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Niveau 3 · Évocation')).toBeVisible();
    await expect(dialog.getByText('45 m')).toBeVisible();
    await page.screenshot({
      path: 'uat-review/codex/02-sort-detail-full.png',
      fullPage: true,
    });
    await page.screenshot({
      path: 'uat-review/codex/02-sort-detail-viewport.png',
      fullPage: false,
    });
    await page.keyboard.press('Escape');

    // ── 2. Objets magiques ───────────────────────────────────────────
    await page.getByRole('tab', { name: /Objets magiques/ }).click();
    await page
      .getByPlaceholder('Rechercher un objet magique…')
      .fill('amulette de bonne santé');
    await page.getByText('Amulette de bonne santé', { exact: true }).click();
    dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Équipement · Peu commun')).toBeVisible();
    await expect(dialog.getByText('Harmonisation requise')).toBeVisible();
    await page.screenshot({
      path: 'uat-review/codex/03-objet-magique-detail-full.png',
      fullPage: true,
    });
    await page.screenshot({
      path: 'uat-review/codex/03-objet-magique-detail-viewport.png',
      fullPage: false,
    });
    await page.keyboard.press('Escape');
    await page.screenshot({
      path: 'uat-review/codex/04-objets-magiques-liste.png',
      fullPage: true,
    });

    // ── 3. Équipement ────────────────────────────────────────────────
    await page.getByRole('tab', { name: /Équipement/ }).click();
    await page.getByPlaceholder('Rechercher un équipement…').fill('dague');
    await page.getByText('Dague', { exact: true }).click();
    dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // Dégâts chiffrés exacts (1d4 perforants), poids exact.
    await expect(dialog.getByText('1d4 perforants')).toBeVisible();
    await expect(dialog.getByText('1 kg')).toBeVisible();
    await page.screenshot({
      path: 'uat-review/codex/05-equipement-detail-full.png',
      fullPage: true,
    });
    await page.screenshot({
      path: 'uat-review/codex/05-equipement-detail-viewport.png',
      fullPage: false,
    });
    await page.keyboard.press('Escape');

    // ── 4. Dons ──────────────────────────────────────────────────────
    await page.getByRole('tab', { name: /Dons/ }).click();
    await expect(page.getByText('Vigilant', { exact: true })).toBeVisible();
    await page.screenshot({
      path: 'uat-review/codex/06-dons-liste.png',
      fullPage: true,
    });

    // ── 5. Invocations ───────────────────────────────────────────────
    await page.getByRole('tab', { name: /Invocations/ }).click();
    await expect(
      page.getByText('Décharge déchirante', { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: 'uat-review/codex/07-invocations-liste.png',
      fullPage: true,
    });

    // ── 6. États ─────────────────────────────────────────────────────
    await page.getByRole('tab', { name: /États/ }).click();
    await expect(page.getByText('Aveuglé', { exact: true })).toBeVisible();
    await page.screenshot({
      path: 'uat-review/codex/08-etats-liste.png',
      fullPage: true,
    });
    await page.getByText('Aveuglé', { exact: true }).click();
    dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/vous ne voyez rien/)).toBeVisible();
    await page.screenshot({
      path: 'uat-review/codex/09-etat-detail-full.png',
      fullPage: true,
    });
    await page.screenshot({
      path: 'uat-review/codex/09-etat-detail-viewport.png',
      fullPage: false,
    });
  });
});
