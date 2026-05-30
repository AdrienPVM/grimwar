import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { takeStepScreenshot } from './helpers/screenshot';
import {
  readBackCharacter,
  rogueL1Expertise,
  seedCharacter,
} from './seed-character';

/**
 * JALON 2B.6b — e2e parcours level-up Rogue L1 → L3.
 *
 * Persona « skill-focused » (Roublard) — couvre :
 *
 *  - L1 → L2 : step HP unique (« Ruse » est une feature de classe, pas un
 *    choix utilisateur).
 *  - L2 → L3 : HP + sous-classe Voleur.
 *
 * Le Rôdeur a un ASI bonus à L10 et un autre à L6/14/etc., mais la
 * matrice ASI 2C.2 + le bundle confirment que L4/8/10/12/16 sont les
 * niveaux ASI Roublard. Pas d'ASI ni de sorts/cantrips au parcours L1→L3.
 *
 * Persona caractéristique : Roublard L1 avec Expertise sur Discrétion +
 * Escamotage (preset `rogueL1Expertise`) — vérifie au passage que les
 * sous-choix L1 (`expertiseSkills`) survivent au level-up (champ
 * non-touché par le patch partiel `useLevelUp`).
 *
 * Pré-requis : émulateur Firebase actif (`pnpm e2e:emulators`).
 *
 * Gotcha capture (cf. spec Fighter) : pas de `takeStepScreenshot` entre
 * deux steps d'une modale ouverte (le fullPage resize ferme la modale).
 */
test.describe('Level-up Rogue L1 → L3 (HP + sous-classe Voleur)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping level-up Rogue.',
    );
  });

  test('Rogue L1 → L2 → L3 (Voleur) + persistance reload + expertise conservée', async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { uid, charId } = await seedCharacter(page, rogueL1Expertise);
    await page.goto(`/character/${charId}`);

    await expect(
      page.getByText(rogueL1Expertise.name).first(),
      'Hero card doit afficher le nom du Roublard seedé.',
    ).toBeVisible({ timeout: 10_000 });
    await takeStepScreenshot(page, testInfo, '00-sheet-l1-loaded');

    // ── L1 → L2 : HP seul ──────────────────────────────────────────────
    await page.getByRole('button', { name: /Monter au niveau 2/ }).click();
    let dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/Niveau 1 → 2/)).toBeVisible();
    // 1 step → pas d'indicateur d'étape (cf. StepIndicator total <= 1).
    await expect(dialog.getByText(/Étape 1 \/ /)).toHaveCount(0);

    await dialog.getByRole('button', { name: /Moyenne/i }).click();
    await dialog.getByRole('button', { name: /^Confirmer$/i }).click();
    await expect(dialog).toBeHidden({ timeout: 5_000 });

    await expect
      .poll(
        async () => {
          const doc = await readBackCharacter(uid, charId);
          return doc?.totalLevel;
        },
        { message: 'L1→L2 doit poser totalLevel=2.', timeout: 5_000 },
      )
      .toBe(2);

    // ── L2 → L3 : HP + sous-classe Voleur ─────────────────────────────
    await page.getByRole('button', { name: /Monter au niveau 3/ }).click();
    dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/Niveau 2 → 3/)).toBeVisible();
    await expect(dialog.getByText(/Étape 1 \/ 2/)).toBeVisible();

    await dialog.getByRole('button', { name: /Moyenne/i }).click();
    await dialog.getByRole('button', { name: /^Suivant$/i }).click();

    await expect(dialog.getByText(/Étape 2 \/ 2/)).toBeVisible();
    const voleurRadio = dialog.getByRole('radio', { name: /Voleur/i });
    await expect(
      voleurRadio,
      'La sous-classe Voleur doit être proposée au L3 Rogue.',
    ).toBeVisible();
    await takeStepScreenshot(page, testInfo, '01-modal-l2-to-l3-step-subclass');

    await voleurRadio.click();
    await dialog.getByRole('button', { name: /^Confirmer$/i }).click();
    await expect(dialog).toBeHidden({ timeout: 5_000 });

    // Vérification finale : totalLevel + subclassId + sous-choix L1
    // (expertiseSkills) toujours présents — le patch partiel `useLevelUp`
    // ne doit JAMAIS écraser les champs hors du périmètre.
    const finalDoc = await readBackCharacter(uid, charId);
    expect(finalDoc?.totalLevel).toBe(3);
    const classes = finalDoc?.classes as Array<{
      subclassId: string | null;
      expertiseSkills: string[];
    }>;
    expect(classes[0]?.subclassId).toBe('thief');
    expect(classes[0]?.expertiseSkills).toEqual(['stealth', 'sleight-of-hand']);

    // ── Reload : persistance fiche → bouton cible L4 ──────────────────
    await page.reload();
    await waitForAppReady(page);
    await expect(
      page.getByText(rogueL1Expertise.name).first(),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole('button', { name: /Monter au niveau 4/ }),
      'Après reload, le bouton doit cibler L4.',
    ).toBeVisible({ timeout: 10_000 });
    await takeStepScreenshot(page, testInfo, '02-sheet-l3-after-reload');
  });
});
