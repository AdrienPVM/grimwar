import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import {
  fighterL3,
  humanL1Skillful,
  seedCampaignMembership,
  seedCharacter,
  seedEncounter,
} from './seed-character';

/**
 * UAT E13 (étapes 1-2) — les notifications atteignent le joueur LÀ OÙ IL EST.
 *
 * C'est le seul test qui prouve ce que le lot livre. Un test unitaire montre que
 * le hook toaste ; il ne montre pas que le joueur reçoit quoi que ce soit depuis
 * sa FICHE, qui est justement l'écran où il se trouve pendant une partie et le
 * seul endroit où l'URL ne porte aucune campagne. C'est le pointeur de campagne
 * active, posé par la fiche à partir de `homeCampaignId`, qui prend le relais —
 * et ça ne se vérifie qu'en montant l'app entière.
 *
 * Scénario, deux navigateurs contre les VRAIES rules de l'émulateur :
 *   1. Un joueur a une fiche liée à une campagne ; il l'ouvre et y reste.
 *   2. Le MJ fait avancer le combat d'un tour → le tour tombe sur le joueur →
 *      « C'est à vous de jouer » s'affiche sur la fiche, sans rien y toucher.
 *   3. Le MJ transmet un document à la table → « Le MJ vous a transmis un
 *      document » s'affiche sur la même fiche.
 *
 * Avant ce lot, aucun des deux n'arrivait : le premier n'existait pas, le second
 * n'était écouté que depuis le hub de campagne.
 *
 * Captures → `uat-review/` (gitignored). Skip propre sans émulateur.
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review');
const CAMPAIGN_NAME = 'La Marche des Cendres';
const ENCOUNTER_NAME = 'Embuscade au col';
const HANDOUT_TITLE = 'Le parchemin du col';

function ensureUatDir(): void {
  mkdirSync(UAT_DIR, { recursive: true });
}

async function capture(page: Page, filename: string, fullPage: boolean): Promise<void> {
  ensureUatDir();
  await page.screenshot({ path: path.join(UAT_DIR, filename), fullPage });
}

async function newDesktopContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({ viewport: { width: 1440, height: 900 } });
}

test.describe('UAT E13 — notifications au joueur, depuis sa fiche', () => {
  test('le tour du joueur et un document arrivent sur la fiche (émulateur requis)', async ({
    browser,
  }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — UAT E13 skippé.');

    const playerCtx = await newDesktopContext(browser);
    const player = await playerCtx.newPage();
    const dmCtx = await newDesktopContext(browser);
    const dm = await dmCtx.newPage();

    try {
      // ─── Deux utilisateurs authentifiés distincts.
      await player.goto('/');
      await waitForAppReady(player);
      const { uid: playerUid, charId } = await seedCharacter(player, fighterL3);

      await dm.goto('/');
      await waitForAppReady(dm);
      // Fiche jetable : seul l'UID du MJ nous intéresse (il devient `gmIds`).
      const { uid: dmUid } = await seedCharacter(dm, humanL1Skillful);

      // ─── Campagne + membership liée. `seedCampaignMembership` pose aussi
      // `homeCampaignId` sur la fiche : c'est ce pointeur que l'écran de fiche
      // lit, et donc la seule chose qui rattachera le joueur à sa campagne quand
      // il sera sur `/character/:id`.
      const cid = `camp-notif-${Date.now().toString(36)}`;
      await seedCampaignMembership({
        campaignId: cid,
        gmUid: dmUid,
        playerUid,
        charId,
        displayName: 'Sigrid',
        campaignName: CAMPAIGN_NAME,
      });

      // ─── Combat actif, tour du gobelin (index 0). Le joueur est en 2ᵉ position
      // dans l'ordre : un seul « Fin du tour » du MJ fera basculer sur lui.
      const { encounterId } = await seedEncounter(cid, {
        name: ENCOUNTER_NAME,
        status: 'active',
        round: 1,
        turnIndex: 0,
        participants: [
          {
            type: 'monster',
            instanceId: 'inst-gob1',
            name: 'Gobelin éclaireur',
            initiative: 18,
            currentHp: 7,
            maxHp: 7,
          },
          {
            type: 'player',
            characterId: charId,
            instanceId: 'inst-aldric',
            name: 'Sigrid la Vigile',
            initiative: 12,
            currentHp: 24,
            maxHp: 28,
          },
          {
            type: 'monster',
            instanceId: 'inst-gob2',
            name: 'Gobelin sapeur',
            initiative: 5,
            currentHp: 7,
            maxHp: 7,
          },
        ],
      });

      // ─── Le joueur ouvre SA FICHE et n'en bouge plus. L'URL ne porte aucune
      // campagne : tout ce qui suit passe par le pointeur de campagne active.
      await player.goto(`/character/${charId}`);
      await waitForAppReady(player);
      await expect(
        player.getByRole('heading', { name: /Sigrid la Vigile/i }).first(),
      ).toBeVisible({ timeout: 15_000 });
      // Aucun toast au repos : le premier snapshot est marqué « vu » sans bruit,
      // sinon arriver sur un écran en plein combat notifierait un tour ancien.
      await expect(player.getByRole('status')).toHaveCount(0);
      await capture(player, '01-fiche-joueur-sans-notification.png', true);

      // ─── Le MJ fait avancer le tour → il tombe sur le joueur.
      await dm.goto(`/campaigns/${cid}/encounters/${encounterId}`);
      await waitForAppReady(dm);
      await expect(dm.getByText('En cours', { exact: true })).toBeVisible({ timeout: 15_000 });
      await dm.getByRole('button', { name: /Fin du tour/i }).click();

      // ─── Le toast arrive sur la FICHE du joueur, sans qu'il ait rien fait.
      const turnToast = player.getByRole('status').filter({ hasText: 'C’est à vous de jouer' });
      await expect(turnToast).toBeVisible({ timeout: 15_000 });
      await expect(turnToast).toContainText(`Round 1 · ${ENCOUNTER_NAME}`);
      await capture(player, '02-toast-cest-a-vous-de-jouer.png', false);
      await capture(player, '03-toast-cest-a-vous-de-jouer-pleine-page.png', true);

      // ─── Le MJ transmet un document à toute la table.
      await dm.goto(`/campaigns/${cid}/handouts`);
      await waitForAppReady(dm);
      await dm.getByRole('button', { name: 'Nouveau document' }).click();
      await expect(dm.getByRole('dialog')).toBeVisible();
      await dm.getByPlaceholder('Titre du document').fill(HANDOUT_TITLE);
      await dm
        .getByPlaceholder(/Rédigez le document/i)
        .fill('Le col est **gardé**. Deux sentinelles, relève à l’aube.');
      await dm.getByRole('button', { name: 'Envoyer' }).click();
      await expect(dm.getByRole('dialog')).toHaveCount(0, { timeout: 15_000 });

      // ─── Toujours sur sa fiche, le joueur est prévenu.
      const handoutToast = player
        .getByRole('status')
        .filter({ hasText: 'Le MJ vous a transmis un document' });
      await expect(handoutToast).toBeVisible({ timeout: 15_000 });
      await expect(handoutToast).toContainText(HANDOUT_TITLE);
      await capture(player, '04-toast-document-transmis.png', false);

      // ─── Le MJ, lui, ne se notifie pas de son propre envoi.
      await expect(
        dm.getByRole('status').filter({ hasText: 'Le MJ vous a transmis un document' }),
      ).toHaveCount(0);
    } finally {
      await playerCtx.close();
      await dmCtx.close();
    }
  });
});
