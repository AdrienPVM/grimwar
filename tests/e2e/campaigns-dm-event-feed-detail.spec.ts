import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import {
  dragonbornL1Red,
  seedCampaignEvent,
  seedCampaignMembership,
  seedCharacter,
  seedCharacterForUid,
  fighterL3,
} from './seed-character';

/**
 * JALON 22.4 — détail au tap + filtre par joueur du feed (reste du plan 21 step 4).
 *
 * Prouve, contre les VRAIES rules Firestore de l'émulateur, que :
 *   1. le feed affiche un filtre par joueur dont le chip porte le NOM du
 *      personnage lié (résolu en lecture cross-owner A2) — pas un identifiant ;
 *   2. sélectionner un joueur ne montre QUE ses événements (le jet secret du
 *      meneur, sans personnage acteur, disparaît) ; « Tous » les ramène ;
 *   3. taper une ligne ouvre la modale de détail, qui résout l'acteur par nom et
 *      détaille le payload (avant / après / variation).
 *
 * Le personnage du joueur est seedé COMPLET sous son sous-arbre (`seedCharacterForUid`)
 * pour que la rule A2 ouvre sa lecture au MJ et que le nom résolve. Distinct du
 * personnage du MJ (Sigrid ≠ Pyrra) pour des assertions non ambiguës.
 *
 * Captures → `uat-review/jalon-22/22.4/` (gitignored). Skip propre si l'émulateur
 * n'est pas joignable (Java absent) — pas de faux-vert silencieux.
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review/jalon-22/22.4');

function ensureUatDir(): void {
  mkdirSync(UAT_DIR, { recursive: true });
}

async function captureFull(page: Page, filename: string): Promise<void> {
  ensureUatDir();
  await page.screenshot({ path: path.join(UAT_DIR, filename), fullPage: true });
}

async function captureViewport(page: Page, filename: string): Promise<void> {
  ensureUatDir();
  await page.screenshot({ path: path.join(UAT_DIR, filename), fullPage: false });
}

test.describe('JALON 22.4 — détail au tap + filtre par joueur du feed', () => {
  test('le MJ filtre par joueur (nom résolu) et ouvre le détail d’un événement', async ({
    page,
  }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — 22.4 skippé.');

    await page.goto('/');
    await waitForAppReady(page);
    // La page (MJ) seede sa propre fiche (Sigrid) — non liée à cette campagne.
    const { uid: gmUid } = await seedCharacter(page, fighterL3);

    // Un joueur avec une fiche COMPLÈTE (Pyrra) liée dans la campagne.
    const cid = `evtdetail-camp-${gmUid}`;
    const playerUid = `evtdetail-player-${gmUid}`;
    const playerCharId = await seedCharacterForUid(playerUid, dragonbornL1Red);
    await seedCampaignMembership({
      campaignId: cid,
      gmUid,
      playerUid,
      charId: playerCharId,
    });

    // ─── Ouverture détail + injection de deux événements (1 joueur, 1 secret MJ).
    await page.goto(`/campaigns/${cid}`);
    await waitForAppReady(page);
    const feed = page.getByRole('region', {
      name: /Journal de bord de la campagne/i,
    });
    await expect(feed).toBeVisible({ timeout: 15_000 });

    await seedCampaignEvent(cid, {
      kind: 'hp-change',
      actorUserId: playerUid,
      actorCharacterId: playerCharId,
      targetCharacterId: playerCharId,
      payload: { before: 12, after: 4, delta: -8, reason: 'damage' },
      visibility: 'all',
    });
    await seedCampaignEvent(cid, {
      kind: 'dm-secret-roll',
      actorUserId: gmUid,
      actorCharacterId: null,
      payload: { total: 17 },
      visibility: 'dm',
    });

    await expect(feed.getByText('Points de vie')).toBeVisible({ timeout: 15_000 });
    await expect(feed.getByText('Jet secret du meneur')).toBeVisible();

    // ─── 1. Le filtre porte le NOM du personnage lié (résolu cross-owner A2).
    const filter = feed.getByRole('group', {
      name: /Filtrer l’activité par joueur/i,
    });
    await expect(filter).toBeVisible({ timeout: 15_000 });
    const playerChip = filter.getByRole('button', { name: dragonbornL1Red.name });
    await expect(playerChip).toBeVisible();
    await captureFull(page, '01-feed-filtre-et-evenements.png');

    // ─── 2. Filtrer par le joueur masque le jet secret du meneur (acteur null).
    await playerChip.click();
    await expect(playerChip).toHaveAttribute('aria-pressed', 'true');
    await expect(feed.getByText('Points de vie')).toBeVisible();
    await expect(feed.getByText('Jet secret du meneur')).toHaveCount(0);

    // « Tous » ramène le jet secret.
    await filter.getByRole('button', { name: 'Tous' }).click();
    await expect(feed.getByText('Jet secret du meneur')).toBeVisible();

    // ─── 3. Tap sur la ligne du joueur → modale de détail (acteur par nom + payload).
    await feed
      .getByRole('button', { name: /Voir le détail de l’événement.*Points de vie/ })
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(dragonbornL1Red.name).first()).toBeVisible();
    await expect(dialog.getByText('Avant')).toBeVisible();
    await expect(dialog.getByText('12')).toBeVisible();
    await expect(dialog.getByText('Après')).toBeVisible();
    await expect(dialog.getByText('Variation')).toBeVisible();
    await expect(dialog.getByText('-8')).toBeVisible();
    // Modale ouverte : pleine page (contenu) + viewport (ressenti overlay).
    await captureFull(page, '02-detail-evenement-pleine-page.png');
    await captureViewport(page, '03-detail-evenement-overlay.png');
  });
});
