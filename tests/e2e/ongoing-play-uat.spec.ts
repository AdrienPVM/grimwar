import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import {
  fighterL3,
  seedCampaignMembership,
  seedCharacter,
  seedEncounter,
  seedSession,
} from './seed-character';

/**
 * UAT + garde-fou — bandeau « En cours » de l'accueil.
 *
 * Ce que ça prouve : depuis l'accueil, une partie ouverte est atteignable EN UN
 * TAP. Avant, rejoindre le combat en cours demandait accueil → Campagnes → la
 * campagne → Rencontres → la bonne ligne : quatre écrans, à la table, pendant
 * que les autres attendent le tour (défaut le plus structurant de
 * `docs/plans/UX-AUDIT-2026-08.md`).
 *
 * On teste la DESTINATION, pas seulement la présence du bandeau : un raccourci
 * qui s'affiche mais mène au mauvais écran serait vert et inutile.
 *
 * Pré-requis : émulateur Firebase (`pnpm e2e:emulators`, Java 11+).
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review');

async function goHome(page: Page): Promise<void> {
  await page.goto('/');
  await waitForAppReady(page);
}

test.describe('UAT — bandeau « En cours » (reprise de table)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable — start it via `pnpm e2e:emulators` (requires Java/JRE 11+). UAT skipped.',
    );
    mkdirSync(UAT_DIR, { recursive: true });
  });

  test('hors partie, l’accueil ne porte aucun bandeau', async ({ page }) => {
    await goHome(page);
    await seedCharacter(page, fighterL3);
    await goHome(page);
    // Le cas nominal est « rien en cours » : l'accueil ne doit pas s'encombrer
    // d'une carte « aucune partie en cours ».
    await expect(page.getByText('En cours', { exact: true })).toHaveCount(0);
  });

  test('séance ouverte → un tap depuis l’accueil mène à la séance', async ({ page }) => {
    await goHome(page);
    const { uid, charId } = await seedCharacter(page, fighterL3);
    const cid = `uat-ongoing-session-${uid}`;
    await seedCampaignMembership({
      campaignId: cid,
      gmUid: `gm-${uid}`,
      playerUid: uid,
      charId,
      displayName: 'Adrien',
    });
    const { sessionId } = await seedSession(cid, {
      number: 7,
      title: 'Le pont de sel',
      status: 'active',
    });

    await goHome(page);
    const banner = page.getByRole('link', { name: /Reprendre/i });
    await expect(banner).toBeVisible();
    // Identité du contenu : le titre ET le numéro exacts de la séance ouverte.
    await expect(page.getByText('Le pont de sel')).toBeVisible();
    await expect(page.getByText(/Séance 7/)).toBeVisible();

    writeFileSync(
      path.join(UAT_DIR, '01-en-cours-seance-accueil.png'),
      await page.screenshot({ fullPage: true, animations: 'disabled' }),
    );

    await banner.click();
    await expect(page).toHaveURL(new RegExp(`/campaigns/${cid}/sessions/${sessionId}$`));
  });

  test('combat ouvert → le bandeau mène AU COMBAT, pas à la séance', async ({ page }) => {
    await goHome(page);
    const { uid, charId } = await seedCharacter(page, fighterL3);
    const cid = `uat-ongoing-fight-${uid}`;
    await seedCampaignMembership({
      campaignId: cid,
      gmUid: `gm-${uid}`,
      playerUid: uid,
      charId,
      displayName: 'Adrien',
    });
    // Les DEUX sont ouverts : c'est le cas qui départage la règle de priorité.
    await seedSession(cid, { number: 8, title: 'La crypte', status: 'active' });
    const { encounterId } = await seedEncounter(cid, {
      name: 'Embuscade gobeline',
      status: 'active',
      round: 2,
      participants: [
        {
          type: 'player',
          characterId: charId,
          instanceId: 'p1',
          name: 'Sigrid',
          currentHp: 22,
          maxHp: 28,
          initiative: 14,
        },
        {
          type: 'monster',
          instanceId: 'm1',
          name: 'Gobelin',
          currentHp: 7,
          maxHp: 7,
          initiative: 11,
        },
      ],
    });

    await goHome(page);
    await expect(page.getByText('Embuscade gobeline')).toBeVisible();
    await expect(page.getByText(/En cours · Combat/)).toBeVisible();
    await expect(page.getByText(/Manche 2/)).toBeVisible();

    writeFileSync(
      path.join(UAT_DIR, '02-en-cours-combat-accueil.png'),
      await page.screenshot({ fullPage: true, animations: 'disabled' }),
    );

    await page.getByRole('link', { name: /Reprendre/i }).click();
    await expect(page).toHaveURL(
      new RegExp(`/campaigns/${cid}/encounters/${encounterId}$`),
    );
  });
});
