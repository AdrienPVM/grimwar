import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * UAT — couper les notifications de partie.
 *
 * Le réglage vit dans `localStorage` : le vérifier demande un vrai navigateur,
 * et surtout de constater qu'il SURVIT à un rechargement — un réglage qu'on
 * doit reposer à chaque ouverture n'est pas un réglage.
 */

test.describe('UAT — notifications de partie', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(!ok, 'Firestore emulator unreachable. Run `pnpm e2e:emulators`.');
  });

  test('le réglage se coupe et tient au rechargement', async ({ page }) => {
    await page.goto('/account');
    await waitForAppReady(page);

    const toggle = page.getByLabel('Notifications de partie');
    await expect(toggle).toBeChecked();

    mkdirSync('uat-review', { recursive: true });
    await page.screenshot({
      path: path.join('uat-review', '06-compte-reglage-notifications.png'),
      fullPage: true,
      animations: 'disabled',
    });

    await toggle.uncheck();
    await page.reload();
    await waitForAppReady(page);

    await expect(page.getByLabel('Notifications de partie')).not.toBeChecked();
  });
});
