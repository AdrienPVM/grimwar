import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { seedCharacter, wizardL5NoSlots } from './seed-character';

/**
 * D28 — réconciliation des emplacements de sort à l'ouverture de la fiche.
 *
 * Régression couverte : un caster créé AVANT le fix porte `spellSlots: {}` et ne
 * peut lancer AUCUN sort à emplacement (bouton « Lancer » désactivé). On seed
 * exactement cet état cassé (`wizardL5NoSlots`, sans `spellSlots`), on ouvre la
 * fiche, et on vérifie que `useCharacter` réconcilie + persiste les emplacements
 * (full caster L5 = L1×4 / L2×3 / L3×2) — rendant Bouclier (L1) lançable.
 *
 * Ce test passe par l'émulateur + les VRAIES security rules : il prouve aussi
 * que le propriétaire est autorisé à écrire le patch `spellSlots` (la
 * réconciliation est un `updateDoc` sur sa propre fiche).
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review', 'spell-slots-reconcile');

test.describe('D28 — emplacements de sort réconciliés on-load', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable — start it via `pnpm e2e:emulators` (requires Java/JRE 11+). Skipped.',
    );
    mkdirSync(UAT_DIR, { recursive: true });
  });

  test('un caster seedé sans emplacements peut lancer un sort de niveau 1 après réconciliation', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, wizardL5NoSlots);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(wizardL5NoSlots.name).first()).toBeVisible({
      timeout: 10_000,
    });

    // Onglet Magie puis ouverture du sort à emplacement Bouclier (L1).
    await page.getByRole('tab', { name: /^Magie$/i }).click();
    await page.getByText('Bouclier', { exact: false }).first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // CŒUR DE LA RÉGRESSION : sans réconciliation, la modale afficherait
    // « Aucun emplacement … disponible » et « Lancer » resterait désactivé.
    // Après réconciliation (round-trip Firestore), la pastille d'emplacement
    // « Niv. 1 » apparaît et le bouton « Lancer » devient actif.
    const slotPill = dialog.getByRole('button', { name: /^Niv\. 1$/ });
    await expect(slotPill, 'la pastille « Niv. 1 » doit apparaître après réconciliation').toBeVisible(
      { timeout: 10_000 },
    );

    const castButton = dialog.getByRole('button', { name: /^Lancer$/ });
    await expect(castButton, 'le bouton « Lancer » doit être actif').toBeEnabled();

    // Capture UAT : la modale avec emplacements disponibles + Lancer actif.
    const buffer = await page.screenshot({ fullPage: false, animations: 'disabled' });
    writeFileSync(path.join(UAT_DIR, '01-bouclier-castable-apres-reconciliation.png'), buffer);

    // Le cast complet doit aboutir : le sceau de sort s'affiche (preuve que
    // `consumeSlot` a trouvé un emplacement et que `handleCast` est passé).
    await castButton.click();
    await expect(
      page.getByTestId('spell-sigil-overlay'),
      'le sceau doit apparaître → le sort a bien consommé un emplacement',
    ).toBeVisible({ timeout: 5_000 });
  });
});
