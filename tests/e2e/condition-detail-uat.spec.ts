import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { fighterL3MulticlassReady, seedCharacter } from './seed-character';

/**
 * UAT — lecture de la règle SRD d'un état depuis le mode Combat.
 *
 * Régression : avant, taper un chip d'état le retirait sans jamais en montrer
 * l'effet. Désormais le tap ouvre une modale avec la règle SRD complète + un
 * bouton « Retirer cet état ». On seed un combattant Aveuglé, on tape le chip,
 * on capture la modale (pleine page = contenu, viewport = ressenti d'overlay).
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review', 'condition-detail');

const BLINDED_PRESET = {
  ...fighterL3MulticlassReady,
  name: 'Sentinelle Aveuglée',
  conditions: ['blinded'],
};

test.describe('UAT — détail d\'un état (mode Combat)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable — start it via `pnpm e2e:emulators` (requires Java/JRE 11+). Skipped.',
    );
    mkdirSync(UAT_DIR, { recursive: true });
  });

  test('taper un état actif ouvre sa règle SRD + le retrait', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, BLINDED_PRESET);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(BLINDED_PRESET.name).first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole('tab', { name: /^Combat$/i }).click();

    // La carte « États » montre le chip Aveuglé. Capture de la fiche avant tap.
    const chip = page.getByRole('button', { name: /Voir le détail de l'état Aveuglé/ });
    await expect(chip).toBeVisible();
    writeFileSync(
      path.join(UAT_DIR, '01-carte-etats-chip.png'),
      await page.screenshot({ fullPage: true, animations: 'disabled' }),
    );

    // Tap → modale de détail avec la règle SRD.
    await chip.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText(/vous ne voyez rien et ratez automatiquement/),
      'la modale doit afficher la règle SRD exacte de l\'état Aveuglé',
    ).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Retirer cet état/ })).toBeVisible();

    // Double capture (règle modales/overlays) : pleine page = contenu,
    // viewport = ressenti d'overlay (backdrop, ancrage).
    writeFileSync(
      path.join(UAT_DIR, '02-modale-regle-srd.png'),
      await page.screenshot({ fullPage: true, animations: 'disabled' }),
    );
    writeFileSync(
      path.join(UAT_DIR, '03-modale-regle-srd-viewport.png'),
      await page.screenshot({ fullPage: false, animations: 'disabled' }),
    );

    // Le retrait fonctionne : on clique « Retirer », la modale se ferme et le
    // chip disparaît.
    await dialog.getByRole('button', { name: /Retirer cet état/ }).click();
    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole('button', { name: /Voir le détail de l'état Aveuglé/ }),
    ).toBeHidden();
  });
});
