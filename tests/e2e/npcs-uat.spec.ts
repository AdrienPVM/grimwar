import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { fighterL3, seedCharacter } from './seed-character';

/**
 * Plan 28 — e2e « PNJ récurrents » contre les VRAIES rules Firestore (émulateur).
 * Prouve le parcours cross-utilisateur de bout en bout (DoD plan 28) :
 *
 *   1. Un MJ crée une campagne. Un joueur seed une fiche + rejoint par code.
 *   2. Le MJ crée un PNJ marchand PUBLIC (« Aldric », visibility 'all') et un PNJ
 *      ennemi SECRET combattant (« Le Masque », visibility 'dm', PV/CA + notes MJ).
 *   3. L'annuaire MJ montre les deux ; « Le Masque » porte le badge Secret.
 *   4. Le joueur ouvre l'annuaire → voit Aldric, ne voit PAS Le Masque (rule).
 *   5. Le détail MJ de « Le Masque » montre les sections RÉSERVÉES MJ (notes
 *      secrètes + stats de combat) — masquées pour les joueurs.
 *   6. Le MJ invoque « Le Masque » dans une rencontre depuis les PNJ enregistrés
 *      → il devient participant du combat.
 *
 * Captures → `uat-review/plan-28/` (gitignored). Skip propre si l'émulateur n'est
 * pas joignable (pas de faux-vert silencieux).
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review/plan-28');
const CAMPAIGN_NAME = 'Les Cendres de Valombre';
const MERCHANT = 'Aldric le marchand';
const VILLAIN = 'Le Masque';
const VILLAIN_DM_NOTE = 'Commanditaire des disparitions du port.';
const ENCOUNTER_NAME = 'Embuscade au port';
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

test.describe('Plan 28 — PNJ récurrents', () => {
  test('le MJ crée un PNJ public + un secret combattant ; le joueur ne voit que le public ; le MJ l’invoque en combat', async ({
    browser,
  }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — plan 28 skippé.');

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

      await dm.getByRole('button', { name: /Ouvrir/i }).first().click();
      await expect(dm.getByRole('heading', { name: CAMPAIGN_NAME })).toBeVisible();
      const cid = /\/campaigns\/([^/]+)$/.exec(dm.url())?.[1] ?? '';
      expect(cid.length).toBeGreaterThan(0);

      const codeNode = dm.locator('p[aria-label*="dicter ou copier"]');
      await expect(codeNode).toBeVisible();
      const inviteCode = ((await codeNode.textContent()) ?? '').trim();
      expect(inviteCode).toMatch(INVITE_CODE_PATTERN);

      const playerCtx = await newDesktopContext(browser);
      const player = await playerCtx.newPage();

      try {
        // ─── Joueur : seed fiche + rejoint.
        await player.goto('/');
        await waitForAppReady(player);
        await seedCharacter(player, fighterL3);
        await joinByCode(player, inviteCode);

        // ─── MJ : PNJ marchand PUBLIC.
        await dm.goto(`/campaigns/${cid}/npcs`);
        await waitForAppReady(dm);
        await dm.getByRole('button', { name: 'Nouveau PNJ' }).click();
        await expect(dm.getByRole('dialog')).toBeVisible();
        await dm.getByPlaceholder('Nom du personnage').fill(MERCHANT);
        await captureViewport(dm, '01-modale-creation-pnj.png');
        await dm.getByRole('button', { name: 'Enregistrer' }).click();
        await expect(dm.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });
        await expect(dm.getByRole('heading', { name: MERCHANT })).toBeVisible({
          timeout: 10_000,
        });

        // ─── MJ : PNJ ennemi SECRET + combattant (PV/CA + notes MJ).
        await dm.getByRole('button', { name: 'Nouveau PNJ' }).click();
        await expect(dm.getByRole('dialog')).toBeVisible();
        await dm.getByPlaceholder('Nom du personnage').fill(VILLAIN);
        await dm.getByRole('button', { name: 'Ennemi' }).click();
        await dm
          .getByPlaceholder(/Secrets, intentions/i)
          .fill(VILLAIN_DM_NOTE);
        await dm.getByRole('button', { name: 'Secret (MJ seul)' }).click();
        await dm.getByRole('checkbox').check();
        await dm.getByLabel('PV', { exact: true }).fill('30');
        await dm.getByLabel('CA', { exact: true }).fill('16');
        await dm.getByRole('button', { name: 'Enregistrer' }).click();
        await expect(dm.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });

        // L'annuaire MJ montre les DEUX, avec badge Secret sur Le Masque.
        await expect(dm.getByRole('heading', { name: VILLAIN })).toBeVisible({
          timeout: 10_000,
        });
        await expect(dm.getByText('Secret').first()).toBeVisible();
        await captureFull(dm, '02-annuaire-mj.png');

        // ─── Joueur : ne voit QUE le marchand public.
        await player.goto(`/campaigns/${cid}/npcs`);
        await waitForAppReady(player);
        await expect(player.getByRole('heading', { name: MERCHANT })).toBeVisible({
          timeout: 10_000,
        });
        await expect(player.getByRole('heading', { name: VILLAIN })).toHaveCount(0);
        await expect(player.getByText('Secret')).toHaveCount(0);
        await captureFull(player, '03-annuaire-joueur.png');

        // ─── MJ : détail du PNJ secret → sections RÉSERVÉES MJ visibles.
        await dm.getByRole('heading', { name: VILLAIN }).click();
        await expect(
          dm.getByRole('heading', { name: 'Le Masque', level: 1 }),
        ).toBeVisible({ timeout: 10_000 });
        await expect(dm.getByText('Notes du MJ')).toBeVisible();
        await expect(dm.getByText(VILLAIN_DM_NOTE)).toBeVisible();
        await expect(dm.getByText('Statistiques de combat')).toBeVisible();
        await captureFull(dm, '04-detail-mj-secret.png');

        // ─── MJ : invoque Le Masque dans une rencontre.
        await dm.goto(`/campaigns/${cid}/encounters`);
        await waitForAppReady(dm);
        await dm.getByRole('button', { name: 'Créer une rencontre' }).click();
        await expect(dm.getByRole('dialog')).toBeVisible();
        await dm.getByLabel('Nom de la rencontre').fill(ENCOUNTER_NAME);
        // La section PNJ liste les PNJ enregistrés ; on sélectionne Le Masque.
        const villainRow = dm.getByRole('dialog').locator('li', { hasText: VILLAIN });
        await villainRow.getByRole('checkbox').check();
        // PV préremplis depuis combatStats (30).
        await expect(villainRow.getByLabel(/PV/)).toHaveValue('30');
        await captureViewport(dm, '05-rencontre-ajout-pnj.png');
        await dm.getByRole('button', { name: 'Créer', exact: true }).click();
        await expect(dm.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });

        // La rencontre apparaît ; on l'ouvre → Le Masque est participant.
        await dm.getByRole('button', { name: new RegExp(ENCOUNTER_NAME) }).click();
        await expect(dm.getByText(VILLAIN).first()).toBeVisible({ timeout: 10_000 });
        await captureFull(dm, '06-combat-pnj-participant.png');
      } finally {
        await playerCtx.close();
      }
    } finally {
      await dmCtx.close();
    }
  });
});
