import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { fighterL1MasteryDefense, seedCharacter, type SeedPreset } from './seed-character';

/** Guerrier blessé (PV 4/12) → le repos court a un soin visible à dépenser. */
const WOUNDED_FIGHTER: SeedPreset = {
  ...fighterL1MasteryDefense,
  name: 'Sigrid la Blessée',
  hp: { current: 4, max: 12 },
};

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

  test('Repos court : dépenser un dé soigne et décrémente le pool (mode digital)', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, WOUNDED_FIGHTER);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(WOUNDED_FIGHTER.name).first()).toBeVisible({ timeout: 10_000 });

    const combat = page.locator('#sheet-mode-panel-combat');
    await expect(combat).toBeVisible();

    // Avant : pool plein (1/1) + bouton « Repos court » disponible (PV non pleins).
    await expect(combat.getByText('1 / 1')).toBeVisible();
    const spendButton = combat.getByRole('button', {
      name: 'Dépenser un dé de vie (Guerrier)',
    });
    await expect(spendButton).toBeVisible();
    await page.screenshot({ path: 'uat-review/hit-dice/02-repos-court-avant.png', fullPage: true });

    // Dépense (digital → l'app lance instantanément, pas de modale).
    await spendButton.click();

    // Après : le dé est consommé (0 / 1) et le bouton disparaît (plus de dé).
    await expect(combat.getByText('0 / 1')).toBeVisible();
    await expect(spendButton).toHaveCount(0);
    await page.screenshot({ path: 'uat-review/hit-dice/03-repos-court-apres.png', fullPage: true });
  });
});
