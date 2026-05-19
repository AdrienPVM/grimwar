import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { fighterL1MasteryDefense, seedCharacter } from './seed-character';

/**
 * Plan 13.9 commit 4a — render Combat des sous-choix de classe Guerrier.
 *
 * Couvre 2 invariants observables côté fiche, sur viewport mobile (cible
 * Playwright par défaut = mobile-chromium) :
 *  - La carte « Style de combat » s'affiche pour un Guerrier dont le sous-
 *    choix `fighterFightingStyle` est posé, avec le nom FR du feat
 *    correspondant (lecture `feats.json`).
 *  - Chaque arme équipée dont l'`itemId` est dans `classes[i].weaponMasteries`
 *    expose un badge `Mastery · <label FR>` cliquable qui ouvre une modale de
 *    détail avec le nom de l'arme substitué dans l'exemple pédagogique.
 *
 * Le test mobile est volontairement strict : si le badge n'est plus tappable
 * faute d'espace ou si la carte ne rend rien parce que le slug d'enum ne
 * résout plus dans le bundle, cette spec rougit (et la suite jsdom aussi —
 * `attacks-list-mastery-badge.test.tsx` couvre les 38 armes en exhaustif).
 *
 * Pré-requis : émulateur Firebase actif (`pnpm e2e:emulators`). Sans
 * émulateur, le test skip proprement.
 */
test.describe('Class Fighter — render Combat (style + mastery badges)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping class-fighter-combat.',
    );
  });

  test('seed Fighter L1 Défense + 3 masteries → Combat mode rend Style + 3 badges Mastery + modale détail', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, fighterL1MasteryDefense);

    await page.goto(`/character/${charId}`);
    await expect(
      page.getByText(fighterL1MasteryDefense.name).first(),
      'Hero card doit afficher le nom du preset (= doc Firestore visible côté client).',
    ).toBeVisible({ timeout: 10_000 });

    // Switch explicite sur Combat (au cas où le défaut bouge).
    await page.getByRole('tab', { name: /^Combat$/i }).click();
    await expect(page.locator('#sheet-mode-panel-combat')).toBeVisible();

    // ── Fighting Style card visible ────────────────────────────────────
    // Le feat `defense` a `name.fr = "Défense"` (vérifié bundle disque).
    const panel = page.locator('#sheet-mode-panel-combat');
    await expect(
      panel.getByText(/^Style de combat$/),
      'Header de la carte Style de combat doit être présent.',
    ).toBeVisible();
    await expect(
      panel.getByText('Défense', { exact: true }),
      'Nom FR du feat Defense doit apparaître dans la carte.',
    ).toBeVisible();

    // ── Mastery badges sur les 3 armes équipées ────────────────────────
    // Aria-label canonique = "Voir la mastery de <name>" (cf. attacks-list).
    const longswordBadge = panel.getByRole('button', {
      name: "Voir la mastery de Épée longue",
    });
    const greatswordBadge = panel.getByRole('button', {
      name: 'Voir la mastery de Épée à deux mains',
    });
    const battleaxeBadge = panel.getByRole('button', {
      name: 'Voir la mastery de Hache d’armes',
    });
    await expect(longswordBadge).toBeVisible();
    await expect(greatswordBadge).toBeVisible();
    await expect(battleaxeBadge).toBeVisible();

    // Label FR de la propriété visible dans le badge :
    //   longsword = sap → "Sape", greatsword = graze → "Écorchure",
    //   battleaxe = topple → "Renversement". Cohérence chooser ↔ help ↔ sheet.
    await expect(longswordBadge).toContainText('Sape');
    await expect(greatswordBadge).toContainText('Écorchure');
    await expect(battleaxeBadge).toContainText('Renversement');

    // ── Tap badge → modale ouverte avec nom d'arme substitué ───────────
    await longswordBadge.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // L'exemple Sap contient "{weapon} : tu poses le malus ..." → après
    // substitution la modale contient "Épée longue : tu poses le malus ...".
    await expect(dialog).toContainText('Épée longue : tu poses');
    // Aucun autre nom d'arme du test ne doit fuiter en préfixe d'exemple.
    const dialogText = (await dialog.textContent()) ?? '';
    expect(dialogText).not.toContain('Épée à deux mains :');
    expect(dialogText).not.toContain('Hache d’armes :');
  });
});
