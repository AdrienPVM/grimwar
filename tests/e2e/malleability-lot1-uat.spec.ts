import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import {
  fighterL3,
  seedCampaignEvent,
  seedCharacter,
  seedEncounter,
} from './seed-character';

/**
 * UAT — lot 1 de `docs/plans/AUDIT-MALLEABILITE-2026-08.md`.
 *
 * Ce que ces captures montrent et que les tests unitaires ne montrent pas : le
 * RENDU des nouvelles soupapes dans la vraie fiche et le vrai tracker, avec le
 * contenu réel et les vraies contraintes de place.
 *
 * Ce qui est prouvé mécaniquement ailleurs (et donc PAS à vérifier à l'œil) :
 * la règle SRD des PV temporaires, le clamp du maximum de PV, l'aller-retour
 * d'export de pack, la dérivation des paliers, le retrait à deux temps d'un
 * event, la visibilité `dm` du jet secret.
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
  writeFileSync(
    path.join(UAT_DIR, name),
    await page.screenshot({ animations: 'disabled' }),
  );
}

/** Crée une campagne et retourne son id (le créateur en est le MJ). */
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

test.describe('UAT — lot 1 de malléabilité', () => {
  test.use({ viewport: DESKTOP });

  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Émulateur Firestore non joignable — démarrer `pnpm e2e:emulators` (Java 11+). UAT skippé.',
    );
    mkdirSync(UAT_DIR, { recursive: true });
  });

  test('la modale de contrôle porte PV temporaires, état maison et note', async ({
    page,
  }) => {
    const cid = await createCampaign(page, 'Le Gouffre aux Murmures');

    // Un dragon à 250 PV À CÔTÉ d'un gobelin à 7 : c'est le contraste qui rend
    // visible la dérivation des paliers (M37).
    const { encounterId } = await seedEncounter(cid, {
      name: 'La Gueule du Dragon',
      status: 'active',
      round: 3,
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
        {
          type: 'monster',
          instanceId: 'inst-dragon',
          name: 'Dragon rouge adulte',
          initiative: 14,
          currentHp: 212,
          maxHp: 250,
        },
        {
          type: 'monster',
          instanceId: 'inst-gob',
          name: 'Gobelin',
          initiative: 6,
          currentHp: 5,
          maxHp: 7,
        },
      ],
    });

    await page.goto(`/campaigns/${cid}/encounters/${encounterId}`);
    await waitForAppReady(page);
    await expect(page.getByText('En cours', { exact: true })).toBeVisible({
      timeout: 10_000,
    });

    // ─── 01 — Modale du DRAGON : paliers à l'échelle de la créature.
    await page
      .getByRole('listitem')
      .filter({ hasText: 'Dragon rouge adulte' })
      .getByRole('button', { name: /PV \/ États/i })
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('button', { name: '−80' })).toBeVisible();
    await captureViewport(page, '01-controle-dragon-paliers-derives.png');

    // ─── 02 — PV temporaires accordés + état maison posé + note écrite.
    await page.getByLabel('Montant').fill('30');
    await page.getByRole('button', { name: /PV temp/ }).click();
    await page.getByLabel('Autre état').fill('Marqué par le Chasseur');
    await page.getByRole('button', { name: 'Poser' }).click();
    await page
      .getByLabel('Note du combattant')
      .fill('Celui-ci porte la clé de la salle du trône.');
    await page.getByRole('button', { name: 'Enregistrer la note' }).click();

    // Le bouclier s'affiche à côté des PV réels, l'état maison en clair.
    await expect(page.getByText('+30', { exact: true }).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByRole('button', { name: 'Marqué par le Chasseur' }),
    ).toBeVisible();
    await captureViewport(page, '02-controle-pv-temp-etat-maison-note.png');

    // ─── 03 — L'état maison remonte sur la carte du combattant, en clair.
    await page.getByRole('button', { name: /Fermer le contrôle/i }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(
      page.getByText('Marqué par le Chasseur').first(),
    ).toBeVisible();
    await captureFull(page, '03-tracker-etat-maison-en-clair.png');

    // ─── 04 — Hand-off d'un jet NUMÉRIQUE (M4) : le mode n'est plus un filtre.
    await seedCampaignEvent(cid, {
      kind: 'roll',
      actorUserId: 'uid-lyralei',
      actorCharacterId: 'char-lyralei',
      payload: {
        label: 'Épée longue',
        rollKind: 'damage',
        mode: 'digital',
        total: 13,
      },
      visibility: 'all',
    });
    const handoff = page.getByRole('region', { name: 'Dégâts à appliquer' });
    await expect(handoff).toBeVisible({ timeout: 10_000 });
    await expect(handoff.getByText('13 dégâts')).toBeVisible();
    await captureFull(page, '04-handoff-jet-numerique.png');
  });

  test('le maximum de PV s’édite depuis la fiche', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, fighterL3);

    await page.goto(`/character/${charId}`);
    await waitForAppReady(page);

    // ─── 05 — Le « / max » est un contrôle, plus un texte mort.
    const maxButton = page.getByRole('button', {
      name: /Modifier le maximum de PV/,
    });
    await expect(maxButton).toBeVisible({ timeout: 10_000 });
    await captureFull(page, '05-fiche-maximum-pv-cliquable.png');

    // ─── 06 — Le pad du maximum, aux couleurs de la fiche (doré) et non du combat.
    await maxButton.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    for (const digit of '38') {
      await page.getByRole('button', { name: digit, exact: true }).click();
    }
    await captureViewport(page, '06-pad-maximum-pv.png');

    await page.getByRole('button', { name: 'Fixer' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    // Le nom accessible porte la valeur courante — c'est l'aria-label qui fait
    // foi, pas le texte « / 38 » qu'il masque.
    await expect(
      page.getByRole('button', { name: /Modifier le maximum de PV \(actuellement 38\)/ }),
    ).toBeVisible({ timeout: 10_000 });
    await captureFull(page, '07-fiche-maximum-pv-applique.png');
  });

  test('le jet secret du meneur se nomme, se journalise et se révèle', async ({
    page,
  }) => {
    const cid = await createCampaign(page, 'Les Cendres de Barovie');
    await page.goto(`/campaigns/${cid}`);
    await waitForAppReady(page);

    // ─── 08 — Outils du meneur : le champ « À propos de quoi ? » est neuf.
    const about = page.getByLabel('À propos de quoi ?');
    await expect(about).toBeVisible({ timeout: 10_000 });
    await about.fill('Perception du garde');
    await page.getByRole('button', { name: /Lancer en secret/i }).click();
    await expect(
      page.getByRole('button', { name: 'Révéler à la table' }),
    ).toBeVisible();
    // Le jet apparaît dans le feed d'activité (visibilité meneur) SUR LA MÊME
    // page : une seconde capture pleine page serait byte-identique à la
    // précédente, donc du bruit dans la galerie. On garde l'assertion, pas le
    // doublon.
    await expect(page.getByText('Jet secret du meneur').first()).toBeVisible({
      timeout: 10_000,
    });
    await captureFull(page, '08-jet-secret-nomme-et-journalise.png');

    // ─── 09 — Le meneur peut retirer un événement du journal (M9).
    await page
      .getByRole('button', { name: /Voir le détail de l.événement/ })
      .first()
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Retirer du journal' }).click();
    await expect(
      page.getByRole('button', { name: 'Confirmer le retrait' }),
    ).toBeVisible();
    await captureViewport(page, '09-retrait-event-confirmation.png');
  });
});
