import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { takeStepScreenshot } from './helpers/screenshot';
import { seedCharacter, wizardL1Grimoire } from './seed-character';

/**
 * Magie e2e — Magicien L1 grimoire complet (plan 13.9 commit 4c).
 *
 * Périmètre : la fiche du Magicien mono-class rend DEUX sections distinctes
 * « Sorts préparés » (4) et « Grimoire » (2 inscrits non-préparés).
 * Captures à chaque étape pour la galerie de pré-UAT.
 *
 * Cohérence avec le test unitaire `wizard-spellbook-sections.test.tsx` :
 * ce test e2e prouve que le composant est bien câblé dans `MagieMode` quand
 * la condition `isWizardMonoClass` est satisfaite.
 */
test.describe('Magie — Magicien L1 grimoire (2 sections + tap sort)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping wizard grimoire.',
    );
  });

  test('Magicien L1 → Magie → 2 sections (Préparés / Grimoire) + modale détail sort', async ({ page }, testInfo) => {
    await page.goto('/');
    await waitForAppReady(page);
    await takeStepScreenshot(page, testInfo, 'app-ready');

    const { charId } = await seedCharacter(page, wizardL1Grimoire);
    await page.goto(`/character/${charId}`);

    await expect(
      page.getByText(wizardL1Grimoire.name).first(),
      'Hero card du Magicien seedé doit être visible.',
    ).toBeVisible({ timeout: 10_000 });
    await takeStepScreenshot(page, testInfo, 'wizard-sheet-loaded');

    await page.getByRole('tab', { name: /^Magie$/i }).click();
    const panel = page.locator('#sheet-mode-panel-magie');
    await expect(panel, 'Panel Magie rendu après tap.').toBeVisible();
    await takeStepScreenshot(page, testInfo, 'magie-tab-open');

    // 2 régions distinctes : Sorts préparés + Grimoire.
    const preparedSection = page.getByRole('region', { name: /Sorts préparés/i });
    const grimoireSection = page.getByRole('region', { name: /Grimoire/i });
    await expect(preparedSection, 'Section Sorts préparés présente.').toBeVisible();
    await expect(grimoireSection, 'Section Grimoire présente.').toBeVisible();
    await takeStepScreenshot(page, testInfo, 'two-sections-visible');

    // Préparés contient bouclier (sort préparé).
    await expect(preparedSection.getByText('Bouclier')).toBeVisible();
    // Grimoire contient alarme (inscrit non-préparé).
    await expect(grimoireSection.getByText('Alarme')).toBeVisible();
    // Test négatif : Alarme N'EST PAS dans Préparés.
    await expect(preparedSection.getByText('Alarme')).toHaveCount(0);

    // Tap sur un sort préparé → modale détail.
    await preparedSection.getByText('Bouclier').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog, 'Modale détail sort doit s\'ouvrir.').toBeVisible();
    await expect(
      dialog.getByText('Bouclier'),
      'Titre modale = name.fr du sort EXACT (cat. 2 identité).',
    ).toBeVisible();
    await takeStepScreenshot(page, testInfo, 'spell-modal-prepared');

    // Ferme via le bouton « Fermer » (SpellDetailModal n'écoute pas Échap —
    // c'est une modale custom héritée du plan 09 ; à migrer sur <DetailModal>
    // partagée dans un plan ultérieur si besoin).
    await dialog.getByRole('button', { name: /Fermer/i }).first().click();
    await expect(dialog, 'La modale doit se fermer au clic sur Fermer.').toBeHidden();

    // Tap sur un sort de la section Grimoire (inscrit non-préparé) → modale.
    await grimoireSection.getByText('Alarme').click();
    await expect(dialog, 'Modale doit ré-ouvrir pour le sort inscrit non-préparé.').toBeVisible();
    await expect(dialog.getByText('Alarme').first()).toBeVisible();
    await takeStepScreenshot(page, testInfo, 'spell-modal-grimoire-only');
  });
});
