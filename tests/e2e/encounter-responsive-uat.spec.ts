import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { seedEncounter } from './seed-character';

/**
 * UAT design — écran de combat RESPONSIVE (mobile / desktop / TV).
 *
 * L'écran de combat (`EncounterScreen`) était figé à `max-w-[860px]` centré avec
 * une strip d'ordre d'initiative en scroll horizontal de cartes 160px : illisible
 * de loin sur une TV au milieu de la table, et gâchant ~60 % d'un écran 1440px+.
 *
 * Cette passe élargit le conteneur (`xl:max-w-[1080px]` / `2xl:max-w-[1320px]`),
 * fait passer la strip en grille qui s'enroule à `lg:` (fini le scroll horizontal
 * quand il y a la place) et agrandit cartes / PV / noms à `lg:` pour la lisibilité
 * à distance. Le mobile est inchangé (toutes les bumps sont gated `lg:`+).
 *
 * On seede un combat ACTIF riche (1 PJ + 6 monstres aux PV variés) et on capture
 * le MÊME état à trois largeurs pour valider la dégradation gracieuse :
 *   01-mobile-combat.png   — 390px : strip en scroll horizontal, cartes compactes
 *   02-desktop-combat.png  — 1440px : conteneur élargi, strip enroulée, cartes lisibles
 *   03-tv-combat.png       — 1920px : conteneur 2xl, exploite toute la largeur (TV)
 *
 * Émulateur Firestore requis. Skip propre sans Java (pas de faux-vert).
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review/design-combat-responsive');

function ensureUatDir(): void {
  mkdirSync(UAT_DIR, { recursive: true });
}

async function captureFull(page: Page, filename: string): Promise<void> {
  ensureUatDir();
  await page.screenshot({ path: path.join(UAT_DIR, filename), fullPage: true });
}

test.describe('UAT design — écran de combat responsive', () => {
  // Viewport de départ « desktop » ; on bascule explicitement par capture.
  test.use({ viewport: { width: 1440, height: 900 } });

  test('combat actif riche capturé en mobile / desktop / TV (émulateur requis)', async ({
    page,
  }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — captures responsive skippées.');

    // ─── Campagne (le créateur = MJ, requis pour lire/écrire la rencontre).
    await page.goto('/campaigns');
    await waitForAppReady(page);
    await page.getByRole('button', { name: /Créer une campagne/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel(/Nom de la campagne/i).fill('La Crypte des Échos');
    await page.getByRole('button', { name: /^Créer$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });

    await page.getByRole('button', { name: /Ouvrir/i }).first().click();
    await expect(page).toHaveURL(/\/campaigns\/[^/]+$/);
    const cid = page.url().match(/\/campaigns\/([^/]+)$/)?.[1];
    expect(cid, 'cid extractible de l’URL').toBeTruthy();

    // ─── Rencontre ACTIVE seedée : 1 PJ + 6 monstres aux PV variés, init posées
    // (la strip d'ordre n'apparaît qu'une fois l'initiative lancée). Assez de
    // cartes pour montrer l'enroulement à lg+ vs le scroll horizontal en mobile.
    const { encounterId } = await seedEncounter(cid!, {
      name: 'Assaut de la Crypte',
      status: 'active',
      round: 2,
      turnIndex: 0,
      participants: [
        {
          type: 'player',
          characterId: 'char-lyralei',
          instanceId: 'inst-lyralei',
          name: 'Lyralei',
          initiative: 19,
          currentHp: 24,
          maxHp: 30,
        },
        { type: 'monster', instanceId: 'inst-gob1', name: 'Gobelin', initiative: 16, currentHp: 5, maxHp: 7 },
        {
          type: 'monster',
          instanceId: 'inst-gob2',
          name: 'Hobgobelin',
          initiative: 14,
          currentHp: 11,
          maxHp: 11,
        },
        {
          type: 'monster',
          instanceId: 'inst-worg',
          name: 'Worg',
          initiative: 12,
          currentHp: 9,
          maxHp: 26,
          conditions: ['prone'],
        },
        {
          type: 'monster',
          instanceId: 'inst-ogre',
          name: 'Ogre',
          initiative: 8,
          currentHp: 18,
          maxHp: 59,
          conditions: ['poisoned'],
        },
        {
          type: 'npc',
          instanceId: 'inst-cultiste',
          name: 'Cultiste sombre',
          initiative: 7,
          currentHp: 6,
          maxHp: 9,
        },
        { type: 'monster', instanceId: 'inst-rat', name: 'Nuée de rats', initiative: 3, currentHp: 22, maxHp: 24 },
      ],
    });

    await page.goto(`/campaigns/${cid}/encounters/${encounterId}`);
    await waitForAppReady(page);
    await expect(page.getByText('En cours', { exact: true })).toBeVisible({ timeout: 10_000 });

    // Pendant le combat, l'ordre d'initiative est la source UNIQUE de la santé
    // (plus de vue de groupe en doublon — corrigé 2026-06-25). On vérifie sa
    // présence ET sa lisibilité (noms + PV) à TOUTES les largeurs (non-régression
    // structurelle de la dégradation responsive).
    const order = page.getByRole('list', { name: /Ordre d.initiative/i });

    // ─── 01 — Mobile (390px) : strip en scroll horizontal, mise en page compacte.
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(order).toBeVisible();
    await expect(order.getByText('Ogre')).toBeVisible();
    await captureFull(page, '01-mobile-combat.png');

    // ─── 02 — Desktop (1440px) : conteneur élargi, strip enroulée, cartes lisibles.
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(order).toBeVisible();
    await expect(order.getByText('24/30')).toBeVisible();
    await captureFull(page, '02-desktop-combat.png');

    // ─── 03 — TV (1920px) : conteneur 2xl, exploite toute la largeur.
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(order).toBeVisible();
    await expect(order.getByText('Ogre')).toBeVisible();
    await captureFull(page, '03-tv-combat.png');
  });
});
