import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { takeStepScreenshot } from './helpers/screenshot';
import { seedCharacter, wizardL1Grimoire } from './seed-character';

/**
 * Préparation des sorts e2e — Magicien niv. 1 (depuis le grimoire).
 *
 * **Pourquoi ce test a une vraie valeur** : contrairement au Clerc/Druide/
 * Paladin (qui préparent depuis toute la liste de classe, couvert par
 * `spell-preparation.spec.ts`), le Magicien prépare depuis son **grimoire**.
 * Avant ce slice, les deux cartes Préparés / Grimoire de la fiche du Magicien
 * étaient en LECTURE SEULE : aucun moyen de déplacer un sort du Grimoire vers
 * Préparés (ni l'inverse) après la création. Ce test prouve le round-trip
 * complet : « Modifier » → retirer un préparé (4→3) → préparer un sort du
 * grimoire (3→4), avec persistance Firestore (`preparedSpells.wizard`).
 *
 * **Pré-requis** : émulateur Firebase actif. Sans émulateur, skip propre.
 */
test.describe('Préparation des sorts — Magicien niv. 1 (grimoire)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping wizard-spell-preparation.',
    );
  });

  test('Magicien L1 → onglet Magie → retirer un préparé (4→3) → préparer un sort du grimoire (3→4)', async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, wizardL1Grimoire);
    await page.goto(`/character/${charId}`);

    await expect(
      page.getByText(wizardL1Grimoire.name).first(),
      'Le nom du Magicien doit apparaître sur la fiche après seed + nav.',
    ).toBeVisible({ timeout: 10_000 });

    // Onglet Magie.
    await page.getByRole('tab', { name: /^Magie$/i }).click();
    const panel = page.locator('#sheet-mode-panel-magie');
    await expect(panel).toBeVisible();

    const preparedSection = panel.getByRole('region', { name: /Sorts préparés/i });
    const grimoireSection = panel.getByRole('region', { name: /Grimoire/i });

    // État initial : 4 préparés / 2 au grimoire.
    await expect(preparedSection.getByRole('heading', { name: /Sorts préparés · 4/ })).toBeVisible();
    await expect(grimoireSection.getByRole('heading', { name: /Grimoire · 2/ })).toBeVisible();
    await takeStepScreenshot(page, testInfo, 'wizard-prep-initial');

    // Entrer en mode préparation — le plafond chiffré apparaît (4 / 4).
    await panel.getByRole('button', { name: 'Modifier' }).click();
    await expect(
      panel.getByText('4 / 4 préparés'),
      'Plafond Magicien L1 = 4 (colonne Prepared Spells SRD 2024).',
    ).toBeVisible();
    await takeStepScreenshot(page, testInfo, 'wizard-prep-edition-au-plafond');

    // 1. Retirer « Bouclier » des préparés → 3 / 4, le sort retombe au grimoire.
    await preparedSection.getByText('Bouclier').click();
    await expect(
      panel.getByText('3 / 4 préparés'),
      'Après retrait de Bouclier, le compteur passe à 3 / 4.',
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      grimoireSection.getByText('Bouclier'),
      'Bouclier, dépréparé, réapparaît dans le Grimoire.',
    ).toBeVisible();

    // 2. Préparer « Alarme » depuis le grimoire → 4 / 4, le sort monte en Préparés.
    await grimoireSection.getByText('Alarme').click();
    await expect(
      panel.getByText('4 / 4 préparés'),
      'Après préparation d’Alarme, le compteur repasse à 4 / 4.',
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      preparedSection.getByText('Alarme'),
      'Alarme, préparée, apparaît dans la section Préparés.',
    ).toBeVisible();
    await takeStepScreenshot(page, testInfo, 'wizard-prep-roundtrip-final');
  });
});
