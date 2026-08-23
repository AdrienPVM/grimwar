import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * UAT — fiche de créature dans le tracker de rencontre (directive 2026-06-27).
 *
 * Boucle : import d'un pack monstre → campagne → rencontre autofill « Depuis le
 * bestiaire » (le participant porte alors un `monsterContentId`) → init →
 * démarrer → ouvrir le contrôle MJ du monstre → bouton « Voir la fiche de
 * créature » → bloc de stats complet (CA/PV/FP/traits) résolu depuis le
 * bestiaire. Prouve de bout en bout que le slug mémorisé à l'autofill rend la
 * fiche actionnable mi-combat.
 *
 * Émulateur Firestore requis. Captures dans `uat-review/encounter-statblock/`.
 */
const OUT = path.resolve(process.cwd(), 'uat-review', 'encounter-statblock');

const PACK = {
  meta: {
    id: 'pack-statblock-uat',
    name: { fr: 'Bestiaire fiche UAT', en: 'Stat Block Bestiary UAT' },
    version: '1.0.0',
    author: 'Adrien e2e',
    createdAt: '2026-06-27T12:00:00Z',
  },
  entities: {
    monsters: [
      {
        id: 'ours-hibou-statblock-uat',
        name: { fr: 'Ours-hibou', en: 'Owlbear' },
        size: 'large',
        type: 'monstruosité',
        alignment: { fr: 'Non aligné', en: 'Unaligned' },
        ac: 13,
        acDetail: { fr: 'armure naturelle', en: 'natural armor' },
        hp: { avg: 59, formula: '7d10 + 21' },
        speed: { walk: 40 },
        abilities: { for: 20, dex: 12, con: 17, int: 3, sag: 12, cha: 7 },
        saves: {},
        skills: { perception: 3 },
        resistances: [],
        immunities: [],
        vulnerabilities: [],
        conditionImmunities: [],
        senses: { darkvision: 60, passivePerception: 13 },
        languages: [],
        cr: 3,
        xp: 700,
        traits: [
          {
            name: { fr: 'Vue perçante', en: 'Keen Sight' },
            description: { fr: 'Avantage aux jets de Perception (vue).' },
          },
        ],
        actions: [
          {
            name: { fr: 'Serres', en: 'Claws' },
            description: { fr: 'Mêlée +7, 2d8+5 tranchant.' },
          },
        ],
        reactions: null,
        legendaryActions: null,
        source: 'srd-5.2.1',
      },
    ],
  },
};

test.describe('UAT — fiche de créature dans le tracker', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(!ok, 'Firestore emulator unreachable — skipping stat block UAT.');
    mkdirSync(OUT, { recursive: true });
  });

  test('autofill → init → contrôle → « Voir la fiche » → bloc de stats', async ({ page }) => {
    // ─── 1. Importe le pack ours-hibou.
    await page.goto('/account/content');
    await waitForAppReady(page);
    await page.getByTestId('pack-file-input').setInputFiles({
      name: 'pack-statblock.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(PACK), 'utf-8'),
    });
    await page.getByTestId('pack-import-confirm').click();
    await page.locator(`[data-pack-id="${PACK.meta.id}"]`).waitFor({ timeout: 10_000 });

    // ─── 2. Campagne + rencontres.
    await page.goto('/campaigns');
    await waitForAppReady(page);
    await page.getByRole('button', { name: /Créer une campagne/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel(/Nom de la campagne/i).fill('La Forêt hurlante');
    await page.getByRole('button', { name: /^Créer$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });
    await page.getByRole('button', { name: /^Rencontres$/ }).click();
    await expect(page).toHaveURL(/\/campaigns\/[^/]+\/encounters$/);

    // ─── 3. Rencontre autofill depuis le bestiaire (participant lié au slug).
    await page.getByRole('button', { name: /Créer une rencontre/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: /Depuis le bestiaire/i }).click();
    await page.getByTestId('monster-pick-ours-hibou-statblock-uat').click();
    await expect(page.getByPlaceholder('Ex. « Gobelin »')).toHaveValue('Ours-hibou');
    await page.getByLabel(/Nom de la rencontre/i).fill('Embuscade dans la clairière');
    await page.getByRole('button', { name: /^Créer$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });

    // ─── 4. Tracker → init → démarrer.
    await page.getByRole('button', { name: /^Embuscade dans la clairière/i }).click();
    await expect(page).toHaveURL(/\/encounters\/[^/]+$/);
    await page.getByRole('button', { name: 'Lancer l’initiative' }).click();
    await page.getByRole('button', { name: 'Démarrer le combat' }).click();
    await expect(page.getByText('En cours', { exact: true })).toBeVisible({ timeout: 10_000 });

    // ─── 5. Ouvre le contrôle MJ du monstre → le bouton « Voir la fiche » est là.
    await page.getByRole('button', { name: /PV \/ États — Ours-hibou/ }).click();
    const controlDialog = page.getByRole('dialog');
    await expect(controlDialog).toBeVisible();
    const viewStatBtn = controlDialog.getByRole('button', { name: 'Voir la fiche de créature' });
    await expect(viewStatBtn).toBeVisible();
    await page.screenshot({ path: path.join(OUT, '01-bouton-fiche-modale.png'), fullPage: true });
    await page.screenshot({
      path: path.join(OUT, '01-bouton-fiche-modale-viewport.png'),
      fullPage: false,
    });

    // ─── 6. Ouvre la fiche → bloc de stats avec identité EXACTE (pas présence).
    await viewStatBtn.click();
    const dialogs = page.getByRole('dialog');
    const statDialog = dialogs.last();
    await expect(statDialog.getByText('Grande · monstruosité · FP 3')).toBeVisible();
    await expect(statDialog.getByText(/13/).first()).toBeVisible(); // CA
    await expect(statDialog.getByText(/59 \(7d10 \+ 21\)/)).toBeVisible(); // PV
    await expect(statDialog.getByText(/Vue perçante/)).toBeVisible();
    await expect(statDialog.getByText(/Serres/)).toBeVisible();
    await page.screenshot({ path: path.join(OUT, '02-fiche-creature.png'), fullPage: true });
    await page.screenshot({
      path: path.join(OUT, '02-fiche-creature-viewport.png'),
      fullPage: false,
    });
  });
});
