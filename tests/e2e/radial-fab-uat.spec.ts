import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { fighterL3MulticlassReady, seedCharacter } from './seed-character';

/**
 * UAT — Radial FAB, menu tactile docké (plan 11, steps 15/21).
 *
 * Cette livraison fournit le cœur DÉTERMINISTE du FAB : un menu tactile (pas
 * encore le geste press-hold-drag, « l'âme de l'app », réservé à une session de
 * calage en main avec Adrien). On vérifie : FAB visible → menu → navigation
 * sous-menu → bascule de mode → jet d20 → l'historique (devenu un wedge) reçoit
 * bien le jet. Captures : viewport pour le ressenti d'overlay (bottom-sheet),
 * pleine page pour le contenu.
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review', 'radial-fab');

test.describe('UAT — Radial FAB (menu docké)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable — start it via `pnpm e2e:emulators` (requires Java/JRE 11+). Skipped.',
    );
    mkdirSync(UAT_DIR, { recursive: true });
  });

  test('le FAB ouvre un menu et chaque wedge route vers son action', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, {
      ...fighterL3MulticlassReady,
      name: 'Maître de Guilde',
    });
    await page.goto(`/character/${charId}`);
    await expect(page.getByText('Maître de Guilde').first()).toBeVisible({ timeout: 10_000 });

    // 1. FAB visible dans le coin (capture viewport = ressenti de la pastille dorée).
    const fab = page.getByRole('button', { name: "Ouvrir le menu d'action" });
    await expect(fab).toBeVisible();
    writeFileSync(
      path.join(UAT_DIR, '01-fab-coin.png'),
      await page.screenshot({ fullPage: false, animations: 'disabled' }),
    );

    // 2. Tap FAB → menu docké avec les 5 wedges.
    await fab.click();
    const menu = page.getByRole('dialog', { name: "Menu d'action" });
    await expect(menu).toBeVisible();
    for (const label of ['Aller à', 'Sorts', 'Repos', 'Lancer', 'Outils']) {
      await expect(menu.getByRole('button', { name: label })).toBeVisible();
    }
    writeFileSync(
      path.join(UAT_DIR, '02-menu-racine.png'),
      await page.screenshot({ fullPage: true, animations: 'disabled' }),
    );
    writeFileSync(
      path.join(UAT_DIR, '03-menu-racine-viewport.png'),
      await page.screenshot({ fullPage: false, animations: 'disabled' }),
    );

    // 3. « Aller à » → sous-menu des 5 modes.
    await menu.getByRole('button', { name: 'Aller à' }).click();
    await expect(menu.getByRole('button', { name: 'Essence' })).toBeVisible();
    writeFileSync(
      path.join(UAT_DIR, '04-sous-menu-aller-a-viewport.png'),
      await page.screenshot({ fullPage: false, animations: 'disabled' }),
    );

    // 4. Choisir « Essence » → le menu se ferme et le mode bascule.
    await menu.getByRole('button', { name: 'Essence' }).click();
    await expect(menu).toBeHidden();
    await expect(page.getByRole('tab', { name: /^Essence$/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    writeFileSync(
      path.join(UAT_DIR, '05-mode-essence-via-fab.png'),
      await page.screenshot({ fullPage: true, animations: 'disabled' }),
    );

    // 5. « Lancer » → un d20 vif (mode digital par défaut hors campagne).
    await fab.click();
    await page.getByRole('dialog', { name: "Menu d'action" })
      .getByRole('button', { name: 'Lancer' })
      .click();

    // 6. L'historique (désormais un wedge « Outils ») contient le jet « d20 vif ».
    await fab.click();
    const menu2 = page.getByRole('dialog', { name: "Menu d'action" });
    await menu2.getByRole('button', { name: 'Outils' }).click();
    await menu2.getByRole('button', { name: 'Historique des jets' }).click();
    const history = page.getByRole('dialog', { name: /Historique des jets/i });
    await expect(history).toBeVisible();
    await expect(history.getByText('d20 vif').first()).toBeVisible({ timeout: 5_000 });
    writeFileSync(
      path.join(UAT_DIR, '06-historique-d20-vif.png'),
      await page.screenshot({ fullPage: false, animations: 'disabled' }),
    );
  });
});
