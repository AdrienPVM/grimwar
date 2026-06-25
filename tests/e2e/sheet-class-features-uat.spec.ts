import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { rogueL1Expertise, seedCharacter } from './seed-character';

/**
 * UAT visuel — carte « Aptitudes de classe » (mode Essence). Les aptitudes de
 * classe (`classes.json[id].features[]` — Second souffle, Attaque sournoise,
 * Rage, Argot des voleurs…) étaient stockées mais listées nulle part.
 *
 * Roublard L1 → 4 aptitudes (Expertise, Attaque sournoise, Argot des voleurs,
 * Bottes d'arme), chacune cliquable → détail. Captures pleine page + viewport
 * (modale) dans `uat-review/class-features/`. La spec asserte le CONTENU
 * (identité, pas présence — cat. 2 testing policy).
 */

test.describe('UAT — Aptitudes de classe (mode Essence)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+).',
    );
  });

  test('Roublard : aptitudes L1 listées + détail Attaque sournoise', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, rogueL1Expertise);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(rogueL1Expertise.name).first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole('tab', { name: /^Essence$/i }).click();
    const essence = page.locator('#sheet-mode-panel-essence');
    await expect(essence).toBeVisible();

    // La carte + les aptitudes L1 du Roublard (identité, pas présence).
    await expect(essence.getByText('Aptitudes de classe', { exact: true })).toBeVisible();
    await expect(essence.getByText('Attaque sournoise', { exact: true })).toBeVisible();
    await expect(essence.getByText('Argot des voleurs', { exact: true })).toBeVisible();
    await expect(essence.getByText('Expertise', { exact: true })).toBeVisible();

    await page.screenshot({
      path: 'uat-review/class-features/01-aptitudes-roublard.png',
      fullPage: true,
    });

    // Tap → modale détail avec la description de l'aptitude.
    await essence.getByRole('button', { name: 'Aptitude : Attaque sournoise' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/exploitent subtilement/)).toBeVisible();
    await page.screenshot({
      path: 'uat-review/class-features/02-aptitude-modale-full.png',
      fullPage: true,
    });
    await page.screenshot({
      path: 'uat-review/class-features/02-aptitude-modale-viewport.png',
      fullPage: false,
    });
  });
});
