import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { SRD_MAGIC_ITEMS_WORN, SRD_MAGIC_ITEMS_WORN_COUNTS } from '../data/srd-magic-items-worn';

/**
 * Batch D29.14 — Objets portés SRD CC v5.2.1 : backfill EN + correction de
 * l'Harmonisation (6/8) + rareté du Ceinturon de force de géant (common→rare) +
 * drift de nom « Collier de perles de prière » → « Chapelet mystique ».
 * 7 rare + 1 legendary = 8, dont 6 harmonisées.
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

describe('SRD magic items — Objets portés D29.14 (cat. 4 compteurs)', () => {
  it('module exporte 7 rare + 1 legendary = 8 entrées, 6 harmonisées', () => {
    expect(SRD_MAGIC_ITEMS_WORN_COUNTS.total).toBe(8);
    expect(SRD_MAGIC_ITEMS_WORN_COUNTS.rare).toBe(7);
    expect(SRD_MAGIC_ITEMS_WORN_COUNTS.legendary).toBe(1);
    expect(SRD_MAGIC_ITEMS_WORN_COUNTS.attuned).toBe(6);
  });

  it('toutes les entrées : category=gear, source=srd-5.2.1, name.en + magicDescription.en présents', () => {
    for (const entry of SRD_MAGIC_ITEMS_WORN) {
      expect(entry.category, `${entry.id}.category`).toBe('gear');
      expect(entry.source, `${entry.id}.source`).toBe('srd-5.2.1');
      expect(entry.name.en, `${entry.id}.name.en`).toBeTruthy();
      expect(entry.magicDescription.en, `${entry.id}.magicDescription.en`).toBeTruthy();
    }
  });

  it('aucun slug dupliqué dans le module', () => {
    const seen = new Set<string>();
    for (const entry of SRD_MAGIC_ITEMS_WORN) {
      expect(seen.has(entry.id), `slug dupliqué : ${entry.id}`).toBe(false);
      seen.add(entry.id);
    }
  });
});

describe('SRD magic items — Objets portés D29.14 (cat. 3 pin valeurs SRD officielles)', () => {
  it('Periapt of Proof against Poison — rare, Harmonisation (corrigé), immunité poison', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'amulette-de-protection-contre-le-poison');
    expect(e?.name.en).toBe('Periapt of Proof against Poison');
    expect(e?.rarity).toBe('rare');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/Immunity\s+to the Poisoned condition and Poison damage/);
  });

  it('Belt of Giant Strength — DRIFT rareté common→rare, Harmonisation, table géants', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'ceinturon-de-force-de-geant');
    expect(e?.name.en).toBe('Belt of Giant Strength');
    expect(e?.rarity).toBe('rare');
    expect(e?.rarity).not.toBe('common');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/\(hill\) 21, Rare/);
    expect(e?.magicDescription.en).toMatch(/\(storm\) 29, Legendary/);
  });

  it('Belt of Dwarvenkind — rare, Harmonisation (corrigé), +2 Constitution', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'ceinturon-des-nains');
    expect(e?.name.en).toBe('Belt of Dwarvenkind');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/Toughness\./);
  });

  it('Necklace of Prayer Beads — DRIFT « Chapelet mystique », qualifiée Clerc/Druide/Paladin, table divergente', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'collier-de-perles-de-priere');
    expect(e?.name.fr).toBe('Chapelet mystique');
    expect(e?.name.fr).not.toBe('Collier de perles de prière');
    expect(e?.name.en).toBe('Necklace of Prayer Beads');
    expect(typeof e?.attunement).toBe('object');
    expect((e?.attunement as { en: string }).en).toBe('Requires Attunement by a Cleric, Druid, or Paladin');
    // Table EN officielle.
    expect(e?.magicDescription.en).toMatch(/Bead of Blessing 1–6, Bless/);
    // Table FR officielle (ordre + tranches distincts).
    expect(e?.magicDescription.fr).toMatch(/Perle de châtiment 7-8, châtiment de révélation/);
  });

  it('Necklace of Fireballs — rare, sans Harmonisation, boules niv.3', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'collier-de-boules-de-feu');
    expect(e?.name.en).toBe('Necklace of Fireballs');
    expect(e?.attunement).toBe(false);
    expect(e?.magicDescription.en).toMatch(/level 3 Fire.*ball \(save DC 15\)/s);
  });

  it('Scarab of Protection — legendary, Harmonisation (corrigé), 12 charges', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'scarabee-de-protection');
    expect(e?.name.en).toBe('Scarab of Protection');
    expect(e?.rarity).toBe('legendary');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/The scarab has 12 charges/);
  });

  it('Bead of Force — perle-de-force, rare, sans Harmonisation, 5d4 force', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'perle-de-force');
    expect(e?.name.en).toBe('Bead of Force');
    expect(e?.attunement).toBe(false);
    expect(e?.magicDescription.en).toMatch(/take 5d4 Force damage/);
  });
});

describe('SRD magic items — Objets portés D29.14 (cat. 1 référentielle bundle)', () => {
  it('les 8 objets sont présents dans le bundle avec name.en/fr + source srd', async () => {
    const bundle = await loadBundle();
    for (const entry of SRD_MAGIC_ITEMS_WORN) {
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
describe('SRD magic items — Objets portés D29.14 (anti-fabrication vs source SRD EN)', () => {
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
    for (const entry of SRD_MAGIC_ITEMS_WORN) {
      const firstParagraph = entry.magicDescription.en.split('\n\n')[0];
      const probe = normalize(firstParagraph.split('\n')[0]).slice(0, 90);
      expect(source.includes(probe), `${entry.id} : EN introuvable verbatim → « ${probe} »`).toBe(true);
    }
  });
});
