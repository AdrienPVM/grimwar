import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * UAT — formulaire d'OBJET MAGIQUE dans l'éditeur de pack (directive Adrien
 * 2026-06-27 : « ajoute les objets magiques et monstres, formulaire dédié »).
 *
 * Ouvre l'éditeur de pack in-app, déploie le formulaire « Objets magiques »,
 * remplit un objet (Épée des flammes, rare, harmonisation) et capture la
 * galerie `uat-review/magic-item-form/`. Sans émulateur, skip propre.
 */
const OUT = path.resolve(process.cwd(), 'uat-review', 'magic-item-form');

test.describe('UAT — formulaire objet magique (éditeur de pack)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(!ok, 'Firestore emulator unreachable — skipping magic-item form UAT.');
    mkdirSync(OUT, { recursive: true });
  });

  test('ouvre la section Objets magiques et remplit un objet', async ({
    page,
  }) => {
    await page.goto('/account/content/new');
    await waitForAppReady(page);
    await page.waitForFunction(
      () => {
        const w = window as Window & { __e2eAuthUid?: string | null };
        return typeof w.__e2eAuthUid === 'string' && w.__e2eAuthUid.length > 0;
      },
      null,
      { timeout: 10_000 },
    );

    // La section objets magiques existe.
    await expect(page.getByTestId('pack-editor-magic-items')).toBeVisible({
      timeout: 10_000,
    });

    // Déploie le formulaire.
    await page.getByTestId('pack-editor-add-magic-item').click();
    await expect(page.getByTestId('magic-item-form')).toBeVisible();

    await page.getByTestId('magic-item-form-id').fill('epee-des-flammes');
    await page.getByTestId('magic-item-form-name-fr').fill('Épée des flammes');
    await page
      .getByTestId('magic-item-form-magic-desc-fr')
      .fill('Sur commande, la lame s’embrase (+2d6 de dégâts de feu).');
    // Le checkbox a un input `sr-only` (label visible) → check forcé.
    await page.getByTestId('magic-item-form-attunement').check({ force: true });

    // 01 — pleine page : le formulaire objet magique est rendu et lisible.
    await page.screenshot({
      path: path.join(OUT, '01-formulaire-objet-magique.png'),
      fullPage: true,
    });
  });
});
