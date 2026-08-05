import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { rogueL1Expertise, seedCharacter } from './seed-character';

/**
 * Lot 2 — le plateau de dés devient un outil de table (M20, M21, M22, M23, M48).
 *
 * Ce que la spec prouve, dans l'ordre où un joueur le vit :
 *   1. **Jet libre** (M20) — le FAB accepte enfin une formule tapée. Le parseur
 *      savait déjà tout lire ; rien ne l'alimentait.
 *   2. **Formule invalide** — le refus est immédiat et lisible, pas un échec
 *      après clic.
 *   3. **Dé retranché** (M48) — `1d20-1d4` (Fardeau) est accepté, alors que le
 *      parseur refusait catégoriquement un terme de dés négatif.
 *   4. **Menu d'options sur une compétence** (M23) — les compétences n'avaient
 *      aucun moyen de demander l'avantage : seul un tap, toujours normal.
 *   5. **Bonus ponctuel** (M22) et **inspiration à la demande** (M21) vivent
 *      dans ce même menu.
 *
 * Sans émulateur, la spec se skip proprement.
 */

async function uatShot(
  page: Page,
  name: string,
  opts: { viewport?: boolean } = {},
): Promise<void> {
  const dir = 'uat-review';
  mkdirSync(dir, { recursive: true });
  await page.screenshot({
    path: path.join(dir, `${name}.png`),
    fullPage: !opts.viewport,
    animations: 'disabled',
  });
}

/** Ouvre le menu radial et choisit une entrée par son libellé. */
async function pickFromFab(page: Page, label: string): Promise<void> {
  await page.getByRole('button', { name: /Ouvrir le menu/i }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: label, exact: true })
    .click();
}

test.describe('Dés — jet libre et options de jet', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+).',
    );
  });

  test('une formule libre se tape, se valide et se lance', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, rogueL1Expertise);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(rogueL1Expertise.name).first()).toBeVisible({
      timeout: 10_000,
    });

    await pickFromFab(page, 'Jet libre');
    const input = page.getByTestId('free-roll-input');
    await expect(input).toBeVisible();
    await uatShot(page, '07-jet-libre-vide', { viewport: true });

    // Refus immédiat, avant tout clic sur « Lancer ».
    await input.fill('2d');
    await expect(page.getByTestId('free-roll-error')).toBeVisible();
    await expect(page.getByTestId('free-roll-submit')).toBeDisabled();
    await uatShot(page, '08-jet-libre-formule-refusee', { viewport: true });

    // M48 — un dé RETRANCHÉ est une mécanique 5e ordinaire (Fardeau).
    await input.fill('1d20-1d4');
    await expect(page.getByTestId('free-roll-error')).toHaveCount(0);
    await expect(page.getByTestId('free-roll-submit')).toBeEnabled();
    await uatShot(page, '09-jet-libre-fardeau', { viewport: true });

    await input.fill('2d10+3');
    await page.getByTestId('free-roll-submit').click();

    // Le jet part : la modale se ferme et le résultat s'annonce.
    await expect(page.getByTestId('free-roll-input')).toHaveCount(0);
    await expect(page.getByText('Jet libre').first()).toBeVisible({
      timeout: 5000,
    });
    await uatShot(page, '10-jet-libre-resultat');
  });

  test('une compétence s’ouvre sur ses options : avantage, bonus, inspiration', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, rogueL1Expertise);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(rogueL1Expertise.name).first()).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole('tab', { name: /^Essence$/i }).click();
    const panel = page.locator('#sheet-mode-panel-essence');
    await expect(panel).toBeVisible();

    // Appui long sur Discrétion → menu d'options. Playwright n'a pas de
    // « long press » natif : on maintient le pointeur au-delà du seuil de 450 ms.
    const stealth = panel.getByRole('button').filter({ hasText: 'Discrétion' });
    await stealth.first().hover();
    await page.mouse.down();
    await page.waitForTimeout(700);
    await page.mouse.up();

    await expect(page.getByTestId('roll-options-advantage')).toBeVisible();
    await uatShot(page, '11-options-de-jet-competence', { viewport: true });

    // M22 — un bonus du moment, qui ne touche pas la fiche.
    await page.getByTestId('roll-options-bonus').fill('2');
    await uatShot(page, '12-options-bonus-ponctuel', { viewport: true });

    await page.getByTestId('roll-options-advantage').click();
    await expect(page.getByTestId('roll-options-advantage')).toHaveCount(0);
  });
});
