import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { seedCharacter, wizardL3, type SeedPreset } from './seed-character';

/**
 * UAT visuel — carte « Vitalité » (mode Combat), refonte 2026-06-25.
 *
 * Contexte : la jauge de fond pleine largeur (« ce fond de couleur qui fait
 * barre de vie ») et le nombre de 80 px ont été rejetés en UAT. La carte est
 * désormais compacte : verre sombre + halo crimson discret (fidèle au
 * prototype), nombre de PV doré réduit, et une PASTILLE d'état (point + mot)
 * porte le signal de santé — Sain (vert) → Blessé (ambre) → Critique (rouge).
 * Aucun fond coloré ne passe derrière le texte.
 *
 * On seed le même magicien à plusieurs niveaux de PV. Captures pleine page (la
 * liste scrolle au niveau du document, `fullPage` suffit). Skip propre si
 * l'émulateur n'est pas joignable.
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review/vitalite-contrast');

function ensureDir(): void {
  mkdirSync(UAT_DIR, { recursive: true });
}

async function full(page: Page, name: string): Promise<void> {
  ensureDir();
  await page.screenshot({ path: path.join(UAT_DIR, name), fullPage: true });
}

/** Variante de `wizardL3` (max 18 PV) avec un `hp` ciblé. */
function wizardAtHp(current: number, temp = 0): SeedPreset {
  return { ...wizardL3, hp: { current, max: 18, temp } };
}

async function captureCombatSheet(
  page: Page,
  preset: SeedPreset,
  fileName: string,
): Promise<void> {
  await page.goto('/');
  await waitForAppReady(page);
  const { charId } = await seedCharacter(page, preset);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/character/${charId}`);
  await waitForAppReady(page);
  // La carte Vitalité porte le titre — on attend qu'elle soit montée avant de
  // capturer (le onSnapshot peut arriver après le ready).
  await expect(page.getByRole('heading', { name: 'Vitalité' })).toBeVisible({
    timeout: 15_000,
  });
  await page.waitForTimeout(400);
  await full(page, fileName);
}

test.describe('UAT — carte Vitalité (refonte pastille)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(!ok, 'Émulateur Firestore non joignable — UAT Vitalité skippé.');
  });

  test('PV pleins → pastille « Sain » verte (18/18)', async ({ page }) => {
    test.setTimeout(120_000);
    await captureCombatSheet(page, wizardAtHp(18), '01-vitalite-sain.png');
  });

  test('PV à mi-vie → pastille « Blessé » ambre (8/18)', async ({ page }) => {
    test.setTimeout(120_000);
    await captureCombatSheet(page, wizardAtHp(8), '02-vitalite-blesse.png');
  });

  test('PV critiques → pastille « Critique » rouge (3/18)', async ({ page }) => {
    test.setTimeout(120_000);
    await captureCombatSheet(page, wizardAtHp(3), '03-vitalite-critique.png');
  });

  test('PV temporaires → chip améthyste « PV temp. » (12/18 +5)', async ({ page }) => {
    test.setTimeout(120_000);
    await captureCombatSheet(page, wizardAtHp(12, 5), '04-vitalite-pv-temp.png');
  });
});
