import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { barbarianL3, seedCharacter } from './seed-character';

/**
 * UAT + garde mécanique — onglets de mode ÉPINGLÉS sur mobile.
 *
 * Sur mobile (<lg), la barre des 5 onglets de mode est désormais `sticky top-0` :
 * une fois qu'on a scrollé au-delà de l'emblème + nom + status (~500px de chrome),
 * elle reste collée en haut de l'écran — on change de mode sans remonter.
 *
 * Garde mécanique (rouge-avant-vert) : après un scroll bien au-delà de la position
 * naturelle des onglets, la barre reste DANS le viewport, ancrée en haut (y ≈ 0).
 * Sur le code d'AVANT (onglets en flux, non épinglés), la barre serait remontée
 * hors écran (y très négatif) → `toBeInViewport()` échouerait. C'est le delta que
 * ce test verrouille.
 *
 * Captures écrites À PLAT à la racine de `uat-review/` (convention projet).
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review');
const MOBILE = { width: 390, height: 844 } as const;

test.describe('UAT onglets épinglés (mobile)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable — start it via `pnpm e2e:emulators` (requires Java/JRE 11+). Skipped.',
    );
    mkdirSync(UAT_DIR, { recursive: true });
  });

  test('la barre d’onglets reste épinglée en haut après scroll, et change de mode en place', async ({
    page,
  }) => {
    await page.setViewportSize({ ...MOBILE });
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, barbarianL3);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(barbarianL3.name).first()).toBeVisible({
      timeout: 10_000,
    });

    // Mode Combat : le plus dense (PV, attaques, états, dés de vie, réserves…) →
    // garantit une page bien plus haute que le viewport, donc un scroll réel.
    await page.getByRole('tab', { name: /^Combat$/i }).click();
    await expect(page.locator('#sheet-mode-panel-combat')).toBeVisible();

    const tablist = page.getByRole('tablist');
    await expect(tablist).toHaveCount(1);

    // Position naturelle (en flux) de la barre, avant tout scroll.
    const naturalTop = await tablist.evaluate(
      (el) => el.getBoundingClientRect().top + window.scrollY,
    );
    // 01 — fiche complète mobile (pleine page), barre en position naturelle.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(150);
    writeFileSync(
      path.join(UAT_DIR, '01-fiche-mobile-combat-pleine-page.png'),
      await page.screenshot({ fullPage: true, animations: 'disabled' }),
    );

    // Scroll bien au-delà de la position naturelle des onglets (+400px de marge)
    // pour prouver l'épinglage : sans `sticky`, la barre serait hors écran.
    await page.evaluate((y) => window.scrollTo(0, y), naturalTop + 400);
    await page.waitForTimeout(150);

    // GARDE MÉCANIQUE — la barre est restée dans le viewport, épinglée JUSTE
    // SOUS le NavShell (h ~56px). Deux régressions verrouillées d'un coup :
    //  - sur l'ancien code (onglets en flux), y serait fortement négatif (hors
    //    écran) → échec `toBeInViewport` + `>= 44`.
    //  - si la barre épinglait à top:0, elle chevaucherait le NavShell → y ≈ 6
    //    → échec `>= 44`. On exige donc qu'elle dégage le NavShell.
    await expect(tablist).toBeInViewport();
    const pinnedBox = await tablist.boundingBox();
    expect(pinnedBox).not.toBeNull();
    expect(pinnedBox!.y).toBeGreaterThanOrEqual(44);
    expect(pinnedBox!.y).toBeLessThanOrEqual(100);

    // 02 — viewport (pas pleine page) : restitue le ressenti d'overlay épinglé,
    // contenu du mode qui défile SOUS la barre.
    writeFileSync(
      path.join(UAT_DIR, '02-onglets-epingles-apres-scroll-viewport.png'),
      await page.screenshot({ animations: 'disabled' }),
    );

    // Changement de mode EN PLACE depuis la barre épinglée (sans remonter).
    await page.getByRole('tab', { name: /^Magie$/i }).click();
    await expect(page.locator('#sheet-mode-panel-magie')).toBeVisible();
    // La barre reste épinglée après changement de mode.
    await expect(tablist).toBeInViewport();

    // 03 — viewport : mode changé alors que la barre était épinglée.
    writeFileSync(
      path.join(UAT_DIR, '03-changement-mode-en-place-viewport.png'),
      await page.screenshot({ animations: 'disabled' }),
    );

    // 04 — desktop (lg) : la barre redevient une sidebar verticale (non épinglée
    // en propre — toute la sidebar est sticky). Garde anti-régression desktop.
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/character/${charId}`);
    await waitForAppReady(page);
    await page.getByRole('tab', { name: /^Combat$/i }).click();
    await expect(page.locator('#sheet-mode-panel-combat')).toBeVisible();
    writeFileSync(
      path.join(UAT_DIR, '04-sidebar-desktop-1280-onglets-verticaux.png'),
      await page.screenshot({ fullPage: true, animations: 'disabled' }),
    );
  });
});
