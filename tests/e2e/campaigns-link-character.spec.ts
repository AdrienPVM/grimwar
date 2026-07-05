import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * JALON 4A.2 — e2e « Mon personnage » : le joueur lie sa fiche à sa membership.
 *
 * Premier consommateur UI du service `linkCharacterToMembership` (livré 4A.1,
 * jusqu'ici sans appelant). On vérifie le parcours réel contre les VRAIES rules
 * Firestore chargées dans l'émulateur :
 *
 *   1. Un MJ (contexte A) crée une campagne, ouvre le détail, on extrait le code.
 *   2. Un joueur (contexte B, UID anon distinct) rejoint via le code → il a
 *      désormais un doc `members/{uid}` → la section « Mon personnage » apparaît.
 *   3. Le MJ pur (contexte A, aucun doc member) ne voit PAS la section — il LIT
 *      les fiches des joueurs (rule A2), il ne lie pas la sienne.
 *   4. Sans personnage, le joueur voit le CHEMIN GUIDÉ : « Créer un personnage »
 *      (pas de « Lier un existant », le picker serait vide) → clic → wizard en
 *      contexte campagne (`/create?campaignId=`) avec bannière de liaison auto.
 *
 * Le WRITE du link lui-même est couvert ailleurs (identité des args en unit
 * `link-character-modal.test.tsx`, forme du batch en `services/campaigns.test.ts`,
 * autorisation owner-write + lecture MJ contre l'émulateur en
 * `firestore-rules.test.ts` 4A.1). Cette spec couvre la dimension rendu navigateur
 * du nouveau parcours contre les rules réelles.
 *
 * Captures → `uat-review/jalon-4/4A.2/` (gitignored). Skip propre si l'émulateur
 * n'est pas joignable (Java/JRE absent) — pas de faux-vert silencieux.
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review/jalon-4/4A.2');
const CAMPAIGN_NAME = 'Les Cendres de Veltharion';
const CAMPAIGN_DESC =
  'Un comté frontalier rongé par une malédiction lente ; les morts ne reposent plus.';
const INVITE_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

function ensureUatDir(): void {
  mkdirSync(UAT_DIR, { recursive: true });
}

async function captureFull(page: Page, filename: string): Promise<void> {
  ensureUatDir();
  await page.screenshot({ path: path.join(UAT_DIR, filename), fullPage: true });
}

async function newDesktopContext(
  browser: import('@playwright/test').Browser,
): Promise<BrowserContext> {
  return browser.newContext({ viewport: { width: 1440, height: 900 } });
}

test.describe('JALON 4A.2 — section « Mon personnage » + picker de liaison', () => {
  test('le joueur voit la section après join ; le MJ pur ne la voit pas', async ({
    browser,
  }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — 4A.2 skippé.');

    const dmCtx = await newDesktopContext(browser);
    const dm = await dmCtx.newPage();

    try {
      // ─── MJ crée la campagne + ouvre le détail + extrait le code.
      await dm.goto('/campaigns');
      await waitForAppReady(dm);
      await dm.getByRole('button', { name: /Créer une campagne/i }).first().click();
      await expect(dm.getByRole('dialog')).toBeVisible();
      await dm.getByLabel(/Nom de la campagne/i).fill(CAMPAIGN_NAME);
      await dm.getByLabel(/Description/i).fill(CAMPAIGN_DESC);
      await dm.getByRole('button', { name: /^Créer$/ }).click();
      await expect(dm.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });

      await expect(dm.getByRole('heading', { name: CAMPAIGN_NAME })).toBeVisible();

      // Le MJ pur (gmIds seul, aucun doc member) NE voit PAS « Mon personnage ».
      await expect(dm.getByText(/Mon personnage/i)).toHaveCount(0);

      const codeNode = dm.locator('p[aria-label*="dicter ou copier"]');
      await expect(codeNode).toBeVisible();
      const inviteCode = ((await codeNode.textContent()) ?? '').trim();
      expect(inviteCode).toMatch(INVITE_CODE_PATTERN);

      // ─── Joueur rejoint via code (UID anon distinct).
      const playerCtx = await newDesktopContext(browser);
      const player = await playerCtx.newPage();

      try {
        await player.goto('/campaigns/join');
        await waitForAppReady(player);
        await player.getByLabel(/Code d['']invitation/i).fill(inviteCode);
        await player.getByRole('button', { name: 'Rejoindre' }).click();
        await expect(
          player.getByRole('heading', { name: CAMPAIGN_NAME }),
        ).toBeVisible({ timeout: 15_000 });

        // Le joueur a un doc member → la section « Mon personnage » est rendue,
        // sans fiche liée. Chemin guidé : CTA « Créer un personnage » présent,
        // « Lier un existant » ABSENT (aucune fiche → picker vide inutile).
        await expect(player.getByText(/Mon personnage/i)).toBeVisible();
        await expect(player.getByText(/Aucun personnage lié/i)).toBeVisible();
        const createCta = player.getByRole('button', {
          name: /Créer un personnage/i,
        });
        await expect(createCta).toBeVisible();
        await expect(
          player.getByRole('button', { name: /Lier un existant/i }),
        ).toHaveCount(0);
        await captureFull(player, '01-player-detail-mon-personnage.png');

        // ─── Le CTA ouvre le wizard EN CONTEXTE CAMPAGNE (?campaignId=) : la
        // fiche créée s'y liera automatiquement (cf. finishCharacterCreation).
        await createCta.click();
        await expect(player).toHaveURL(/\/create\?campaignId=[A-Za-z0-9]/);
        await expect(
          player.getByText(/rejoindra automatiquement ta campagne/i),
        ).toBeVisible();
        await captureFull(player, '02-wizard-in-campaign-banner.png');
      } finally {
        await playerCtx.close();
      }
    } finally {
      await dmCtx.close();
    }
  });
});
