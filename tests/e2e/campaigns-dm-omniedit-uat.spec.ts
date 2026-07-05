import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { fighterL3, seedCharacter } from './seed-character';

/**
 * Plan 26 — e2e « omni-edit MJ + journalisation d'audit » (Voie B, rules-only).
 *
 * Prouve le PARCOURS NAVIGATEUR cross-utilisateur de bout en bout contre les
 * VRAIES rules Firestore (émulateur) :
 *
 *   1. Un MJ crée une campagne ; un joueur (UID distinct) seed une fiche, rejoint
 *      par code, lie sa fiche (write owner-only → members.characterId + homeCampaignId).
 *   2. Le MJ ouvre la fiche via « Voir la fiche » → la fiche est EN ÉDITION (bandeau
 *      « Édition MJ », bouton de montée de niveau présent — plus de lecture seule).
 *   3. Le MJ baisse les PV du joueur (tap « Subir 1 dégât ») → write cross-owner
 *      autorisé par `gmCanReadLinkedCharacter` + immuabilité des champs réservés.
 *      La fiche reflète le nouveau total (28 → 27).
 *   4. De retour sur la campagne, le feed d'activité MJ montre un événement
 *      « Édition MJ » ; son détail liste « Points de vie » (audit, plan 26 step 6).
 *
 * Couvre la dimension manquante des couches inférieures : la rule de write est
 * testée en rules-unit, le routage du hook en unit — ici on prouve le parcours
 * réel cross-utilisateur (DoD step 8).
 *
 * Captures → `uat-review/jalon-26/` (gitignored). Skip propre si l'émulateur n'est
 * pas joignable (Java/JRE absent) — pas de faux-vert silencieux.
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review/jalon-26');
const CAMPAIGN_NAME = 'Les Cendres de Vael';
const CAMPAIGN_DESC = 'Le meneur tient la plume autant que les dés.';
const INVITE_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

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

async function newDesktopContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({ viewport: { width: 1440, height: 900 } });
}

test.describe('Plan 26 — omni-edit MJ + audit dm-edit', () => {
  test('le MJ édite les PV d’un joueur lié → fiche à jour + événement « Édition MJ »', async ({
    browser,
  }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — plan 26 skippé.');

    const dmCtx = await newDesktopContext(browser);
    const dm = await dmCtx.newPage();

    try {
      // ─── MJ crée la campagne + ouvre le détail → code + cid.
      await dm.goto('/campaigns');
      await waitForAppReady(dm);
      await dm.getByRole('button', { name: /Créer une campagne/i }).first().click();
      await expect(dm.getByRole('dialog')).toBeVisible();
      await dm.getByLabel(/Nom de la campagne/i).fill(CAMPAIGN_NAME);
      await dm.getByLabel(/Description/i).fill(CAMPAIGN_DESC);
      await dm.getByRole('button', { name: /^Créer$/ }).click();
      await expect(dm.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });

      await expect(dm.getByRole('heading', { name: CAMPAIGN_NAME })).toBeVisible();

      const cidMatch = /\/campaigns\/([^/]+)$/.exec(dm.url());
      const cid = cidMatch?.[1] ?? '';
      expect(cid.length).toBeGreaterThan(0);

      const codeNode = dm.locator('p[aria-label*="dicter ou copier"]');
      await expect(codeNode).toBeVisible();
      const inviteCode = ((await codeNode.textContent()) ?? '').trim();
      expect(inviteCode).toMatch(INVITE_CODE_PATTERN);

      // ─── Joueur : seed une fiche (Admin SDK) puis rejoint + lie.
      const playerCtx = await newDesktopContext(browser);
      const player = await playerCtx.newPage();

      try {
        await player.goto('/');
        await waitForAppReady(player);
        const { uid: playerUid } = await seedCharacter(player, fighterL3);

        await player.goto('/campaigns/join');
        await waitForAppReady(player);
        await player.getByLabel(/Code d['']invitation/i).fill(inviteCode);
        await player.getByRole('button', { name: 'Rejoindre' }).click();
        await expect(
          player.getByRole('heading', { name: CAMPAIGN_NAME }),
        ).toBeVisible({ timeout: 15_000 });

        // Le joueur a une fiche seedée → CTA « Lier un existant » (le picker).
        await player.getByRole('button', { name: /Lier un existant/i }).click();
        await expect(player.getByRole('dialog')).toBeVisible();
        await player.getByRole('radio', { name: new RegExp(fighterL3.name, 'i') }).click();
        await player.getByRole('button', { name: /^Lier$/ }).click();
        await expect(player.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });
        await expect(player.getByText(new RegExp(fighterL3.name, 'i'))).toBeVisible();

        // ─── MJ : recharge → ouvre la fiche du joueur.
        await dm.reload();
        await waitForAppReady(dm);
        await expect(dm.getByRole('heading', { name: CAMPAIGN_NAME })).toBeVisible();
        const viewBtn = dm.getByRole('button', { name: /Voir la fiche/i });
        await expect(viewBtn).toBeVisible({ timeout: 15_000 });
        await viewBtn.click();

        await expect(dm).toHaveURL(
          new RegExp(`/campaigns/${cid}/members/${playerUid}/sheet$`),
        );

        // ─── OMNI-EDIT (et NON lecture seule) : bandeau « Édition MJ » + montée de
        //     niveau disponible (write réel, plus une consultation passive).
        await expect(dm.getByText(/Édition MJ/i).first()).toBeVisible({ timeout: 15_000 });
        await expect(dm.getByText(/Lecture seule/i)).toHaveCount(0);
        await expect(dm.getByRole('button', { name: /Monter au niveau/i })).toBeVisible();
        // L'historique des jets du joueur reste hors-périmètre (sous-arbre rolls non
        // couvert par la rule cross-owner) → pas de FAB d'historique côté MJ.
        await expect(dm.getByRole('button', { name: /historique des jets/i })).toHaveCount(0);
        await captureFull(dm, '01-fiche-omni-edit.png');

        // ─── Le MJ baisse les PV du joueur (28 → 27).
        await dm.getByRole('tab', { name: /^Combat$/i }).click();
        await expect(dm.locator('#sheet-mode-panel-combat')).toBeVisible();
        await expect(
          dm.locator('[role="tabpanel"]#sheet-mode-panel-combat').getByText(/^28$/).first(),
        ).toBeVisible();
        await dm.getByRole('button', { name: /^Subir 1 dégât/i }).click();
        await expect(
          dm.locator('[role="tabpanel"]#sheet-mode-panel-combat').getByText(/^27$/).first(),
          'La fiche du joueur doit refléter le write MJ (28 → 27).',
        ).toBeVisible({ timeout: 8_000 });
        await captureFull(dm, '02-pv-baisses-par-mj.png');

        // ─── Retour campagne → le feed d'activité MJ montre « Édition MJ ».
        await dm.getByRole('button', { name: /Retour à la campagne/i }).first().click();
        await expect(dm).toHaveURL(new RegExp(`/campaigns/${cid}$`));
        const feedEntry = dm.getByText(/Édition MJ/i).first();
        await expect(feedEntry, 'Le feed MJ doit logguer un événement dm-edit.').toBeVisible({
          timeout: 15_000,
        });
        await captureFull(dm, '03-feed-edition-mj.png');

        // ─── Détail de l'événement : le champ « Points de vie » est tracé (audit).
        await feedEntry.click();
        await expect(dm.getByRole('dialog')).toBeVisible();
        await expect(dm.getByRole('dialog').getByText(/Points de vie/i).first()).toBeVisible();
        await captureFull(dm, '04-detail-audit.png');
        await captureViewport(dm, '05-detail-audit-viewport.png');
      } finally {
        await playerCtx.close();
      }
    } finally {
      await dmCtx.close();
    }
  });
});
