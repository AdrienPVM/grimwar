import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { dragonbornL1Red, seedCharacter } from './seed-character';

/**
 * Plan 13.8 step 36 — Drakéide Rouge L1 → carte Souffle visible en
 * mode Combat avec type Feu + DC.
 */
test.describe('Ancestry — Drakéide Rouge (souffle feu)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping dragonborn breath weapon.',
    );
  });

  test('seed Drakéide Rouge L1 → mode Combat → carte « Souffle draconique » avec type Feu', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, dragonbornL1Red);

    await page.goto(`/character/${charId}`);
    await expect(page.getByText(dragonbornL1Red.name).first()).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole('tab', { name: /^Combat$/i }).click();
    await expect(page.locator('#sheet-mode-panel-combat')).toBeVisible();

    const card = page.locator('[aria-label*="Souffle draconique"]').first();
    await expect(
      card,
      'La carte Souffle draconique doit être visible pour un Drakéide avec dragonAncestry posé.',
    ).toBeVisible();

    // Le type de dégâts résolu pour Rouge = Feu.
    await expect(card.getByText(/Feu/).first()).toBeVisible();
    // DC = 8 + Con(14)mod(+2) + PB(L1=+2) = 12.
    await expect(card.getByText('12').first()).toBeVisible();
  });
});
