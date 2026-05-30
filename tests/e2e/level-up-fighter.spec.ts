import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { takeStepScreenshot } from './helpers/screenshot';
import {
  fighterL1MasteryDefense,
  readBackCharacter,
  seedCharacter,
} from './seed-character';

/**
 * JALON 2B.6a — e2e parcours level-up Fighter L1 → L4.
 *
 * Couvre les 3 transitions canoniques de la modale de level-up sur la classe
 * martiale de référence :
 *
 *  - L1 → L2 : seule étape HP (« Moyenne »), Confirmer applique +average HP
 *    et persiste.
 *  - L2 → L3 : étape HP puis étape Sous-classe (Champion seul candidat dans
 *    le bundle SRD 5.2.1 ship — cf. plan 2B inventory § 2.2).
 *  - L3 → L4 : étape HP puis étape Amélioration de caractéristique (ASI),
 *    chip « Amélioration » sélectionne le défaut +2 Force.
 *
 * Vérifications de bout-en-bout :
 *
 *  1. Le bouton « Monter de niveau » apparaît sur la fiche après seed L1.
 *  2. Le titre de la modale affiche « Niveau N → N+1 ».
 *  3. Chaque transition fait avancer le `totalLevel` côté Firestore
 *     (lecture Admin SDK `readBackCharacter`) — preuve que la persistance
 *     de 2B.5 fonctionne contre l'émulateur, pas seulement en jsdom.
 *  4. À L3, le `classes[0].subclassId` Firestore = `'champion'` après
 *     confirmation.
 *  5. À L4, `abilities.for` a augmenté de 2 (16 → 18 sur le preset).
 *  6. Refresh dur de la page après L4 : la fiche affiche toujours Niveau 4
 *     (preuve que la persistance survit un reload, donc le doc Firestore
 *     est la source de vérité — pas un state React éphémère).
 *
 * Pré-requis : émulateur Firebase actif (`pnpm e2e:emulators`). Sans
 * émulateur, la spec skip proprement (Java/JRE 11+ requis).
 *
 * Gotcha capture : `takeStepScreenshot(page, …, { fullPage: true })` redimensionne
 * temporairement le viewport à `scrollHeight` x `scrollWidth` pour la capture,
 * ce qui sur mobile-chromium peut fermer une modale ouverte (le `DetailModal`
 * portal au `<body>` n'est pas robuste à un resize pendant qu'il est monté).
 * On capture donc UNIQUEMENT entre les ouvertures/fermetures de modale, jamais
 * pendant qu'un step intermédiaire est rendu.
 */
test.describe('Level-up Fighter L1 → L4 (HP + sous-classe + ASI)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping level-up Fighter.',
    );
  });

  test('Fighter L1 → L2 → L3 (Champion) → L4 (ASI Force +2) + persistance reload', async ({
    page,
  }, testInfo) => {
    // ── Boot + seed ────────────────────────────────────────────────────
    await page.goto('/');
    await waitForAppReady(page);

    const { uid, charId } = await seedCharacter(page, fighterL1MasteryDefense);
    await page.goto(`/character/${charId}`);

    await expect(
      page.getByText(fighterL1MasteryDefense.name).first(),
      'Hero card doit afficher le nom du Fighter seedé.',
    ).toBeVisible({ timeout: 10_000 });
    await takeStepScreenshot(page, testInfo, '00-sheet-l1-loaded');

    // ── L1 → L2 : 1 étape HP ───────────────────────────────────────────
    const levelUpButton = page.getByRole('button', { name: /Monter au niveau 2/ });
    await expect(
      levelUpButton,
      'Le bouton « Monter de niveau » doit être visible sur la fiche L1.',
    ).toBeVisible();
    await levelUpButton.click();

    let dialog = page.getByRole('dialog');
    await expect(dialog, 'Modale level-up doit s\'ouvrir au tap.').toBeVisible();
    await expect(
      dialog.getByText(/Niveau 1 → 2/),
      'Le titre doit refléter la transition L1 → L2.',
    ).toBeVisible();
    await takeStepScreenshot(page, testInfo, '01-modal-l1-to-l2');

    await dialog.getByRole('button', { name: /Moyenne/i }).click();
    await dialog.getByRole('button', { name: /^Confirmer$/i }).click();
    await expect(dialog, 'Modale doit se fermer après Confirmer L1→L2.').toBeHidden({
      timeout: 5_000,
    });

    // Doc Firestore relu via Admin SDK → totalLevel = 2.
    await expect
      .poll(
        async () => {
          const doc = await readBackCharacter(uid, charId);
          return doc?.totalLevel;
        },
        {
          message: 'Le doc Firestore doit avoir totalLevel=2 après L1→L2.',
          timeout: 5_000,
        },
      )
      .toBe(2);

    // ── L2 → L3 : HP + sous-classe Champion ────────────────────────────
    const levelUpButtonL3 = page.getByRole('button', { name: /Monter au niveau 3/ });
    await expect(
      levelUpButtonL3,
      'Le bouton « Monter de niveau » doit refléter la cible L3 après L1→L2.',
    ).toBeVisible({ timeout: 5_000 });
    await levelUpButtonL3.click();

    dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/Niveau 2 → 3/)).toBeVisible();
    await expect(dialog.getByText(/Étape 1 \/ 2/)).toBeVisible();

    await dialog.getByRole('button', { name: /Moyenne/i }).click();
    await dialog.getByRole('button', { name: /^Suivant$/i }).click();

    await expect(dialog.getByText(/Étape 2 \/ 2/)).toBeVisible();
    const championRadio = dialog.getByRole('radio', { name: /Champion/i });
    await expect(
      championRadio,
      'La sous-classe Champion doit être proposée au L3 Fighter.',
    ).toBeVisible();
    await takeStepScreenshot(page, testInfo, '02-modal-l2-to-l3-step-subclass');

    await championRadio.click();
    await dialog.getByRole('button', { name: /^Confirmer$/i }).click();
    await expect(dialog).toBeHidden({ timeout: 5_000 });

    await expect
      .poll(
        async () => {
          const doc = await readBackCharacter(uid, charId);
          const classes = (doc?.classes as Array<{ subclassId: string | null; level: number }>) ?? [];
          return { level: doc?.totalLevel, subclassId: classes[0]?.subclassId };
        },
        {
          message: 'Le doc Firestore doit avoir totalLevel=3 + subclassId=champion.',
          timeout: 5_000,
        },
      )
      .toEqual({ level: 3, subclassId: 'champion' });

    // ── L3 → L4 : HP + ASI +2 Force ────────────────────────────────────
    const levelUpButtonL4 = page.getByRole('button', { name: /Monter au niveau 4/ });
    await expect(levelUpButtonL4).toBeVisible({ timeout: 5_000 });
    await levelUpButtonL4.click();

    dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/Niveau 3 → 4/)).toBeVisible();
    await expect(dialog.getByText(/Étape 1 \/ 2/)).toBeVisible();

    await dialog.getByRole('button', { name: /Moyenne/i }).click();
    await dialog.getByRole('button', { name: /^Suivant$/i }).click();

    await expect(dialog.getByText(/Étape 2 \/ 2/)).toBeVisible();
    // Le step ASI/Feat affiche d'abord 2 chips radio « Amélioration » + « Don ».
    const asiChip = dialog.getByRole('radio', { name: /Amélioration/i });
    await expect(
      asiChip,
      'Le chip Amélioration doit être proposé au step ASI L4.',
    ).toBeVisible();
    await takeStepScreenshot(page, testInfo, '03-modal-l3-to-l4-step-asi');

    await asiChip.click();
    // Le défaut posé par la modale = +2 sur Force (cf. level-up-modal.tsx
    // l.452 : abilityIncreases:[{ ability:'for', bonus:2 }]). On Confirme
    // directement — vérification du défaut, pas du picker.
    await dialog.getByRole('button', { name: /^Confirmer$/i }).click();
    await expect(dialog).toBeHidden({ timeout: 5_000 });

    // Force = 16 (preset) + 2 (ASI) = 18.
    await expect
      .poll(
        async () => {
          const doc = await readBackCharacter(uid, charId);
          const abilities = doc?.abilities as Record<string, number> | undefined;
          return { level: doc?.totalLevel, for: abilities?.for };
        },
        {
          message: 'Le doc Firestore doit avoir totalLevel=4 + abilities.for=18.',
          timeout: 5_000,
        },
      )
      .toEqual({ level: 4, for: 18 });

    // ── Persistance : reload page, l'état L4 doit survivre ─────────────
    await page.reload();
    await waitForAppReady(page);
    await expect(
      page.getByText(fighterL1MasteryDefense.name).first(),
      'Hero card doit toujours afficher le Fighter après reload.',
    ).toBeVisible({ timeout: 10_000 });

    // Le bouton de level-up reflète maintenant la cible L5 (= preuve que la
    // fiche reçoit bien la donnée persistée).
    await expect(
      page.getByRole('button', { name: /Monter au niveau 5/ }),
      'Après reload, le bouton doit cibler L5 (= la fiche lit le doc Firestore à totalLevel=4).',
    ).toBeVisible({ timeout: 10_000 });
    await takeStepScreenshot(page, testInfo, '04-sheet-l4-after-reload');
  });
});
