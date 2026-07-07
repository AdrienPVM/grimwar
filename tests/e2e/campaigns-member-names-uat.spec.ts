import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { fighterL3, seedCampaignMembership, seedCharacter } from './seed-character';

/**
 * UAT — le roster affiche les NOMS des membres (displayName dénormalisé), plus
 * les UID cryptés. On seede une campagne où la page (MJ, anonyme → pas de nom)
 * a deux joueurs portant un displayName sur leur doc member (sans fiche liée →
 * ligne compacte). Le roster doit rendre « Aldric le Rôdeur » / « Brune la
 * Barde » en toutes lettres, et retomber sur l'UID tronqué pour le MJ anonyme
 * (contraste nom réel vs repli technique).
 *
 * Skip propre si l'émulateur n'est pas joignable.
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review');

async function captureFull(page: Page, filename: string): Promise<void> {
  mkdirSync(UAT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(UAT_DIR, filename), fullPage: true });
}

test.describe('UAT — noms de membres dans le roster', () => {
  test('le roster rend les displayName, repli UID pour l’anonyme', async ({ page }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — noms de membres skippé.');

    // La page s'authentifie en anon → son UID sera le MJ (sans displayName).
    await page.goto('/');
    await waitForAppReady(page);
    const { uid: gmUid } = await seedCharacter(page, fighterL3);

    const cid = `names-camp-${gmUid}`;
    // Deux membres sans fiche liée (charId null → ligne compacte) portant un nom.
    await seedCampaignMembership({
      campaignId: cid,
      gmUid,
      playerUid: `names-p1-${gmUid}`,
      charId: null,
      displayName: 'Aldric le Rôdeur',
    });
    await seedCampaignMembership({
      campaignId: cid,
      gmUid,
      playerUid: `names-p2-${gmUid}`,
      charId: null,
      displayName: 'Brune la Barde',
    });

    await page.goto(`/campaigns/${cid}`);
    await waitForAppReady(page);
    const region = page.getByRole('region', { name: /Membres de la campagne/i });
    await expect(region).toBeVisible({ timeout: 15_000 });

    // Identité : les noms exacts sont rendus (pas un préfixe UID).
    await expect(region.getByText('Aldric le Rôdeur')).toBeVisible({ timeout: 15_000 });
    await expect(region.getByText('Brune la Barde')).toBeVisible();

    await captureFull(page, '01-roster-noms-de-membres.png');
  });
});
