import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { seedCharacter, tieflingL1Infernal } from './seed-character';

const UAT_DIR = path.resolve(process.cwd(), 'uat-review/ancestry-cantrip-castable');

/**
 * Plan 13.8 step 37 — Tieffelin Infernal L1 → `Trait de feu` apparaît
 * dans la liste des sorts d'héritage en mode Magie.
 */
test.describe('Ancestry — Tieffelin Infernal (sorts d\'héritage)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping tiefling legacy spells.',
    );
  });

  test('seed Tieffelin Infernal Roublard L1 → mode Magie → tap Trait de feu (carte + SpellList) ouvre la modale + cantrip d\'ascendance lançable', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, tieflingL1Infernal);

    await page.goto(`/character/${charId}`);
    await expect(page.getByText(tieflingL1Infernal.name).first()).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole('tab', { name: /^Magie$/i }).click();
    await expect(page.locator('#sheet-mode-panel-magie')).toBeVisible();

    // Titre de la carte « Sorts d'héritage fiélon ».
    await expect(page.getByText(/Sorts d'héritage fiélon/)).toBeVisible();
    // Cantrip Infernal = Trait de feu (visible non grisé à L1). Plan 13.8b :
    // le sort apparaît dans la carte ET dans la SpellList (chip
    // « Héritage Infernal ») — on prend la PREMIÈRE occurrence (la carte).
    await expect(page.getByText('Trait de feu').first()).toBeVisible();
    // Sorts L3/L5 inscrits mais grisés à L1.
    await expect(page.getByText('Niv. 3')).toBeVisible();
    await expect(page.getByText('Niv. 5')).toBeVisible();

    // Plan 13.8b commit 3 — la SpellList doit aussi rendre le sort avec
    // le chip source « Héritage Infernal » (non-caster + ancestry spells →
    // SpellList rendue sans placeholder).
    await expect(page.getByText('Héritage Infernal').first()).toBeVisible();

    // Tap sur le bouton de la carte de lignage → modale ouverte.
    const cardButton = page.getByRole('button', { name: 'Trait de feu' }).first();
    await cardButton.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Trait de feu' })).toBeVisible();
    // Trait de feu est un CANTRIP d'ascendance (à volonté, aucun emplacement) :
    // il est désormais lançable directement (le blocage ne vaut plus que pour
    // les sorts d'ascendance de niveau ≥ 1, en attente du compteur d'usages).
    const launchBtn = dialog.getByRole('button', { name: /Lancer/ });
    await expect(launchBtn).toBeEnabled();
    await expect(launchBtn).not.toHaveAttribute('title');
    mkdirSync(UAT_DIR, { recursive: true });
    // Pleine page (contenu exhaustif de la modale) + viewport (ressenti overlay).
    await page.screenshot({
      path: path.join(UAT_DIR, '01-trait-de-feu-lancable-pleine-page.png'),
      fullPage: true,
    });
    await page.screenshot({
      path: path.join(UAT_DIR, '02-trait-de-feu-lancable-overlay.png'),
      fullPage: false,
    });

    // Ferme la modale, ouvre depuis la SpellList — même modale.
    await dialog.getByRole('button', { name: /Fermer/ }).first().click();
    await expect(dialog).not.toBeVisible();
    // Trait de feu apparaît à plusieurs endroits (carte + SpellList) — on
    // prend le SECOND bouton (la ligne de la SpellList).
    const listButton = page.getByRole('button', { name: 'Trait de feu' }).nth(1);
    await listButton.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(
      page.getByRole('dialog').getByRole('heading', { name: 'Trait de feu' }),
    ).toBeVisible();
  });
});
