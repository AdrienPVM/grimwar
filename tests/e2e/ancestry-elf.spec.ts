import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { elfL1Drow, seedCharacter } from './seed-character';

/**
 * Plan 13.8 step 38 — Elfe Drow L1 → `Lumières dansantes` (Dancing Lights)
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

  test('seed Elfe Drow Roublard L1 → mode Magie → tap Lumières dansantes ouvre la modale + Lancer désactivé', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, elfL1Drow);

    await page.goto(`/character/${charId}`);
    await expect(page.getByText(elfL1Drow.name).first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole('tab', { name: /^Magie$/i }).click();
    await expect(page.locator('#sheet-mode-panel-magie')).toBeVisible();

    await expect(page.getByText(/Sorts de lignage elfique/)).toBeVisible();
    // Plan 13.8b commit 3 — clic sur le bouton du sort de la carte de lignage
    // → ouvre la modale détail. `first()` cible la carte (rendue avant la
    // SpellList dans MagieMode).
    const spellButton = page.getByRole('button', { name: 'Lumières dansantes' }).first();
    await expect(spellButton).toBeVisible();
    await spellButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Lumières dansantes' })).toBeVisible();
    // Bouton « Lancer » désactivé avec hint (Roublard non-caster + sort
    // d'ascendance pure → DEBT D12).
    const launchBtn = dialog.getByRole('button', { name: /Lancer/ });
    await expect(launchBtn).toBeDisabled();
    await expect(launchBtn).toHaveAttribute(
      'title',
      "Lancement des sorts d'ascendance pas encore implémenté.",
    );
  });
});
