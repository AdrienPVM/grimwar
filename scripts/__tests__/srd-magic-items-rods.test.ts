import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { SRD_MAGIC_ITEMS_RODS, SRD_MAGIC_ITEMS_RODS_COUNTS } from '../data/srd-magic-items-rods';

/**
 * Batch D29.5 — Sceptres / Rods SRD CC v5.2.1 (backfill EN + correction de
 * l'Harmonisation héritée d'AideDD : 4 des 5 sceptres l'exigent au SRD, le
 * Sceptre de sécurité non). 1 rare + 3 very rare + 1 legendary = 5.
 */

const MAGIC_ITEMS_JSON = path.resolve(__dirname, '../../public/data/magic-items.json');
const SRD_EN_TXT = path.resolve(__dirname, '../../content-sources/extracted/raw/SRD_CC_v5.2.1.txt');

interface MagicItemEntry {
  id: string;
  name: { fr: string; en?: string };
  category: string;
  rarity: string;
  attunement: boolean | { fr: string; en?: string };
  magicDescription: { fr: string; en?: string };
  description: { fr: string } | null;
  source: string;
}

async function loadBundle(): Promise<MagicItemEntry[]> {
  const raw = await readFile(MAGIC_ITEMS_JSON, 'utf-8');
  return JSON.parse(raw) as MagicItemEntry[];
}

describe('SRD magic items — Sceptres D29.5 (cat. 4 compteurs)', () => {
  it('module exporte 1 rare + 3 very rare + 1 legendary = 5 entrées, 4 harmonisées', () => {
    expect(SRD_MAGIC_ITEMS_RODS_COUNTS.total).toBe(5);
    expect(SRD_MAGIC_ITEMS_RODS_COUNTS.rare).toBe(1);
    expect(SRD_MAGIC_ITEMS_RODS_COUNTS.veryRare).toBe(3);
    expect(SRD_MAGIC_ITEMS_RODS_COUNTS.legendary).toBe(1);
    expect(SRD_MAGIC_ITEMS_RODS_COUNTS.attuned).toBe(4);
  });

  it('toutes les entrées : category=gear, source=srd-5.2.1, name.en + magicDescription.en présents', () => {
    for (const entry of SRD_MAGIC_ITEMS_RODS) {
      expect(entry.category, `${entry.id}.category`).toBe('gear');
      expect(entry.source, `${entry.id}.source`).toBe('srd-5.2.1');
      expect(entry.name.en, `${entry.id}.name.en`).toBeTruthy();
      expect(entry.magicDescription.en, `${entry.id}.magicDescription.en`).toBeTruthy();
    }
  });

  it('aucun slug dupliqué dans le module', () => {
    const seen = new Set<string>();
    for (const entry of SRD_MAGIC_ITEMS_RODS) {
      expect(seen.has(entry.id), `slug dupliqué : ${entry.id}`).toBe(false);
      seen.add(entry.id);
    }
  });
});

describe('SRD magic items — Sceptres D29.5 (cat. 3 pin valeurs SRD officielles)', () => {
  it('Rod of Absorption — very rare, Harmonisation requise — absorbe jusqu’à 50 niveaux', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'sceptre-d-absorption');
    expect(e?.name.fr).toBe("Sceptre d'absorption");
    expect(e?.name.en).toBe('Rod of Absorption');
    expect(e?.rarity).toBe('very rare');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/absorb and store up\s+to 50 levels of energy/);
  });

  it('Rod of Lordly Might — legendary, Harmonisation requise — masse +3 à six boutons', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'sceptre-de-puissance-seigneuriale');
    expect(e?.name.en).toBe('Rod of Lordly Might');
    expect(e?.rarity).toBe('legendary');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/functions as a\s+magic Mace that grants a \+3 bonus/);
    expect(e?.magicDescription.en).toMatch(/Drain Life\./);
  });

  it('Rod of Rulership — rare, Harmonisation requise — DD 15, 120 pieds, Charmé 8 h', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'sceptre-de-suzerainete');
    expect(e?.name.en).toBe('Rod of Rulership');
    expect(e?.rarity).toBe('rare');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/DC 15 Wisdom\s+saving throw or have the Charmed condition for 8/);
  });

  it('Rod of Security — very rare, AUCUNE Harmonisation (corrigé) — demi-plan jusqu’à 199 créatures', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'sceptre-de-securite');
    expect(e?.name.en).toBe('Rod of Security');
    expect(e?.rarity).toBe('very rare');
    expect(e?.attunement).toBe(false);
    expect(e?.magicDescription.en).toMatch(/up to 199 other willing creatures you can see\s+to a demiplane/);
  });

  it('Rod of Alertness — very rare, Harmonisation requise — Avantage Perception + Initiative', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'sceptre-de-vigilance');
    expect(e?.name.en).toBe('Rod of Alertness');
    expect(e?.rarity).toBe('very rare');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/Advantage on Wisdom \(Perception\) checks and on\s+Initiative rolls/);
    // Pas de mention parasite de « lanière/strap » (drift AideDD purgé).
    expect(e?.magicDescription.fr).not.toMatch(/lanière/);
  });
});

describe('SRD magic items — Sceptres D29.5 (cat. 1 référentielle bundle)', () => {
  it('les 5 sceptres sont présents dans le bundle avec name.en + source srd', async () => {
    const bundle = await loadBundle();
    for (const entry of SRD_MAGIC_ITEMS_RODS) {
      const inBundle = bundle.find((i) => i.id === entry.id);
      expect(inBundle, `slug ${entry.id} absent du bundle`).toBeDefined();
      expect(inBundle?.name.en, `${entry.id}.name.en dans bundle`).toBe(entry.name.en);
      expect(inBundle?.source, `${entry.id}.source dans bundle`).toBe('srd-5.2.1');
    }
  });

  it('le Sceptre tentacule (non-SRD) reste sans name.en', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'sceptre-tentacule');
    expect(e, 'sceptre-tentacule présent dans le bundle').toBeDefined();
    expect(e?.name.en, 'le Tentacle Rod est hors SRD 5.2.1 → pas de name.en fabriqué').toBeUndefined();
  });
});

/**
 * Garde anti-fabrication : la 1re phrase de chaque `magicDescription.en` doit
 * être une sous-chaîne verbatim de l'extraction SRD EN. Source `.txt`
 * gitignorée → skip propre en CI.
 */
describe('SRD magic items — Sceptres D29.5 (anti-fabrication vs source SRD EN)', () => {
  const sourceAvailable = existsSync(SRD_EN_TXT);
  const maybe = sourceAvailable ? it : it.skip;

  function normalize(raw: string): string {
    return raw
      .replace(/-\n/g, '')
      .replace(/System Reference Document 5\.2\.1\s*\n?\s*\d+/g, ' ')
      .replace(/[’‘]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  if (!sourceAvailable) {
    it('source SRD EN absente (gitignore) → garde verbatim skippée', () => {
      expect(sourceAvailable).toBe(false);
    });
  }

  maybe('chaque phrase EN distinctive existe verbatim dans SRD_CC_v5.2.1.txt', () => {
    const source = normalize(readFileSync(SRD_EN_TXT, 'utf-8'));
    for (const entry of SRD_MAGIC_ITEMS_RODS) {
      const firstParagraph = entry.magicDescription.en.split('\n\n')[0];
      const probe = normalize(firstParagraph.split('\n')[0]).slice(0, 90);
      expect(source.includes(probe), `${entry.id} : EN introuvable verbatim → « ${probe} »`).toBe(true);
    }
  });
});
