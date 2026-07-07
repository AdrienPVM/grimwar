import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { SRD_MAGIC_ITEMS_SWORDS, SRD_MAGIC_ITEMS_SWORDS_COUNTS } from '../data/srd-magic-items-swords';

/**
 * Batch D29.7 — Épées / lames SRD CC v5.2.1 (backfill EN + correction de
 * l'Harmonisation héritée d'AideDD : les 7 épées l'exigent au SRD + drift de nom
 * « Épée ardente » → « Arme ardente » sur Flame Tongue). 4 rare + 2 very rare +
 * 1 legendary = 7.
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

describe('SRD magic items — Épées D29.7 (cat. 4 compteurs)', () => {
  it('module exporte 4 rare + 2 very rare + 1 legendary = 7 entrées, 7 harmonisées', () => {
    expect(SRD_MAGIC_ITEMS_SWORDS_COUNTS.total).toBe(7);
    expect(SRD_MAGIC_ITEMS_SWORDS_COUNTS.rare).toBe(4);
    expect(SRD_MAGIC_ITEMS_SWORDS_COUNTS.veryRare).toBe(2);
    expect(SRD_MAGIC_ITEMS_SWORDS_COUNTS.legendary).toBe(1);
    expect(SRD_MAGIC_ITEMS_SWORDS_COUNTS.attuned).toBe(7);
  });

  it('toutes les entrées : category=weapon, source=srd-5.2.1, name.en + magicDescription.en présents', () => {
    for (const entry of SRD_MAGIC_ITEMS_SWORDS) {
      expect(entry.category, `${entry.id}.category`).toBe('weapon');
      expect(entry.source, `${entry.id}.source`).toBe('srd-5.2.1');
      expect(entry.name.en, `${entry.id}.name.en`).toBeTruthy();
      expect(entry.magicDescription.en, `${entry.id}.magicDescription.en`).toBeTruthy();
      expect(entry.attunement, `${entry.id}.attunement`).toBe(true);
    }
  });

  it('aucun slug dupliqué dans le module', () => {
    const seen = new Set<string>();
    for (const entry of SRD_MAGIC_ITEMS_SWORDS) {
      expect(seen.has(entry.id), `slug dupliqué : ${entry.id}`).toBe(false);
      seen.add(entry.id);
    }
  });
});

describe('SRD magic items — Épées D29.7 (cat. 3 pin valeurs SRD officielles)', () => {
  it('Sword of Sharpness — very rare, Harmonisation — maximise les dés vs objets, +14 tranchants sur 20', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'epee-aceree');
    expect(e?.name.fr).toBe('Épée acérée');
    expect(e?.name.en).toBe('Sword of Sharpness');
    expect(e?.rarity).toBe('very rare');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/maximize your weapon damage dice/);
    expect(e?.magicDescription.en).toMatch(/extra 14 Slashing damage and gains\s+1 Exhaustion level/);
  });

  it('Flame Tongue — DRIFT name.fr « Arme ardente » (PAS « Épée ardente »), rare, Harmonisation', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'epee-ardente');
    expect(e?.name.fr).toBe('Arme ardente');
    expect(e?.name.fr).not.toBe('Épée ardente');
    expect(e?.name.en).toBe('Flame Tongue');
    expect(e?.rarity).toBe('rare');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/an extra 2d6\s+Fire damage on a hit/);
  });

  it('Dancing Sword — very rare, Harmonisation — 4 attaques en vol stationnaire', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'epee-dansante');
    expect(e?.name.en).toBe('Dancing Sword');
    expect(e?.rarity).toBe('very rare');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/After the hovering weapon attacks for the fourth\s+time/);
  });

  it('Sword of Wounding — rare, Harmonisation — +2d6 nécrotiques + DD 15 Constitution', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'epee-mordante');
    expect(e?.name.en).toBe('Sword of Wounding');
    expect(e?.rarity).toBe('rare');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/extra 2d6 Necrotic damage.*DC 15 Constitution saving throw/s);
  });

  it('Sun Blade — rare, Harmonisation — lame de radiance, +2, lumière du soleil', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'epee-radieuse');
    expect(e?.name.fr).toBe('Épée radieuse');
    expect(e?.name.en).toBe('Sun Blade');
    expect(e?.rarity).toBe('rare');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/Blade of Radiance\./);
    expect(e?.magicDescription.en).toMatch(/The light is sunlight\./);
  });

  it('Sword of Life Stealing — rare, Harmonisation — +15 nécrotiques sur 20 (sauf Construct/Undead)', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'epee-voleuse-de-vie');
    expect(e?.name.en).toBe('Sword of Life Stealing');
    expect(e?.rarity).toBe('rare');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/extra 15 Necrotic damage if it isn’t\s+a Construct or an Undead/);
  });

  it('Vorpal Sword — legendary, Harmonisation — +3, décapitation sur 20', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'epee-vorpale');
    expect(e?.name.en).toBe('Vorpal Sword');
    expect(e?.rarity).toBe('legendary');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/\+3 bonus to attack rolls/);
    expect(e?.magicDescription.en).toMatch(/you cut off one of the creature’s\s+heads/);
  });
});

describe('SRD magic items — Épées D29.7 (cat. 1 référentielle bundle)', () => {
  it('les 7 épées sont présentes dans le bundle avec name.en + source srd', async () => {
    const bundle = await loadBundle();
    for (const entry of SRD_MAGIC_ITEMS_SWORDS) {
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
 * être une sous-chaîne verbatim de l'extraction SRD EN. Source `.txt`
 * gitignorée → skip propre en CI.
 */
describe('SRD magic items — Épées D29.7 (anti-fabrication vs source SRD EN)', () => {
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
    for (const entry of SRD_MAGIC_ITEMS_SWORDS) {
      const firstParagraph = entry.magicDescription.en.split('\n\n')[0];
      const probe = normalize(firstParagraph.split('\n')[0]).slice(0, 90);
      expect(source.includes(probe), `${entry.id} : EN introuvable verbatim → « ${probe} »`).toBe(true);
    }
  });
});
