import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { elfL1Drow, seedCharacter } from './seed-character';

/**
 * Plan 13.8 step 38 — Elfe Drow L1 → `Danses lumineuses` (Dancing Lights)
 * visible en mode Magie.
 */
test.describe('Ancestry — Elfe Drow (sorts de lignage)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping elf lineage spells.',
    );
  });

  test('seed Elfe Drow L1 → mode Magie → Danses lumineuses visible', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, elfL1Drow);

    await page.goto(`/character/${charId}`);
    await expect(page.getByText(elfL1Drow.name).first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole('tab', { name: /^Magie$/i }).click();
    await expect(page.locator('#sheet-mode-panel-magie')).toBeVisible();

    await expect(page.getByText(/Sorts de lignage elfique/)).toBeVisible();
    await expect(page.getByText('Danses lumineuses')).toBeVisible();
  });
});
