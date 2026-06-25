import { expect, test } from '@playwright/test';

import { waitForAppReady } from './fixtures';

/**
 * UAT — Le Codex (plan 19), navigateur de contenu SRD. Spec UI-only : le Codex
 * lit ses bundles depuis `public/data/*.json` (aucune écriture Firestore,
 * aucun `character`), donc elle tourne SANS l'émulateur Firebase / sans Java.
 *
 * Asserte l'IDENTITÉ du contenu (pas la présence) : un sort/état précis du
 * bundle SRD avec ses champs exacts (niveau, école, portée, description). Les
 * captures pleine page + viewport (modales) sont écrites dans
 * `uat-review/codex/`.
 */

test.describe('UAT — Le Codex', () => {
  test('Sorts / États / Dons / Invocations : navigation + détail identité', async ({
    page,
  }) => {
    await page.goto('/codex');
    await waitForAppReady(page);

    // ── Sorts ────────────────────────────────────────────────────────
    await expect(
      page.getByRole('heading', { name: 'Le Codex' }),
    ).toBeVisible();
    await expect(page.getByRole('tab', { name: /Sorts/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    // Contenu chargé : le compteur de résultats affiche le total du bundle.
    await expect(page.getByText(/\d+ · résultats/)).toBeVisible({
      timeout: 15_000,
    });
    await page.screenshot({
      path: 'uat-review/codex/01-codex-sorts-liste.png',
      fullPage: true,
    });

    // Détail d'un sort précis — Boule de feu (Fireball), niveau 3, évocation.
    await page.getByPlaceholder('Rechercher un sort…').fill('boule de feu');
    await page.getByText('Boule de feu', { exact: true }).click();
    const spellDialog = page.getByRole('dialog');
    await expect(spellDialog).toBeVisible();
    await expect(
      spellDialog.getByText('Niveau 3 · Évocation'),
    ).toBeVisible();
    await expect(spellDialog.getByText('45 m')).toBeVisible();
    await page.screenshot({
      path: 'uat-review/codex/02-sort-detail-boule-de-feu-full.png',
      fullPage: true,
    });
    await page.screenshot({
      path: 'uat-review/codex/02-sort-detail-boule-de-feu-viewport.png',
      fullPage: false,
    });
    await page.keyboard.press('Escape');
    await expect(spellDialog).not.toBeVisible();

    // ── États ────────────────────────────────────────────────────────
    await page.getByRole('tab', { name: /États/ }).click();
    await expect(page.getByText('Aveuglé', { exact: true })).toBeVisible();
    await page.screenshot({
      path: 'uat-review/codex/03-codex-etats.png',
      fullPage: true,
    });
    await page.getByText('Aveuglé', { exact: true }).click();
    const condDialog = page.getByRole('dialog');
    await expect(condDialog).toBeVisible();
    await expect(condDialog.getByText(/vous ne voyez rien/)).toBeVisible();
    await page.screenshot({
      path: 'uat-review/codex/04-etat-detail-aveugle-full.png',
      fullPage: true,
    });
    await page.screenshot({
      path: 'uat-review/codex/04-etat-detail-aveugle-viewport.png',
      fullPage: false,
    });
    await page.keyboard.press('Escape');

    // ── Dons ─────────────────────────────────────────────────────────
    await page.getByRole('tab', { name: /Dons/ }).click();
    await expect(page.getByText('Vigilant', { exact: true })).toBeVisible();
    await page.screenshot({
      path: 'uat-review/codex/05-codex-dons.png',
      fullPage: true,
    });

    // ── Invocations ──────────────────────────────────────────────────
    await page.getByRole('tab', { name: /Invocations/ }).click();
    await expect(
      page.getByText('Décharge déchirante', { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: 'uat-review/codex/06-codex-invocations.png',
      fullPage: true,
    });
  });
});
