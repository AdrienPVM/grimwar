import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import {
  fighterL3,
  seedCampaignMembership,
  seedCharacter,
  seedCharacterForUid,
  seedEncounter,
} from './seed-character';

/**
 * UAT + garde-fou — consulter SANS quitter la partie (audit UX, E6 + E7).
 *
 * Ce que ça prouve, et que les tests unitaires ne peuvent pas prouver :
 *  - le Codex s'ouvre PAR-DESSUS l'écran de jeu, qui reste monté derrière ;
 *  - une modale de détail ouverte DEPUIS le Codex se ferme seule sur Échap —
 *    le vrai chemin d'imbrication, contre le primitif seul en unitaire ;
 *  - la barre de la rencontre tient sur un écran de 375 px.
 *
 * Avant ce lot : la règle d'un état coûtait 4 à 5 gestes depuis la fiche (J9),
 * autant depuis la rencontre (M6), et la fiche d'un joueur en plein tour de jeu
 * en coûtait 4 (M5) — chaque fois en quittant l'écran de jeu.
 *
 * Pré-requis : émulateur Firebase (`pnpm e2e:emulators`, Java 11+).
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review');

async function captureFull(page: Page, name: string): Promise<void> {
  writeFileSync(
    path.join(UAT_DIR, name),
    await page.screenshot({ fullPage: true, animations: 'disabled' }),
  );
}

/**
 * Seconde capture pour les modales : `fullPage` reprojette la modale dans le
 * flux du document et efface le ressenti d'overlay (backdrop, ancrage
 * bottom-sheet mobile, stacking). La viewport le restitue.
 */
async function captureViewport(page: Page, name: string): Promise<void> {
  writeFileSync(
    path.join(UAT_DIR, name),
    await page.screenshot({ animations: 'disabled' }),
  );
}

test.describe('UAT — consulter sans quitter la partie (E6 + E7)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable — start it via `pnpm e2e:emulators` (requires Java/JRE 11+). UAT skipped.',
    );
    mkdirSync(UAT_DIR, { recursive: true });
  });

  test('fiche — le FAB ouvre le Codex sur les États, la fiche reste derrière', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, fighterL3);

    await page.goto(`/character/${charId}`);
    await waitForAppReady(page);

    await page.getByRole('button', { name: "Ouvrir le menu d'action" }).click();
    const codexWedge = page.getByRole('button', { name: 'Codex', exact: true });
    await expect(codexWedge).toBeVisible();
    await captureViewport(page, '30-fab-wedge-codex.png');

    await codexWedge.click();

    const codex = page.getByRole('dialog', { name: 'Le Codex' });
    await expect(codex).toBeVisible();
    // Identité de la catégorie d'arrivée : les États, pas les sorts.
    await expect(codex.getByRole('tab', { name: /États/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    // La fiche est TOUJOURS montée derrière — c'est tout l'intérêt.
    await expect(page.getByText(fighterL3.name).first()).toBeAttached();

    await captureFull(page, '31-codex-sur-fiche-pleine-page.png');
    await captureViewport(page, '32-codex-sur-fiche-overlay.png');
  });

  test('Échap sur un détail ouvert depuis le Codex ne ferme QUE le détail', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, fighterL3);

    await page.goto(`/character/${charId}`);
    await waitForAppReady(page);
    await page.getByRole('button', { name: "Ouvrir le menu d'action" }).click();
    await page.getByRole('button', { name: 'Codex', exact: true }).click();

    const codex = page.getByRole('dialog', { name: 'Le Codex' });
    await expect(codex).toBeVisible();

    // Ouvre le détail du premier état listé → deux modales empilées.
    await codex.getByRole('button', { name: /À terre/ }).first().click();
    const dialogs = page.getByRole('dialog');
    await expect(dialogs).toHaveCount(2);
    await captureViewport(page, '33-detail-etat-sur-codex.png');

    // Le point du fix : Échap ne prend QUE la modale du dessus.
    await page.keyboard.press('Escape');
    await expect(dialogs).toHaveCount(1);
    await expect(codex).toBeVisible();

    // Deuxième Échap : le Codex se ferme, la fiche revient.
    await page.keyboard.press('Escape');
    await expect(codex).toHaveCount(0);
  });

  test('rencontre — Codex sur le bestiaire et compagnie, par-dessus le tracker', async ({
    page,
  }) => {
    // La page s'authentifie en anonyme → son UID est le MJ de la campagne.
    await page.goto('/');
    await waitForAppReady(page);
    const { uid: gmUid } = await seedCharacter(page, fighterL3);

    const cid = `inplay-camp-${gmUid}`;
    const playerUid = `inplay-player-${gmUid}`;
    const playerCharId = await seedCharacterForUid(playerUid, fighterL3);
    await seedCampaignMembership({
      campaignId: cid,
      gmUid,
      playerUid,
      charId: playerCharId,
      displayName: 'Lyralei',
    });
    const { encounterId } = await seedEncounter(cid, {
      name: 'Embuscade gobeline',
      status: 'active',
      round: 2,
      participants: [
        {
          type: 'player',
          characterId: playerCharId,
          instanceId: 'p1',
          name: 'Lyralei',
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

    await page.goto(`/campaigns/${cid}/encounters/${encounterId}`);
    await waitForAppReady(page);
    await expect(page.getByText('Embuscade gobeline')).toBeVisible({ timeout: 15_000 });
    await captureFull(page, '34-rencontre-barre-outils.png');

    // ─── Codex, ouvert sur le bestiaire.
    await page.getByRole('button', { name: 'Codex', exact: true }).click();
    const codex = page.getByRole('dialog', { name: 'Le Codex' });
    await expect(codex).toBeVisible();
    await expect(codex.getByRole('tab', { name: /Bestiaire/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    // Le tracker n'a pas été démonté.
    await expect(page.getByText('Gobelin').first()).toBeAttached();
    await captureViewport(page, '35-codex-sur-rencontre-overlay.png');
    await page.keyboard.press('Escape');
    await expect(codex).toHaveCount(0);

    // ─── La compagnie, avec la carte live du joueur lié (lecture MJ, rule A2).
    await page.getByRole('button', { name: 'La compagnie' }).click();
    const roster = page.getByRole('dialog', { name: 'La compagnie' });
    await expect(roster).toBeVisible();
    // Identité : le nom du joueur ET ses PV réels, pas une simple présence.
    await expect(roster.getByText('28 / 28')).toBeVisible({ timeout: 15_000 });
    // L'administration de table n'a rien à faire ici.
    await expect(roster.getByRole('button', { name: /Promouvoir/ })).toHaveCount(0);

    await captureFull(page, '36-compagnie-sur-rencontre-pleine-page.png');
    await captureViewport(page, '37-compagnie-sur-rencontre-overlay.png');
  });

  test('mobile 375 — la barre de la rencontre tient, le Codex s’ancre en bas', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await waitForAppReady(page);
    const { uid: gmUid } = await seedCharacter(page, fighterL3);

    const cid = `inplay-mob-${gmUid}`;
    const { encounterId } = await seedEncounter(cid, {
      name: 'Embuscade gobeline',
      status: 'active',
      round: 2,
      participants: [
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
    await seedCampaignMembership({
      campaignId: cid,
      gmUid,
      playerUid: `inplay-mob-p-${gmUid}`,
      charId: null,
      displayName: 'Brann',
    });

    await page.goto(`/campaigns/${cid}/encounters/${encounterId}`);
    await waitForAppReady(page);
    await expect(page.getByText('Embuscade gobeline')).toBeVisible({ timeout: 15_000 });

    // Les 3 boutons de la barre tiennent dans la largeur, sans débordement.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await captureFull(page, '38-rencontre-barre-mobile.png');

    await page.getByRole('button', { name: 'Codex', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Le Codex' })).toBeVisible();
    await captureViewport(page, '39-codex-mobile-overlay.png');
  });
});
