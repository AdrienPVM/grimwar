import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * UAT + preuve de bout en bout — un pack importé contenant un MONSTRE et un
 * OBJET MAGIQUE custom apparaît dans le Codex (bestiaire + objets magiques).
 *
 * Boucle complète : import JSON via `/account/content` → fusion runtime
 * (`useContent` ∪ packs) → rendu dans le Codex. Sans la fusion, les entrées
 * n'existeraient nulle part. Capture `uat-review/bestiary-codex/`.
 */
const OUT = path.resolve(process.cwd(), 'uat-review', 'bestiary-codex');

const PACK = {
  meta: {
    id: 'pack-bestiaire-uat',
    name: { fr: 'Bestiaire UAT', en: 'Bestiary UAT' },
    version: '1.0.0',
    author: 'Adrien e2e',
    createdAt: '2026-06-27T12:00:00Z',
  },
  entities: {
    monsters: [
      {
        id: 'gobelin-roi-uat',
        name: { fr: 'Roi gobelin', en: 'Goblin King' },
        size: 'small',
        type: 'humanoïde',
        alignment: { fr: 'Neutre mauvais', en: 'Neutral Evil' },
        ac: 15,
        acDetail: null,
        hp: { avg: 30, formula: '4d6 + 16' },
        speed: { walk: 30 },
        abilities: { for: 10, dex: 16, con: 14, int: 10, sag: 9, cha: 12 },
        saves: {},
        skills: {},
        resistances: [],
        immunities: [],
        vulnerabilities: [],
        conditionImmunities: [],
        senses: { darkvision: 60, passivePerception: 9 },
        languages: ['commun', 'gobelin'],
        cr: 1,
        xp: 200,
        traits: [],
        actions: [
          {
            name: { fr: 'Cimeterre', en: 'Scimitar' },
            description: { fr: 'Mêlée +5, 1d6+3 tranchant.' },
          },
        ],
        reactions: null,
        legendaryActions: null,
        source: 'srd-5.2.1',
      },
    ],
    'magic-items': [
      {
        id: 'couronne-gobeline-uat',
        name: { fr: 'Couronne gobeline', en: 'Goblin Crown' },
        category: 'gear',
        rarity: 'uncommon',
        attunement: true,
        magicDescription: { fr: 'Commande les gobelins à portée de voix.' },
        description: null,
        source: 'srd-5.2.1',
      },
    ],
  },
};

test.describe('UAT — bestiaire + objet magique custom dans le Codex', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(!ok, 'Firestore emulator unreachable — skipping bestiary-codex UAT.');
    mkdirSync(OUT, { recursive: true });
  });

  test('import pack (monstre + objet magique) → visibles dans le Codex', async ({
    page,
  }) => {
    await page.goto('/account/content');
    await waitForAppReady(page);

    await page.getByTestId('pack-file-input').setInputFiles({
      name: 'pack-bestiaire.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(PACK), 'utf-8'),
    });
    await page.getByTestId('pack-import-confirm').click();
    await page
      .locator(`[data-pack-id="${PACK.meta.id}"]`)
      .waitFor({ timeout: 10_000 });

    // Codex → onglet Bestiaire : le monstre custom apparaît.
    await page.goto('/codex');
    await waitForAppReady(page);
    await page.getByRole('tab', { name: /Bestiaire/ }).click();
    await expect(page.getByText('Roi gobelin')).toBeVisible({ timeout: 10_000 });

    // Identité : ouvrir la fiche → FP + action exacts.
    await page.getByText('Roi gobelin').click();
    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByText('Petite · humanoïde · FP 1'),
    ).toBeVisible();
    await expect(dialog.getByText(/Cimeterre/)).toBeVisible();
    await page.screenshot({
      path: path.join(OUT, '01-bestiaire-monstre-custom.png'),
      fullPage: true,
    });
    await page.keyboard.press('Escape');

    // Onglet Objets magiques : l'objet custom apparaît.
    await page.getByRole('tab', { name: /Objets magiques/ }).click();
    await expect(page.getByText('Couronne gobeline')).toBeVisible({
      timeout: 10_000,
    });
    await page.screenshot({
      path: path.join(OUT, '02-objet-magique-custom.png'),
      fullPage: true,
    });
  });
});
