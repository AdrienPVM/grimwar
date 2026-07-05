import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { fighterL3, humanL1Skillful, seedCharacter } from './seed-character';

/**
 * Plan 27 — e2e « handouts MJ→joueur » (texte, Option A) contre les VRAIES rules
 * Firestore (émulateur). Prouve le parcours cross-utilisateur de bout en bout :
 *
 *   1. Un MJ crée une campagne. Deux joueurs (UIDs distincts) seed une fiche et
 *      rejoignent par code.
 *   2. Le MJ ouvre `/campaigns/:cid/handouts`, crée un document texte Markdown
 *      CIBLÉ sur le joueur A, l'envoie. Le document apparaît dans sa liste.
 *   3. Le joueur A ouvre `/campaigns/:cid/handouts` → voit le document, l'ouvre
 *      → la visionneuse rend le titre + le Markdown (write self-reveal autorisé).
 *   4. Le joueur B ouvre le même écran → ne voit RIEN (non destinataire : la rule
 *      le bloque, l'écran affiche l'état vide).
 *
 * Couvre la DoD (targeted player voit + ouvre ; non-targeted ne lit pas) sur le
 * vrai filtrage de visibilité. Image = sous-plan 27b (hors périmètre).
 *
 * Captures → `uat-review/jalon-27/` (gitignored). Skip propre si l'émulateur
 * n'est pas joignable (pas de faux-vert silencieux).
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review/jalon-27');
const CAMPAIGN_NAME = 'Le Codex des Murmures';
const HANDOUT_TITLE = 'La lettre du cartographe';
const HANDOUT_BODY = '## Indice\nLe passage est **derrière la tapisserie**.';
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

async function joinByCode(page: Page, code: string): Promise<void> {
  await page.goto('/campaigns/join');
  await waitForAppReady(page);
  await page.getByLabel(/Code d['']invitation/i).fill(code);
  await page.getByRole('button', { name: 'Rejoindre' }).click();
  await expect(page.getByRole('heading', { name: CAMPAIGN_NAME })).toBeVisible({
    timeout: 15_000,
  });
}

test.describe('Plan 27 — handouts MJ→joueur (texte)', () => {
  test('le MJ cible un joueur → ce joueur voit et ouvre ; un autre ne voit rien', async ({
    browser,
  }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — plan 27 skippé.');

    const dmCtx = await newDesktopContext(browser);
    const dm = await dmCtx.newPage();

    try {
      // ─── MJ crée la campagne → code + cid.
      await dm.goto('/campaigns');
      await waitForAppReady(dm);
      await dm.getByRole('button', { name: /Créer une campagne/i }).first().click();
      await expect(dm.getByRole('dialog')).toBeVisible();
      await dm.getByLabel(/Nom de la campagne/i).fill(CAMPAIGN_NAME);
      await dm.getByRole('button', { name: /^Créer$/ }).click();
      await expect(dm.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });

      await expect(dm.getByRole('heading', { name: CAMPAIGN_NAME })).toBeVisible();
      const cid = /\/campaigns\/([^/]+)$/.exec(dm.url())?.[1] ?? '';
      expect(cid.length).toBeGreaterThan(0);

      const codeNode = dm.locator('p[aria-label*="dicter ou copier"]');
      await expect(codeNode).toBeVisible();
      const inviteCode = ((await codeNode.textContent()) ?? '').trim();
      expect(inviteCode).toMatch(INVITE_CODE_PATTERN);

      const playerACtx = await newDesktopContext(browser);
      const playerA = await playerACtx.newPage();
      const playerBCtx = await newDesktopContext(browser);
      const playerB = await playerBCtx.newPage();

      try {
        // ─── Deux joueurs : seed fiche + rejoignent.
        await playerA.goto('/');
        await waitForAppReady(playerA);
        const { uid: uidA } = await seedCharacter(playerA, fighterL3);
        await joinByCode(playerA, inviteCode);

        await playerB.goto('/');
        await waitForAppReady(playerB);
        await seedCharacter(playerB, humanL1Skillful);
        await joinByCode(playerB, inviteCode);

        // ─── MJ : crée un document texte CIBLÉ sur le joueur A.
        await dm.goto(`/campaigns/${cid}/handouts`);
        await waitForAppReady(dm);
        await dm.getByRole('button', { name: 'Nouveau document' }).click();
        await expect(dm.getByRole('dialog')).toBeVisible();
        await dm.getByPlaceholder('Titre du document').fill(HANDOUT_TITLE);
        await dm.getByPlaceholder(/Rédigez le document/i).fill(HANDOUT_BODY);
        // Aperçu Markdown live : le **gras** rendu apparaît dans la modale.
        // `exact: true` cible le <strong> du rendu (la valeur brute du textarea,
        // avec ses `**`, n'est pas une correspondance exacte).
        await expect(
          dm.getByRole('dialog').getByText('derrière la tapisserie', { exact: true }),
        ).toBeVisible();
        await captureViewport(dm, '01-modale-creation.png');
        // Cible le joueur A (libellé = UID tronqué).
        await dm.getByRole('button', { name: 'Choisir des joueurs' }).click();
        await dm.getByRole('button', { name: new RegExp(uidA.slice(0, 8)) }).click();
        await dm.getByRole('button', { name: 'Envoyer' }).click();
        await expect(dm.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });

        // Le document apparaît dans la liste du MJ.
        await expect(dm.getByRole('heading', { name: HANDOUT_TITLE })).toBeVisible({
          timeout: 10_000,
        });
        await captureFull(dm, '02-liste-mj.png');

        // ─── Joueur A : voit le document et l'ouvre.
        await playerA.goto(`/campaigns/${cid}/handouts`);
        await waitForAppReady(playerA);
        await expect(playerA.getByRole('heading', { name: HANDOUT_TITLE })).toBeVisible({
          timeout: 10_000,
        });
        await playerA.getByRole('button', { name: 'Ouvrir' }).first().click();
        await expect(playerA.getByRole('dialog')).toBeVisible();
        await expect(
          playerA.getByRole('dialog').getByText('derrière la tapisserie', { exact: true }),
        ).toBeVisible();
        await captureViewport(playerA, '03-visionneuse-joueur-A.png');

        // ─── Joueur B : non destinataire → ne voit RIEN.
        await playerB.goto(`/campaigns/${cid}/handouts`);
        await waitForAppReady(playerB);
        await expect(
          playerB.getByText('Le MJ ne vous a transmis aucun document.'),
        ).toBeVisible({ timeout: 10_000 });
        await expect(playerB.getByRole('heading', { name: HANDOUT_TITLE })).toHaveCount(0);
        await captureFull(playerB, '04-joueur-B-rien.png');
      } finally {
        await playerACtx.close();
        await playerBCtx.close();
      }
    } finally {
      await dmCtx.close();
    }
  });
});
