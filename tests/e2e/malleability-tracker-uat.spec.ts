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
 * UAT — M2, M3, M5 et M7 de `plans/AUDIT-MALLEABILITE-2026-08.md` : le tracker
 * de combat devient éditable et réparable.
 *
 * Ce que ces captures montrent et que les tests unitaires ne montrent pas : la
 * PLACE que prennent les nouveaux contrôles dans une modale déjà dense, et si
 * un geste destructeur (retirer, supprimer) se distingue assez d'un geste
 * courant.
 *
 * Ce qui est prouvé mécaniquement ailleurs (et donc PAS à vérifier à l'œil) :
 * le réalignement du tour après un tri ou un retrait, le reclamp des PV
 * courants sous un nouveau maximum, l'absorption par les PV temporaires, le
 * refus de rouvrir quand un autre combat tourne, l'unicité des `instanceId`.
 *
 * Pré-requis : émulateur Firebase (`pnpm e2e:emulators`, Java 11+).
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review');
const DESKTOP = { width: 1440, height: 900 } as const;

async function captureFull(page: Page, name: string): Promise<void> {
  writeFileSync(
    path.join(UAT_DIR, name),
    await page.screenshot({ fullPage: true, animations: 'disabled' }),
  );
}

/** Capture viewport — restitue le ressenti d'overlay d'une modale ouverte. */
async function captureViewport(page: Page, name: string): Promise<void> {
  writeFileSync(path.join(UAT_DIR, name), await page.screenshot({ animations: 'disabled' }));
}

/**
 * Capture le contenu EXHAUSTIF d'une modale.
 *
 * `fullPage: true` ne suffit pas ici : le panneau de `DetailModal` est en
 * `max-h-[90vh] overflow-y-auto` et le scroll de la page est bloqué pendant
 * qu'une modale est ouverte — Playwright étend le viewport à la hauteur du
 * `<html>`, pas à celle d'un conteneur scrollé indépendamment, et rendrait donc
 * une capture tronquée *silencieusement* (elle sortait byte-identique à la
 * viewport). On agrandit temporairement le viewport : `90vh` suit, la modale
 * tient sans scroll interne, et on restaure ensuite.
 */
async function captureTallModal(page: Page, name: string): Promise<void> {
  await page.setViewportSize({ width: DESKTOP.width, height: 2200 });
  writeFileSync(path.join(UAT_DIR, name), await page.screenshot({ animations: 'disabled' }));
  await page.setViewportSize({ ...DESKTOP });
}

async function createCampaign(page: Page, name: string): Promise<string> {
  await page.goto('/campaigns');
  await waitForAppReady(page);
  await page.getByRole('button', { name: /Créer une campagne/i }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel(/Nom de la campagne/i).fill(name);
  await page.getByRole('button', { name: /^Créer$/ }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });
  await expect(page).toHaveURL(/\/campaigns\/[^/]+$/);
  const cid = page.url().match(/\/campaigns\/([^/]+)$/)?.[1];
  expect(cid, 'cid extractible de l’URL').toBeTruthy();
  return cid as string;
}

test.describe('UAT — le tracker devient éditable et réparable', () => {
  test.use({ viewport: DESKTOP });

  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Émulateur Firestore non joignable — démarrer `pnpm e2e:emulators` (Java 11+). UAT skippé.',
    );
    mkdirSync(UAT_DIR, { recursive: true });
  });

  test('un combattant se corrige, un renfort entre, un tour se rejoue', async ({ page }) => {
    const cid = await createCampaign(page, 'La Marche des Cendres');
    const { encounterId } = await seedEncounter(cid, {
      name: 'Le guet-apens du col',
      status: 'active',
      round: 3,
      turnIndex: 1,
      participants: [
        {
          type: 'monster',
          instanceId: 'inst-gob-1',
          name: 'Gobelin 2',
          initiative: 15,
          currentHp: 7,
          maxHp: 7,
        },
        {
          type: 'monster',
          instanceId: 'inst-gob-2',
          name: 'Gobelin 3',
          initiative: 9,
          currentHp: 4,
          maxHp: 7,
        },
      ],
    });

    await page.goto(`/campaigns/${cid}/encounters/${encounterId}`);
    await waitForAppReady(page);
    await expect(page.getByText('En cours', { exact: true })).toBeVisible({ timeout: 10_000 });

    // ─── 01 — La barre d'actions du combat : « Tour précédent » et « Ajouter un
    // combattant » n'existaient pas ; « Fin du tour » n'avait aucun symétrique.
    await expect(page.getByRole('button', { name: 'Tour précédent' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ajouter un combattant' })).toBeVisible();
    await captureFull(page, '01-tracker-barre-actions.png');

    // ─── 02 — Le bloc « Modifier le combattant », au bas de la modale de contrôle.
    await page
      .getByRole('listitem')
      .filter({ hasText: 'Gobelin 2' })
      .getByRole('button', { name: /PV \/ États/i })
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Initiative')).toHaveValue('15');
    await captureViewport(page, '02-modale-modifier-combattant.png');
    await captureTallModal(page, '02b-modale-modifier-combattant-entiere.png');

    // ─── 03 — Renommé, PV corrigés, initiative saisie : « Gobelin 2 » devient le chef.
    await dialog.getByLabel('Nom').fill('Chef gobelin');
    await dialog.getByLabel('PV maximum').fill('21');
    await dialog.getByLabel('Initiative').fill('19');
    await dialog.getByRole('button', { name: 'Enregistrer les corrections' }).click();
    await expect(dialog.getByRole('heading', { name: 'Chef gobelin' })).toBeVisible({
      timeout: 10_000,
    });
    await captureViewport(page, '03-combattant-corrige.png');

    // ─── 04 — Le retrait est en deux temps : un geste irréversible ne part pas
    // au premier tap.
    await dialog.getByRole('button', { name: 'Retirer du combat' }).click();
    await expect(dialog.getByRole('button', { name: 'Confirmer le retrait' })).toBeVisible();
    await captureViewport(page, '04-retrait-confirmation.png');

    // On n'exécute PAS le retrait : le chef sert de repère aux captures suivantes.
    await page.getByRole('button', { name: 'Fermer le contrôle' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // ─── 05 — La carte reflète le nouveau nom, les nouveaux PV, la nouvelle place.
    await expect(page.getByText('Chef gobelin')).toBeVisible({ timeout: 10_000 });
    await captureFull(page, '05-carte-combattant-corrige.png');

    // ─── 06 — Le renfort qui arrive au round 3.
    await page.getByRole('button', { name: 'Ajouter un combattant' }).click();
    const addDialog = page.getByRole('dialog');
    await expect(addDialog).toBeVisible();
    await addDialog.getByLabel('Nom').fill('Ogre de renfort');
    // Scopé à la modale : « PV » matche aussi l'aria-label « PV / États — … »
    // des cartes restées derrière l'overlay.
    await addDialog.getByLabel('PV', { exact: true }).fill('59');
    await captureViewport(page, '06-modale-ajout-combattant.png');
    await captureTallModal(page, '06b-modale-ajout-combattant-entiere.png');

    await page.getByRole('button', { name: 'Ajouter au combat' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('Ogre de renfort')).toBeVisible({ timeout: 10_000 });
    await captureFull(page, '07-renfort-en-fin-d-ordre.png');
  });

  test('un combat abandonné se distingue d’un combat gagné, et se rouvre', async ({ page }) => {
    const cid = await createCampaign(page, 'Les Brumes de Vael');
    const { encounterId } = await seedEncounter(cid, {
      name: 'L’escarmouche du gué',
      status: 'active',
      round: 2,
      turnIndex: 0,
      participants: [
        {
          type: 'monster',
          instanceId: 'inst-loup',
          name: 'Loup sanguinaire',
          initiative: 12,
          currentHp: 26,
          maxHp: 37,
        },
      ],
    });

    await page.goto(`/campaigns/${cid}/encounters/${encounterId}`);
    await waitForAppReady(page);
    await expect(page.getByText('En cours', { exact: true })).toBeVisible({ timeout: 10_000 });

    // ─── 08 — Le panneau de clôture offre une quatrième sortie : l'abandon.
    await page.getByRole('button', { name: 'Clôturer le combat' }).click();
    await expect(page.getByRole('button', { name: 'Abandonner le combat' })).toBeVisible();
    await captureFull(page, '08-cloture-abandon.png');

    await page.getByRole('button', { name: 'Abandonner le combat' }).click();
    await expect(page.getByText('Abandonnée', { exact: true })).toBeVisible({ timeout: 10_000 });

    // ─── 09 — Rencontre close : la seule action restante est la réouverture.
    await expect(page.getByRole('button', { name: 'Rouvrir le combat' })).toBeVisible();
    await captureFull(page, '09-rencontre-close-rouvrir.png');

    await page.getByRole('button', { name: 'Rouvrir le combat' }).click();
    await expect(page.getByText('En cours', { exact: true })).toBeVisible({ timeout: 10_000 });

    // ─── 10 — Renommer / supprimer depuis la liste des rencontres.
    await page.goto(`/campaigns/${cid}/encounters`);
    await waitForAppReady(page);
    await page.getByRole('button', { name: /Gérer la rencontre — L.escarmouche du gué/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel('Nom de la rencontre').fill('L’escarmouche du gué de Vael');
    await captureViewport(page, '10-gerer-rencontre.png');

    // Le geste destructeur passe par une confirmation explicite.
    await page.getByRole('button', { name: 'Supprimer la rencontre' }).click();
    await expect(page.getByRole('button', { name: 'Confirmer la suppression' })).toBeVisible();
    await captureViewport(page, '11-suppression-confirmation.png');
  });

  test('le meneur applique des dégâts à un personnage joueur depuis le tracker', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { uid: gmUid } = await seedCharacter(page, fighterL3);

    // Un joueur (UID distinct) avec sa fiche liée à la campagne : c'est cette
    // fiche que le meneur écrit, via la voie omni-edit du plan 26.
    const cid = `tracker-camp-${gmUid}`;
    const playerUid = `tracker-player-${gmUid}`;
    const playerCharId = await seedCharacterForUid(playerUid, fighterL3);
    await seedCampaignMembership({
      campaignId: cid,
      gmUid,
      playerUid,
      charId: playerCharId,
      displayName: 'Lyralei',
      campaignName: 'Le Val des Cendres',
    });

    const { encounterId } = await seedEncounter(cid, {
      name: 'Le souffle du dragon',
      status: 'active',
      round: 1,
      turnIndex: 0,
      participants: [
        {
          type: 'player',
          characterId: playerCharId,
          instanceId: 'inst-pj',
          name: fighterL3.name,
          initiative: 17,
          // Instantané figé à la création — c'est précisément ce que M5 corrige.
          currentHp: 28,
          maxHp: 28,
        },
      ],
    });

    await page.goto(`/campaigns/${cid}/encounters/${encounterId}`);
    await waitForAppReady(page);

    // ─── 12 — La carte d'un PJ porte maintenant un contrôle de PV.
    const hpButton = page.getByRole('button', { name: /Points de vie — / });
    await expect(hpButton).toBeVisible({ timeout: 15_000 });
    await captureFull(page, '12-carte-pj-controle-pv.png');

    // ─── 13 — La modale annonce qu'elle écrit sur la fiche, et que c'est journalisé.
    await hpButton.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('28/28')).toBeVisible({ timeout: 15_000 });
    await captureViewport(page, '13-modale-pv-joueur.png');
    await captureTallModal(page, '13b-modale-pv-joueur-entiere.png');

    // ─── 14 — 22 dégâts appliqués : la fiche encaisse, le tracker cesse de mentir.
    await dialog.getByLabel('Montant').fill('22');
    await dialog.getByRole('button', { name: /^− Dégâts$/ }).click();
    await expect(dialog.getByText('6/28')).toBeVisible({ timeout: 15_000 });
    await captureViewport(page, '14-degats-appliques-au-pj.png');

    await page.getByRole('button', { name: 'Fermer le contrôle' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('6/28')).toBeVisible({ timeout: 15_000 });
    await captureFull(page, '15-carte-pj-pv-refletes.png');
  });
});
