import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { fighterL1MasteryDefense, seedCharacter } from './seed-character';

/**
 * UAT visuel — Vitesse affichée en MÈTRES sur le status strip de la fiche.
 *
 * Bug corrigé : `ancestries.json` stocke la vitesse en PIEDS (Humain = 30,
 * valeur SRD canonique) ; le status strip l'affichait brute sous le label « m »
 * → « 30 m », un non-sens (30 pieds ≠ 30 mètres). Convention officielle D&D 5e
 * FR : 30 ft = 9 m (×0,3). La cellule doit donc montrer « 9 m ».
 *
 * On asserte le CONTENU (cat. 2/4 de la content-truth policy : le NOMBRE exact,
 * pas la présence) puis on capture pour la revue d'Adrien.
 */

test.describe('UAT — Vitesse en mètres (status strip)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+).',
    );
  });

  test('Guerrier humain : strip affiche « Vit. 9 m » (et non « 30 m »)', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForAppReady(page);
    // fighterL1MasteryDefense est un Humain → speed SRD = 30 ft.
    const { charId } = await seedCharacter(page, fighterL1MasteryDefense);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(fighterL1MasteryDefense.name).first()).toBeVisible({
      timeout: 10_000,
    });

    // Cellule Vitesse du strip (label « Vit. »). La valeur « 9 » + l'unité « m »
    // sont concaténées dans le span de valeur.
    const speedCell = page.getByText('Vit.').locator('xpath=ancestor::div[1]');
    await expect(speedCell).toBeVisible();
    await expect(speedCell).toContainText('9');
    await expect(speedCell).toContainText('m');
    // Le chiffre brut en pieds (« 30 ») ne doit PLUS apparaître dans la cellule.
    await expect(speedCell).not.toContainText('30');

    await page.screenshot({
      path: 'uat-review/speed-meters/01-strip-vitesse-metres.png',
      fullPage: true,
    });
    // Capture rapprochée du strip (la pleine page le rend trop petit pour lire
    // « 9 m » à l'œil) — élément ciblé, lisible pour la revue.
    await page
      .getByRole('region', { name: 'Statistiques vitales' })
      .screenshot({ path: 'uat-review/speed-meters/03-strip-zoom-vitesse-9m.png' });
  });
});
