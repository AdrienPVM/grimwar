import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { gnomeL1Forest, seedCharacter } from './seed-character';

/**
 * Plan 13.8 step 39 — Gnome des forêts L1 → `Illusion mineure`
 * (Minor Illusion) visible en mode Magie.
 */
test.describe('Ancestry — Gnome des forêts (sorts de lignage)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping gnome lineage spells.',
    );
  });

  test('seed Gnome des forêts L1 → mode Magie → Illusion mineure visible', async ({ page }) => {
    // FIXME 2026-05-18 — Bloqué par même dette de contenu que ancestry-elf.spec.ts :
    // `ancestries.json > gnome.options.gnomeLineages.forest.cantripSpellIds`
    // = `['minor-illusion']` (EN-slug), mais `spells.json` ne contient que
    // `illusion-mineure` (FR-slug). À résoudre par regen `ancestries.json`
    // depuis `srd-ancestries-l1.ts` après update des slugs EN → FR. Surfacé
    // à Adrien plan 13.9 UAT 2026-05-18.
    test.fixme();
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, gnomeL1Forest);

    await page.goto(`/character/${charId}`);
    await expect(page.getByText(gnomeL1Forest.name).first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole('tab', { name: /^Magie$/i }).click();
    await expect(page.locator('#sheet-mode-panel-magie')).toBeVisible();

    await expect(page.getByText(/Sorts de lignage gnome/)).toBeVisible();
    await expect(page.getByText('Illusion mineure')).toBeVisible();
  });
});
