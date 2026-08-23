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
  seedSession,
} from './seed-character';

/**
 * UAT + garde-fou — le paquet des 🟡 peu chers de l'audit UX (E8, E10, E11, E12).
 *
 * Ce que ça prouve, et que les tests unitaires ne peuvent pas prouver :
 *  - la pastille de campagne ne pousse pas la carte hors de sa colonne (E8) ;
 *  - le bandeau de brouillon survit à un vrai `localStorage` et à un vrai
 *    rechargement de page — pas seulement à un store monté en mémoire (E10) ;
 *  - la carte Épuisement ne fait plus 2,5 fois la hauteur de ses voisines de
 *    rangée bento, ce qui est une mesure de BOÎTE, invisible en unitaire (E11) ;
 *  - les outils du meneur s'ouvrent PAR-DESSUS le tracker, qui reste monté (E12).
 *
 * Pré-requis : émulateur Firebase (`pnpm e2e:emulators`, Java 11+).
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review');

const DESKTOP = { width: 1440, height: 900 } as const;
const MOBILE = { width: 375, height: 812 } as const;

/** Clé de persistance du wizard — cf. `wizard-slice.ts` (version 5). */
const DRAFT_KEY = 'grimwar-wizard-draft-v5';

async function captureFull(page: Page, name: string): Promise<void> {
  writeFileSync(
    path.join(UAT_DIR, name),
    await page.screenshot({ fullPage: true, animations: 'disabled' }),
  );
}

async function captureViewport(page: Page, name: string): Promise<void> {
  writeFileSync(
    path.join(UAT_DIR, name),
    await page.screenshot({ animations: 'disabled' }),
  );
}

test.describe('UAT — paquet des polish peu chers (E8, E10, E11, E12)', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable — start it via `pnpm e2e:emulators` (requires Java/JRE 11+). UAT skipped.',
    );
    mkdirSync(UAT_DIR, { recursive: true });
  });

  test('E8 — la carte de personnage porte sa table sans déborder', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/');
    await waitForAppReady(page);
    const { uid, charId } = await seedCharacter(page, fighterL3);

    // Nom volontairement long : c'est le cas qui casse une mise en page, et le
    // seul qui prouve que la troncature rend bien des points de suspension.
    const longName = 'La Malédiction de Strahd von Zarovich';
    const cid = `polish-camp-${uid}`;
    await seedCampaignMembership({
      campaignId: cid,
      gmUid: `polish-gm-${uid}`,
      playerUid: uid,
      charId,
      displayName: 'Adrien',
      campaignName: longName,
    });

    await page.goto('/');
    await waitForAppReady(page);

    // Identité : le NOM de la campagne, pas son identifiant technique.
    const chip = page.getByText(longName, { exact: true });
    await expect(chip).toBeVisible();

    // La pastille ne doit pas pousser la carte hors de sa colonne de grille.
    const card = page.getByRole('button', { name: new RegExp(fighterL3.name) });
    const cardBox = await card.boundingBox();
    const chipBox = await chip.boundingBox();
    if (!cardBox || !chipBox) throw new Error('carte ou pastille sans boîte mesurable');
    expect(chipBox.x + chipBox.width).toBeLessThanOrEqual(cardBox.x + cardBox.width + 1);

    // Le texte déborde réellement sa boîte ⇒ la troncature s'applique, et elle
    // doit rendre des points de suspension : `text-overflow` ne fonctionne pas
    // sur un conteneur `inline-flex`, d'où le span interne.
    const overflow = await chip.evaluate((el) => ({
      clipped: el.scrollWidth > el.clientWidth,
      textOverflow: window.getComputedStyle(el).textOverflow,
    }));
    expect(overflow.clipped).toBe(true);
    expect(overflow.textOverflow).toBe('ellipsis');

    await captureFull(page, '01-carte-personnage-campagne-attachee.png');
  });

  test('E10 — le brouillon survit au rechargement et sait être abandonné', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/');
    await waitForAppReady(page);
    await seedCharacter(page, fighterL3);

    // Vrai `localStorage`, vraie réhydratation : c'est le seul moyen de prouver
    // que le bandeau lit le brouillon PERSISTÉ et non un store monté en mémoire.
    await page.evaluate((key) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          version: 5,
          state: {
            draft: {
              name: 'Ombrelame',
              level: 1,
              alignment: 'NB',
              classes: [],
              primaryClassId: null,
              ancestryId: 'elf',
              ancestrySubChoices: {},
              method: 'standard-array',
              rollSource: 'app',
              abilities: { for: 10, dex: 10, con: 10, int: 10, sag: 10, cha: 10 },
              backgroundId: null,
              personality: { trait: '', ideal: '', bond: '', flaw: '', backstory: '' },
              pickedSkills: [],
              extraLanguages: [],
              equipmentChoices: [],
              spellsByClass: [],
            },
            currentStep: 'skills',
            visitedSteps: ['identity', 'class', 'ancestry'],
          },
        }),
      );
    }, DRAFT_KEY);

    await page.reload();
    await waitForAppReady(page);

    await expect(page.getByText('Création commencée')).toBeVisible();
    await expect(page.getByText('Ombrelame')).toBeVisible();
    await expect(page.getByText(/Étape 6 sur 9 · Compétences/)).toBeVisible();
    await captureFull(page, '02-accueil-brouillon-en-cours.png');

    // « Abandonner » — le vrai gain de E10 : jusqu'ici, sortir d'un brouillon
    // demandait de le mener au bout ou de vider son stockage local.
    await page.getByRole('button', { name: /Abandonner le brouillon/ }).click();
    await expect(page.getByText('Création commencée')).toHaveCount(0);
    await captureFull(page, '03-accueil-brouillon-abandonne.png');
  });

  test('E11 — la carte Épuisement ne domine plus sa rangée', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, fighterL3);

    await page.goto(`/character/${charId}`);
    await waitForAppReady(page);

    // Épuisement posé PAR L'UI : le preset de seed le fige à 0, et c'est
    // justement au-dessus de 0 que les 7 lignes revenaient avant ce lot.
    await page.getByRole('button', { name: 'Augmenter l’épuisement' }).click();
    await page.getByRole('button', { name: 'Augmenter l’épuisement' }).click();
    await expect(page.getByText(/Niveau 2/)).toBeVisible();

    // Le texte SRD est replié : c'est la CAUSE de l'étirement de rangée.
    await expect(page.getByText(/réduit de 2 fois votre niveau actuel/)).toHaveCount(0);
    await captureFull(page, '04-fiche-combat-epuisement-replie.png');

    // La règle reste à une tape, dans la modale des états — pas un idiome inédit.
    await page.getByRole('button', { name: 'Lire la règle' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/réduit de 2 fois votre niveau actuel/)).toBeVisible();
    await captureFull(page, '05-epuisement-regle-pleine-page.png');
    await captureViewport(page, '06-epuisement-regle-overlay-viewport.png');
  });

  test('E12 — les outils du meneur s’ouvrent sur le combat sans le quitter', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/');
    await waitForAppReady(page);
    const { uid: gmUid } = await seedCharacter(page, fighterL3);

    const cid = `polish-dm-${gmUid}`;
    const playerUid = `polish-player-${gmUid}`;
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
          type: 'monster',
          instanceId: 'm1',
          name: 'Gobelin 1',
          currentHp: 7,
          maxHp: 7,
          initiative: 11,
        },
      ],
    });

    await page.goto(`/campaigns/${cid}/encounters/${encounterId}`);
    await waitForAppReady(page);

    await page.getByRole('button', { name: 'Outils' }).click();
    const dialog = page.getByRole('dialog', { name: 'Outils du meneur' });
    await expect(dialog.getByRole('button', { name: 'Lancer en secret' })).toBeVisible();
    await expect(dialog.getByText('Notes de séance')).toBeVisible();
    // Le combat est toujours monté derrière — c'est tout l'intérêt.
    await expect(page.getByText('Gobelin 1').first()).toBeAttached();
    // Une seule capture ici, contrairement au doublet pleine-page + viewport des
    // autres modales : `DetailModal` verrouille le défilement du document, donc
    // la hauteur du document ÉGALE celle de la fenêtre et les deux captures
    // sortent byte-identiques. Un doublon dans la galerie n'est pas une preuve.
    await captureViewport(page, '07-combat-outils-meneur-overlay.png');

    // La barre de la rencontre porte désormais QUATRE contrôles : elle doit
    // encore tenir sur un téléphone.
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await page.setViewportSize(MOBILE);
    // Le curseur reste sur le bouton après le clic : son infobulle recouvrirait
    // la barre qu'on vient précisément juger. On l'écarte avant de capturer.
    await page.mouse.move(0, 0);
    // Fermer la modale rend le focus au bouton — et `tooltip.tsx` s'ouvre au
    // focus autant qu'au survol. Sans ce blur, la bulle recouvre la barre qu'on
    // vient précisément juger. L'infobulle reste MONTÉE et se cache par opacité,
    // donc c'est l'opacité qu'on attend, pas sa disparition du DOM.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await expect(page.locator('[role="tooltip"]', { hasText: 'Jet secret' })).toHaveCSS(
      'opacity',
      '0',
    );
    await captureViewport(page, '08-combat-barre-quatre-controles-mobile.png');
  });

  test('E12 — la séance ouvre les mêmes outils', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/');
    await waitForAppReady(page);
    const { uid: gmUid } = await seedCharacter(page, fighterL3);

    const cid = `polish-sess-${gmUid}`;
    await seedCampaignMembership({
      campaignId: cid,
      gmUid,
      playerUid: `polish-sess-p-${gmUid}`,
      charId: null,
      displayName: 'Brann',
    });
    const { sessionId } = await seedSession(cid, {
      number: 3,
      title: 'L’embuscade de la passe',
      status: 'active',
    });

    await page.goto(`/campaigns/${cid}/sessions/${sessionId}`);
    await waitForAppReady(page);

    await page.getByRole('button', { name: 'Outils' }).click();
    const dialog = page.getByRole('dialog', { name: 'Outils du meneur' });
    await expect(dialog.getByRole('button', { name: 'Lancer en secret' })).toBeVisible();
    await captureViewport(page, '09-seance-outils-meneur-overlay.png');
  });
});
