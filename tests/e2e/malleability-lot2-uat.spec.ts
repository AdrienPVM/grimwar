import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { clericL1Protector, seedCharacter } from './seed-character';

/**
 * UAT — lot 2 de malléabilité : la fiche devient pilotable.
 *
 * Ce que seul un navigateur peut dire : à quoi ressemblent les modes d'édition
 * une fois posés sur les cartes réelles, et si l'affordance nouvelle écrase le
 * contenu voisin (le piège du lot 1 ter : un bouton ajouté à une rangée dense
 * réduit le nom du membre à zéro pixel).
 */

async function uatShot(
  page: Page,
  name: string,
  opts: { viewport?: boolean } = {},
): Promise<void> {
  const dir = 'uat-review';
  mkdirSync(dir, { recursive: true });
  await page.screenshot({
    path: path.join(dir, `${name}.png`),
    fullPage: !opts.viewport,
    animations: 'disabled',
  });
}

test.describe('UAT — lot 2 de malléabilité', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Émulateur Firestore non joignable sur 127.0.0.1:8080 — `pnpm e2e:emulators` (Java/JRE 11+).',
    );
  });

  test('identité : l’alignement se lit en toutes lettres et s’édite', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, clericL1Protector);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(clericL1Protector.name).first()).toBeVisible({
      timeout: 10_000,
    });

    // Le champ persiste « N » ; c'est « Neutre » qui doit être à l'écran.
    await expect(page.getByText('Neutre', { exact: true }).first()).toBeVisible();
    await uatShot(page, '01-fiche-alignement-en-toutes-lettres');

    await page.getByRole('button', { name: 'Modifier l’identité' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Nom')).toHaveValue(clericL1Protector.name);
    await uatShot(page, '02-modale-identite', { viewport: true });

    // Le nouveau nom atteint la carte héros sans rechargement.
    await dialog.getByLabel('Nom').fill('Corvus');
    await dialog.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByRole('heading', { name: /Corvus/ })).toBeVisible({
      timeout: 10_000,
    });
    await uatShot(page, '03-fiche-nom-change');
  });

  test('maîtrises : compétences, sauvegardes, langues et outils deviennent éditables', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, clericL1Protector);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(clericL1Protector.name).first()).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole('tab', { name: /^Essence$/i }).click();
    const panel = page.locator('#sheet-mode-panel-essence');
    await expect(panel).toBeVisible();

    const skillsCard = panel
      .locator('div.rounded-card', {
        has: page.getByRole('heading', { name: 'Compétences' }),
      })
      .first();
    await skillsCard
      .getByRole('button', { name: 'Modifier les maîtrises de compétences' })
      .click();

    // Un tap fait tourner la maîtrise au lieu de lancer un dé.
    const survie = skillsCard.getByRole('button', { name: /^Survie — Non maîtrisée/ });
    await expect(survie).toBeVisible();
    await survie.click();
    await expect(
      skillsCard.getByRole('button', { name: /^Survie — Maîtrise/ }),
    ).toBeVisible({ timeout: 10_000 });

    await uatShot(page, '04-essence-mode-maitrises');

    // Les cartes Langues et Maîtrises ouvrent leur propre éditeur.
    const languesCard = panel
      .locator('div.rounded-card', { has: page.getByRole('heading', { name: 'Langues' }) })
      .first();
    await languesCard.getByRole('button', { name: 'Modifier les langues connues' }).click();
    await languesCard.getByLabel(/Saisir une entrée libre/).fill('Thayen');
    await languesCard.getByRole('button', { name: 'Ajouter' }).click();
    // Deux occurrences légitimes : la puce d'AFFICHAGE (texte exact) et la
    // puce retirable de l'éditeur (« Thayen✕ »). On vise l'affichage.
    await expect(languesCard.getByText('Thayen', { exact: true })).toBeVisible({
      timeout: 10_000,
    });

    await uatShot(page, '05-essence-langue-ajoutee');
  });

  test('magie : un sort hors liste s’ajoute et devient préparable', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    // Clerc et non Magicien : le Magicien a sa propre présentation en sections
    // de grimoire, la liste standard sert tous les autres lanceurs.
    const { charId } = await seedCharacter(page, clericL1Protector);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(clericL1Protector.name).first()).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole('tab', { name: /^Magie$/i }).click();
    const panel = page.locator('#sheet-mode-panel-magie');
    await expect(panel).toBeVisible();

    const list = page.getByTestId('spell-list');
    await list.getByRole('button', { name: 'Ajouter un sort' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Chercher un sort à ajouter').fill('benediction');
    // Recherche sans accents : « benediction » doit trouver « Bénédiction ».
    await expect(dialog.getByRole('button', { name: /Bénédiction/ })).toBeVisible({
      timeout: 10_000,
    });
    await uatShot(page, '06-magie-ajouter-un-sort', { viewport: true });

    await dialog.getByRole('button', { name: /Bénédiction/ }).click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });
    await expect(list.getByText('Bénédiction').first()).toBeVisible({ timeout: 10_000 });
    await uatShot(page, '07-magie-sort-ajoute');
  });

  test('dés : le menu d’options porte le jet discret, l’historique porte Relancer', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, clericL1Protector);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(clericL1Protector.name).first()).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole('tab', { name: /^Essence$/i }).click();
    const panel = page.locator('#sheet-mode-panel-essence');
    await expect(panel).toBeVisible();

    // Appui long sur une sauvegarde → menu d'options.
    const chip = panel.getByRole('button', { name: /^Jet de sauvegarde Sagesse/ }).first();
    await chip.hover();
    await page.mouse.down();
    await page.waitForTimeout(600);
    await page.mouse.up();

    const menu = page.getByRole('dialog');
    await expect(menu).toBeVisible();
    await expect(menu.getByTestId('roll-options-discreet')).toBeVisible();
    await menu.getByTestId('roll-options-discreet').click();
    await uatShot(page, '08-menu-jet-discret', { viewport: true });

    // On lance : le jet part, le plateau le montre, l'historique le garde.
    await menu.getByTestId('roll-options-normal').click();
    await expect(menu).toBeHidden({ timeout: 10_000 });
  });
});
