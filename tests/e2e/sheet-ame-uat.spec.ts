import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { clericL1Protector, rogueL1Expertise, seedCharacter, type SeedPreset } from './seed-character';

/**
 * UAT visuel — mode Âme (plan 20 v1) : Personnalité (trait / idéal / attache /
 * défaut), Histoire, et tableau de bord des statistiques de jeu. Champs réservés
 * au propriétaire (édition inline), stats agrégées depuis `character.stats`.
 *
 * Deux états capturés pour la revue d'Adrien :
 *   • rempli (personnalité + stats peuplées) → l'affichage de contenu ;
 *   • vide (propriétaire) → les affordances « Modifier » + invites de vide +
 *     message « aucun jet ».
 * Captures pleine page dans `uat-review/ame/`. La spec asserte le CONTENU
 * (identité, pas présence ; moyenne d20 au nombre — cat. 2/4 testing policy).
 */

const AME_FILLED: SeedPreset = {
  ...rogueL1Expertise,
  name: 'Sif aux Mille Visages',
  personality: {
    trait: 'Je désamorce la tension avec une plaisanterie au pire moment.',
    ideal: 'Liberté. Les chaînes sont faites pour être brisées.',
    bond: 'Je dois tout à la guilde qui m’a recueillie enfant.',
    flaw: 'Je ne résiste jamais à un trésor mal gardé.',
    backstory:
      'Abandonnée sur les quais de la cité, Sif a grandi entre les toits et les égouts, apprenant à survivre par la ruse avant d’apprendre à lire.',
  },
  stats: {
    totalRolls: 24,
    totalD20Sum: 252,
    crits: 3,
    fumbles: 1,
    skillUses: { stealth: 9, perception: 4, acrobatics: 2 },
  },
};

test.describe('UAT — mode Âme (Personnalité / Histoire / Statistiques)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+).',
    );
  });

  test('Âme rempli : personnalité exacte + stats (moyenne d20 = 10.5)', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, AME_FILLED);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(AME_FILLED.name).first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole('tab', { name: /^Âme$/i }).click();
    const panel = page.locator('#sheet-mode-panel-ame');
    await expect(panel).toBeVisible();

    // Personnalité — valeurs EXACTES du doc (identité, pas présence). Le titre
    // de section est ciblé par texte EXACT (le nom accessible du titre inclut les
    // décorations ✦ du CardHeader ; « personnalité » réapparaît aussi dans le
    // libellé « Trait de personnalité » → getByText exact évite les 2 pièges).
    await expect(panel.getByText('Personnalité', { exact: true })).toBeVisible();
    await expect(
      panel.getByText('Je désamorce la tension avec une plaisanterie au pire moment.'),
    ).toBeVisible();
    await expect(panel.getByText('Liberté. Les chaînes sont faites pour être brisées.')).toBeVisible();
    // Terme projet : « Attache » (pas « Lien »).
    await expect(panel.getByText('Attache', { exact: true })).toBeVisible();

    // Histoire.
    await expect(panel.getByText('Histoire', { exact: true })).toBeVisible();
    await expect(panel.getByText(/Abandonnée sur les quais de la cité/)).toBeVisible();

    // Stats — moyenne d20 = 252 / 24 = 10.5 (au NOMBRE, cat. 4).
    await expect(panel.getByText('Statistiques', { exact: true })).toBeVisible();
    await expect(panel.getByText('10.5')).toBeVisible();
    await expect(panel.getByText('Moyenne au d20')).toBeVisible();
    // stealth (9) plus utilisée → « Discrétion » (nom FR du registre SKILLS).
    await expect(panel.getByText('Discrétion')).toBeVisible();

    await page.screenshot({ path: 'uat-review/ame/01-ame-rempli.png', fullPage: true });
  });

  test('Âme vide (propriétaire) : invites de vide + boutons Modifier + aucun jet', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, clericL1Protector);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(clericL1Protector.name).first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole('tab', { name: /^Âme$/i }).click();
    const panel = page.locator('#sheet-mode-panel-ame');
    await expect(panel).toBeVisible();

    // 4 champs de personnalité vides → invite « Pas encore renseigné. ».
    await expect(panel.getByText('Pas encore renseigné.')).toHaveCount(4);
    // Le propriétaire voit des affordances « Modifier ».
    await expect(
      panel.getByRole('button', { name: 'Modifier Trait de personnalité' }),
    ).toBeVisible();
    // Aucun jet → message neutre, pas de tuiles à 0.
    await expect(panel.getByText('Aucun jet enregistré pour l’instant.')).toBeVisible();

    await page.screenshot({ path: 'uat-review/ame/02-ame-vide-editable.png', fullPage: true });
  });

  test('Âme édition : saisir un trait le persiste et l’affiche', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, clericL1Protector);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(clericL1Protector.name).first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole('tab', { name: /^Âme$/i }).click();
    const panel = page.locator('#sheet-mode-panel-ame');
    await expect(panel).toBeVisible();

    await panel.getByRole('button', { name: 'Modifier Trait de personnalité' }).click();
    const textarea = panel.getByRole('textbox', { name: 'Trait de personnalité' });
    await textarea.fill('Je récite une prière avant chaque combat.');
    await panel.getByRole('button', { name: 'Enregistrer' }).click();

    // Persisté → ré-affiché en lecture (le onSnapshot remonte la valeur).
    await expect(panel.getByText('Je récite une prière avant chaque combat.')).toBeVisible();
    await page.screenshot({ path: 'uat-review/ame/03-ame-edition-persistee.png', fullPage: true });
  });
});
