import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import {
  fighterL3,
  patchSeededCharacter,
  seedCampaignMembership,
  seedCharacter,
  seedCharacterForUid,
} from './seed-character';

/**
 * JALON 4A.4 — panneau « compagnie » MJ (état de combat des joueurs en direct).
 *
 * Prouve, contre les VRAIES rules Firestore de l'émulateur, que :
 *   1. le MJ ouvre le détail campagne et voit la section « État de la compagnie »
 *      avec la carte d'un joueur ayant lié une fiche — lecture cross-owner A2 ;
 *   2. la carte affiche l'état de la fiche du joueur (nom + PV) ;
 *   3. quand le joueur modifie ses PV (write Admin SDK sous son sous-arbre),
 *      la carte se met à jour EN DIRECT sans rechargement (`onSnapshot`,
 *      plan 21 step 11 : « player changes HP, DM sees update »).
 *
 * Style single-page (le MJ EST la page authentifiée) : le joueur est fabriqué via
 * l'Admin SDK sous un UID arbitraire (rule A2 autorise sur `gmIds` + lien de
 * membership, pas sur une session active). Le parcours UI complet du link joueur
 * est déjà couvert par campaigns-dm-read-sheet.
 *
 * Captures → `uat-review/jalon-4/4A.4/` (gitignored). Skip propre si l'émulateur
 * n'est pas joignable (Java absent) — pas de faux-vert silencieux.
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review/jalon-4/4A.4');

function ensureUatDir(): void {
  mkdirSync(UAT_DIR, { recursive: true });
}

async function captureFull(page: Page, filename: string): Promise<void> {
  ensureUatDir();
  await page.screenshot({ path: path.join(UAT_DIR, filename), fullPage: true });
}

test.describe('JALON 4A.4 — panneau compagnie MJ (état live des joueurs)', () => {
  test('le MJ voit la carte d’un joueur et ses PV se mettent à jour en direct', async ({
    page,
  }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — 4A.4 skippé.');

    // La page s'authentifie en anon → son UID sera le MJ.
    await page.goto('/');
    await waitForAppReady(page);
    const { uid: gmUid } = await seedCharacter(page, fighterL3);

    // Un joueur (UID fabriqué) avec une fiche complète seedée sous son sous-arbre,
    // + une campagne où la page est MJ et où ce joueur a lié sa fiche.
    const cid = `party-camp-${gmUid}`;
    const playerUid = `party-player-${gmUid}`;
    const playerCharId = await seedCharacterForUid(playerUid, fighterL3);
    await seedCampaignMembership({
      campaignId: cid,
      gmUid,
      playerUid,
      charId: playerCharId,
    });

    // ─── Le MJ ouvre le détail → la section compagnie rend la carte du joueur.
    await page.goto(`/campaigns/${cid}`);
    await waitForAppReady(page);
    const region = page.getByRole('region', {
      name: /État de combat de la compagnie/i,
    });
    await expect(region).toBeVisible({ timeout: 15_000 });
    // La carte du joueur lié : nom + PV initiaux (28 / 28 pour fighterL3).
    await expect(region.getByText(fighterL3.name)).toBeVisible({ timeout: 15_000 });
    await expect(region.getByText('28 / 28')).toBeVisible();
    await captureFull(page, '01-compagnie-initiale.png');

    // ─── Le joueur prend des dégâts (write sous SON sous-arbre) → le MJ voit la
    // maj LIVE sans reload. 7 est un PV unique parmi les chiffres affichés.
    await patchSeededCharacter(playerUid, playerCharId, {
      hp: { current: 7, max: 28, temp: 0 },
    });
    await expect(region.getByText('7 / 28')).toBeVisible({ timeout: 15_000 });
    await expect(region.getByText('28 / 28')).toHaveCount(0);
    await captureFull(page, '02-compagnie-pv-live.png');
  });
});
