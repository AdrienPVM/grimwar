import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * UAT — autofill d'une rencontre depuis le bestiaire (directive 2026-06-27).
 *
 * Boucle complète : import d'un pack monstre via `/account/content` → création
 * d'une campagne → modale « Créer une rencontre » → bouton « Depuis le bestiaire »
 * → choix du monstre → la ligne se préremplit (nom + PV du bloc de stats) →
 * soumission. Prouve le chemin heureux que le test unitaire couvre côté données,
 * mais ici visuellement de bout en bout.
 *
 * Émulateur Firestore requis. Captures dans `uat-review/encounter-bestiary/`.
 */
const OUT = path.resolve(process.cwd(), 'uat-review', 'encounter-bestiary');

const PACK = {
  meta: {
    id: 'pack-rencontre-uat',
    name: { fr: 'Bestiaire rencontre UAT', en: 'Encounter Bestiary UAT' },
    version: '1.0.0',
    author: 'Adrien e2e',
    createdAt: '2026-06-27T12:00:00Z',
  },
  entities: {
    monsters: [
      {
        id: 'ours-hibou-uat',
        name: { fr: 'Ours-hibou', en: 'Owlbear' },
        size: 'large',
        type: 'monstruosité',
        alignment: { fr: 'Non aligné', en: 'Unaligned' },
        ac: 13,
        acDetail: null,
        hp: { avg: 59, formula: '7d10 + 21' },
        speed: { walk: 40 },
        abilities: { for: 20, dex: 12, con: 17, int: 3, sag: 12, cha: 7 },
        saves: {},
        skills: {},
        resistances: [],
        immunities: [],
        vulnerabilities: [],
        conditionImmunities: [],
        senses: { darkvision: 60, passivePerception: 13 },
        languages: [],
        cr: 3,
        xp: 700,
        traits: [],
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

test.describe('UAT — autofill rencontre depuis le bestiaire', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(!ok, 'Firestore emulator unreachable — skipping encounter bestiary UAT.');
    mkdirSync(OUT, { recursive: true });
  });

  test('import pack → pick monstre → ligne préremplie → rencontre créée', async ({
    page,
  }) => {
    // ─── 1. Importe un pack contenant l'ours-hibou (PV moyens 59).
    await page.goto('/account/content');
    await waitForAppReady(page);
    await page.getByTestId('pack-file-input').setInputFiles({
      name: 'pack-rencontre.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(PACK), 'utf-8'),
    });
    await page.getByTestId('pack-import-confirm').click();
    await page
      .locator(`[data-pack-id="${PACK.meta.id}"]`)
      .waitFor({ timeout: 10_000 });

    // ─── 2. Crée une campagne et ouvre ses rencontres.
    await page.goto('/campaigns');
    await waitForAppReady(page);
    await page.getByRole('button', { name: /Créer une campagne/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel(/Nom de la campagne/i).fill('La Forêt hurlante');
    await page.getByRole('button', { name: /^Créer$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });
    await page.getByRole('button', { name: /^Rencontres$/ }).click();
    await expect(page).toHaveURL(/\/campaigns\/[^/]+\/encounters$/);

    // ─── 3. Ouvre la modale + le sélecteur de bestiaire.
    await page.getByRole('button', { name: /Créer une rencontre/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: /Depuis le bestiaire/i }).click();

    // Le bestiaire liste l'ours-hibou (importé) → capture du sélecteur peuplé.
    const owlbearRow = page.getByTestId('monster-pick-ours-hibou-uat');
    await expect(owlbearRow).toBeVisible({ timeout: 10_000 });
    await page.screenshot({
      path: path.join(OUT, '01-selecteur-bestiaire-peuple.png'),
      fullPage: false,
    });

    // ─── 4. Choisit l'ours-hibou → la ligne se préremplit (nom + PV 59).
    await owlbearRow.click();
    // Le nom du monstre est dans le champ « Nom » de la ligne (placeholder Gobelin),
    // les PV moyens (59) dans le champ PV adjacent — assertion sur la valeur saisie.
    const nameInput = page.getByPlaceholder('Ex. « Gobelin »');
    await expect(nameInput).toHaveValue('Ours-hibou');
    await expect(page.getByLabel('PV').first()).toHaveValue('59');
    await page.screenshot({
      path: path.join(OUT, '02-ligne-preremplie.png'),
      fullPage: true,
    });

    // ─── 5. Nomme et soumet la rencontre → elle apparaît dans la liste.
    await page.getByLabel(/Nom de la rencontre/i).fill('Embuscade dans la clairière');
    await page.getByRole('button', { name: /^Créer$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });
    await expect(page.getByText('Embuscade dans la clairière')).toBeVisible();
    await page.screenshot({
      path: path.join(OUT, '03-rencontre-creee.png'),
      fullPage: true,
    });
  });
});
