import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  SRD_MAGIC_ITEMS_CONSUMABLES,
  SRD_MAGIC_ITEMS_CONSUMABLES_COUNTS,
} from '../data/srd-magic-items-consumables';

/**
 * Batch D29.15 — Consommables (huiles, élixirs, colle/solvant) SRD CC v5.2.1 :
 * backfill EN. 2 rare + 2 very rare + 2 legendary = 6, 0 harmonisé, aucun drift.
 * Mapping notable : elixir-de-jouvence = Potion of Longevity.
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

describe('SRD magic items — Consommables D29.15 (cat. 4 compteurs)', () => {
  it('module exporte 2 rare + 2 very rare + 2 legendary = 6 entrées, 0 harmonisée', () => {
    expect(SRD_MAGIC_ITEMS_CONSUMABLES_COUNTS.total).toBe(6);
    expect(SRD_MAGIC_ITEMS_CONSUMABLES_COUNTS.rare).toBe(2);
    expect(SRD_MAGIC_ITEMS_CONSUMABLES_COUNTS.veryRare).toBe(2);
    expect(SRD_MAGIC_ITEMS_CONSUMABLES_COUNTS.legendary).toBe(2);
    expect(SRD_MAGIC_ITEMS_CONSUMABLES_COUNTS.attuned).toBe(0);
  });

  it('toutes les entrées : category=gear, source=srd-5.2.1, sans Harmonisation, name.en présent', () => {
    for (const entry of SRD_MAGIC_ITEMS_CONSUMABLES) {
      expect(entry.category, `${entry.id}.category`).toBe('gear');
      expect(entry.source, `${entry.id}.source`).toBe('srd-5.2.1');
      expect(entry.attunement, `${entry.id}.attunement`).toBe(false);
      expect(entry.name.en, `${entry.id}.name.en`).toBeTruthy();
      expect(entry.magicDescription.en, `${entry.id}.magicDescription.en`).toBeTruthy();
    }
  });
});

describe('SRD magic items — Consommables D29.15 (cat. 3 pin valeurs SRD officielles)', () => {
  it('Potion of Longevity — elixir-de-jouvence, very rare, -1d6+6 ans', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'elixir-de-jouvence');
    expect(e?.name.fr).toBe('Élixir de jouvence');
    expect(e?.name.en).toBe('Potion of Longevity');
    expect(e?.rarity).toBe('very rare');
    expect(e?.magicDescription.en).toMatch(/reduced by 1d6 \+ 6 years, to a minimum of 13 years/);
  });

  it('Oil of Sharpness — huile-d-affutage, very rare, +3', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'huile-d-affutage');
    expect(e?.name.en).toBe('Oil of Sharpness');
    expect(e?.rarity).toBe('very rare');
    expect(e?.magicDescription.en).toMatch(/into a \+3 Weapon or the coated ammunition\s+into \+3 Ammunition/);
  });

  it('Oil of Etherealness — huile-etheree, rare, forme éthérée 1 h', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'huile-etheree');
    expect(e?.name.en).toBe('Oil of Etherealness');
    expect(e?.rarity).toBe('rare');
    expect(e?.magicDescription.en).toMatch(/effect of the Etherealness spell for 1 hour/);
  });

  it('Elixir of Health — elixir-de-sante, rare, guérit contagions', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'elixir-de-sante');
    expect(e?.name.en).toBe('Elixir of Health');
    expect(e?.magicDescription.en).toMatch(/cured of all magical contagions/);
  });

  it('Sovereign Glue & Universal Solvent — legendary', async () => {
    const bundle = await loadBundle();
    const glue = bundle.find((i) => i.id === 'colle-universelle');
    expect(glue?.name.en).toBe('Sovereign Glue');
    expect(glue?.rarity).toBe('legendary');
    expect(glue?.magicDescription.en).toMatch(/permanent adhesive bond between any two objects/);
    const solvent = bundle.find((i) => i.id === 'solvant-universel');
    expect(solvent?.name.en).toBe('Universal Solvent');
    expect(solvent?.rarity).toBe('legendary');
    expect(solvent?.magicDescription.en).toMatch(/dissolves up to 1\s+square foot of adhesive/);
  });
});

describe('SRD magic items — Consommables D29.15 (cat. 1 référentielle bundle)', () => {
  it('les 6 objets sont présents dans le bundle avec name.en/fr + source srd', async () => {
    const bundle = await loadBundle();
    for (const entry of SRD_MAGIC_ITEMS_CONSUMABLES) {
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
describe('SRD magic items — Consommables D29.15 (anti-fabrication vs source SRD EN)', () => {
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
    for (const entry of SRD_MAGIC_ITEMS_CONSUMABLES) {
      const firstParagraph = entry.magicDescription.en.split('\n\n')[0];
      const probe = normalize(firstParagraph.split('\n')[0]).slice(0, 90);
      expect(source.includes(probe), `${entry.id} : EN introuvable verbatim → « ${probe} »`).toBe(true);
    }
  });
});
