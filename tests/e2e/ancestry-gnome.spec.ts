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

  test('seed Gnome des forêts Roublard L1 → mode Magie → tap Illusion mineure ouvre la modale + Lancer désactivé', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, gnomeL1Forest);

    await page.goto(`/character/${charId}`);
    await expect(page.getByText(gnomeL1Forest.name).first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole('tab', { name: /^Magie$/i }).click();
    await expect(page.locator('#sheet-mode-panel-magie')).toBeVisible();

    await expect(page.getByText(/Sorts de lignage gnome/)).toBeVisible();
    // Plan 13.8b commit 3 — tap → modale + Lancer désactivé.
    const spellButton = page.getByRole('button', { name: 'Illusion mineure' }).first();
    await expect(spellButton).toBeVisible();
    await spellButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Illusion mineure' })).toBeVisible();
    const launchBtn = dialog.getByRole('button', { name: /Lancer/ });
    await expect(launchBtn).toBeDisabled();
    await expect(launchBtn).toHaveAttribute(
      'title',
      "Lancement des sorts d'ascendance pas encore implémenté.",
    );
  });
});
