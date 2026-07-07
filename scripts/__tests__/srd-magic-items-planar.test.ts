import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { SRD_MAGIC_ITEMS_PLANAR, SRD_MAGIC_ITEMS_PLANAR_COUNTS } from '../data/srd-magic-items-planar';

/**
 * Batch D29.17 — Objets planaires & légendaires SRD CC v5.2.1 : backfill EN +
 * correction de l'Harmonisation (4/9). 2 rare + 7 legendary = 9, dont 4
 * harmonisées. Talisman du mal absolu : FR reconstruit (extraction interleavée).
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

describe('SRD magic items — Planaires D29.17 (cat. 4 compteurs)', () => {
  it('module exporte 2 rare + 7 legendary = 9 entrées, 4 harmonisées', () => {
    expect(SRD_MAGIC_ITEMS_PLANAR_COUNTS.total).toBe(9);
    expect(SRD_MAGIC_ITEMS_PLANAR_COUNTS.rare).toBe(2);
    expect(SRD_MAGIC_ITEMS_PLANAR_COUNTS.legendary).toBe(7);
    expect(SRD_MAGIC_ITEMS_PLANAR_COUNTS.attuned).toBe(4);
  });

  it('toutes les entrées : category=gear, source=srd-5.2.1, name.en + magicDescription.en présents', () => {
    for (const entry of SRD_MAGIC_ITEMS_PLANAR) {
      expect(entry.category, `${entry.id}.category`).toBe('gear');
      expect(entry.source, `${entry.id}.source`).toBe('srd-5.2.1');
      expect(entry.name.en, `${entry.id}.name.en`).toBeTruthy();
      expect(entry.magicDescription.en, `${entry.id}.magicDescription.en`).toBeTruthy();
    }
  });

  it('aucun slug dupliqué dans le module', () => {
    const seen = new Set<string>();
    for (const entry of SRD_MAGIC_ITEMS_PLANAR) {
      expect(seen.has(entry.id), `slug dupliqué : ${entry.id}`).toBe(false);
      seen.add(entry.id);
    }
  });
});

describe('SRD magic items — Planaires D29.17 (cat. 3 pin valeurs SRD officielles)', () => {
  it('Cube of Force — rare, Harmonisation (corrigé), table des faces', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'cube-de-force');
    expect(e?.name.en).toBe('Cube of Force');
    expect(e?.rarity).toBe('rare');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/Mage Armor 1; Shield 1; Tiny Hut 3/);
  });

  it('Talisman of Pure Good — legendary, Harmonisation qualifiée Clerc/Paladin', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'talisman-du-bien-ultime');
    expect(e?.name.en).toBe('Talisman of Pure Good');
    expect(typeof e?.attunement).toBe('object');
    expect((e?.attunement as { en: string }).en).toBe('Requires Attunement by a Cleric or Paladin');
    expect(e?.magicDescription.en).toMatch(/8d6 Radiant damage/);
    expect(e?.magicDescription.en).toMatch(/Pure Rebuke\./);
  });

  it('Talisman of Ultimate Evil — legendary, Harmonisation, FR reconstruit (limon malodorant)', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'talisman-du-mal-absolu');
    expect(e?.name.en).toBe('Talisman of Ultimate Evil');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/8d6 Necrotic damage/);
    expect(e?.magicDescription.en).toMatch(/dissolves into foul-smell.*ing slime/s);
    // FR reconstruit sans la table des leviers interleavée du Submersible.
    expect(e?.magicDescription.fr).toMatch(/limon malodorant, détruit à jamais/);
    expect(e?.magicDescription.fr).not.toMatch(/Levier|submersible/i);
  });

  it('Talisman of the Sphere — legendary, Harmonisation (corrigé)', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'talisman-de-la-sphere');
    expect(e?.name.en).toBe('Talisman of the Sphere');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/control a Sphere of Annihilation/);
  });

  it('Sphere of Annihilation — legendary, sans Harmonisation, table interactions', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'sphere-d-annihilation');
    expect(e?.name.en).toBe('Sphere of Annihilation');
    expect(e?.attunement).toBe(false);
    expect(e?.magicDescription.en).toMatch(/8d10 Force damage/);
    expect(e?.magicDescription.en).toMatch(/01–50, The sphere is destroyed/);
  });

  it('Cubic Gate, Well of Many Worlds, Portable Hole, Iron Flask — sans Harmonisation', async () => {
    const bundle = await loadBundle();
    for (const [id, en] of [
      ['cube-des-plans', 'Cubic Gate'],
      ['puits-des-mondes', 'Well of Many Worlds'],
      ['puits-portable', 'Portable Hole'],
      ['flasque-de-fer', 'Iron Flask'],
    ] as const) {
      const e = bundle.find((i) => i.id === id);
      expect(e?.name.en, `${id}.name.en`).toBe(en);
      expect(e?.attunement, `${id}.attunement`).toBe(false);
    }
  });
});

describe('SRD magic items — Planaires D29.17 (cat. 1 référentielle bundle)', () => {
  it('les 9 objets sont présents dans le bundle avec name.en/fr + source srd', async () => {
    const bundle = await loadBundle();
    for (const entry of SRD_MAGIC_ITEMS_PLANAR) {
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
describe('SRD magic items — Planaires D29.17 (anti-fabrication vs source SRD EN)', () => {
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
    for (const entry of SRD_MAGIC_ITEMS_PLANAR) {
      const firstParagraph = entry.magicDescription.en.split('\n\n')[0];
      const probe = normalize(firstParagraph.split('\n')[0]).slice(0, 90);
      expect(source.includes(probe), `${entry.id} : EN introuvable verbatim → « ${probe} »`).toBe(true);
    }
  });
});
