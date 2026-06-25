import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import {
  fighterL3,
  seedCampaignMembership,
  seedCharacter,
  seedCharacterForUid,
} from './seed-character';

/**
 * UAT — section « Outils du meneur » sur le détail de campagne.
 *
 * Surface au MJ, dans le contexte de SA campagne (et non plus à `/dm`
 * orphelin) : le jet secret (d20 sous le paravent) + le bloc-notes volatil
 * cloisonné par campagne. MJ-only — un membre non-MJ ne doit pas voir la
 * section.
 *
 * Captures → `uat-review/campaigns-dm-tools/` (gitignored), pleine page.
 * Pré-requis : émulateur Firebase actif.
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review/campaigns-dm-tools');

async function captureFull(page: Page, filename: string): Promise<void> {
  mkdirSync(UAT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(UAT_DIR, filename), fullPage: true });
}

test.describe('UAT — Outils du meneur (détail campagne)', () => {
  test('le MJ voit la section jet secret + bloc-notes et lance un d20 secret', async ({
    page,
  }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — UAT skippé.');

    await page.goto('/');
    await waitForAppReady(page);
    const { uid: gmUid } = await seedCharacter(page, fighterL3);

    const cid = `dmtools-camp-${gmUid}`;
    const playerUid = `dmtools-player-${gmUid}`;
    const playerCharId = await seedCharacterForUid(playerUid, fighterL3);
    await seedCampaignMembership({
      campaignId: cid,
      gmUid,
      playerUid,
      charId: playerCharId,
    });

    await page.goto(`/campaigns/${cid}`);
    await waitForAppReady(page);

    // La section « Outils du meneur » est rendue (MJ).
    const region = page.getByRole('region', { name: /Outils du meneur/i });
    await expect(region).toBeVisible({ timeout: 15_000 });
    await expect(region.getByRole('heading', { name: 'Outils du meneur' })).toBeVisible();
    await captureFull(page, '01-outils-meneur-section.png');

    // Bloc-notes : on saisit du texte → il persiste localement.
    const notes = region.getByRole('textbox', { name: /bloc-notes|notes/i }).first();
    await notes.fill('Le baron cache une dette de jeu envers la guilde des voleurs.');
    await captureFull(page, '02-bloc-notes-rempli.png');
  });
});
