import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { fighterL3, seedCharacter } from './seed-character';

/**
 * UAT — PV temporaires (mode Combat).
 *
 * Le joueur ajoute des PV temporaires via le chip « + PV temp. » sous le grand
 * compteur, saisit un montant au pad, puis subit des dégâts : le tampon temp est
 * consommé EN PREMIER (SRD 5.2.1). Couvre aussi la règle « ne se cumulent pas ».
 *
 * Captures → `uat-review/temp-hp/` (gitignored), pleine page (+ overlay pour le
 * pad numérique modal). Pré-requis : émulateur Firebase actif.
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review/temp-hp');

async function capture(page: Page, filename: string, fullPage = true): Promise<void> {
  mkdirSync(UAT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(UAT_DIR, filename), fullPage });
}

test.describe('UAT — PV temporaires (mode Combat)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Émulateur Firestore non joignable sur 127.0.0.1:8080 — `pnpm e2e:emulators` (Java/JRE 11+).',
    );
  });

  test('ajouter des PV temporaires puis les voir absorber des dégâts', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, fighterL3);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(fighterL3.name).first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole('tab', { name: /^Combat$/i }).click();
    const panel = page.locator('#sheet-mode-panel-combat');
    await expect(panel).toBeVisible();

    // Pas de PV temp au départ → le déclencheur « + PV temp. » est visible.
    const addTempBtn = panel.getByRole('button', { name: 'Ajouter des PV temporaires' });
    await expect(addTempBtn).toBeVisible();
    await capture(page, '01-combat-sans-pv-temp.png');

    // Ouvre le pad temp, saisit 8.
    await addTempBtn.click();
    const pad = page.getByRole('dialog', { name: /PV temporaires/i });
    await expect(pad).toBeVisible();
    await pad.getByRole('button', { name: '8', exact: true }).click();
    await capture(page, '02-pad-pv-temp-8.png', false);
    await pad.getByRole('button', { name: 'Poser' }).click();

    // Le chip +8 PV temp. apparaît.
    await expect(panel.getByText('PV temp.')).toBeVisible();
    await expect(panel.getByText('+8')).toBeVisible();
    await capture(page, '03-pv-temp-poses.png');

    // Subir 5 dégâts par taps simples « − » (chaque tap = −1, absorbé d'abord
    // par le tampon temp). On évite le long-press (gesture peu fiable en e2e,
    // couvert unitairement). 5 taps : temp 8 → 3, PV inchangés.
    const minusBtn = panel.getByRole('button', { name: /^Subir 1 dégât/i });
    for (let i = 0; i < 5; i += 1) {
      await minusBtn.click();
    }

    // Le tampon temp est tombé à 3 ; les PV restent pleins (les dégâts ont mordu
    // le tampon, pas les PV).
    await expect(panel.getByText('+3')).toBeVisible({ timeout: 10_000 });
    await capture(page, '04-degats-absorbes-par-temp.png');
  });
});
