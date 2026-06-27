import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { fighterL3, seedCharacter } from './seed-character';

/**
 * UAT visuel — infobulles explicites du Battle HUD (combat).
 *
 * Vérifie de bout en bout que :
 * - le survol d'un contrôle EXPOSE son infobulle (fermée = `aria-hidden`, donc
 *   hors de l'arbre d'accessibilité ; ouverte = exposée et lisible) ;
 * - l'enveloppe `<Tooltip>` ne mange PAS le clic (garde-fou de non-régression :
 *   taper une pastille d'économie d'action bascule bien son état) ;
 * - capture l'infobulle réellement ouverte pour l'UAT humain.
 *
 * Playwright considère `opacity:0` comme « visible » → on ne peut PAS détecter
 * l'ouverture via `toBeVisible`. On s'appuie sur l'exposition ARIA : `getByRole
 * ('tooltip', { name })` ne matche QUE quand l'infobulle est ouverte.
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review');

test.describe('UAT infobulles — Battle HUD', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable — start it via `pnpm e2e:emulators` (requires Java/JRE 11+). UAT skipped.',
    );
    mkdirSync(UAT_DIR, { recursive: true });
  });

  test('survol → infobulle exposée + clic préservé + captures', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, fighterL3);
    await page.goto(`/character/${charId}`);

    await expect(
      page.getByText(fighterL3.name).first(),
      'La hero card doit afficher le nom du PJ seedé.',
    ).toBeVisible({ timeout: 10_000 });

    const hud = page.getByRole('region', { name: 'Tableau de bord de combat' });
    await expect(hud).toBeVisible();

    // ── Infobulle « Fin du tour » : fermée AVANT survol (aria-hidden donc hors
    //    de l'arbre d'accessibilité), exposée APRÈS survol.
    const endTurnTip = page.getByRole('tooltip', {
      name: /Termine ton tour et réinitialise/i,
    });
    await expect(
      endTurnTip,
      "L'infobulle « Fin du tour » ne doit PAS être exposée au repos.",
    ).toHaveCount(0);

    await hud.getByRole('button', { name: /Fin du tour/i }).hover();
    await expect(
      endTurnTip,
      "Au survol, l'infobulle « Fin du tour » doit être exposée et lisible.",
    ).toBeVisible();

    // Capture viewport AVEC l'infobulle ouverte (le survol persiste).
    writeFileSync(
      path.join(UAT_DIR, '01-hud-infobulle-fin-du-tour-viewport.png'),
      await page.screenshot({ fullPage: false, animations: 'disabled' }),
    );

    // ── Infobulle « Inspiration héroïque » (octroi quand le perso ne l'a pas).
    await hud.getByRole('button', { name: /Inspiration héroïque/i }).hover();
    await expect(
      page.getByRole('tooltip', { name: /Octroie l’Inspiration héroïque/i }),
      "Au survol, l'infobulle d'Inspiration doit expliquer l'octroi.",
    ).toBeVisible();
    writeFileSync(
      path.join(UAT_DIR, '02-hud-infobulle-inspiration-viewport.png'),
      await page.screenshot({ fullPage: false, animations: 'disabled' }),
    );

    // ── Garde-fou de non-régression : l'enveloppe Tooltip ne bloque pas le clic.
    const actionChip = hud.getByRole('button', { name: 'Action', exact: true });
    await expect(actionChip).toHaveAttribute('aria-pressed', 'false');
    await actionChip.click();
    await expect(
      actionChip,
      'Taper la pastille « Action » doit la marquer comme utilisée (clic non avalé par le Tooltip).',
    ).toHaveAttribute('aria-pressed', 'true');

    // ── Baseline pleine page (aucun survol) : prouve que rien n'a cassé ailleurs.
    await page.mouse.move(0, 0);
    writeFileSync(
      path.join(UAT_DIR, '03-fiche-combat-pleine-page.png'),
      await page.screenshot({ fullPage: true, animations: 'disabled' }),
    );
  });
});
