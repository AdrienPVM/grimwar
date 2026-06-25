import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import {
  fighterL3,
  seedCampaignMembership,
  seedCharacter,
  seedCharacterForUid,
} from './seed-character';

/**
 * UAT visuel — conteneur de page partagé (`<PageContainer>`).
 *
 * Le primitif unifie le wrapper répété sur ~10 écrans et fait s'élargir le
 * contenu sur écran large/TV (paliers `xl:` ≥1280px, `2xl:` ≥1536px) tout en
 * gardant EXACTEMENT la largeur historique du mobile au desktop standard.
 *
 * Ce qu'Adrien juge à l'œil (le mécanique — chaînes de largeur exactes par
 * palier — est figé par `page-container.test.tsx`) :
 *  1. Détail de campagne en 1920 (TV) : le contenu respire jusqu'à ~1320px
 *     centré, au lieu de rester bloqué à 860px avec deux marges vides géantes.
 *  2. Même écran en 390 (mobile) : INCHANGÉ, pleine largeur — aucune régression.
 *  3. Bibliothèque en 1920 : palier `wide` (~1360px).
 *  4. Liste des campagnes en 1920 : palier `xwide` (~1536px).
 *
 * Captures pleine page. Skip propre si l'émulateur n'est pas joignable.
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review/page-container-responsive');

function ensureDir(): void {
  mkdirSync(UAT_DIR, { recursive: true });
}

async function full(page: Page, name: string): Promise<void> {
  ensureDir();
  await page.screenshot({ path: path.join(UAT_DIR, name), fullPage: true });
}

test.describe('UAT — conteneur de page responsive', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(!ok, 'Émulateur Firestore non joignable — UAT conteneur responsive skippé.');
  });

  test('détail de campagne — TV 1920 puis mobile 390', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    await waitForAppReady(page);
    const { uid: gmUid } = await seedCharacter(page, fighterL3);
    const cid = `uatpc-camp-${gmUid}`;
    const playerUid = `uatpc-player-${gmUid}`;
    const playerCharId = await seedCharacterForUid(playerUid, fighterL3);
    await seedCampaignMembership({ campaignId: cid, gmUid, playerUid, charId: playerCharId });

    // TV — le contenu doit s'élargir et rester centré (palier `content` → 1320).
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`/campaigns/${cid}`);
    await waitForAppReady(page);
    await expect(
      page.getByRole('region', { name: /Membres de la campagne/i }),
    ).toBeVisible({ timeout: 15_000 });
    await full(page, '01-campagne-detail-tv-1920.png');

    // Mobile — pleine largeur, layout historique inchangé.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/campaigns/${cid}`);
    await waitForAppReady(page);
    await expect(
      page.getByRole('region', { name: /Membres de la campagne/i }),
    ).toBeVisible({ timeout: 15_000 });
    await full(page, '02-campagne-detail-mobile-390.png');
  });

  test('bibliothèque + liste campagnes — TV 1920', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    await waitForAppReady(page);
    const { uid: gmUid } = await seedCharacter(page, fighterL3);
    const cid = `uatpc-list-${gmUid}`;
    const playerUid = `uatpc-listplayer-${gmUid}`;
    const playerCharId = await seedCharacterForUid(playerUid, fighterL3);
    await seedCampaignMembership({ campaignId: cid, gmUid, playerUid, charId: playerCharId });

    // Bibliothèque (palier `wide` → 1360).
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await waitForAppReady(page);
    await expect(page.getByText(fighterL3.name).first()).toBeVisible({ timeout: 15_000 });
    await full(page, '03-bibliotheque-tv-1920.png');

    // Liste des campagnes (palier `xwide` → 1536).
    await page.goto('/campaigns');
    await waitForAppReady(page);
    await page.waitForTimeout(400);
    await full(page, '04-campagnes-liste-tv-1920.png');
  });
});
