import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  SRD_MAGIC_ITEMS_BLUDGEONING,
  SRD_MAGIC_ITEMS_BLUDGEONING_COUNTS,
} from '../data/srd-magic-items-bludgeoning';

/**
 * Batch D29.8 — Masses, marteaux & haches SRD CC v5.2.1 (backfill EN + correction
 * de l'Harmonisation héritée d'AideDD + drift de nom « Marteau de lancer nain » →
 * « Marteau volant des nains »). 4 rare + 1 very rare + 1 legendary = 6, dont 5
 * harmonisées (Masse destructrice non).
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

describe('SRD magic items — Masses/marteaux/haches D29.8 (cat. 4 compteurs)', () => {
  it('module exporte 4 rare + 1 very rare + 1 legendary = 6 entrées, 5 harmonisées', () => {
    expect(SRD_MAGIC_ITEMS_BLUDGEONING_COUNTS.total).toBe(6);
    expect(SRD_MAGIC_ITEMS_BLUDGEONING_COUNTS.rare).toBe(4);
    expect(SRD_MAGIC_ITEMS_BLUDGEONING_COUNTS.veryRare).toBe(1);
    expect(SRD_MAGIC_ITEMS_BLUDGEONING_COUNTS.legendary).toBe(1);
    expect(SRD_MAGIC_ITEMS_BLUDGEONING_COUNTS.attuned).toBe(5);
  });

  it('toutes les entrées : category=weapon, source=srd-5.2.1, name.en + magicDescription.en présents', () => {
    for (const entry of SRD_MAGIC_ITEMS_BLUDGEONING) {
      expect(entry.category, `${entry.id}.category`).toBe('weapon');
      expect(entry.source, `${entry.id}.source`).toBe('srd-5.2.1');
      expect(entry.name.en, `${entry.id}.name.en`).toBeTruthy();
      expect(entry.magicDescription.en, `${entry.id}.magicDescription.en`).toBeTruthy();
    }
  });

  it('aucun slug dupliqué dans le module', () => {
    const seen = new Set<string>();
    for (const entry of SRD_MAGIC_ITEMS_BLUDGEONING) {
      expect(seen.has(entry.id), `slug dupliqué : ${entry.id}`).toBe(false);
      seen.add(entry.id);
    }
  });
});

describe('SRD magic items — Masses/marteaux/haches D29.8 (cat. 3 pin valeurs SRD officielles)', () => {
  it('Berserker Axe — rare, Harmonisation, maudite, PV max +1/niveau', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'hache-du-berserker');
    expect(e?.name.en).toBe('Berserker Axe');
    expect(e?.rarity).toBe('rare');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/your Hit Point\s+maximum increases by 1 for each level/);
    expect(e?.magicDescription.en).toMatch(/Curse\./);
  });

  it('Dwarven Thrower — DRIFT « Marteau volant des nains », very rare, Harmonisation qualifiée', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'marteau-de-lancer-nain');
    expect(e?.name.fr).toBe('Marteau volant des nains');
    expect(e?.name.fr).not.toBe('Marteau de lancer nain');
    expect(e?.name.en).toBe('Dwarven Thrower');
    expect(e?.rarity).toBe('very rare');
    expect(typeof e?.attunement).toBe('object');
    expect((e?.attunement as { en: string }).en).toBe(
      'Requires Attunement by a Dwarf or a Creature Attuned to a Belt of Dwarvenkind',
    );
    expect(e?.magicDescription.en).toMatch(/extra 1d8 Force dam.*age, or an extra 2d8 Force damage if the target is\s+a Giant/s);
  });

  it('Hammer of Thunderbolts — legendary, Harmonisation, 5 charges, coup de tonnerre 300 pieds', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'marteau-de-tonnerre');
    expect(e?.name.en).toBe('Hammer of Thunderbolts');
    expect(e?.rarity).toBe('legendary');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/thunder.*clap audible out to 300 feet/s);
    expect(e?.magicDescription.en).toMatch(/Might of Giants\./);
  });

  it('Mace of Disruption — rare, Harmonisation, +2d6 radiants vs Fiélon/Mort-vivant', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'masse-d-aneantissement');
    expect(e?.name.en).toBe('Mace of Disruption');
    expect(e?.rarity).toBe('rare');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/hit a Fiend or an Undead.*extra 2d6\s+Radiant damage/s);
  });

  it('Mace of Smiting — rare, AUCUNE Harmonisation (corrigé), +7 contondants sur 20', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'masse-destructrice');
    expect(e?.name.en).toBe('Mace of Smiting');
    expect(e?.rarity).toBe('rare');
    expect(e?.attunement).toBe(false);
    expect(e?.magicDescription.en).toMatch(/extra 7 Bludgeon.*ing damage, or 14 Bludgeoning damage/s);
  });

  it('Mace of Terror — rare, Harmonisation, 3 charges, vague de terreur DD 15', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'masse-terrifiante');
    expect(e?.name.en).toBe('Mace of Terror');
    expect(e?.rarity).toBe('rare');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/wave of terror.*DC 15 Wisdom saving throw/s);
    // Terme officiel FR 5.2.1 pour « Dash » = « Pointe » (verbatim SRD FR).
    expect(e?.magicDescription.fr).toMatch(/que Pointe ou tenter de se libérer/);
  });
});

describe('SRD magic items — Masses/marteaux/haches D29.8 (cat. 1 référentielle bundle)', () => {
  it('les 6 armes sont présentes dans le bundle avec name.en/fr + source srd', async () => {
    const bundle = await loadBundle();
    for (const entry of SRD_MAGIC_ITEMS_BLUDGEONING) {
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
describe('SRD magic items — Masses/marteaux/haches D29.8 (anti-fabrication vs source SRD EN)', () => {
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
    for (const entry of SRD_MAGIC_ITEMS_BLUDGEONING) {
      const firstParagraph = entry.magicDescription.en.split('\n\n')[0];
      const probe = normalize(firstParagraph.split('\n')[0]).slice(0, 90);
      expect(source.includes(probe), `${entry.id} : EN introuvable verbatim → « ${probe} »`).toBe(true);
    }
  });
});
