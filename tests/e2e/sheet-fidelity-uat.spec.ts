import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import {
  clericL1Protector,
  fighterL1MasteryDefense,
  rogueL1Expertise,
  seedCharacter,
  wizardL1Grimoire,
  type SeedPreset,
} from './seed-character';

/**
 * UAT visuel — fidélité de la fiche niveau 1 (ce plan) :
 *   • Perception passive sur le status strip (4e cellule) ;
 *   • carte « Maîtrises » (armures / armes / outils) en mode Essence ;
 *   • carte « Langues » avec la langue bonus du Roublard.
 *
 * Captures pleine page écrites dans `uat-review/sheet-fidelity/` pour la revue
 * d'Adrien. La spec asserte aussi le CONTENU (cat. 2/4 testing policy) pour ne
 * pas dépendre de l'œil seul.
 */

const ROGUE_WITH_LANGUAGE: SeedPreset = {
  ...rogueL1Expertise,
  name: 'Sif la Polyglotte',
  // La langue bonus du Roublard — perdue avant le fix submit, désormais
  // persistée et affichée par la carte Langues.
  extraLanguages: ['elvish'],
};

test.describe('UAT — fidélité fiche L1 (Perception passive / Maîtrises / Langues)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+).',
    );
  });

  test('Guerrier : Perception passive au strip + Maîtrises complètes en Essence', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, fighterL1MasteryDefense);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(fighterL1MasteryDefense.name).first()).toBeVisible({
      timeout: 10_000,
    });

    // Ligne d'identité (carte héros) : l'historique « Soldat » apparaît désormais
    // à côté de l'espèce — jadis stocké mais affiché nulle part.
    await expect(page.getByText(/·\s*Soldat/)).toBeVisible();
    await page.screenshot({
      path: 'uat-review/sheet-fidelity/07-identite-guerrier-soldat.png',
      fullPage: false,
    });

    // Strip : la 4e cellule « Perc. passive » est présente.
    // Sigrid : SAG 10 (mod 0), pas de maîtrise Perception → 10.
    await expect(page.getByText('Perc. passive')).toBeVisible();
    await page.screenshot({
      path: 'uat-review/sheet-fidelity/01-perc-passive-strip.png',
      fullPage: true,
    });

    // Essence : carte Maîtrises — Guerrier a TOUTES les armures (dont « Heavy
    // ar- mor » réparée → « Armures lourdes ») + boucliers + armes courantes/guerre.
    await page.getByRole('tab', { name: /^Essence$/i }).click();
    const panel = page.locator('#sheet-mode-panel-essence');
    await expect(panel).toBeVisible();
    await expect(panel.getByText('Maîtrises')).toBeVisible();
    await expect(panel.getByText('Armures lourdes')).toBeVisible();
    await expect(panel.getByText('Boucliers')).toBeVisible();
    await expect(panel.getByText('Armes de guerre', { exact: true })).toBeVisible();
    await page.screenshot({
      path: 'uat-review/sheet-fidelity/02-maitrises-guerrier.png',
      fullPage: true,
    });
  });

  test('Magicien : aucune armure, outils de background résolus en FR', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, wizardL1Grimoire);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(wizardL1Grimoire.name).first()).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole('tab', { name: /^Essence$/i }).click();
    const panel = page.locator('#sheet-mode-panel-essence');
    await expect(panel).toBeVisible();
    await expect(panel.getByText('Maîtrises')).toBeVisible();
    // « None » → pas de ligne Armures.
    await expect(panel.getByText('Armures', { exact: true })).toHaveCount(0);
    await expect(panel.getByText('Armes courantes')).toBeVisible();
    await page.screenshot({
      path: 'uat-review/sheet-fidelity/03-maitrises-magicien.png',
      fullPage: true,
    });
  });

  test('Roublard : langue bonus (Commun + Elfique) + armes finesse/légère', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, ROGUE_WITH_LANGUAGE);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(ROGUE_WITH_LANGUAGE.name).first()).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole('tab', { name: /^Essence$/i }).click();
    const panel = page.locator('#sheet-mode-panel-essence');
    await expect(panel).toBeVisible();

    // Carte Langues : Commun (ascendance) + Elfique (bonus Roublard) — le fix.
    // On vise le TITRE de carte et non un texte libre : `getByText` fait une
    // recherche de sous-chaîne insensible à la casse, et la description de
    // l'Argot des voleurs contient « …diverses langues auprès des
    // communautés… ». Deux correspondances, violation du mode strict — la
    // spec échouait sur un mot du contenu SRD, pas sur un défaut de la fiche.
    await expect(panel.getByRole('heading', { name: /Langues/ })).toBeVisible();
    await expect(panel.getByRole('listitem').filter({ hasText: /^Commun$/ })).toBeVisible();
    await expect(panel.getByRole('listitem').filter({ hasText: /^Elfique$/ })).toBeVisible();

    // Carte Maîtrises : la variante finesse/légère + outils de voleur.
    await expect(
      panel.getByText('Armes de guerre dotées de la propriété Finesse ou Légère'),
    ).toBeVisible();
    await expect(panel.getByText('Outils de voleur')).toBeVisible();

    await page.screenshot({
      path: 'uat-review/sheet-fidelity/04-langues-roublard-bonus.png',
      fullPage: true,
    });
  });

  test('Clerc : carte « Don d\'origines » (Initié à la magie) + modale détail', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, clericL1Protector);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(clericL1Protector.name).first()).toBeVisible({
      timeout: 10_000,
    });

    // Ligne d'identité : l'historique « Acolyte » à côté de l'espèce.
    await expect(page.getByText(/·\s*Acolyte/)).toBeVisible();
    await page.screenshot({
      path: 'uat-review/sheet-fidelity/08-identite-clerc-acolyte.png',
      fullPage: false,
    });

    await page.getByRole('tab', { name: /^Essence$/i }).click();
    const panel = page.locator('#sheet-mode-panel-essence');
    await expect(panel).toBeVisible();

    // Carte « Don d'origines » : titre de catégorie SRD FR + nom exact du don de
    // l'historique Acolyte (depuis backgrounds.json, pas une constante). Le titre
    // est ciblé par rôle (le mot « don d'origines » réapparaît dans la prose du
    // don → collision strict-mode si on matche par texte).
    await expect(panel.getByRole('heading', { name: /Don d'origines/ })).toBeVisible();
    await expect(panel.getByText('Don : Initié à la magie (Clerc)')).toBeVisible();
    await page.screenshot({
      path: 'uat-review/sheet-fidelity/05-don-origine-clerc.png',
      fullPage: true,
    });

    // Tap → modale détail avec la description complète du don.
    await panel.getByRole('button', { name: /Don d'origines : / }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: /Initié à la magie \(Clerc\)/ })).toBeVisible();
    // Pleine page (contenu textuel) + viewport (ressenti overlay) — cf. règle
    // « captures de modale » du CLAUDE.md.
    await page.screenshot({
      path: 'uat-review/sheet-fidelity/06-don-origine-modale-full.png',
      fullPage: true,
    });
    await page.screenshot({
      path: 'uat-review/sheet-fidelity/06-don-origine-modale-viewport.png',
      fullPage: false,
    });
  });
});
