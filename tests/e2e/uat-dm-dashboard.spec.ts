import { test, type Page, type TestInfo } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { takeStepScreenshot } from './helpers/screenshot';
import { seedCharacter, wizardL5DamageD1 } from './seed-character';

/**
 * Capture la vue MJ S1 (route `/dm`) aux 3 viewports de référence — mobile,
 * tablette, desktop. Validation visuelle de l'UAT.
 */
const VIEWPORTS = [
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'tablet-1024', width: 1024, height: 1366 },
  { name: 'desktop-1440', width: 1440, height: 900 },
] as const;

async function captureDm(
  page: Page,
  testInfo: TestInfo,
  step: string,
  opts: { waitForParty?: boolean } = {},
): Promise<void> {
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/dm');
    await waitForAppReady(page);
    // Quand on attend l'état "avec party", on patiente que la PartyCard
    // apparaisse (le listener onSnapshot peut prendre un beat à se synchroniser
    // après un seed récent). Sans ce wait, on capture l'empty state pendant
    // le bref intervalle où le listener n'a pas encore poussé le seed.
    if (opts.waitForParty) {
      await page
        .getByRole('heading', { level: 2, name: /Compagnonnage/i })
        .waitFor({ state: 'visible', timeout: 5000 });
    }
    await page.waitForTimeout(250);
    await takeStepScreenshot(page, testInfo, `${step}-${vp.name}`);
  }
}

test.describe('UAT DM dashboard (S1 MVP)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable. Run `pnpm e2e:emulators` first.',
    );
  });

  test('Vue MJ × 3 viewports — empty state', async ({
    page,
  }, testInfo) => {
    // Empty state capture seul — la party state nécessite un seed que le
    // listener onSnapshot peine à voir à temps après un rebondissement
    // multi-route. La capture séparée est suffisante pour l'UAT visuel ; le
    // state "avec party" est validé indirectement par les tests unitaires
    // de DmDashboardScreen + par le screenshot manuel d'Adrien lors de l'UAT.
    test.setTimeout(60_000);
    await page.goto('/');
    await waitForAppReady(page);
    await captureDm(page, testInfo, '01-dm-empty');
  });

  test('Vue MJ — party state à desktop-1440', async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await page.goto('/');
    await waitForAppReady(page);
    const { charId: _charId } = await seedCharacter(page, wizardL5DamageD1);
    // On vérifie d'abord que le seed est visible dans la library
    // (confirme que la write a propagé jusqu'au snapshot listener).
    await page
      .getByRole('button', { name: /Ouvrir la fiche de Vex/i })
      .waitFor({ state: 'visible', timeout: 10000 });
    await captureDm(page, testInfo, '02-dm-with-party', { waitForParty: true });
  });
});
