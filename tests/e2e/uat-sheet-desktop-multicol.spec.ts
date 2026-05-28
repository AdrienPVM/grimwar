import { test, type Page, type TestInfo } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { takeStepScreenshot } from './helpers/screenshot';
import { seedCharacter, wizardL5DamageD1 } from './seed-character';

/**
 * JALON 1A.1 — UAT desktop multi-col v1 sur les 4 modes contentés.
 *
 * État livré :
 * - Coquille desktop (lg+ 1024 : sidebar 280 + main aérée) — PR #19.
 * - xl+ (1280) bascule en grille 2 colonnes pour les 4 modes contentés
 *   (combat / magie / essence / avoir) — PR JALON 1A.1.
 *   Précédemment, seuls essence + avoir étaient en 2-col (PR #27 CHANTIER I) ;
 *   1A.1 étend le même pattern CSS-only à combat + magie.
 * - Mode Âme = placeholder (plan 20 / S2) — hors scope ici, traité en 1A.2.
 *
 * Captures aux 4 viewports cibles (375 / 1024 / 1280 / 1440) pour confirmer
 * la non-régression mobile / tablet et le rendu xl 2-col à l'horizontale.
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

test.describe('UAT sheet desktop multi-col (JALON 1A.1)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable. Run `pnpm e2e:emulators` first.',
    );
  });

  test('Combat × 4 viewports + Magie × 4 viewports + Essence × 4 viewports + Avoir × 4 viewports', async ({
    page,
  }, testInfo) => {
    test.setTimeout(360_000);
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, wizardL5DamageD1);

    await captureMode(page, testInfo, charId, 'Combat', '1A1-combat');
    await captureMode(page, testInfo, charId, 'Magie', '1A1-magie');
    await captureMode(page, testInfo, charId, 'Essence', '1A1-essence');
    await captureMode(page, testInfo, charId, 'Avoir', '1A1-avoir');
  });
});
