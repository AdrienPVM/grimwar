import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { seedCharacter, tieflingL1Infernal } from './seed-character';

/**
 * Plan 13.8 step 37 — Tieffelin Infernal L1 → `Trait de feu` apparaît
 * dans la liste des sorts d'héritage en mode Magie.
 */
test.describe('Ancestry — Tieffelin Infernal (sorts d\'héritage)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping tiefling legacy spells.',
    );
  });

  test('seed Tieffelin Infernal L1 → mode Magie → Trait de feu visible avec source « Héritage Infernal »', async ({
    page,
  }) => {
    // FIXME 2026-05-18 — Bloqué par même dette de contenu que ancestry-elf.spec.ts :
    // `ancestries.json > tiefling.options.tieflingLegacies.infernal.cantripSpellId`
    // = `'fire-bolt'` (EN-slug) mais `spells.json` ne contient que `trait-de-feu`
    // (FR-slug). À résoudre par regen `ancestries.json` depuis
    // `srd-ancestries-l1.ts` après update slugs EN → FR. Surfacé à Adrien
    // plan 13.9 UAT 2026-05-18.
    test.fixme();
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, tieflingL1Infernal);

    await page.goto(`/character/${charId}`);
    await expect(page.getByText(tieflingL1Infernal.name).first()).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole('tab', { name: /^Magie$/i }).click();
    await expect(page.locator('#sheet-mode-panel-magie')).toBeVisible();

    // Titre de la carte « Sorts d'héritage fiélon ».
    await expect(page.getByText(/Sorts d'héritage fiélon/)).toBeVisible();
    // Cantrip Infernal = Trait de feu (visible non grisé à L1).
    await expect(page.getByText('Trait de feu')).toBeVisible();
    // Sorts L3/L5 inscrits mais grisés à L1.
    await expect(page.getByText('Niv. 3')).toBeVisible();
    await expect(page.getByText('Niv. 5')).toBeVisible();
  });
});
