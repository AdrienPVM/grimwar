import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  SRD_MAGIC_ITEMS_WEAPONS_MISC,
  SRD_MAGIC_ITEMS_WEAPONS_MISC_COUNTS,
} from '../data/srd-magic-items-weapons-misc';

/**
 * Batch D29.10 — Armes diverses & munitions SRD CC v5.2.1 (clôt les 25 armes) :
 * backfill EN + correction de l'Harmonisation (Arc du serment, Fer gelé) +
 * 2 drifts de nom (« Arme vicieuse » → « Arme brutale », « Flèche tueuse » →
 * « Projectile tueur »). 3 rare + 3 very rare = 6, dont 2 harmonisées.
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

describe('SRD magic items — Armes diverses D29.10 (cat. 4 compteurs)', () => {
  it('module exporte 3 rare + 3 very rare = 6 entrées, 2 harmonisées', () => {
    expect(SRD_MAGIC_ITEMS_WEAPONS_MISC_COUNTS.total).toBe(6);
    expect(SRD_MAGIC_ITEMS_WEAPONS_MISC_COUNTS.rare).toBe(3);
    expect(SRD_MAGIC_ITEMS_WEAPONS_MISC_COUNTS.veryRare).toBe(3);
    expect(SRD_MAGIC_ITEMS_WEAPONS_MISC_COUNTS.attuned).toBe(2);
  });

  it('toutes les entrées : category=weapon, source=srd-5.2.1, name.en + magicDescription.en présents', () => {
    for (const entry of SRD_MAGIC_ITEMS_WEAPONS_MISC) {
      expect(entry.category, `${entry.id}.category`).toBe('weapon');
      expect(entry.source, `${entry.id}.source`).toBe('srd-5.2.1');
      expect(entry.name.en, `${entry.id}.name.en`).toBeTruthy();
      expect(entry.magicDescription.en, `${entry.id}.magicDescription.en`).toBeTruthy();
    }
  });

  it('aucun slug dupliqué dans le module', () => {
    const seen = new Set<string>();
    for (const entry of SRD_MAGIC_ITEMS_WEAPONS_MISC) {
      expect(seen.has(entry.id), `slug dupliqué : ${entry.id}`).toBe(false);
      seen.add(entry.id);
    }
  });
});

describe('SRD magic items — Armes diverses D29.10 (cat. 3 pin valeurs SRD officielles)', () => {
  it('Oathbow — very rare, Harmonisation (corrigé), ennemi désigné 7 jours', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'arc-du-serment');
    expect(e?.name.en).toBe('Oathbow');
    expect(e?.rarity).toBe('very rare');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/sworn enemy until it dies or\s+until dawn 7 days later/);
  });

  it('Vicious Weapon — DRIFT « Arme brutale », rare, AUCUNE Harmonisation, +2d6', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'arme-vicieuse');
    expect(e?.name.fr).toBe('Arme brutale');
    expect(e?.name.fr).not.toBe('Arme vicieuse');
    expect(e?.name.en).toBe('Vicious Weapon');
    expect(e?.rarity).toBe('rare');
    expect(e?.attunement).toBe(false);
    expect(e?.magicDescription.en).toMatch(/extra 2d6 damage to\s+any creature it hits/);
  });

  it('Frost Brand — very rare, Harmonisation (corrigé), +1d6 froid + Résistance feu', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'fer-gele');
    expect(e?.name.en).toBe('Frost Brand');
    expect(e?.rarity).toBe('very rare');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/extra 1d6 Cold damage.*Resistance to Fire damage/s);
  });

  it('Ammunition of Slaying — DRIFT « Projectile tueur », very rare, sans Harmonisation, table divergente', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'fleche-tueuse');
    expect(e?.name.fr).toBe('Projectile tueur');
    expect(e?.name.fr).not.toBe('Flèche tueuse');
    expect(e?.name.en).toBe('Ammunition of Slaying');
    expect(e?.rarity).toBe('very rare');
    expect(e?.attunement).toBe(false);
    expect(e?.magicDescription.en).toMatch(/extra 6d10 Force damage/);
    // Table EN officielle (ordre + tranches distincts du FR).
    expect(e?.magicDescription.en).toMatch(/Humanoids 46–50, Fey 51–60/);
    // Table FR officielle (alphabétique FR, tranches différentes).
    expect(e?.magicDescription.fr).toMatch(/Fées 46-55, Fiélons 56-65/);
  });

  it('Dragon Slayer — rare, sans Harmonisation, +3d6 vs Dragon', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'tueuse-de-dragons');
    expect(e?.name.en).toBe('Dragon Slayer');
    expect(e?.rarity).toBe('rare');
    expect(e?.attunement).toBe(false);
    expect(e?.magicDescription.en).toMatch(/extra 3d6 damage of the\s+weapon’s type if the target is a Dragon/);
  });

  it('Giant Slayer — rare, sans Harmonisation, +2d6 vs Géant + DD 15 Force', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'tueuse-de-geants');
    expect(e?.name.en).toBe('Giant Slayer');
    expect(e?.rarity).toBe('rare');
    expect(e?.attunement).toBe(false);
    expect(e?.magicDescription.en).toMatch(/DC 15 Strength saving throw or\s+have the Prone condition/);
  });
});

describe('SRD magic items — Armes diverses D29.10 (cat. 1 référentielle bundle)', () => {
  it('les 6 armes sont présentes dans le bundle avec name.en/fr + source srd', async () => {
    const bundle = await loadBundle();
    for (const entry of SRD_MAGIC_ITEMS_WEAPONS_MISC) {
      const inBundle = bundle.find((i) => i.id === entry.id);
      expect(inBundle, `slug ${entry.id} absent du bundle`).toBeDefined();
      expect(inBundle?.name.en, `${entry.id}.name.en dans bundle`).toBe(entry.name.en);
      expect(inBundle?.name.fr, `${entry.id}.name.fr dans bundle`).toBe(entry.name.fr);
      expect(inBundle?.source, `${entry.id}.source dans bundle`).toBe('srd-5.2.1');
    }
  });

  it('plus aucune arme (category=weapon) sans name.en dans le bundle', async () => {
    const bundle = await loadBundle();
    const weaponsSansEn = bundle.filter((i) => i.category === 'weapon' && (!i.name || !i.name.en));
    expect(weaponsSansEn.map((i) => i.id)).toEqual([]);
  });
});

/**
 * Garde anti-fabrication : la 1re phrase de chaque `magicDescription.en` doit
 * être une sous-chaîne verbatim de l'extraction SRD EN.
 */
describe('SRD magic items — Armes diverses D29.10 (anti-fabrication vs source SRD EN)', () => {
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
    for (const entry of SRD_MAGIC_ITEMS_WEAPONS_MISC) {
      const firstParagraph = entry.magicDescription.en.split('\n\n')[0];
      const probe = normalize(firstParagraph.split('\n')[0]).slice(0, 90);
      expect(source.includes(probe), `${entry.id} : EN introuvable verbatim → « ${probe} »`).toBe(true);
    }
  });
});
