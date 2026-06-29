import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  SRD_MAGIC_ITEMS_STAVES,
  SRD_MAGIC_ITEMS_STAVES_COUNTS,
} from '../data/srd-magic-items-staves';

/**
 * Batch D29.3 — Bâtons SRD CC v5.2.1 (backfill EN + correction des drifts
 * FR/attunement hérités d'AideDD). 1 uncommon + 5 rare + 5 very rare + 1
 * legendary = 12.
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

describe('SRD magic items — Staves D29.3 (cat. 4 compteurs)', () => {
  it('module exporte 1 uncommon + 5 rare + 5 very rare + 1 legendary = 12 entrées', () => {
    expect(SRD_MAGIC_ITEMS_STAVES_COUNTS.total).toBe(12);
    expect(SRD_MAGIC_ITEMS_STAVES_COUNTS.uncommon).toBe(1);
    expect(SRD_MAGIC_ITEMS_STAVES_COUNTS.rare).toBe(5);
    expect(SRD_MAGIC_ITEMS_STAVES_COUNTS.veryRare).toBe(5);
    expect(SRD_MAGIC_ITEMS_STAVES_COUNTS.legendary).toBe(1);
  });

  it('toutes les entrées : category=gear, source=srd-5.2.1, name.en + magicDescription.en présents', () => {
    for (const entry of SRD_MAGIC_ITEMS_STAVES) {
      expect(entry.category, `${entry.id}.category`).toBe('gear');
      expect(entry.source, `${entry.id}.source`).toBe('srd-5.2.1');
      expect(entry.name.en, `${entry.id}.name.en`).toBeTruthy();
      expect(entry.magicDescription.en, `${entry.id}.magicDescription.en`).toBeTruthy();
    }
  });

  it('toutes les entrées exigent l\'Harmonisation (corrige le bundle qui les avait toutes à false)', () => {
    for (const entry of SRD_MAGIC_ITEMS_STAVES) {
      expect(entry.attunement, `${entry.id}.attunement ne doit pas être false`).not.toBe(false);
    }
  });

  it('aucun slug dupliqué dans le module', () => {
    const seen = new Set<string>();
    for (const entry of SRD_MAGIC_ITEMS_STAVES) {
      expect(seen.has(entry.id), `slug dupliqué : ${entry.id}`).toBe(false);
      seen.add(entry.id);
    }
  });
});

describe('SRD magic items — Staves D29.3 (cat. 3 pin valeurs SRD officielles)', () => {
  it('Staff of the Magi — legendary — incantateurs + 4d6+2 + table complète', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'baton-du-thaumaturge');
    expect(e?.name.fr).toBe('Bâton du thaumaturge');
    expect(e?.name.en).toBe('Staff of the Magi');
    expect(e?.rarity).toBe('legendary');
    expect(e?.attunement).toEqual({
      fr: 'Harmonisation requise avec un Ensorceleur, Magicien ou Occultiste',
      en: 'Requires Attunement by a Sorcerer, Warlock, or Wizard',
    });
    expect(e?.magicDescription.en).toMatch(/This staff has 50 charges/);
    expect(e?.magicDescription.en).toMatch(/The staff regains 4d6 \+ 2 expended charges/);
    // Retributive Strike du Magi = 6× (≠ Power qui est 4×)
    expect(e?.magicDescription.en).toMatch(/Force damage equal to 6 times the number of charges/);
    expect(e?.magicDescription.fr).toMatch(/Absorption de sort\./);
  });

  it('Staff of Power — very rare — incantateurs + Retributive 4×', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'baton-de-surpuissance');
    expect(e?.name.en).toBe('Staff of Power');
    expect(e?.attunement).toEqual({
      fr: 'Harmonisation requise avec un Ensorceleur, Magicien ou Occultiste',
      en: 'Requires Attunement by a Sorcerer, Warlock, or Wizard',
    });
    expect(e?.magicDescription.en).toMatch(/Force damage equal to 4 times the number of charges/);
  });

  it('Staff of Charming — rare — harmonisation 6 classes', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'baton-d-envoutement');
    expect(e?.name.en).toBe('Staff of Charming');
    expect(e?.attunement).toEqual({
      fr: 'Harmonisation requise avec un Barde, Clerc, Druide, Ensorceleur, Magicien ou Occultiste',
      en: 'Requires Attunement by a Bard, Cleric, Druid, Sorcerer, Warlock, or Wizard',
    });
    expect(e?.magicDescription.en).toMatch(/Reflect Enchantment\./);
    expect(e?.magicDescription.en).toMatch(/Resist Enchantment\./);
  });

  it('Staff of Swarming Insects — rare — name.fr officiel (corrige « de grand essaim »→« du »)', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'baton-de-grand-essaim');
    expect(e?.name.fr).toBe('Bâton du grand essaim');
    expect(e?.name.en).toBe('Staff of Swarming Insects');
    expect(e?.magicDescription.fr).toMatch(/met fin à l'effet\./);
    expect(e?.magicDescription.en).toMatch(/Giant Insect: 4 charges; Insect Plague: 5 charges\./);
  });

  it('Staff of the Woodlands — rare — Druide uniquement', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'baton-des-forets');
    expect(e?.name.en).toBe('Staff of the Woodlands');
    expect(e?.attunement).toEqual({
      fr: 'Harmonisation requise avec un Druide',
      en: 'Requires Attunement by a Druid',
    });
    expect(e?.magicDescription.en).toMatch(/Tree Form\./);
  });

  it('Staff of the Python — uncommon — Harmonisation simple (true)', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'baton-du-python');
    expect(e?.name.en).toBe('Staff of the Python');
    expect(e?.rarity).toBe('uncommon');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/Giant Constrictor Snake/);
  });

  it('Staff of Striking — very rare — +3 quarterstaff, Harmonisation simple', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'baton-percussif');
    expect(e?.name.en).toBe('Staff of Striking');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/\+3 bonus to attack rolls and damage rolls/);
  });
});

describe('SRD magic items — Staves D29.3 (cat. 1 référentielle bundle)', () => {
  it('les 12 bâtons sont présents dans le bundle avec name.en + source srd', async () => {
    const bundle = await loadBundle();
    for (const entry of SRD_MAGIC_ITEMS_STAVES) {
      const inBundle = bundle.find((i) => i.id === entry.id);
      expect(inBundle, `slug ${entry.id} absent du bundle`).toBeDefined();
      expect(inBundle?.name.en, `${entry.id}.name.en dans bundle`).toBe(entry.name.en);
      expect(inBundle?.source, `${entry.id}.source dans bundle`).toBe('srd-5.2.1');
    }
  });
});

/**
 * Garde anti-fabrication : la 1re phrase de chaque `magicDescription.en` doit
 * être une sous-chaîne verbatim de l'extraction SRD EN. Source `.txt`
 * gitignorée → skip propre en CI.
 */
describe('SRD magic items — Staves D29.3 (anti-fabrication vs source SRD EN)', () => {
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
    for (const entry of SRD_MAGIC_ITEMS_STAVES) {
      const firstParagraph = entry.magicDescription.en.split('\n\n')[0];
      const probe = normalize(firstParagraph.split('\n')[0]).slice(0, 90);
      expect(source.includes(probe), `${entry.id} : EN introuvable verbatim → « ${probe} »`).toBe(true);
    }
  });
});
