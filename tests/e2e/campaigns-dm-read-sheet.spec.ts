import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { fighterL3, seedCharacter } from './seed-character';

/**
 * JALON 4A.3 — e2e « lecture MJ d'une fiche liée ».
 *
 * Premier consommateur UI de la rule de lecture cross-owner A2 (4A.1) : le MJ
 * ouvre, EN LECTURE SEULE, la fiche d'un de ses joueurs. La spec exerce la chaîne
 * 4A complète contre les VRAIES rules Firestore chargées dans l'émulateur :
 *
 *   1. Un MJ (contexte A) crée une campagne → on extrait code + cid.
 *   2. Un joueur (contexte B, UID anon distinct) se voit seed une fiche (Admin SDK,
 *      bypass rules), rejoint par code, puis LIE sa fiche via le picker (4A.2) —
 *      write owner-only qui estampille `members/{uid}.characterId` + `homeCampaignId`.
 *   3. Le MJ recharge le détail : la ligne du joueur expose « Voir la fiche » (4A.3,
 *      affordance MJ uniquement, conditionnée à une fiche liée).
 *   4. Le MJ ouvre la fiche → la rule A2 autorise la lecture `users/{player}/characters/{c}`
 *      → la fiche s'affiche en lecture seule (bandeau « Lecture seule », pas de FAB
 *      d'historique de jets — la sous-collection de rolls du joueur est hors A2).
 *
 * Couvre la dimension manquante des couches inférieures : l'autorisation A2 est
 * testée en rules-unit (4A.1) et le link en unit/services (4A.2) — ici on prouve
 * le PARCOURS NAVIGATEUR cross-utilisateur de bout en bout contre les rules réelles.
 *
 * Captures → `uat-review/jalon-4/4A.3/` (gitignored). Skip propre si l'émulateur
 * n'est pas joignable (Java/JRE absent) — pas de faux-vert silencieux.
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review/jalon-4/4A.3');
const CAMPAIGN_NAME = 'Le Serment de Korvath';
const CAMPAIGN_DESC =
  'Une marche frontalière où un ancien serment lie les vivants aux morts.';
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

test.describe('JALON 4A.3 — lecture MJ (lecture seule) d’une fiche liée', () => {
  test('le MJ ouvre la fiche d’un joueur lié via « Voir la fiche »', async ({
    browser,
  }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — 4A.3 skippé.');

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

      await dm.getByRole('button', { name: /Ouvrir/i }).first().click();
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

        // Lie la fiche seedée via le picker (write owner-only → characterId +
        // homeCampaignId). La fiche apparaît comme option radio par son nom.
        await player.getByRole('button', { name: /Lier un personnage/i }).click();
        await expect(player.getByRole('dialog')).toBeVisible();
        await player.getByRole('radio', { name: new RegExp(fighterL3.name, 'i') }).click();
        await player.getByRole('button', { name: /^Lier$/ }).click();
        await expect(player.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });
        // La section reflète la fiche liée.
        await expect(player.getByText(new RegExp(fighterL3.name, 'i'))).toBeVisible();
        await captureFull(player, '01-joueur-fiche-liee.png');

        // ─── MJ : recharge → « Voir la fiche » apparaît pour ce joueur.
        await dm.reload();
        await waitForAppReady(dm);
        await expect(dm.getByRole('heading', { name: CAMPAIGN_NAME })).toBeVisible();
        const viewBtn = dm.getByRole('button', { name: /Voir la fiche/i });
        await expect(viewBtn).toBeVisible({ timeout: 15_000 });
        await viewBtn.click();

        // ─── Lecture seule : route member-sheet + rendu de la fiche du joueur.
        await expect(dm).toHaveURL(
          new RegExp(`/campaigns/${cid}/members/${playerUid}/sheet$`),
        );
        await expect(dm.getByText(/Lecture seule/i)).toBeVisible({ timeout: 15_000 });
        await expect(dm.getByText(new RegExp(fighterL3.name, 'i')).first()).toBeVisible();
        // Pas de FAB d'historique des jets en lecture cross-owner (hors A2).
        await expect(
          dm.getByRole('button', { name: /historique des jets/i }),
        ).toHaveCount(0);
        // Lecture seule RÉELLE (pas cosmétique) : l'affordance de montée de niveau
        // (qui écrirait la fiche du joueur) est absente côté MJ.
        await expect(
          dm.getByRole('button', { name: /Monter au niveau/i }),
        ).toHaveCount(0);
        await captureFull(dm, '02-mj-fiche-lecture-seule.png');
        await captureViewport(dm, '03-mj-fiche-lecture-seule-viewport.png');

        // ─── Retour → détail campagne.
        await dm.getByRole('button', { name: /Retour à la campagne/i }).first().click();
        await expect(dm).toHaveURL(new RegExp(`/campaigns/${cid}$`));
      } finally {
        await playerCtx.close();
      }
    } finally {
      await dmCtx.close();
    }
  });
});
