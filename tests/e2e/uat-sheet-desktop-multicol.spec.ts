import { test, type Page, type TestInfo } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { takeStepScreenshot } from './helpers/screenshot';
import { seedCharacter, wizardL5DamageD1 } from './seed-character';

/**
 * JALON 1A — UAT desktop sur les 5 modes de fiche.
 *
 * État livré (1A.1 + 1A.2) :
 * - Coquille desktop (lg+ 1024 : sidebar 280 + main aérée) — PR #19.
 * - xl+ (1280) bascule en grille 2 colonnes pour les 4 modes contentés
 *   (combat / magie / essence / avoir) — PR #47 JALON 1A.1.
 * - Mode Âme = placeholder rendu en `<section>` cohérent (1A.2). Reste centré
 *   au xl (pas de grille 2-col vide). Contenu réel = plan 20 / S2 / V1 jalon
 *   ultérieur — pas dans le périmètre V1 jalon 1.
 *
 * Captures aux 4 viewports cibles (375 / 1024 / 1280 / 1440) sur les 5 modes
 * = 20 fichiers, curé dans `uat-review/jalon-1/1A.2/` après UAT.
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

test.describe('UAT sheet desktop (JALON 1A)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable. Run `pnpm e2e:emulators` first.',
    );
  });

  test('5 modes × 4 viewports — combat / magie / essence / avoir / âme', async ({
    page,
  }, testInfo) => {
    test.setTimeout(360_000);
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, wizardL5DamageD1);

    await captureMode(page, testInfo, charId, 'Combat', '1A-combat');
    await captureMode(page, testInfo, charId, 'Magie', '1A-magie');
    await captureMode(page, testInfo, charId, 'Essence', '1A-essence');
    await captureMode(page, testInfo, charId, 'Avoir', '1A-avoir');
    await captureMode(page, testInfo, charId, 'Âme', '1A-ame');
  });
});
