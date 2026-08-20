import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import {
  fighterL3,
  seedCampaignMembership,
  seedCharacter,
  seedSession,
} from './seed-character';

/**
 * UAT — M11 à M14 de `docs/plans/AUDIT-MALLEABILITE-2026-08.md` : le cycle de vie
 * d'une campagne devient réparable (roster, documents, séances, journal).
 *
 * Ce que ces captures montrent et que les tests unitaires ne montrent pas :
 * si un geste d'autorité destructif (exclure, rétrograder, régénérer, supprimer)
 * se distingue assez d'un geste courant quand il cohabite avec lui dans la même
 * rangée, et si les nouvelles cases de cadrage du journal alourdissent l'écran.
 *
 * Ce qui est prouvé mécaniquement ailleurs (et donc PAS à vérifier à l'œil) :
 * le refus de rétrograder le dernier meneur, l'atomicité de la rotation de code,
 * la non-re-journalisation d'une correction de document, la cible de réouverture
 * selon l'état terminal, et le défaut « tout inclus » de la compilation.
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

async function captureViewport(page: Page, name: string): Promise<void> {
  writeFileSync(path.join(UAT_DIR, name), await page.screenshot({ animations: 'disabled' }));
}

/**
 * Capture le contenu EXHAUSTIF d'une modale. `fullPage` ne franchit pas le
 * `max-h-[90vh] overflow-y-auto` du panneau de `DetailModal` et sortirait une
 * capture tronquée *silencieusement* (byte-identique à la viewport) — piège
 * gravé au lot 1 bis. On agrandit temporairement le viewport.
 */
async function captureTallModal(page: Page, name: string): Promise<void> {
  await page.setViewportSize({ width: DESKTOP.width, height: 2200 });
  writeFileSync(path.join(UAT_DIR, name), await page.screenshot({ animations: 'disabled' }));
  await page.setViewportSize({ ...DESKTOP });
}

test.describe('UAT — le cycle de vie d’une campagne devient réparable', () => {
  test.use({ viewport: DESKTOP });

  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Émulateur Firestore non joignable — démarrer `pnpm e2e:emulators` (Java 11+). UAT skippé.',
    );
    mkdirSync(UAT_DIR, { recursive: true });
  });

  test('un roster se répare : exclure, rétrograder, révoquer un code', async ({ page }) => {
    // La page s'authentifie en anonyme au premier rendu — son UID sera le meneur.
    await page.goto('/');
    await waitForAppReady(page);
    const { uid: gmUid } = await seedCharacter(page, fighterL3);
    const cid = `lifecycle-camp-${gmUid}`;

    await seedCampaignMembership({
      campaignId: cid,
      gmUid,
      playerUid: `lifecycle-marie-${gmUid}`,
      charId: null,
      displayName: 'Marie',
      campaignName: 'Les Cendres de Corvus',
    });
    await seedCampaignMembership({
      campaignId: cid,
      gmUid,
      playerUid: `lifecycle-bob-${gmUid}`,
      charId: null,
      displayName: 'Bob',
      campaignName: 'Les Cendres de Corvus',
    });

    await page.goto(`/campaigns/${cid}`);
    await waitForAppReady(page);
    await expect(page.getByRole('heading', { name: 'Les Cendres de Corvus' })).toBeVisible({
      timeout: 15_000,
    });

    // ─── 01 — Le roster porte enfin les gestes d'autorité. « Exclure » n'avait
    // aucun appelant depuis 4.0.3 ; « Rétrograder » n'existait pas.
    const marieRow = page.getByRole('listitem').filter({ hasText: 'Marie' });
    await expect(marieRow.getByRole('button', { name: 'Exclure' })).toBeVisible();
    await expect(marieRow.getByRole('button', { name: 'Promouvoir meneur' })).toBeVisible();
    // Le meneur ne s'exclut ni ne se rétrograde depuis sa propre ligne.
    const gmRow = page.getByRole('listitem').filter({ hasText: '(toi)' });
    await expect(gmRow.getByRole('button', { name: 'Exclure' })).toHaveCount(0);
    await expect(gmRow.getByRole('button', { name: 'Rétrograder' })).toHaveCount(0);
    await captureFull(page, '01-roster-gestes-autorite.png');

    // ─── 02 — La modale d'exclusion dit ce qui est perdu ET ce qui reste.
    await marieRow.getByRole('button', { name: 'Exclure' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Exclure ce membre')).toBeVisible();
    await captureViewport(page, '02-modale-exclusion.png');
    await captureTallModal(page, '02b-modale-exclusion-entiere.png');
    await dialog.getByRole('button', { name: 'Annuler' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // ─── 03 — Régénérer le code : confirmation en deux temps, avertissement
    // explicite sur les liens déjà partagés.
    await page.getByRole('button', { name: 'Régénérer le code' }).click();
    await expect(
      page.getByText(/Le code actuel cessera immédiatement de fonctionner/i),
    ).toBeVisible();
    await captureFull(page, '03-regeneration-code-confirmation.png');
    await page.getByRole('button', { name: 'Garder le code actuel' }).click();
  });

  test('un document envoyé se corrige, et ses destinataires ont un nom', async ({
    page,
  }) => {
    // La page s'authentifie en anonyme au premier rendu — son UID sera le meneur.
    await page.goto('/');
    await waitForAppReady(page);
    const { uid: gmUid } = await seedCharacter(page, fighterL3);
    const cid = `lifecycle-handout-${gmUid}`;

    await seedCampaignMembership({
      campaignId: cid,
      gmUid,
      playerUid: `handout-marie-${gmUid}`,
      charId: null,
      displayName: 'Marie',
      campaignName: 'Les Cendres de Corvus',
    });
    await seedCampaignMembership({
      campaignId: cid,
      gmUid,
      playerUid: `handout-bob-${gmUid}`,
      charId: null,
      displayName: 'Bob',
      campaignName: 'Les Cendres de Corvus',
    });

    await page.goto(`/campaigns/${cid}/handouts`);
    await waitForAppReady(page);

    // Crée un document ciblé sur Marie — c'est le chemin qui prouve que le
    // sélecteur de destinataires affiche des NOMS et non des UIDs.
    await page.getByRole('button', { name: 'Nouveau document' }).click();
    const createDialog = page.getByRole('dialog');
    await createDialog
      .getByPlaceholder(/Le mot du corbeau/i)
      .or(createDialog.locator('input[type="text"]').first())
      .fill('La lettre du baron');
    await createDialog.locator('textarea').first().fill('Mon cher ami, **viens seul**.');
    await createDialog.getByRole('button', { name: 'Choisir des joueurs' }).click();

    // ─── 04 — Les destinataires sont NOMMÉS dans le sélecteur.
    await expect(createDialog.getByRole('button', { name: /Marie/ })).toBeVisible();
    await captureTallModal(page, '04-selecteur-destinataires-nommes.png');

    await createDialog.getByRole('button', { name: /Marie/ }).click();
    await createDialog.getByRole('button', { name: 'Envoyer' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15_000 });

    // ─── 05 — La carte NOMME le destinataire au lieu de le compter.
    await expect(page.getByText(/Ciblé · Marie/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Corriger' })).toBeVisible();
    await captureFull(page, '05-carte-document-destinataire-nomme.png');

    // ─── 06 — La correction rouvre le formulaire prérempli.
    await page.getByRole('button', { name: 'Corriger' }).click();
    const editDialog = page.getByRole('dialog');
    await expect(editDialog.getByText('Corriger le document')).toBeVisible();
    await captureTallModal(page, '06-modale-correction-prremplie.png');
    // Montrer aussi le document à Bob — il en sera prévenu par son propre
    // listener, sans une ligne de code de notification (cf. `updateHandout`).
    await editDialog.getByRole('button', { name: /Bob/ }).click();
    await editDialog.getByRole('button', { name: 'Enregistrer les corrections' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15_000 });
    await expect(page.getByText(/Ciblé · Marie, Bob/)).toBeVisible({ timeout: 15_000 });
    await captureFull(page, '07-document-destinataire-elargi.png');

    // ─── 08 — La suppression se distingue de l'archivage, en deux temps.
    await page.getByRole('button', { name: 'Supprimer' }).click();
    await expect(
      page.getByRole('button', { name: 'Confirmer la suppression' }),
    ).toBeVisible();
    await captureFull(page, '08-suppression-document-confirmation.png');
  });

  test('une séance se rouvre, et le journal se cadre', async ({ page }) => {
    // La page s'authentifie en anonyme au premier rendu — son UID sera le meneur.
    await page.goto('/');
    await waitForAppReady(page);
    const { uid: gmUid } = await seedCharacter(page, fighterL3);
    const cid = `lifecycle-session-${gmUid}`;

    await seedCampaignMembership({
      campaignId: cid,
      gmUid,
      playerUid: `session-marie-${gmUid}`,
      charId: null,
      displayName: 'Marie',
      campaignName: 'Les Cendres de Corvus',
    });
    const { sessionId } = await seedSession(cid, {
      number: 3,
      title: 'L’embuscade de la passe',
      status: 'completed',
      journalCompiled: '## Exploration\n\n- La compagnie franchit le col.',
    });

    await page.goto(`/campaigns/${cid}/sessions/${sessionId}`);
    await waitForAppReady(page);
    await expect(page.getByRole('heading', { name: 'L’embuscade de la passe' })).toBeVisible({
      timeout: 15_000,
    });

    // ─── 09 — La barre d'actions ne disparaît PLUS sur une séance close : elle
    // propose la réouverture et la correction. Avant M13, l'écran n'offrait rien.
    await expect(page.getByRole('button', { name: 'Rouvrir la séance' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Modifier la séance' })).toBeVisible();
    // Une séance terminée ne s'annule pas (elle a eu lieu).
    await expect(page.getByRole('button', { name: 'Annuler la séance' })).toHaveCount(0);
    await captureFull(page, '09-seance-close-actions.png');

    // ─── 10 — La modale de modification : titre, numéro, date.
    await page.getByRole('button', { name: 'Modifier la séance' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Modifier la séance')).toBeVisible();
    await captureViewport(page, '10-modale-modifier-seance.png');
    await captureTallModal(page, '10b-modale-modifier-seance-entiere.png');
    await dialog.getByRole('button', { name: 'Annuler' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // ─── 11 — Onglet Journal : les cases de cadrage, au-dessus de la
    // re-compilation. C'est la question de densité à juger.
    await page.getByRole('tab', { name: 'Journal' }).click();
    await page.getByRole('button', { name: 'Re-compiler depuis les événements' }).click();
    await expect(page.getByText('Ce que le récit embarque')).toBeVisible();
    await captureFull(page, '11-journal-cadrage-recompilation.png');
  });

  test('le journal de campagne exporte une séance seule', async ({ page }) => {
    // La page s'authentifie en anonyme au premier rendu — son UID sera le meneur.
    await page.goto('/');
    await waitForAppReady(page);
    const { uid: gmUid } = await seedCharacter(page, fighterL3);
    const cid = `lifecycle-journal-${gmUid}`;

    await seedCampaignMembership({
      campaignId: cid,
      gmUid,
      playerUid: `journal-marie-${gmUid}`,
      charId: null,
      displayName: 'Marie',
      campaignName: 'Les Cendres de Corvus',
    });
    await seedSession(cid, {
      number: 1,
      title: 'Le départ',
      status: 'completed',
      journalCompiled: '## Exploration\n\n- La compagnie quitte Corvus.',
    });
    await seedSession(cid, {
      number: 2,
      title: 'La crypte',
      status: 'completed',
      journalCompiled: '## Exploration\n\n- La crypte s’ouvre sur un escalier.',
    });

    await page.goto(`/campaigns/${cid}/journal`);
    await waitForAppReady(page);
    await expect(page.getByRole('button', { name: /La crypte/ })).toBeVisible({
      timeout: 15_000,
    });

    // ─── 12 — « Exporter cette séance » n'apparaît qu'au dépliage : le joueur
    // absent reçoit UNE séance, pas les 41 précédentes.
    await expect(
      page.getByRole('button', { name: 'Exporter cette séance' }),
    ).toHaveCount(0);
    await page.getByRole('button', { name: /La crypte/ }).click();
    await expect(page.getByRole('button', { name: 'Exporter cette séance' })).toBeVisible();
    await captureFull(page, '12-journal-export-une-seance.png');
  });
});
