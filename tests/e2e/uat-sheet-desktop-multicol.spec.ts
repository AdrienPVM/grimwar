import { test, type Page, type TestInfo } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { takeStepScreenshot } from './helpers/screenshot';
import { seedCharacter, wizardL5DamageD1 } from './seed-character';

/**
 * CHANTIER I nuit 3 — UAT desktop multi-col v1 sur 2 modes (PROTOTYPE).
 *
 * Étend la coquille desktop de PR #19 (lg 1024+, sidebar 280 + main aérée)
 * avec une grille 2 colonnes au sein des modes Essence et Avoir à xl+
 * (1280+). Mobile / tablet < xl restent strictement inchangés.
 *
 * Mode Combat et Magie conservés en flux vertical : leur structure
 * (HP en haut, attaques sous, conditions sous) impose un ordre vertical
 * qui ne profite pas naturellement de 2 colonnes ; refactor v2 dédié.
 * Mode Âme = placeholder, hors scope.
 *
 * Captures aux 4 viewports cibles habituelles pour confirmer la non-
 * régression mobile / tablet et le rendu xl 2-col.
 */

const VIEWPORTS = [
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'tablet-1024', width: 1024, height: 1366 },
  { name: 'desktop-1280', width: 1280, height: 900 },
  { name: 'desktop-1440', width: 1440, height: 900 },
] as const;

async function captureMode(
  page: Page,
  testInfo: TestInfo,
  charId: string,
  modeTab: string,
  step: string,
): Promise<void> {
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(`/character/${charId}`);
    await waitForAppReady(page);
    const tab = page.getByRole('tab', {
      name: new RegExp(`^${modeTab}$`, 'i'),
    });
    if (await tab.isVisible()) await tab.click();
    await page.waitForTimeout(200);
    await takeStepScreenshot(page, testInfo, `${step}-${vp.name}`);
  }
}

test.describe('UAT sheet desktop multi-col (CHANTIER I)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable. Run `pnpm e2e:emulators` first.',
    );
  });

  test('Essence × 4 viewports + Avoir × 4 viewports', async ({
    page,
  }, testInfo) => {
    test.setTimeout(180_000);
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, wizardL5DamageD1);

    await captureMode(page, testInfo, charId, 'Essence', 'I-essence');
    await captureMode(page, testInfo, charId, 'Avoir', 'I-avoir');
  });
});
