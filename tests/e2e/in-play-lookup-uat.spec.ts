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

/**
 * Le seul projet Playwright est un Pixel 7 : sans redimensionnement explicite,
 * TOUTES les captures seraient mobiles. Or le gabarit `xl` du Codex (1000 px)
 * et la barre à trois boutons de la rencontre sont des enjeux desktop.
 */
const DESKTOP = { width: 1440, height: 900 } as const;
const MOBILE = { width: 375, height: 812 } as const;

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

/**
 * L'onglet actif est-il réellement DANS la zone visible de sa rangée ?
 *
 * Le Codex s'ouvre désormais sur une catégorie éloignée (États = 10ᵉ onglet,
 * Bestiaire = 4ᵉ). Sur une rangée qui défile horizontalement, l'onglet actif
 * arrivait hors-champ : on voyait la liste des états sous « Sorts · Objets
 * magiques · Équi… », sans aucun moyen de savoir quelle catégorie était active.
 *
 * Une assertion de classe CSS ne prouverait rien ici — on mesure les boîtes.
 */
async function expectActiveTabVisible(page: Page, dialogName: string): Promise<void> {
  const dialog = page.getByRole('dialog', { name: dialogName });
  const nav = dialog.getByRole('tablist');
  const activeTab = dialog.locator('[role="tab"][aria-selected="true"]');
  const navBox = await nav.boundingBox();
  const tabBox = await activeTab.boundingBox();
  if (!navBox || !tabBox) throw new Error('rangée ou onglet actif sans boîte mesurable');
  expect(tabBox.x).toBeGreaterThanOrEqual(navBox.x - 1);
  expect(tabBox.x + tabBox.width).toBeLessThanOrEqual(navBox.x + navBox.width + 1);
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
    await captureViewport(page, '03-fab-wedge-codex-mobile.png');

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

    // L'onglet d'arrivée (11ᵉ sur 11) doit être VISIBLE, pas juste sélectionné.
    await expectActiveTabVisible(page, 'Le Codex');

    // Mobile : le ressenti d'ancrage bas (bottom-sheet) ne se lit qu'en viewport.
    await captureViewport(page, '04-codex-sur-fiche-mobile-overlay.png');

    // Desktop : c'est là que se juge la largeur du gabarit `xl`.
    await page.setViewportSize(DESKTOP);
    await expect(codex).toBeVisible();
    await captureFull(page, '05-codex-sur-fiche-desktop-pleine-page.png');
    await captureViewport(page, '06-codex-sur-fiche-desktop-overlay.png');
  });

  test('Échap sur un détail ouvert depuis le Codex ne ferme QUE le détail', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
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
    await captureViewport(page, '07-detail-etat-sur-codex-desktop.png');

    // Le point du fix : Échap ne prend QUE la modale du dessus.
    await page.keyboard.press('Escape');
    await expect(dialogs).toHaveCount(1);
    await expect(codex).toBeVisible();

    // Deuxième Échap : le Codex se ferme, la fiche revient.
    await page.keyboard.press('Escape');
    await expect(codex).toHaveCount(0);
  });

  test('rencontre — Codex sur les États et compagnie, par-dessus le tracker', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
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
    await captureFull(page, '08-rencontre-barre-outils-desktop.png');

    // ─── Codex, ouvert sur les États (le bestiaire est vide à ce jour).
    await page.getByRole('button', { name: 'Codex', exact: true }).click();
    const codex = page.getByRole('dialog', { name: 'Le Codex' });
    await expect(codex).toBeVisible();
    await expect(codex.getByRole('tab', { name: /États/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    // Et la catégorie d'arrivée n'est pas un cul-de-sac : elle a du contenu.
    // (« RÉSULTATS » n'est capitalisé que par CSS — le DOM porte des minuscules.)
    await expect(codex.getByText(/résultats/)).toContainText('15');
    // Le tracker n'a pas été démonté.
    await expect(page.getByText('Gobelin').first()).toBeAttached();
    await expectActiveTabVisible(page, 'Le Codex');
    await captureViewport(page, '09-codex-sur-rencontre-desktop-overlay.png');
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

    // Une seule capture ici : la modale verrouille le scroll et le document de
    // la rencontre tient dans le viewport desktop, donc `fullPage` et viewport
    // rendent une image identique — la double capture « modale » n'apporterait
    // qu'un doublon à l'octet près dans la galerie d'UAT.
    await captureFull(page, '10-compagnie-sur-rencontre-overlay.png');
  });

  test('mobile 375 — la barre de la rencontre tient, le Codex s’ancre en bas', async ({
    page,
  }) => {
    await page.setViewportSize(MOBILE);
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
    await captureFull(page, '11-rencontre-barre-mobile-375.png');

    await page.getByRole('button', { name: 'Codex', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Le Codex' })).toBeVisible();
    await expectActiveTabVisible(page, 'Le Codex');
    await captureViewport(page, '12-codex-mobile-375-overlay.png');
  });
});
