import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import {
  fighterL3,
  seedCampaignMembership,
  seedCharacter,
  seedCharacterForUid,
  wizardL3,
} from './seed-character';

/**
 * UAT visuel — passe « dédup + responsive » (post-plan 26).
 *
 * Rassemble dans `uat-review/dedup-responsive/` les captures-clés des trois
 * améliorations à juger à l'œil par Adrien (le mécanique est couvert par les
 * tests unitaires + e2e) :
 *  1. Détail de campagne : section UNIQUE « La compagnie » (fusion roster +
 *     état) — plus de duplication « deux sections, mêmes joueurs ».
 *  2. Fiche mode Combat : PV non tripliés — l'emblème porte les PV glanceable,
 *     la HpMegaCard le contrôle ; le StatusStrip ne répète plus les PV.
 *  3. Modale large : le détail de sort profite de la largeur sur desktop/TV
 *     (gabarit `size="lg"` du DetailModal responsive).
 *
 * Captures en pleine page (`fullPage`) + une viewport supplémentaire pour la
 * modale (ressenti d'overlay). Skip propre si l'émulateur n'est pas joignable.
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review/dedup-responsive');

function ensureDir(): void {
  mkdirSync(UAT_DIR, { recursive: true });
}

async function full(page: Page, name: string): Promise<void> {
  ensureDir();
  await page.screenshot({ path: path.join(UAT_DIR, name), fullPage: true });
}

async function viewport(page: Page, name: string): Promise<void> {
  ensureDir();
  await page.screenshot({ path: path.join(UAT_DIR, name), fullPage: false });
}

test.describe('UAT — dédup + responsive', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(!ok, 'Émulateur Firestore non joignable — UAT dédup/responsive skippé.');
  });

  test('campagne — section unique « La compagnie » (desktop)', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    await waitForAppReady(page);
    const { uid: gmUid } = await seedCharacter(page, fighterL3);
    const cid = `uat27-camp-${gmUid}`;
    const playerUid = `uat27-player-${gmUid}`;
    const playerCharId = await seedCharacterForUid(playerUid, fighterL3);
    await seedCampaignMembership({ campaignId: cid, gmUid, playerUid, charId: playerCharId });

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/campaigns/${cid}`);
    await waitForAppReady(page);
    const region = page.getByRole('region', { name: /Membres de la campagne/i });
    await expect(region).toBeVisible({ timeout: 15_000 });
    // La carte live du joueur lié + la ligne compacte du MJ cohabitent dans UNE
    // section (le joueur n'apparaît plus deux fois).
    await expect(region.getByText(fighterL3.name)).toBeVisible({ timeout: 15_000 });
    await full(page, '01-campagne-section-unique-desktop.png');
  });

  test('fiche combat — PV non tripliés (desktop + mobile)', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, wizardL3);

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/character/${charId}`);
    await waitForAppReady(page);
    await page.waitForTimeout(300);
    await full(page, '02-fiche-combat-desktop.png');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/character/${charId}`);
    await waitForAppReady(page);
    await page.waitForTimeout(300);
    await full(page, '03-fiche-combat-mobile.png');
  });

  test('modale large — détail de sort (desktop)', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, wizardL3);

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/character/${charId}`);
    await waitForAppReady(page);
    await page.getByRole('tab', { name: /^Magie$/i }).click();
    const panel = page.locator('#sheet-mode-panel-magie');
    await expect(panel).toBeVisible();
    await panel.getByText('Armure du mage', { exact: false }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await full(page, '04-modale-sort-large-desktop.png');
    await viewport(page, '05-modale-sort-large-desktop-viewport.png');
  });
});
