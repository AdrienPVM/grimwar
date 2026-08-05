import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { barbarianL3, seedCharacter } from './seed-character';

/**
 * Lot 2 — la fiche devient pilotable (M16, M24).
 *
 * Deux valeurs qui étaient posées une fois et plus jamais réécrites :
 *   - **Initiative et vitesse** (M16). « +2 d'initiative avec Alerte »,
 *     « vitesse 12 m sous Hâte » : la bande CA/Init/Vitesse était déclarée
 *     « purement informative ». La CA reste dérivée — la rendre surchargeable
 *     demande un champ au schéma, donc l'accord d'Adrien.
 *   - **Maximum d'une réserve de classe** (M24). Le max était réimposé depuis la
 *     progression à CHAQUE écriture : une Rage accordée par le MJ disparaissait
 *     à la première dépense.
 *
 * La vitesse se saisit en mètres et se stocke en pieds — l'invariant est
 * couvert en unitaire ; ici on prouve le parcours et on produit la galerie.
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

test.describe('Fiche — surcharges manuelles', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+).',
    );
  });

  test('l’initiative et la vitesse se corrigent depuis la fiche', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, barbarianL3);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(barbarianL3.name).first()).toBeVisible({
      timeout: 10_000,
    });
    await uatShot(page, '13-fiche-avant-surcharge');

    // Initiative : la cellule est un bouton, plus un texte inerte.
    await page.getByTestId('status-init').click();
    const initInput = page.getByTestId('status-init-input');
    await expect(initInput).toBeVisible();
    await initInput.fill('5');
    await initInput.press('Enter');
    await expect(page.getByTestId('status-init')).toContainText('+5', {
      timeout: 5000,
    });

    // Vitesse : saisie EN MÈTRES, l'unité affichée.
    await page.getByTestId('status-speed').click();
    const speedInput = page.getByTestId('status-speed-input');
    await expect(speedInput).toHaveValue('9');
    await speedInput.fill('12');
    await speedInput.press('Enter');
    await expect(page.getByTestId('status-speed')).toContainText('12', {
      timeout: 5000,
    });

    await uatShot(page, '14-fiche-initiative-et-vitesse-corrigees');
  });

  test('un maximum de réserve accordé survit à la dépense', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, barbarianL3);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(barbarianL3.name).first()).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole('tab', { name: /^Combat$/i }).click();
    const counter = page.getByTestId('resource-max-barbarian:rage');
    await expect(counter).toContainText('3 / 3');
    await uatShot(page, '15-reserves-avant');

    await counter.click();
    const input = page.getByTestId('resource-max-input-barbarian:rage');
    await input.fill('4');
    await input.press('Enter');
    await expect(counter).toContainText('/ 4', { timeout: 5000 });
    await uatShot(page, '16-reserve-maximum-accorde');

    // Le cœur du mur : la dépense réécrivait le max dérivé et effaçait l'accordé.
    await page.getByRole('button', { name: /Dépenser un point de/i }).click();
    await expect(counter).toContainText('/ 4', { timeout: 5000 });
    await uatShot(page, '17-reserve-apres-depense');
  });
});
