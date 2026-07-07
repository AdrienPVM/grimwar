import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * UAT — polish du cycle de vie campagne (post-création + rappel compte anonyme +
 * voie « rejoindre » depuis la bibliothèque). Captures pleine page à plat dans
 * `uat-review/` (une galerie ordonnée pour la validation visuelle d'Adrien).
 *
 * Skip propre si l'émulateur Firestore n'est pas joignable (les 2 dernières
 * captures créent une campagne → besoin de l'émulateur ; la 1re est UI-only).
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review');

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

test.describe('UAT — polish cycle de vie campagne', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('01 — bibliothèque vide : Créer + Rejoindre une campagne (UI-only)', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForAppReady(page);
    // Empty state : deux voies offertes au nouveau venu.
    await expect(
      page.getByRole('button', { name: /Créer un personnage/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Rejoindre une campagne/i }),
    ).toBeVisible();
    await captureFull(page, '01-bibliotheque-vide-creer-ou-rejoindre.png');
  });

  test('02-03 — création → détail « Invite tes joueurs » + rappel compte anonyme', async ({
    page,
  }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — captures skippées.');

    await page.goto('/campaigns');
    await waitForAppReady(page);
    await page
      .getByRole('button', { name: /Créer une campagne/i })
      .first()
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel(/Nom de la campagne/i).fill('La Confrérie du Val');
    await page
      .getByLabel(/Description/i)
      .fill('Une guilde de marchands, une route de montagne et de vieilles dettes.');
    await page.getByRole('button', { name: /^Créer$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });

    // Après création : on atterrit sur le détail. Aucun joueur → bloc premier
    // pas « Invite tes joueurs » + bandeau « Sauvegarde ton compte » (le MJ est
    // sur un compte anonyme dans l'émulateur).
    await expect(
      page.getByRole('heading', { name: /La Confrérie du Val/i }),
    ).toBeVisible();
    await expect(page.getByText(/Invite tes joueurs/i)).toBeVisible();
    await expect(page.getByText('Sauvegarde ton compte')).toBeVisible();
    await captureFull(page, '02-detail-campagne-invite-premier-pas.png');

    // Mobile 375 — même écran, pour juger l'empilement du bandeau + bloc invite.
    await page.setViewportSize({ width: 375, height: 812 });
    await captureFull(page, '03-detail-campagne-mobile-375.png');
  });

  test('04-05 — réglages : contrôle d’état + puce « Archivée » sur le détail', async ({
    page,
  }) => {
    const reachable = await isEmulatorReachable();
    test.skip(!reachable, 'Émulateur Firestore non joignable — captures skippées.');

    await page.goto('/campaigns');
    await waitForAppReady(page);
    await page
      .getByRole('button', { name: /Créer une campagne/i })
      .first()
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel(/Nom de la campagne/i).fill('Les Cendres de Valmont');
    await page.getByRole('button', { name: /^Créer$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });
    await expect(
      page.getByRole('heading', { name: /Les Cendres de Valmont/i }),
    ).toBeVisible();

    // Ouvre les réglages MJ et capture le nouveau contrôle d'état.
    await page.getByRole('button', { name: /Réglages/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/État de la campagne/i)).toBeVisible();
    await captureViewport(page, '04-reglages-controle-etat.png');

    // Passe la campagne en « Archivée » et enregistre.
    await page.getByRole('radio', { name: /Archivée/i }).click();
    await page.getByRole('button', { name: /Enregistrer/i }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });

    // La puce « Archivée » apparaît dans l'en-tête du détail (exact : le mot
    // « Archivée » figure aussi dans la bannière d'état ci-dessous).
    await expect(page.getByText('Archivée', { exact: true })).toBeVisible();
    // La bannière d'état donne un sens fonctionnel à l'archivage (au-delà de la
    // puce) : la campagne n'est plus « en cours », consultable en lecture.
    await expect(page.getByText(/Cette campagne est archivée/i)).toBeVisible();
    await captureFull(page, '05-detail-campagne-archivee.png');
  });
});
