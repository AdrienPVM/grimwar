import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { fighterL3, seedCharacter } from './seed-character';

/**
 * UAT — bascule de l'Inspiration héroïque (Battle HUD, mode Combat).
 *
 * Le drapeau `inspiration` était CONSOMMÉ par les jets mais jamais OCTROYÉ
 * depuis l'UI. Le chip « ✦ Inspiration » du HUD le bascule : octroi → chip doré
 * pressé (persisté Firestore), 2e tap → retrait.
 *
 * Captures → `uat-review/inspiration/` (gitignored), pleine page.
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review/inspiration');

async function capture(page: Page, filename: string): Promise<void> {
  mkdirSync(UAT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(UAT_DIR, filename), fullPage: true });
}

test.describe('UAT — Inspiration héroïque (Battle HUD)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Émulateur Firestore non joignable sur 127.0.0.1:8080 — `pnpm e2e:emulators` (Java/JRE 11+).',
    );
  });

  test('octroyer puis retirer l’Inspiration héroïque (persistance Firestore)', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, fighterL3);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(fighterL3.name).first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole('tab', { name: /^Combat$/i }).click();
    const panel = page.locator('#sheet-mode-panel-combat');
    await expect(panel).toBeVisible();

    // Au départ : chip présent, non pressé (Inspiration à octroyer).
    const grantBtn = panel.getByRole('button', { name: 'Octroyer l’Inspiration héroïque' });
    await expect(grantBtn).toBeVisible();
    await expect(grantBtn).toHaveAttribute('aria-pressed', 'false');
    await capture(page, '01-inspiration-non-octroyee.png');

    // Octroi → le chip devient pressé (aria-pressed true), persisté.
    await grantBtn.click();
    const activeBtn = panel.getByRole('button', { name: 'Retirer l’Inspiration héroïque' });
    await expect(activeBtn).toBeVisible({ timeout: 10_000 });
    await expect(activeBtn).toHaveAttribute('aria-pressed', 'true');
    await capture(page, '02-inspiration-octroyee.png');

    // Retrait → retour à l'état non pressé.
    await activeBtn.click();
    await expect(
      panel.getByRole('button', { name: 'Octroyer l’Inspiration héroïque' }),
    ).toHaveAttribute('aria-pressed', 'false', { timeout: 10_000 });
    await capture(page, '03-inspiration-retiree.png');
  });
});
