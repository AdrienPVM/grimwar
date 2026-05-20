import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { takeStepScreenshot } from './helpers/screenshot';
import { seedCharacter, wizardL3 } from './seed-character';

/**
 * Magie mode e2e (plan 13.5 complément — dette plan 09 step 15 partielle).
 *
 * **Périmètre** : golden path Magie. Seed un Magicien niv. 3 (4 sorts connus,
 * 2 cantrips + 2 sorts niv 1), navigue vers sa fiche, switch sur l'onglet
 * Magie, vérifie le câblage entre :
 *   - le contenu public (cache Dexie alimenté par `public/data/spells.json`)
 *   - le doc Firestore (knownSpells.wizard de 4 IDs)
 *   - le rendu UI (au moins 1 sort visible + barre de stats classe)
 *
 * **Pourquoi cette spec a une vraie valeur** : la magie est la feature où le
 * cache Dexie + le doc Firestore + la résolution des sorts par classe se
 * rencontrent. Si jamais une régression casse l'index spells (ex : refactor
 * `useContent('spells')`) ou la résolution `knownSpells[classId]`, la liste
 * tombera à vide ; ce test l'attrape immédiatement.
 *
 * **Ce qui n'est PAS testé ici** (intentionnel) :
 *   - Consommation slot via tap MagicCircle — couvert unitairement par
 *     `spell-slots.test.ts`.
 *   - Modale SpellDetail + flow de lancement avec concentration — la
 *     mécanique de concentration est testée dans le slice unitaire.
 *   - Filtres recherche / préparé / cantrip / ritual — UI search, faible
 *     risque de régression silencieuse.
 *
 * **Pré-requis** : émulateur Firebase actif. Sans émulateur, skip propre.
 */
test.describe('Magie — slots + spell list (golden path Magicien niv. 3)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping magie.',
    );
  });

  test('Magicien niv. 3 → onglet Magie → barre stats + sort connu visible', async ({ page }, testInfo) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, wizardL3);
    await page.goto(`/character/${charId}`);

    // 1. Fiche chargée — le nom apparaît dans la hero card.
    await expect(
      page.getByText(wizardL3.name).first(),
      'Le nom du PJ Magicien doit apparaître sur la fiche après seed + nav.',
    ).toBeVisible({ timeout: 10_000 });
    await takeStepScreenshot(page, testInfo, 'wizard-l3-sheet-loaded');

    // 2. Tap onglet Magie.
    await page.getByRole('tab', { name: /^Magie$/i }).click();
    const panel = page.locator('#sheet-mode-panel-magie');
    await expect(
      panel,
      'Le panel Magie doit être rendu après tap de l\'onglet.',
    ).toBeVisible();
    await takeStepScreenshot(page, testInfo, 'wizard-l3-magie-tab');

    // 3. Barre de stats classe : doit afficher au moins « DD » + « + attaque »
    //    pour la classe Wizard. Le composant SpellStatsBar rend ces labels
    //    inconditionnellement quand au moins une classe lanceuse existe — si
    //    `spellcastingClasses` est vide (régression), la barre ne rend rien.
    await expect(
      panel.getByText('DD').first(),
      'La barre de stats magie doit montrer le DD du sort (8 + PB + mod).',
    ).toBeVisible();
    await expect(
      panel.getByText(/\+ attaque/i).first(),
      'La barre de stats magie doit montrer le bonus d\'attaque (+ PB + mod).',
    ).toBeVisible();

    // 4. Au moins UN sort connu rendu dans la liste. Les sorts seedés sont
    //    « Main du mage » (cantrip) + « Aspersion acide » (cantrip) + « Alarme »
    //    (niv 1) + « Armure du mage » (niv 1). On valide la présence d'au
    //    moins 2 d'entre eux pour ne pas être faux-positif sur un crash
    //    silencieux qui laisserait un seul sort de fallback.
    //
    //    Note : si le texte est dans une carte Card cliquable, le sort est
    //    cherché en se contentant de localiser le label visible.
    await expect(
      panel.getByText(/Armure du mage/i).first(),
      '« Armure du mage » (preset wizardL3) doit apparaître dans la liste — si absent, knownSpells.wizard n\'est pas résolu correctement.',
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      panel.getByText(/Alarme/i).first(),
      '« Alarme » (preset wizardL3) doit apparaître dans la liste.',
    ).toBeVisible();
    await takeStepScreenshot(page, testInfo, 'wizard-l3-spells-visible');
  });
});
