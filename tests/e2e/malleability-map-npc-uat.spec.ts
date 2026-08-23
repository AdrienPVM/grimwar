import { mkdirSync } from 'node:fs';
import path from 'node:path';

import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
} from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { fighterL3, seedCharacter } from './seed-character';

/**
 * UAT — lot « carte + PNJ » de l'audit de malléabilité (M30, M31, M32, M34,
 * M39, M40, M41, M42, M67a).
 *
 * Galerie PLATE dans `uat-review/` (gitignored), numérotée dans l'ordre de
 * revue. Skip propre si l'émulateur n'est pas joignable — pas de faux-vert.
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review');
const CAMPAIGN_NAME = 'Les Cendres de Valombre';
const SECOND_CAMPAIGN = 'Les Mers du Sud';
const MAP_NAME = "Donjon de l'aube";
const NPC_NAME = 'Aldric le marchand';
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

async function createCampaign(page: Page, name: string): Promise<string> {
  await page.goto('/campaigns');
  await waitForAppReady(page);
  await page
    .getByRole('button', { name: /Créer une campagne/i })
    .first()
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel(/Nom de la campagne/i).fill(name);
  await page.getByRole('button', { name: /^Créer$/ }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });
  await expect(page.getByRole('heading', { name })).toBeVisible();
  return /\/campaigns\/([^/]+)$/.exec(page.url())?.[1] ?? '';
}

test.describe('UAT — malléabilité : la carte et les PNJ', () => {
  test('la carte se calibre, se cadre, et s’ouvre aux joueurs', async ({
    browser,
  }) => {
    test.skip(
      !(await isEmulatorReachable()),
      'Émulateur Firestore non joignable — UAT carte skippée.',
    );

    const dmCtx = await newDesktopContext(browser);
    const dm = await dmCtx.newPage();
    try {
      const cid = await createCampaign(dm, CAMPAIGN_NAME);
      expect(cid.length).toBeGreaterThan(0);

      const codeNode = dm.locator('p[aria-label*="dicter ou copier"]');
      await expect(codeNode).toBeVisible();
      const inviteCode = ((await codeNode.textContent()) ?? '').trim();
      expect(inviteCode).toMatch(INVITE_CODE_PATTERN);

      // ── M31 : le second onglet d'import, « Image de battlemap ».
      await dm.goto(`/map-proto/cloud/${cid}/import`);
      await waitForAppReady(dm);
      await dm.getByTestId('map-import-tab-image').click();
      await expect(dm.getByTestId('map-import-image-file')).toBeAttached();
      await captureFull(dm, '01-import-onglet-image-nue.png');

      // ── Une carte, puis ses réglages (M30).
      await dm.goto(`/map-proto/cloud/${cid}`);
      await waitForAppReady(dm);
      await dm.getByTestId('maps-cloud-create-id').fill('donjon-de-l-aube');
      await dm.getByTestId('maps-cloud-create-name').fill(MAP_NAME);
      await dm.getByTestId('maps-cloud-create-submit').click();
      await expect(dm.getByTestId('maps-cloud-card-donjon-de-l-aube')).toBeVisible({
        timeout: 10_000,
      });
      await captureFull(dm, '02-liste-cartes-meneur.png');

      await dm.getByTestId('maps-cloud-open-donjon-de-l-aube').click();
      await expect(dm.getByTestId('map-live-svg')).toBeVisible({ timeout: 15_000 });

      await dm.getByTestId('map-live-open-settings').click();
      await expect(dm.getByRole('dialog')).toBeVisible();
      await expect(dm.getByTestId('map-settings-scale')).toHaveValue('1,5');
      await captureViewport(dm, '03-reglages-carte-overlay.png');
      await captureFull(dm, '04-reglages-carte-entiers.png');

      // Recalibrage : une case fait 3 m chez cette table.
      await dm.getByTestId('map-settings-scale').fill('3');
      await dm.getByTestId('map-settings-grid-size').fill('64');
      await dm.getByTestId('map-settings-save').click();
      await expect(dm.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });

      // ── M32 : le cadrage. 100 % → deux crans de zoom.
      await expect(dm.getByTestId('map-live-zoom-level')).toHaveText('100 %');
      await dm.getByTestId('map-live-zoom-in').click();
      await dm.getByTestId('map-live-zoom-in').click();
      await expect(dm.getByTestId('map-live-zoom-level')).not.toHaveText('100 %');
      await captureFull(dm, '05-carte-live-zoomee.png');

      // ── La vue présentation porte les mêmes contrôles.
      await dm.getByTestId('map-live-open-tv').click();
      await expect(dm.getByTestId('map-tv-svg')).toBeVisible({ timeout: 15_000 });
      await dm.getByTestId('map-tv-zoom-in').click();
      await captureViewport(dm, '06-vue-presentation-cadrage.png');

      // ── M34 : la porte du joueur.
      const playerCtx = await newDesktopContext(browser);
      const player = await playerCtx.newPage();
      try {
        await player.goto('/');
        await waitForAppReady(player);
        await seedCharacter(player, fighterL3);
        await player.goto('/campaigns/join');
        await waitForAppReady(player);
        await player.getByLabel(/Code d['’]invitation/i).fill(inviteCode);
        await player.getByRole('button', { name: 'Rejoindre' }).click();
        await expect(
          player.getByRole('heading', { name: CAMPAIGN_NAME }),
        ).toBeVisible({ timeout: 15_000 });

        await expect(
          player.getByRole('button', { name: /Voir la carte/i }),
        ).toBeVisible();
        await captureFull(player, '07-campagne-joueur-voir-la-carte.png');

        await player.getByRole('button', { name: /Voir la carte/i }).click();
        await expect(player.getByTestId('maps-cloud-member-intro')).toBeVisible({
          timeout: 15_000,
        });
        // Lecture seule : ni création, ni import, ni suppression.
        await expect(player.getByTestId('maps-cloud-create-form')).toHaveCount(0);
        await expect(player.getByTestId('maps-cloud-import-link')).toHaveCount(0);
        await captureFull(player, '08-liste-cartes-joueur-lecture-seule.png');
      } finally {
        await playerCtx.close();
      }
    } finally {
      await dmCtx.close();
    }
  });

  test('un PNJ se retrouve, se dote d’un visage et voyage', async ({ browser }) => {
    test.skip(
      !(await isEmulatorReachable()),
      'Émulateur Firestore non joignable — UAT PNJ skippée.',
    );

    const dmCtx = await newDesktopContext(browser);
    const dm = await dmCtx.newPage();
    try {
      const cid = await createCampaign(dm, CAMPAIGN_NAME);
      // Seconde campagne : cible de duplication (M42).
      await createCampaign(dm, SECOND_CAMPAIGN);

      // ── M67a : le meneur voit « Mon personnage » sans doc member.
      await dm.goto(`/campaigns/${cid}`);
      await waitForAppReady(dm);
      await expect(
        dm.getByRole('heading', { name: /Rejoins l['’]aventure/i }),
      ).toBeVisible();
      await captureFull(dm, '09-meneur-mon-personnage.png');

      // ── M39/M40 : le formulaire PNJ porte photo et lien bestiaire.
      await dm.goto(`/campaigns/${cid}/npcs`);
      await waitForAppReady(dm);
      await dm.getByRole('button', { name: 'Nouveau PNJ' }).click();
      await expect(dm.getByRole('dialog')).toBeVisible();
      await dm.getByPlaceholder('Nom du personnage').fill(NPC_NAME);
      await dm.getByRole('checkbox').check();
      await expect(dm.getByRole('button', { name: 'Lier un monstre' })).toBeVisible();
      // Haut de la modale : le ressenti d'overlay + le bouton « Ajouter une photo ».
      await dm.getByRole('dialog').getByRole('heading').first().scrollIntoViewIfNeeded();
      await captureViewport(dm, '10-formulaire-pnj-haut-photo.png');
      // La modale PNJ a son PROPRE `overflow-y-auto` sur un conteneur de hauteur
      // figée : `fullPage` la tronque silencieusement (piège gravé dans
      // CLAUDE.md). On agrandit le viewport pour que tout tienne sans scroll
      // interne, plutôt que de livrer une capture coupée.
      await dm.setViewportSize({ width: 1440, height: 2000 });
      await dm.getByRole('button', { name: 'Lier un monstre' }).scrollIntoViewIfNeeded();
      await captureViewport(dm, '11-formulaire-pnj-entier.png');
      await dm.setViewportSize({ width: 1440, height: 900 });
      await dm.getByRole('button', { name: 'Enregistrer' }).click();
      await expect(dm.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });
      await expect(dm.getByRole('heading', { name: NPC_NAME })).toBeVisible({
        timeout: 10_000,
      });

      // ── M41 : la recherche et le tri de l'annuaire.
      await expect(dm.getByTestId('npc-search')).toBeVisible();
      await dm.getByTestId('npc-search').fill('aldric');
      await expect(dm.getByRole('heading', { name: NPC_NAME })).toBeVisible();
      await captureFull(dm, '12-annuaire-pnj-recherche-et-tri.png');
      await dm.getByTestId('npc-search').fill('');

      // ── M42 : la duplication vers l'autre campagne.
      await dm.getByRole('heading', { name: NPC_NAME }).click();
      await expect(
        dm.getByRole('button', { name: /^Dupliquer$/ }),
      ).toBeVisible({ timeout: 10_000 });
      await dm.getByRole('button', { name: /^Dupliquer$/ }).click();
      await expect(dm.getByRole('dialog')).toBeVisible();
      await expect(dm.getByText(SECOND_CAMPAIGN)).toBeVisible();
      await captureViewport(dm, '13-duplication-pnj-overlay.png');
      await captureFull(dm, '14-duplication-pnj-entiere.png');
    } finally {
      await dmCtx.close();
    }
  });
});
