import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { seedCharacter, warlockL1ArmorOfShadows } from './seed-character';

/**
 * UAT — passe d'internationalisation (i18n complète des modes de fiche).
 *
 * Cette spec ne couvre PAS une régression fonctionnelle : elle produit les
 * captures pleine page que l'utilisateur juge pour la passe « purge des chaînes
 * UI codées en dur » (mode par mode). Le contenu FR reste majoritairement
 * identique (extraction pure vers t()) ; les rares deltas VISIBLES sont signalés
 * dans le rapport de livraison (ex. titre de carte « Grimoire », libellé
 * officiel « Sorts mineurs » au lieu de l'ancien « Tours »).
 *
 * Les captures sont écrites À PLAT à la racine de `uat-review/` (convention du
 * projet — jamais en sous-dossier), numérotées pour l'ordre de lecture.
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review');

test.describe('UAT i18n — modes de fiche', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable — start it via `pnpm e2e:emulators` (requires Java/JRE 11+). Skipped.',
    );
    mkdirSync(UAT_DIR, { recursive: true });
  });

  test('mode Magie (Occultiste) — Grimoire + Magie de pacte localisés', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, warlockL1ArmorOfShadows);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(warlockL1ArmorOfShadows.name).first()).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole('tab', { name: /^Magie$/i }).click();
    const panel = page.locator('#sheet-mode-panel-magie');
    await expect(panel).toBeVisible();

    // Vérités visibles de la passe : titre de carte « Grimoire » (et non plus le
    // résidu de marque « GrimWar ») + libellé officiel « Sorts mineurs ».
    await expect(panel.getByRole('heading', { name: 'Grimoire' })).toBeVisible();
    await expect(panel.getByText('Magie de pacte')).toBeVisible();

    writeFileSync(
      path.join(UAT_DIR, '04-magie-grimoire-et-pacte-pleine-page.png'),
      await page.screenshot({ fullPage: true, animations: 'disabled' }),
    );
  });
});
