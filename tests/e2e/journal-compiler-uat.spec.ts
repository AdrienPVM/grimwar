import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { seedCampaignEvent, seedSession } from './seed-character';

/**
 * UAT JALON 25.2 (plan 25, step 11) — compilateur de journal de séance.
 *
 * On seede (Admin SDK) une séance ACTIVE + ~6 événements tagués `sessionId`
 * (cycle de séance + un petit combat). Le MJ ouvre l'onglet Journal, compile, et
 * la narration FR s'affiche : sections « ## Exploration » / « ## Combat — {nom} »,
 * lignes de prose (tour, dégâts monstre), pied d'issue « victoire ». La query
 * `listSessionEvents` + la compilation passent par les VRAIES rules de
 * l'émulateur (read events `all`/`dm` MJ, update session `isDMOf`).
 *
 * Plan UAT (captures `uat-review/jalon-25/25.2/`) :
 *   01-journal-vide.png      — onglet Journal avant compilation (état vide MJ + bouton)
 *   02-journal-compile.png   — après « Compiler » : narration rendue (sections + puces)
 *
 * Émulateur Firestore requis. Skip propre sans Java (pas de faux-vert).
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review/jalon-25/25.2');

function ensureUatDir(): void {
  mkdirSync(UAT_DIR, { recursive: true });
}

async function captureFull(page: Page, filename: string): Promise<void> {
  ensureUatDir();
  await page.screenshot({ path: path.join(UAT_DIR, filename), fullPage: true });
}

test.describe('UAT 25.2 — compilateur de journal de séance', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('seed séance + events → onglet Journal → compiler → narration (émulateur requis)', async ({
    page,
  }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — captures 25.2 skippées.');

    // ─── Campagne (le créateur = MJ).
    await page.goto('/campaigns');
    await waitForAppReady(page);
    await page.getByRole('button', { name: /Créer une campagne/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel(/Nom de la campagne/i).fill('Les Cendres de Valdûn');
    await page.getByRole('button', { name: /^Créer$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });

    await page.getByRole('button', { name: /Ouvrir/i }).first().click();
    await expect(page).toHaveURL(/\/campaigns\/[^/]+$/);
    const cid = page.url().match(/\/campaigns\/([^/]+)$/)?.[1];
    expect(cid, 'cid extractible de l’URL').toBeTruthy();

    // ─── Séance active seedée.
    const { sessionId } = await seedSession(cid!, {
      number: 4,
      title: 'La crypte oubliée',
      status: 'active',
    });

    // ─── ~6 événements tagués `sessionId` : ouverture, un combat complet, fin.
    await seedCampaignEvent(cid!, {
      kind: 'session-start',
      actorUserId: 'uid-gm',
      sessionId,
      payload: { sessionNumber: 4, title: 'La crypte oubliée' },
      visibility: 'all',
    });
    await seedCampaignEvent(cid!, {
      kind: 'encounter-start',
      actorUserId: 'uid-gm',
      sessionId,
      encounterId: 'enc-1',
      payload: { name: 'Les gobelins de la crypte', participantCount: 3 },
      visibility: 'all',
    });
    await seedCampaignEvent(cid!, {
      kind: 'turn-start',
      actorUserId: 'uid-gm',
      sessionId,
      encounterId: 'enc-1',
      payload: { participantId: 'inst-gob1', participantName: 'Gobelin 1', round: 1 },
      visibility: 'all',
    });
    await seedCampaignEvent(cid!, {
      kind: 'monster-hp-change',
      actorUserId: 'uid-gm',
      sessionId,
      encounterId: 'enc-1',
      payload: { monsterInstanceId: 'inst-gob1', monsterName: 'Gobelin 1', before: 7, after: 0, delta: -7 },
      visibility: 'dm',
    });
    await seedCampaignEvent(cid!, {
      kind: 'encounter-end',
      actorUserId: 'uid-gm',
      sessionId,
      encounterId: 'enc-1',
      payload: { name: 'Les gobelins de la crypte', outcome: 'victory' },
      visibility: 'all',
    });
    await seedCampaignEvent(cid!, {
      kind: 'session-end',
      actorUserId: 'uid-gm',
      sessionId,
      payload: { sessionNumber: 4, title: 'La crypte oubliée' },
      visibility: 'all',
    });

    // ─── Onglet Journal de la séance.
    await page.goto(`/campaigns/${cid}/sessions/${sessionId}`);
    await waitForAppReady(page);
    await expect(page.getByRole('heading', { name: 'La crypte oubliée' })).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole('tab', { name: 'Journal' }).click();

    // ─── 01 — État vide MJ + bouton « Compiler le journal ».
    const compileBtn = page.getByRole('button', { name: 'Compiler le journal' });
    await expect(compileBtn).toBeVisible();
    await captureFull(page, '01-journal-vide.png');

    // ─── 02 — Compile → narration rendue (sections + lignes + issue).
    await compileBtn.click();
    await expect(page.getByRole('heading', { level: 2, name: /Combat — Les gobelins de la crypte/ })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText('Gobelin 1', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Issue : victoire.')).toBeVisible();
    // L'ouverture (session-start) et la clôture (session-end) bracketent le
    // combat → deux phases « Exploration » distinctes (avant / après le combat).
    await expect(page.getByRole('heading', { level: 2, name: 'Exploration' }).first()).toBeVisible();
    await expect(page.getByText('La séance 4 — « La crypte oubliée » — commence.')).toBeVisible();
    await expect(page.getByText('La séance 4 — « La crypte oubliée » — se termine.')).toBeVisible();
    await captureFull(page, '02-journal-compile.png');
  });
});
