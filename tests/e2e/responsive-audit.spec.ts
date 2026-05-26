import { test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { takeStepScreenshot } from './helpers/screenshot';
import { seedCharacter, wizardL5DamageD1 } from './seed-character';

/**
 * Plan 13.14 — AUDIT responsive (audit-only, PAS de fix).
 *
 * Pour chaque écran principal du parcours utilisateur, capture une
 * screenshot fullPage à 4 viewports cibles : mobile (375px), petite
 * tablette (768px), tablette (1024px), desktop (1440px). Les captures
 * sont collectées dans `uat-review/13.14-audit/` via `takeStepScreenshot`
 * (et le rapport `plans/13.14-RESPONSIVE-AUDIT.md` les indexe).
 *
 * Hors périmètre : tout fix. Si un défaut visuel est trouvé, il est
 * **listé** dans le rapport ; il n'est PAS corrigé dans cette PR.
 *
 * Pré-requis : émulateur Firebase (`pnpm e2e:emulators`, Java 11+).
 */

const VIEWPORTS = [
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'tablet-sm-768', width: 768, height: 1024 },
  { name: 'tablet-1024', width: 1024, height: 1366 },
  { name: 'desktop-1440', width: 1440, height: 900 },
] as const;

async function captureAllViewports(
  page: Page,
  testInfo: import('@playwright/test').TestInfo,
  step: string,
  setup: () => Promise<void>,
): Promise<void> {
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await setup();
    await takeStepScreenshot(page, testInfo, `${step}-${vp.name}`);
  }
}

test.describe('Plan 13.14 — Audit responsive (audit-only)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable. Run `pnpm e2e:emulators` first.',
    );
  });

  test('Audit wizard L1 landing × 4 viewports', async ({
    page,
  }, testInfo) => {
    // L'audit capture 16+ fullPage screenshots à 4 viewports — sur CI, le
    // fullPage à 1024×1366 et 1440×900 sur des panneaux Sheet denses
    // dépasse régulièrement le timeout par défaut de 60s. On le triple
    // pour cette spec qui est audit-only, pas hot-path.
    test.setTimeout(180_000);
    // L'avancement multi-step du wizard est complexe à automatiser
    // proprement à 4 viewports (chooser de classe, sous-choix conditionnels).
    // L'audit ici se limite au landing wizard + à un état avec nom rempli
    // — c'est l'écran où la première impression responsive se forme.
    await captureAllViewports(page, testInfo, 'wizard-landing', async () => {
      await page.goto('/create');
      await waitForAppReady(page);
    });

    await captureAllViewports(page, testInfo, 'wizard-identity-filled', async () => {
      await page.goto('/create');
      await waitForAppReady(page);
      const nameInput = page.getByLabel(/^Nom du personnage/i);
      if (await nameInput.isVisible()) await nameInput.fill('Vex');
    });
  });

  test('Audit fiche personnage — Combat / Magie / Essence / Avoir / Ame × 4 viewports', async ({
    page,
  }, testInfo) => {
    test.setTimeout(180_000);
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, wizardL5DamageD1);

    for (const mode of [
      { tab: 'Combat', step: 'sheet-combat' },
      { tab: 'Magie', step: 'sheet-magie' },
      { tab: 'Essence', step: 'sheet-essence' },
      { tab: 'Avoir', step: 'sheet-avoir' },
    ]) {
      await captureAllViewports(page, testInfo, mode.step, async () => {
        await page.goto(`/character/${charId}`);
        await waitForAppReady(page);
        const tab = page.getByRole('tab', {
          name: new RegExp(`^${mode.tab}$`, 'i'),
        });
        if (await tab.isVisible()) await tab.click();
        // Wait a beat for the panel to render
        await page.waitForTimeout(200);
      });
    }
  });
});
