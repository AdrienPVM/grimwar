import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * UAT — rangée 4 de l'audit de malléabilité : le confort de l'éditeur de packs
 * (M50 dupliquer une entrée du catalogue · M51 progression de sorts d'une
 * classe maison · M53 provenance d'un pack) et la langue de la table (M54).
 *
 * M52 (découpage automatique des gros packs) n'a pas de capture : c'est un
 * comportement de service, couvert en unitaire — fabriquer un pack de plus
 * d'un mégaoctet dans le navigateur n'apprendrait rien à l'œil.
 *
 * Captures pleine page à plat dans `uat-review/`, plus une capture viewport
 * pour chaque modale (le `fullPage` reprojette l'overlay dans le flux du
 * document et masque le ressenti de superposition).
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review');

function ensureUatDir(): void {
  mkdirSync(UAT_DIR, { recursive: true });
}

async function captureFull(page: Page, filename: string): Promise<void> {
  ensureUatDir();
  await page.screenshot({ path: path.join(UAT_DIR, filename), fullPage: true });
}

async function captureViewport(page: Page, filename: string): Promise<void> {
  ensureUatDir();
  await page.screenshot({ path: path.join(UAT_DIR, filename), fullPage: false });
}

test.describe('UAT — rangée 4 : éditeur de packs et langue de la table', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('01-03 — dupliquer une entrée du catalogue (M50) + provenance (M53)', async ({
    page,
  }) => {
    await page.goto('/account/content/new');
    await waitForAppReady(page);

    // Métadonnées, dont le champ « Provenance » (M53) : c'est là que le MJ
    // écrit d'où vient réellement son contenu.
    await page.getByTestId('pack-meta-id').fill('pack-de-ma-table');
    await page.getByTestId('pack-meta-name-fr').fill('Le pack de ma table');
    await page.getByTestId('pack-meta-author').fill('Adrien');
    await page.getByTestId('pack-meta-source-label').fill('Ma campagne');
    await captureFull(page, '01-pack-metadonnees-provenance.png');

    // Chaque catégorie porte désormais deux boutons : « Dupliquer » et
    // « Ajouter ». L'en-tête doit rester lisible malgré ça.
    const duplicateFeat = page.getByTestId('pack-editor-duplicate-feat');
    await expect(duplicateFeat).toBeVisible();
    await duplicateFeat.click();

    const picker = page.getByTestId('catalogue-picker');
    await expect(picker).toBeVisible();
    // Le mode est posé AVANT le choix : copie par défaut.
    await expect(page.getByTestId('catalogue-picker-mode-copy')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await captureViewport(page, '02-selecteur-catalogue-modale.png');

    // Un don du bundle SRD : on prend le premier de la liste.
    const firstPick = page.locator('[data-testid^="catalogue-pick-"]').first();
    await expect(firstPick).toBeVisible();
    // La rangée est `<span>(nom)(id)</span>` : le premier span est le
    // conteneur, pas le nom — d'où le descendant direct.
    const pickedName = (
      await firstPick.locator('span > span').first().innerText()
    ).trim();
    await firstPick.click();

    // Le formulaire s'ouvre pré-rempli, identifiant décalé, nom suffixé.
    await expect(page.getByTestId('feat-form-id')).toHaveValue(/-maison$/);
    await expect(page.getByTestId('feat-form-name-fr')).toHaveValue(
      `${pickedName} (maison)`,
    );
    await captureFull(page, '03-formulaire-prerempli-depuis-le-catalogue.png');
  });

  test('04 — table de progression et mode de préparation d’une classe maison (M51)', async ({
    page,
  }) => {
    await page.goto('/account/content/new');
    await waitForAppReady(page);

    await page.getByTestId('pack-editor-add-class').click();
    await page.getByTestId('class-form-id').fill('thaumaturge');
    await page.getByTestId('class-form-name-fr').fill('Thaumaturge');
    await page
      .getByTestId('class-form-description-fr')
      .fill('La classe de ma table : un mage de village, sans école ni tour.');
    await page.getByTestId('class-form-primary-sag').click();
    await page.getByTestId('class-form-save-sag').click();

    // Le bloc magie ouvre désormais les deux colonnes de table + le mode.
    await page.getByTestId('class-form-spellcasting-toggle').click();
    await expect(page.getByTestId('class-form-spellcasting-preparation')).toBeVisible();
    await page
      .getByTestId('class-form-spells-known')
      .fill('2 3 4 5 6 6 7 7 9 9 10 10 11 11 12 12 14 14 15 15');
    await page
      .getByTestId('class-form-cantrips-known')
      .fill('3 3 3 4 4 4 4 4 4 5 5 5 5 5 5 5 5 5 5 5');
    await captureFull(page, '04-classe-maison-table-de-progression.png');
  });

  test('05 — colonne incomplète : l’erreur sort au champ, pas au save (M51)', async ({
    page,
  }) => {
    await page.goto('/account/content/new');
    await waitForAppReady(page);

    await page.getByTestId('pack-editor-add-class').click();
    await page.getByTestId('class-form-id').fill('thaumaturge');
    await page.getByTestId('class-form-name-fr').fill('Thaumaturge');
    await page.getByTestId('class-form-description-fr').fill('Une classe.');
    await page.getByTestId('class-form-primary-sag').click();
    await page.getByTestId('class-form-save-sag').click();
    await page.getByTestId('class-form-spellcasting-toggle').click();
    await page.getByTestId('class-form-spells-known').fill('2 3 4');
    await page.getByTestId('class-form-confirm').click();

    await expect(
      page.getByText(/exactement 20 nombres entiers positifs/i),
    ).toBeVisible();
    await captureFull(page, '05-colonne-incomplete-erreur-au-champ.png');
  });

  test('06 — langue de la table exposée au MJ (M54)', async ({ page }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — capture skippée.');

    await page.goto('/campaigns');
    await waitForAppReady(page);
    await page
      .getByRole('button', { name: /Créer une campagne/i })
      .first()
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel(/Nom de la campagne/i).fill('La Table de Bruxelles');
    await page.getByRole('button', { name: /^Créer$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });

    await page.getByRole('button', { name: /Réglages/i }).first().click();
    const settings = page.getByRole('dialog');
    await expect(settings).toBeVisible();

    // Le réglage existait au schéma depuis le plan 14 sans aucune UI.
    const language = page.getByTestId('campaign-settings-language');
    await expect(language).toBeVisible();
    await language.scrollIntoViewIfNeeded();
    await expect(
      settings.getByRole('radio', { name: /^Français$/ }),
    ).toHaveAttribute('aria-checked', 'true');
    await captureViewport(page, '06-reglages-langue-de-la-table.png');
  });
});
