import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import { expectModalInViewport, isEmulatorReachable, waitForAppReady } from './fixtures';

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
 *   4. Le joueur ouvre le picker. N'ayant pas encore de personnage, il voit
 *      l'état vide (« crée-en un depuis ta bibliothèque ») — et la modale
 *      respecte l'invariant viewport (portal vers body, panneau dans l'écran).
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

async function captureViewport(page: Page, filename: string): Promise<void> {
  ensureUatDir();
  await page.screenshot({ path: path.join(UAT_DIR, filename), fullPage: false });
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

      await dm.getByRole('button', { name: /Ouvrir/i }).first().click();
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
        // sans fiche liée + CTA « Lier un personnage ».
        await expect(player.getByText(/Mon personnage/i)).toBeVisible();
        await expect(player.getByText(/Aucun personnage lié/i)).toBeVisible();
        const linkCta = player.getByRole('button', { name: /Lier un personnage/i });
        await expect(linkCta).toBeVisible();
        await captureFull(player, '01-player-detail-mon-personnage.png');

        // ─── Ouvre le picker : pas de fiche → état vide + invariant viewport.
        await linkCta.click();
        await expect(player.getByRole('dialog')).toBeVisible();
        await expectModalInViewport(player);
        await expect(
          player.getByText(/Crée-en un depuis ta bibliothèque/i),
        ).toBeVisible();
        // Le bouton « Lier » de la modale reste désactivé (rien à lier).
        await expect(
          player.getByRole('button', { name: /^Lier$/ }),
        ).toBeDisabled();
        await captureFull(player, '02-link-modal-empty.png');
        await captureViewport(player, '02-link-modal-empty-viewport.png');

        // Ferme proprement.
        await player.getByRole('button', { name: /Annuler/i }).click();
        await expect(player.getByRole('dialog')).toHaveCount(0);
      } finally {
        await playerCtx.close();
      }
    } finally {
      await dmCtx.close();
    }
  });
});
