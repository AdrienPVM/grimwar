import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { goliathL1Storm, seedCharacter } from './seed-character';

/**
 * Plan 13.8 step 40 — Goliath Storm L1 → carte « Ascendance gigante »
 * avec effet Tonnerre visible en mode Combat.
 */
test.describe('Ancestry — Goliath Storm (Tonnerre)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping goliath ancestry card.',
    );
  });

  test('seed Goliath Storm L1 → mode Combat → carte Ascendance gigante avec Tonnerre', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, goliathL1Storm);

    await page.goto(`/character/${charId}`);
    await expect(page.getByText(goliathL1Storm.name).first()).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole('tab', { name: /^Combat$/i }).click();
    await expect(page.locator('#sheet-mode-panel-combat')).toBeVisible();

    const card = page.locator('[aria-label*="Ascendance gigante"]').first();
    await expect(card).toBeVisible();
    await expect(card.getByText(/Tonnerre/)).toBeVisible();
    // 2× / RL = PB du niveau 1.
    await expect(card.getByText(/2×/)).toBeVisible();
  });
});
