import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { clericL1Protector, fighterL1MasteryDefense, seedCharacter } from './seed-character';

/**
 * UAT — rangée 3 du lot 2 + correctif de padding des modales.
 *
 * Ce que seul un navigateur peut dire :
 *  - si le contenu des modales corrigées respire vraiment, en bottom-sheet
 *    mobile où le panneau est collé au bord de l'écran (le défaut d'origine :
 *    le titre franchissait la bordure gauche) ;
 *  - à quoi ressemble la carte d'expérience posée dans le bento du mode Âme,
 *    et si sa jauge se lit ;
 *  - si l'entrée « Prise en tenaille » tient dans le menu d'attaque sans le
 *    faire déborder — c'est un 4e élément à libellé long sur une rangée de
 *    pilules courtes.
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

test.describe('UAT — rangée 3 + padding des modales', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Émulateur Firestore non joignable sur 127.0.0.1:8080 — `pnpm e2e:emulators` (Java/JRE 11+).',
    );
  });

  test('les modales corrigées ne touchent plus leurs bordures', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, clericL1Protector);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(clericL1Protector.name).first()).toBeVisible({
      timeout: 10_000,
    });

    // Modale Identité — c'est celle où « IDENTITÉ » était rogné à gauche et
    // « Enregistrer » touchait deux bordures à la fois.
    await page.getByRole('button', { name: 'Modifier l’identité' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await uatShot(page, '01-modale-identite-padding', { viewport: true });
    await page.keyboard.press('Escape');

    // Modale Ajouter un sort — « AJOUTER UN SORT » débordait par la gauche.
    await page.getByRole('tab', { name: /^Magie$/i }).click();
    const addSpell = page.getByRole('button', { name: /Ajouter un sort/i }).first();
    await addSpell.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Chercher un sort à ajouter').fill('benediction');
    await expect(dialog.getByRole('button', { name: /Bénédiction/ })).toBeVisible();
    await uatShot(page, '02-modale-ajouter-un-sort-padding', { viewport: true });
  });

  test('la carte d’expérience se lit et s’édite', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, clericL1Protector);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(clericL1Protector.name).first()).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole('tab', { name: /^Âme$/i }).click();
    const panel = page.locator('#sheet-mode-panel-ame');
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('heading', { name: 'Expérience' })).toBeVisible();
    await uatShot(page, '03-ame-carte-experience');

    // Attribuer 450 PX : le total, la jauge et le reste avant le niveau
    // suivant doivent tous bouger ensemble.
    await panel.getByRole('button', { name: 'Modifier les points d’expérience' }).click();
    const input = panel.getByRole('spinbutton');
    await input.fill('450');
    await input.press('Enter');
    await expect(panel.getByText(/450 PX avant le niveau 3/)).toBeVisible({
      timeout: 10_000,
    });
    // Écarter le pointeur : l'infobulle du bouton reste ouverte après le clic
    // et recouvre le titre de la carte sur la capture.
    await page.mouse.move(0, 0);
    await expect(panel.getByRole('tooltip')).toBeHidden();
    await uatShot(page, '04-ame-experience-450-attribues');
  });

  test('le menu d’attaque accueille la prise en tenaille sans déborder', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, fighterL1MasteryDefense);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(fighterL1MasteryDefense.name).first()).toBeVisible({
      timeout: 10_000,
    });

    // La variante n'est pas activable sans campagne dans ce parcours : on
    // capture le menu tel qu'il est hors variante, pour juger la rangée de
    // pilules de référence à laquelle la tenaille vient s'ajouter.
    await page.getByRole('tab', { name: /^Combat$/i }).click();
    const panel = page.locator('#sheet-mode-panel-combat');
    await expect(panel).toBeVisible();
    await uatShot(page, '05-combat-liste-attaques');
  });
});
