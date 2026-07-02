import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { SRD_MAGIC_ITEMS_CLOAKS, SRD_MAGIC_ITEMS_CLOAKS_COUNTS } from '../data/srd-magic-items-cloaks';

/**
 * Batch D29.11 — Capes, manteau & robes SRD CC v5.2.1 (backfill EN + correction
 * de l'Harmonisation héritée d'AideDD sur 9 des 10). 6 rare + 3 very rare +
 * 1 legendary = 10, dont 9 harmonisées (Cape du prestidigitateur non).
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

describe('SRD magic items — Capes/robes D29.11 (cat. 4 compteurs)', () => {
  it('module exporte 6 rare + 3 very rare + 1 legendary = 10 entrées, 9 harmonisées', () => {
    expect(SRD_MAGIC_ITEMS_CLOAKS_COUNTS.total).toBe(10);
    expect(SRD_MAGIC_ITEMS_CLOAKS_COUNTS.rare).toBe(6);
    expect(SRD_MAGIC_ITEMS_CLOAKS_COUNTS.veryRare).toBe(3);
    expect(SRD_MAGIC_ITEMS_CLOAKS_COUNTS.legendary).toBe(1);
    expect(SRD_MAGIC_ITEMS_CLOAKS_COUNTS.attuned).toBe(9);
  });

  it('toutes les entrées : category=gear, source=srd-5.2.1, name.en + magicDescription.en présents', () => {
    for (const entry of SRD_MAGIC_ITEMS_CLOAKS) {
      expect(entry.category, `${entry.id}.category`).toBe('gear');
      expect(entry.source, `${entry.id}.source`).toBe('srd-5.2.1');
      expect(entry.name.en, `${entry.id}.name.en`).toBeTruthy();
      expect(entry.magicDescription.en, `${entry.id}.magicDescription.en`).toBeTruthy();
    }
  });

  it('aucun slug dupliqué dans le module', () => {
    const seen = new Set<string>();
    for (const entry of SRD_MAGIC_ITEMS_CLOAKS) {
      expect(seen.has(entry.id), `slug dupliqué : ${entry.id}`).toBe(false);
      seen.add(entry.id);
    }
  });
});

describe('SRD magic items — Capes/robes D29.11 (cat. 3 pin valeurs SRD officielles)', () => {
  it('Cloak of Displacement — rare, Harmonisation, illusion Désavantage', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'cape-de-deplacement');
    expect(e?.name.en).toBe('Cloak of Displacement');
    expect(e?.rarity).toBe('rare');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/Disadvantage on attack rolls against\s+you/);
  });

  it('Cloak of Arachnida — very rare, Harmonisation, Web DC 13', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'cape-de-l-arachnide');
    expect(e?.name.en).toBe('Cloak of Arachnida');
    expect(e?.rarity).toBe('very rare');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/You can cast Web \(save DC 13\)/);
  });

  it('Wings of Flying — cape-de-vol, rare, Harmonisation, vol 60 pieds', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'cape-de-vol');
    expect(e?.name.fr).toBe('Cape de vol');
    expect(e?.name.en).toBe('Wings of Flying');
    expect(e?.rarity).toBe('rare');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/a pair of wings on your\s+back/);
    expect(e?.magicDescription.en).toMatch(/Fly Speed of 60 feet/);
  });

  it('Cape of the Mountebank — cape-du-prestidigitateur, rare, AUCUNE Harmonisation', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'cape-du-prestidigitateur');
    expect(e?.name.en).toBe('Cape of the Mountebank');
    expect(e?.rarity).toBe('rare');
    expect(e?.attunement).toBe(false);
    expect(e?.magicDescription.en).toMatch(/cast Dimension Door as a\s+Magic action/);
  });

  it('Robe of the Archmagi — legendary, Harmonisation qualifiée « Sorcerer, Warlock, or Wizard »', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'robe-de-l-archimage');
    expect(e?.name.en).toBe('Robe of the Archmagi');
    expect(e?.rarity).toBe('legendary');
    expect(typeof e?.attunement).toBe('object');
    expect((e?.attunement as { en: string }).en).toBe('Requires Attunement by a Sorcerer, Warlock, or Wizard');
    expect((e?.attunement as { fr: string }).fr).toBe(
      'Harmonisation requise avec un Ensorceleur, Magicien ou Occultiste',
    );
    expect(e?.magicDescription.en).toMatch(/War Mage\./);
  });

  it('Robe of Eyes — robe-de-vision-totale, rare, Harmonisation, Truesight 120', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'robe-de-vision-totale');
    expect(e?.name.en).toBe('Robe of Eyes');
    expect(e?.rarity).toBe('rare');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/Darkvision and Truesight,\s+both with a range of 120 feet/);
  });

  it('Robe of Scintillating Colors — robe-prismatique, very rare, Harmonisation, 3 charges', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'robe-prismatique');
    expect(e?.name.en).toBe('Robe of Scintillating Colors');
    expect(e?.rarity).toBe('very rare');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/shifting pattern\s+of dazzling hues/);
  });
});

describe('SRD magic items — Capes/robes D29.11 (cat. 1 référentielle bundle)', () => {
  it('les 10 objets sont présents dans le bundle avec name.en/fr + source srd', async () => {
    const bundle = await loadBundle();
    for (const entry of SRD_MAGIC_ITEMS_CLOAKS) {
      const inBundle = bundle.find((i) => i.id === entry.id);
      expect(inBundle, `slug ${entry.id} absent du bundle`).toBeDefined();
      expect(inBundle?.name.en, `${entry.id}.name.en dans bundle`).toBe(entry.name.en);
      expect(inBundle?.name.fr, `${entry.id}.name.fr dans bundle`).toBe(entry.name.fr);
      expect(inBundle?.source, `${entry.id}.source dans bundle`).toBe('srd-5.2.1');
    }
  });
});

/**
 * Garde anti-fabrication : la 1re phrase de chaque `magicDescription.en` doit
 * être une sous-chaîne verbatim de l'extraction SRD EN.
 */
describe('SRD magic items — Capes/robes D29.11 (anti-fabrication vs source SRD EN)', () => {
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
    for (const entry of SRD_MAGIC_ITEMS_CLOAKS) {
      const firstParagraph = entry.magicDescription.en.split('\n\n')[0];
      const probe = normalize(firstParagraph.split('\n')[0]).slice(0, 90);
      expect(source.includes(probe), `${entry.id} : EN introuvable verbatim → « ${probe} »`).toBe(true);
    }
  });
});
