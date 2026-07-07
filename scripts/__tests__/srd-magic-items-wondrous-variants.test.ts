import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  SRD_MAGIC_ITEMS_WONDROUS_VARIANTS,
  SRD_MAGIC_ITEMS_WONDROUS_VARIANTS_COUNTS,
} from '../data/srd-magic-items-wondrous-variants';

/**
 * Batch D29.19 — Objets merveilleux à tables/variantes SRD CC v5.2.1 : backfill EN
 * + correction Harmonisation + rareté Orbe (common→artifact) + 2 drifts de nom.
 * 1 very rare + 1 legendary + 1 artifact = 3, dont 2 harmonisées.
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

describe('SRD magic items — Variantes D29.19 (cat. 4 compteurs)', () => {
  it('module exporte 1 very rare + 1 legendary + 1 artifact = 3 entrées, 2 harmonisées', () => {
    expect(SRD_MAGIC_ITEMS_WONDROUS_VARIANTS_COUNTS.total).toBe(3);
    expect(SRD_MAGIC_ITEMS_WONDROUS_VARIANTS_COUNTS.veryRare).toBe(1);
    expect(SRD_MAGIC_ITEMS_WONDROUS_VARIANTS_COUNTS.legendary).toBe(1);
    expect(SRD_MAGIC_ITEMS_WONDROUS_VARIANTS_COUNTS.artifact).toBe(1);
    expect(SRD_MAGIC_ITEMS_WONDROUS_VARIANTS_COUNTS.attuned).toBe(2);
  });

  it('toutes les entrées : category=gear, source=srd-5.2.1, name.en + magicDescription.en présents', () => {
    for (const entry of SRD_MAGIC_ITEMS_WONDROUS_VARIANTS) {
      expect(entry.category, `${entry.id}.category`).toBe('gear');
      expect(entry.source, `${entry.id}.source`).toBe('srd-5.2.1');
      expect(entry.name.en, `${entry.id}.name.en`).toBeTruthy();
      expect(entry.magicDescription.en, `${entry.id}.magicDescription.en`).toBeTruthy();
    }
  });
});

describe('SRD magic items — Variantes D29.19 (cat. 3 pin valeurs SRD officielles)', () => {
  it('Amulet of the Planes — very rare, Harmonisation (corrigé), table destinations', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'amulette-des-plans');
    expect(e?.name.en).toBe('Amulet of the Planes');
    expect(e?.rarity).toBe('very rare');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/DC 15 Intelligence \(Arcana\) check/);
    expect(e?.magicDescription.en).toMatch(/91–00, Random location on the Astral Plane/);
  });

  it('Apparatus of the Crab — DRIFT « Submersible du Crabe », legendary, sans Harmonisation', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'submersible-de-kwalish');
    expect(e?.name.fr).toBe('Submersible du Crabe');
    expect(e?.name.fr).not.toBe('Submersible de Kwalish');
    expect(e?.name.en).toBe('Apparatus of the Crab');
    expect(e?.rarity).toBe('legendary');
    expect(e?.attunement).toBe(false);
    expect(e?.magicDescription.en).toMatch(/Ten levers are set in a row/);
    expect(e?.magicDescription.en).toMatch(/The rear hatch unseals and opens/);
  });

  it('Dragon Orb — DRIFT « Orbe draconique » + rareté common→artifact, Harmonisation', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'orbe-des-dragons');
    expect(e?.name.fr).toBe('Orbe draconique');
    expect(e?.name.fr).not.toBe('Orbe des dragons');
    expect(e?.name.en).toBe('Dragon Orb');
    expect(e?.rarity).toBe('artifact');
    expect(e?.rarity).not.toBe('common');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/advance the worship of Tiamat/);
    expect(e?.magicDescription.en).toMatch(/Cure Wounds \(level 9 version\) 4/);
  });
});

describe('SRD magic items — Variantes D29.19 (cat. 1 référentielle bundle)', () => {
  it('les 3 objets sont présents dans le bundle avec name.en/fr + source srd', async () => {
    const bundle = await loadBundle();
    for (const entry of SRD_MAGIC_ITEMS_WONDROUS_VARIANTS) {
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
describe('SRD magic items — Variantes D29.19 (anti-fabrication vs source SRD EN)', () => {
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
    for (const entry of SRD_MAGIC_ITEMS_WONDROUS_VARIANTS) {
      const firstParagraph = entry.magicDescription.en.split('\n\n')[0];
      const probe = normalize(firstParagraph.split('\n')[0]).slice(0, 90);
      expect(source.includes(probe), `${entry.id} : EN introuvable verbatim → « ${probe} »`).toBe(true);
    }
  });
});
