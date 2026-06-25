import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { fighterL1MasteryDefense, seedCharacter } from './seed-character';

/**
 * UAT visuel — carte « Dés de vie » (mode Combat). Le pool de dés de vie
 * (`character.hitDice[]`) était stocké mais affiché nulle part ; un MJ qui
 * arbitre les repos courts à la main a besoin de le voir.
 *
 * Guerrier L1 → 1d10 (1/1). Capture pleine page dans `uat-review/hit-dice/`.
 * La spec asserte le CONTENU (identité, pas présence — cat. 2 testing policy).
 */

test.describe('UAT — Dés de vie (mode Combat)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+).',
    );
  });

  test('Guerrier : carte Dés de vie (1d10, 1/1) en Combat', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, fighterL1MasteryDefense);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(fighterL1MasteryDefense.name).first()).toBeVisible({
      timeout: 10_000,
    });

    // Le mode Combat est l'onglet par défaut.
    const combat = page.locator('#sheet-mode-panel-combat');
    await expect(combat).toBeVisible();

    await expect(combat.getByText('Dés de vie', { exact: true })).toBeVisible();
    await expect(combat.getByText('Guerrier', { exact: true })).toBeVisible();
    await expect(combat.getByText('1d10', { exact: true })).toBeVisible();

    await page.screenshot({ path: 'uat-review/hit-dice/01-des-de-vie-guerrier.png', fullPage: true });
  });
});
