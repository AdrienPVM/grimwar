import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { takeStepScreenshot } from './helpers/screenshot';
import {
  fighterL3MulticlassReady,
  paladinL1MulticlassBlocked,
  readBackCharacter,
  seedCharacter,
} from './seed-character';

/**
 * JALON 2D.5 — e2e parcours add-class (multiclass) côté UI.
 *
 * Couvre deux pivots du flow 2D côté utilisateur :
 *
 *  1. **Add-class succès** — Fighter L3 (SAG 13) ouvre la modale via le
 *     bouton « Ajouter une classe », pick Cleric (éligible), sélectionne
 *     l'Ordre divin « Protecteur » (single-select wiré en 2D.4c), confirme.
 *     On vérifie côté Firestore (`readBackCharacter`) :
 *       - `totalLevel === 4`,
 *       - `classes.length === 2`, `classes[1].classId === 'cleric'`,
 *       - `classes[1].level === 1`, `clericDivineOrder === 'protector'`,
 *       - `spellSlots['1'].max === 2` (caster level unifié = 1, Cleric
 *         full caster L1).
 *     Preuve que le flow add-class (2D.4a→2D.4c) persiste correctement
 *     l'état multiclass et déclenche le recompute SRD des slots.
 *     NB : le wiring multi-select (Weapon Mastery, Eldritch Invocations,
 *     Wizard Spellbook) est gating en 2D.4d ; en attendant, on exerce le
 *     flow complet via une classe à sous-choix L1 single-select pour
 *     prouver le câblage end-to-end.
 *
 *  2. **Add-class blocked par prereq** — Paladin L1 avec CHA 12 voit le
 *     picker mais la rangée Bard est `aria-disabled='true'` et porte la
 *     raison `CHA 12/13`. Preuve que `computeMulticlassEligibility`
 *     (2D.3) + le grey-out (2D.4c) gardent un MJ déloyal de bypasser la
 *     règle. Le Fighter reste cliquable (FOR 13 satisfait le OR du
 *     prereq Fighter — sans quoi le bouton « Ajouter une classe » ne
 *     s'afficherait même pas).
 *
 * Pré-requis : émulateur Firebase actif (`pnpm e2e:emulators`). Sans
 * émulateur, le `test.skip` du beforeAll garantit pas de faux-vert.
 */
test.describe('Level-up multiclass — add-class flow + prereq gating', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping level-up multiclass.',
    );
  });

  test('Fighter L3 (SAG 13) → ajoute Cleric L1 Protecteur : slots unifiés + persistance', async ({
    page,
  }, testInfo) => {
    // ── Boot + seed ───────────────────────────────────────────────────
    await page.goto('/');
    await waitForAppReady(page);

    const { uid, charId } = await seedCharacter(page, fighterL3MulticlassReady);
    await page.goto(`/character/${charId}`);

    await expect(
      page.getByText(fighterL3MulticlassReady.name).first(),
      'Hero card doit afficher le nom du Fighter seedé.',
    ).toBeVisible({ timeout: 10_000 });
    await takeStepScreenshot(page, testInfo, '00-sheet-fighter-l3');

    // ── Ouverture modale add-class ────────────────────────────────────
    const addClassButton = page.getByRole('button', { name: /Ajouter une classe/i });
    await expect(
      addClassButton,
      'Le bouton « Ajouter une classe » doit être visible sur la fiche Fighter L3 (au moins 1 classe éligible).',
    ).toBeVisible();
    await addClassButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog, 'Modale add-class doit s\'ouvrir au tap.').toBeVisible();
    await expect(
      dialog.getByText(/Choisis ta nouvelle classe/i),
      'Le titre doit refléter le picker initial.',
    ).toBeVisible();
    await takeStepScreenshot(page, testInfo, '01-modal-add-class-picker');

    // ── Pick Cleric (éligible car SAG 13) ─────────────────────────────
    const clericOption = dialog.getByRole('radio', { name: /Clerc/i });
    await expect(
      clericOption,
      'L\'option Clerc doit être présente et cliquable.',
    ).toBeVisible();
    await expect(clericOption).not.toHaveAttribute('aria-disabled', 'true');
    await clericOption.click();

    // Étape suivante : sub-choices L1 du Clerc (Ordre divin).
    await dialog.getByRole('button', { name: /^Suivant$/i }).click();

    await expect(
      dialog.getByText(/Ordre divin/i),
      'Le single-select Ordre divin doit apparaître pour la classe Clerc.',
    ).toBeVisible();
    await takeStepScreenshot(page, testInfo, '02-modal-cleric-divine-order');

    // Pick « Protecteur » — un des 2 Ordres divins SRD 5.2.1 (Protecteur /
    // Thaumaturge), rendu par `AddClassSubChoicesStep > RadioRowGroup`.
    const protectorOption = dialog.getByRole('radio', { name: /Protecteur/i });
    await expect(
      protectorOption,
      'L\'option « Protecteur » doit être proposée comme Ordre divin.',
    ).toBeVisible();
    await protectorOption.click();

    // ── Confirm ───────────────────────────────────────────────────────
    await dialog.getByRole('button', { name: /^Confirmer$/i }).click();
    await expect(dialog, 'Modale doit se fermer après Confirmer.').toBeHidden({
      timeout: 5_000,
    });

    // ── Vérification Firestore via Admin SDK ──────────────────────────
    await expect
      .poll(
        async () => {
          const doc = await readBackCharacter(uid, charId);
          const classes =
            (doc?.classes as Array<{
              classId: string;
              level: number;
              clericDivineOrder?: string | null;
            }>) ?? [];
          const slots = doc?.spellSlots as Record<string, { max: number }> | undefined;
          return {
            totalLevel: doc?.totalLevel,
            classesLength: classes.length,
            secondClassId: classes[1]?.classId,
            secondClassLevel: classes[1]?.level,
            secondClericOrder: classes[1]?.clericDivineOrder,
            slotsL1Max: slots?.['1']?.max,
          };
        },
        {
          message:
            'Le doc Firestore doit refléter Fighter L3 + Cleric L1 Protecteur multiclass après Confirmer.',
          timeout: 5_000,
        },
      )
      .toEqual({
        totalLevel: 4,
        classesLength: 2,
        secondClassId: 'cleric',
        secondClassLevel: 1,
        secondClericOrder: 'protector',
        slotsL1Max: 2,
      });

    await takeStepScreenshot(page, testInfo, '03-sheet-multiclass-fighter-cleric');
  });

  test('Paladin L1 (CHA 12) → Bard grisé dans le picker (CHA 12/13)', async ({
    page,
  }, testInfo) => {
    // ── Boot + seed ───────────────────────────────────────────────────
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, paladinL1MulticlassBlocked);
    await page.goto(`/character/${charId}`);

    await expect(
      page.getByText(paladinL1MulticlassBlocked.name).first(),
      'Hero card doit afficher le nom du Paladin seedé.',
    ).toBeVisible({ timeout: 10_000 });
    await takeStepScreenshot(page, testInfo, '00-sheet-paladin-l1');

    // ── Le bouton add-class doit être visible car Fighter (FOR 13)
    //     est éligible — sans quoi `LevelUpButton` masque l'entrée.
    const addClassButton = page.getByRole('button', { name: /Ajouter une classe/i });
    await expect(
      addClassButton,
      'Le bouton « Ajouter une classe » doit être visible (Fighter éligible via FOR 13).',
    ).toBeVisible();
    await addClassButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await takeStepScreenshot(page, testInfo, '01-modal-picker-with-blocked-options');

    // ── Bard doit être présent dans le picker mais grisé avec raison ──
    const bardOption = dialog.getByRole('radio', { name: /Barde/i });
    await expect(
      bardOption,
      'Le Barde doit être listé dans le picker (présent mais bloqué).',
    ).toBeVisible();
    await expect(
      bardOption,
      'aria-disabled doit valoir "true" pour le Barde (CHA <13).',
    ).toHaveAttribute('aria-disabled', 'true');

    // La raison textuelle doit afficher le score actuel vs minimum.
    // Pattern rendu par `AddClassPickerStep` : `CHA {actual}/{minimum}`.
    await expect(
      bardOption,
      'Le bouton Barde doit porter la raison « CHA 12/13 » comme contenu.',
    ).toContainText(/CHA 12\/13/i);

    // ── Sanity : Fighter reste cliquable (preuve que le picker n'est
    //     pas bloqué globalement par un bug — seul Bard est grisé) ────
    const fighterOption = dialog.getByRole('radio', { name: /Guerrier/i });
    await expect(fighterOption).toBeVisible();
    await expect(fighterOption).not.toHaveAttribute('aria-disabled', 'true');
  });
});
