import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Batch D29.23 (garde finale) — Garde « non-SRD » (anti-fabrication).
 *
 * Ces magic-items grandfathered AideDD **n'existent pas dans le SRD CC v5.2.1**
 * (ni en-tête EN, ni en-tête FR — vérifié par grep exhaustif). Ils restent
 * volontairement **sans `name.en`** : on ne fabrique jamais de traduction EN pour
 * un contenu absent du SRD (politique de contenu LOCKED). Ce test échoue si l'un
 * d'eux se voit un jour ajouter un `name.en` sans source SRD — ou si un AUTRE item
 * se retrouve sans `name.en` (régression du backfill D29.1→D29.23).
 *
 * Cas particulier `anneau-de-resistance-au-poison` : ce n'est PAS un item SRD
 * distinct. Le SRD ne connaît qu'un seul « Ring of Resistance » à table de type de
 * dégâts (déjà backfillé sous le slug générique `anneau-de-resistance`). La
 * variante par-élément héritée d'AideDD reste sans `name.en` en attendant
 * l'arbitrage d'Adrien (fusion / re-tag / retrait — « décision 2 »).
 */

const MAGIC_ITEMS_JSON = path.resolve(__dirname, '../../public/data/magic-items.json');
const SRD_EN_TXT = path.resolve(__dirname, '../../content-sources/extracted/raw/SRD_CC_v5.2.1.txt');
const SRD_FR_TXT = path.resolve(__dirname, '../../content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt');

interface MagicItemEntry {
  id: string;
  name: { fr: string; en?: string };
}

async function loadBundle(): Promise<MagicItemEntry[]> {
  const raw = await readFile(MAGIC_ITEMS_JSON, 'utf-8');
  return JSON.parse(raw) as MagicItemEntry[];
}

/** slug → raison documentée de l'absence de name.en. */
const NON_SRD_ITEMS: Array<{ id: string; reason: string }> = [
  { id: 'armure-de-matelot', reason: "Mariner's Armor — absente du SRD 5.2.1" },
  { id: 'baume-de-keoghtom', reason: "Keoghtom's Ointment — absente du SRD 5.2.1" },
  { id: 'cruche-alchimique', reason: 'Alchemy Jug — absente du SRD 5.2.1' },
  { id: 'globe-flottant', reason: 'Floating Globe — absente du SRD 5.2.1' },
  { id: 'parchemin-de-protection', reason: 'Scroll of Protection — absente du SRD 5.2.1' },
  { id: 'potion-de-souffle-enflamme', reason: 'Potion of Fire Breath — absente du SRD 5.2.1 (legacy 2014)' },
  { id: 'sceptre-tentacule', reason: 'Tentacle Rod — absent du SRD 5.2.1 (legacy 2014)' },
  {
    id: 'anneau-de-resistance-au-poison',
    reason: "variante par-élément — le générique 'anneau-de-resistance' = Ring of Resistance couvre déjà (décision 2 Adrien)",
  },
];

describe('SRD magic items — Garde non-SRD (finale D29.23)', () => {
  it('les 8 items non-SRD sont présents dans le bundle SANS name.en', async () => {
    const bundle = await loadBundle();
    for (const { id, reason } of NON_SRD_ITEMS) {
      const e = bundle.find((i) => i.id === id);
      expect(e, `slug ${id} absent du bundle (${reason})`).toBeDefined();
      expect(e?.name.en, `${id} ne doit PAS avoir de name.en (${reason})`).toBeUndefined();
      expect(e?.name.fr, `${id}.name.fr doit rester présent`).toBeTruthy();
    }
  });

  it('couverture globale : SEULS les 8 items non-SRD restent sans name.en (backfill D29 complet)', async () => {
    const bundle = await loadBundle();
    const stillMissing = bundle.filter((i) => i.name?.fr && !i.name.en).map((i) => i.id).sort();
    const expected = NON_SRD_ITEMS.map((x) => x.id).sort();
    expect(stillMissing).toEqual(expected);
  });
});

/**
 * Garde d'absence vérifiée : aucun des noms EN présumés n'apparaît comme en-tête
 * d'objet magique dans l'extraction SRD EN. Skip propre si le `.txt` gitignoré
 * est absent (CI).
 */
describe('SRD magic items — Garde non-SRD (absence vérifiée vs source SRD)', () => {
  const available = existsSync(SRD_EN_TXT) && existsSync(SRD_FR_TXT);
  const maybe = available ? it : it.skip;

  if (!available) {
    it("sources SRD absentes (gitignore) → garde d'absence skippée", () => {
      expect(available).toBe(false);
    });
  }

  maybe("les noms EN présumés ne sont pas des en-têtes d'objet SRD", () => {
    const en = readFileSync(SRD_EN_TXT, 'utf-8');
    const forbiddenHeaders = [
      "Mariner's Armor",
      'Mariner’s Armor',
      "Keoghtom's Ointment",
      'Alchemy Jug',
      'Floating Globe',
      'Scroll of Protection',
      'Potion of Fire Breath',
      'Tentacle Rod',
    ];
    for (const h of forbiddenHeaders) {
      expect(en.includes(`\n${h}\n`), `en-tête SRD inattendu : « ${h} »`).toBe(false);
    }
  });
});
