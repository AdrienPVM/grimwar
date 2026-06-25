import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { elfL1Drow, seedCharacter } from './seed-character';

/**
 * UAT visuel — carte « Traits d'ascendance » (mode Essence). Les traits communs
 * de l'espèce (`ancestries.json[id].traits[]`, ex. Vision dans le noir,
 * Ascendance féerique, Transe…) étaient stockés mais affichés nulle part.
 *
 * Elfe (Vaelarie) → 5 traits listés, chacun cliquable → détail. Captures pleine
 * page + viewport (modale) dans `uat-review/ancestry-traits/`. La spec asserte le
 * CONTENU (identité, pas présence — cat. 2 testing policy).
 */

test.describe('UAT — Traits d\'ascendance (mode Essence)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+).',
    );
  });

  test('Elfe : 5 traits listés + détail Vision dans le noir', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, elfL1Drow);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(elfL1Drow.name).first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole('tab', { name: /^Essence$/i }).click();
    const essence = page.locator('#sheet-mode-panel-essence');
    await expect(essence).toBeVisible();

    // La carte + les traits communs de l'elfe (identité, pas présence).
    await expect(essence.getByText("Traits d'ascendance", { exact: true })).toBeVisible();
    await expect(essence.getByText('Vision dans le noir', { exact: true })).toBeVisible();
    await expect(essence.getByText('Ascendance féerique', { exact: true })).toBeVisible();
    await expect(essence.getByText('Transe', { exact: true })).toBeVisible();

    await page.screenshot({
      path: 'uat-review/ancestry-traits/01-traits-elfe.png',
      fullPage: true,
    });

    // Tap → modale détail avec la description exacte du trait.
    await essence.getByRole('button', { name: 'Trait : Vision dans le noir' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Vous disposez de la Vision dans le noir sur 18 m.')).toBeVisible();
    await page.screenshot({
      path: 'uat-review/ancestry-traits/02-trait-modale-full.png',
      fullPage: true,
    });
    await page.screenshot({
      path: 'uat-review/ancestry-traits/02-trait-modale-viewport.png',
      fullPage: false,
    });
  });
});
