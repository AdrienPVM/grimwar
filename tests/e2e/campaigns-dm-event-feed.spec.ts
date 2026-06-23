import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import {
  fighterL3,
  seedCampaignEvent,
  seedCampaignMembership,
  seedCharacter,
} from './seed-character';

/**
 * JALON 22.3 — lecteur du flux d'événements (feed d'activité MJ).
 *
 * Premier CONSOMMATEUR du journal écrit par 22.1/22.2. Prouve, contre les VRAIES
 * rules Firestore de l'émulateur, que :
 *   1. le MJ (page authentifiée, membre de `gmIds`) ouvre le détail campagne et
 *      voit la section « Activité récente » (feed MJ-only) ;
 *   2. un événement injecté APRÈS l'ouverture (Admin SDK) apparaît EN DIRECT dans
 *      le feed sans rechargement — la chaîne rule élargie (`isMemberOf || isDMOf`)
 *      + query contrainte (`visibility in ['all','dm']`) + `onSnapshot` fonctionne ;
 *   3. un événement `dm` (visibilité MJ) est lisible par le MJ.
 *
 * La rule de read `events` exigeait `isMemberOf` seul (22.1) → un MJ pur (sans doc
 * `members/`) ne pouvait pas lire le flux. 22.3 élargit à `isMemberOf || isDMOf` ;
 * cette spec verrouille le parcours navigateur de bout en bout.
 *
 * Captures → `uat-review/jalon-22/22.3/` (gitignored). Skip propre si l'émulateur
 * n'est pas joignable (Java absent) — pas de faux-vert silencieux.
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review/jalon-22/22.3');

function ensureUatDir(): void {
  mkdirSync(UAT_DIR, { recursive: true });
}

async function captureFull(page: Page, filename: string): Promise<void> {
  ensureUatDir();
  await page.screenshot({ path: path.join(UAT_DIR, filename), fullPage: true });
}

test.describe('JALON 22.3 — feed d’activité MJ (lecteur d’événements)', () => {
  test('le MJ voit un événement apparaître EN DIRECT dans le feed', async ({
    page,
  }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — 22.3 skippé.');

    // La page s'authentifie en anon → on récupère son UID, qui sera le MJ.
    await page.goto('/');
    await waitForAppReady(page);
    const { uid: gmUid } = await seedCharacter(page, fighterL3);

    // Campagne où la page (gmUid) est MJ, + un joueur membre avec fiche liée.
    const cid = `evtfeed-camp-${gmUid}`;
    const playerUid = `player-${gmUid}`;
    const playerChar = `pchar-${gmUid}`;
    await seedCampaignMembership({
      campaignId: cid,
      gmUid,
      playerUid,
      charId: playerChar,
    });

    // ─── Le MJ ouvre le détail campagne → la section feed est rendue (MJ-only).
    await page.goto(`/campaigns/${cid}`);
    await waitForAppReady(page);
    await expect(
      page.getByRole('region', { name: /Journal de bord de la campagne/i }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Activité récente')).toBeVisible();
    // Avant injection : état vide (ancre « rouge avant vert »).
    await expect(
      page.getByText('Aucune activité enregistrée pour l’instant.'),
    ).toBeVisible();

    // ─── Injection d'un événement roll APRÈS l'ouverture → doit apparaître LIVE.
    await seedCampaignEvent(cid, {
      kind: 'roll',
      actorUserId: playerUid,
      actorCharacterId: playerChar,
      payload: { label: 'Épée longue', total: 18 },
      visibility: 'all',
    });

    await expect(page.getByText('Jet de dés')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Épée longue · 18')).toBeVisible();
    // L'état vide a disparu — le feed s'est mis à jour sans reload.
    await expect(
      page.getByText('Aucune activité enregistrée pour l’instant.'),
    ).toHaveCount(0);

    // ─── Un événement « dm » est lisible par le MJ (élargissement de visibilité).
    await seedCampaignEvent(cid, {
      kind: 'dm-secret-roll',
      actorUserId: gmUid,
      actorCharacterId: null,
      payload: { total: 14 },
      visibility: 'dm',
    });
    await expect(page.getByText('Jet secret du meneur')).toBeVisible({
      timeout: 15_000,
    });

    await captureFull(page, '01-feed-mj-evenements.png');
  });
});
