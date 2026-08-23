import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { seedCampaignEvent, seedEncounter } from './seed-character';

/**
 * UAT JALON 24.4 (steps 7b + 8) — hand-off des dégâts physiques + vue de groupe,
 * sur le tracker (`EncounterScreen`).
 *
 * On seede directement (Admin SDK) une rencontre ACTIVE riche : un PJ allié
 * (« Lyralei ») + 3 gobelins aux PV variés. Pendant le combat, la santé de tous
 * est portée par l'ordre d'initiative (source UNIQUE — plus de vue de groupe en
 * doublon, corrigé 2026-06-25). Puis on injecte deux events `roll` physiques (un
 * jet de dégâts + un jet d'attaque) posés par le joueur : le panneau de hand-off
 * apparaît côté MJ. Le MJ choisit une cible (jamais le joueur) et applique les
 * dégâts ; l'event quitte le panneau.
 *
 * Plan UAT (captures `uat-review/jalon-24/24.4-suite/`) :
 *   01-combat-tracker.png     — tracker actif : ordre d'initiative + PV variés
 *   02-handoff-panneau.png    — panneau « Dégâts à appliquer » : ligne dégâts + ligne attaque
 *   03-handoff-cibles.png     — « Appliquer à… » déplié : chips de cibles (gobelins)
 *   04-handoff-applique.png    — après application : Gobelin 1 à 0/7 + panneau réduit à l'attaque
 *
 * Émulateur Firestore requis. Skip propre sans Java (pas de faux-vert).
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review/jalon-24/24.4-suite');

function ensureUatDir(): void {
  mkdirSync(UAT_DIR, { recursive: true });
}

async function captureFull(page: Page, filename: string): Promise<void> {
  ensureUatDir();
  await page.screenshot({ path: path.join(UAT_DIR, filename), fullPage: true });
}

test.describe('UAT 24.4 — hand-off dégâts + vue de groupe', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('seed combat actif → panneau hand-off → application sur une cible (émulateur requis)', async ({
    page,
  }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — captures 24.4-suite skippées.');

    // ─── Campagne (le créateur = MJ, requis pour lire/écrire la rencontre).
    await page.goto('/campaigns');
    await waitForAppReady(page);
    await page.getByRole('button', { name: /Créer une campagne/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel(/Nom de la campagne/i).fill('Le Gouffre aux Murmures');
    await page.getByRole('button', { name: /^Créer$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });

    await expect(page).toHaveURL(/\/campaigns\/[^/]+$/);
    const cid = page.url().match(/\/campaigns\/([^/]+)$/)?.[1];
    expect(cid, 'cid extractible de l’URL').toBeTruthy();

    // ─── Rencontre ACTIVE seedée : 1 PJ allié + 3 gobelins aux PV variés.
    const { encounterId } = await seedEncounter(cid!, {
      name: 'Embuscade au Gouffre',
      status: 'active',
      round: 1,
      turnIndex: 0,
      participants: [
        {
          type: 'player',
          characterId: 'char-lyralei',
          instanceId: 'inst-lyralei',
          name: 'Lyralei',
          initiative: 17,
          currentHp: 14,
          maxHp: 20,
        },
        { type: 'monster', instanceId: 'inst-gob1', name: 'Gobelin 1', initiative: 12, currentHp: 5, maxHp: 7 },
        { type: 'monster', instanceId: 'inst-gob2', name: 'Gobelin 2', initiative: 9, currentHp: 7, maxHp: 7 },
        {
          type: 'monster',
          instanceId: 'inst-gob3',
          name: 'Gobelin 3',
          initiative: 6,
          currentHp: 2,
          maxHp: 7,
          conditions: ['poisoned'],
        },
      ],
    });

    await page.goto(`/campaigns/${cid}/encounters/${encounterId}`);
    await waitForAppReady(page);
    await expect(page.getByText('En cours', { exact: true })).toBeVisible({ timeout: 10_000 });

    // ─── 01 — Combat actif : l'ordre d'initiative porte la santé de TOUS (source
    // unique ; aucune vue de groupe en doublon pendant le combat — 2026-06-25).
    const order = page.getByRole('list', { name: /Ordre d.initiative/i });
    await expect(order.getByText('Lyralei')).toBeVisible();
    await expect(order.getByText('14/20')).toBeVisible();
    await captureFull(page, '01-combat-tracker.png');

    // ─── Le joueur a lancé physiquement : un jet de dégâts + un jet d'attaque.
    await seedCampaignEvent(cid!, {
      kind: 'roll',
      actorUserId: 'uid-lyralei',
      actorCharacterId: 'char-lyralei',
      payload: { label: 'Arc long', rollKind: 'attack', mode: 'physical', total: 17 },
      visibility: 'all',
    });
    await seedCampaignEvent(cid!, {
      kind: 'roll',
      actorUserId: 'uid-lyralei',
      actorCharacterId: 'char-lyralei',
      payload: { label: 'Épée longue', rollKind: 'damage', mode: 'physical', total: 11 },
      visibility: 'all',
    });

    // ─── 02 — Le panneau de hand-off apparaît (live, onSnapshot).
    // M4 : le panneau n'est plus réservé au mode physique — son libellé non plus.
    const handoff = page.getByRole('region', { name: 'Dégâts à appliquer' });
    await expect(handoff).toBeVisible({ timeout: 10_000 });
    await expect(handoff.getByText('11 dégâts')).toBeVisible();
    await expect(handoff.getByText('Att 17')).toBeVisible();
    await expect(handoff.getByText('Lyralei').first()).toBeVisible();
    await captureFull(page, '02-handoff-panneau.png');

    // ─── 03 — « Appliquer à… » déplie les cibles (jamais le joueur ne cible).
    await handoff.getByRole('button', { name: 'Appliquer à…' }).click();
    await expect(handoff.getByRole('button', { name: 'Gobelin 1' })).toBeVisible();
    await captureFull(page, '03-handoff-cibles.png');

    // ─── 04 — Applique 11 dégâts à Gobelin 1 (5 → 0, clamp). L'ordre d'initiative
    // reflète 0/7 et l'event de dégâts quitte le panneau (reste l'attaque).
    await handoff.getByRole('button', { name: 'Gobelin 1' }).click();
    await expect(order.getByText('0/7')).toBeVisible({ timeout: 10_000 });
    await expect(handoff.getByText('11 dégâts')).toHaveCount(0);
    await expect(handoff.getByText('Att 17')).toBeVisible();
    await captureFull(page, '04-handoff-applique.png');
  });
});
