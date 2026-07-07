import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  SRD_MAGIC_ITEMS_POTIONS_RARE,
  SRD_MAGIC_ITEMS_POTIONS_RARE_COUNTS,
} from '../data/srd-magic-items-potions-rare';

/**
 * Batch D29.4 — Potions ≥ Rare SRD CC v5.2.1 (backfill EN + correction du drift
 * de rareté hérité d'AideDD sur la Potion d'invisibilité). 7 rare + 3 very rare
 * = 10. Le module C.1 couvre Common + Uncommon (disjoint).
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

describe('SRD magic items — Potions ≥ Rare D29.4 (cat. 4 compteurs)', () => {
  it('module exporte 7 rare + 3 very rare = 10 entrées', () => {
    expect(SRD_MAGIC_ITEMS_POTIONS_RARE_COUNTS.total).toBe(10);
    expect(SRD_MAGIC_ITEMS_POTIONS_RARE_COUNTS.rare).toBe(7);
    expect(SRD_MAGIC_ITEMS_POTIONS_RARE_COUNTS.veryRare).toBe(3);
  });

  it('toutes les entrées : category=gear, source=srd-5.2.1, name.en + magicDescription.en présents', () => {
    for (const entry of SRD_MAGIC_ITEMS_POTIONS_RARE) {
      expect(entry.category, `${entry.id}.category`).toBe('gear');
      expect(entry.source, `${entry.id}.source`).toBe('srd-5.2.1');
      expect(entry.name.en, `${entry.id}.name.en`).toBeTruthy();
      expect(entry.magicDescription.en, `${entry.id}.magicDescription.en`).toBeTruthy();
    }
  });

  it('aucune potion n\'exige l\'Harmonisation (toutes attunement=false, conforme SRD)', () => {
    for (const entry of SRD_MAGIC_ITEMS_POTIONS_RARE) {
      expect(entry.attunement, `${entry.id}.attunement`).toBe(false);
    }
  });

  it('aucun slug dupliqué dans le module', () => {
    const seen = new Set<string>();
    for (const entry of SRD_MAGIC_ITEMS_POTIONS_RARE) {
      expect(seen.has(entry.id), `slug dupliqué : ${entry.id}`).toBe(false);
      seen.add(entry.id);
    }
  });
});

describe('SRD magic items — Potions ≥ Rare D29.4 (cat. 3 pin valeurs SRD officielles)', () => {
  it('Potion of Invisibility — rareté corrigée very rare → rare (SRD EN+FR « Rare »)', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'potion-d-invisibilite');
    expect(e?.name.fr).toBe("Potion d'invisibilité");
    expect(e?.name.en).toBe('Potion of Invisibility');
    expect(e?.rarity).toBe('rare');
    expect(e?.magicDescription.en).toMatch(/you have the Invisible condition for 1 hour/);
  });

  it('Potion of Heroism — rare — 10 PV temp + bénédiction', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'potion-d-heroisme');
    expect(e?.name.en).toBe('Potion of Heroism');
    expect(e?.rarity).toBe('rare');
    expect(e?.magicDescription.en).toMatch(/you gain 10 Temporary Hit Points/);
    expect(e?.magicDescription.en).toMatch(/the Bless spell/);
    expect(e?.magicDescription.fr).toMatch(/du sort bénédiction/);
  });

  it('Potion of Vitality — very rare — supprime Épuisement + max PV par dé de vie', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'potion-de-vitalite');
    expect(e?.name.en).toBe('Potion of Vitality');
    expect(e?.rarity).toBe('very rare');
    expect(e?.magicDescription.en).toMatch(/removes any\s+Exhaustion levels/);
  });

  it('Potion of Speed — very rare — hâte 1 minute sans léthargie', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'potion-de-vitesse');
    expect(e?.name.en).toBe('Potion of Speed');
    expect(e?.rarity).toBe('very rare');
    expect(e?.magicDescription.en).toMatch(/the Haste spell for 1 minute/);
  });

  it('Potion of Flying — very rare — Fly Speed 1 heure + hover', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'potion-de-vol');
    expect(e?.name.en).toBe('Potion of Flying');
    expect(e?.rarity).toBe('very rare');
    expect(e?.magicDescription.en).toMatch(/a Fly Speed\s+equal to your Speed for 1 hour and can hover/);
  });

  it('Potion of Mind Reading — rare — détection des pensées DD 13', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'potion-de-lecture-des-pensees');
    expect(e?.name.en).toBe('Potion of Mind Reading');
    expect(e?.magicDescription.en).toMatch(/the Detect Thoughts spell \(save DC 13\)/);
  });
});

describe('SRD magic items — Potions ≥ Rare D29.4 (cat. 1 référentielle bundle)', () => {
  it('les 10 potions sont présentes dans le bundle avec name.en + source srd', async () => {
    const bundle = await loadBundle();
    for (const entry of SRD_MAGIC_ITEMS_POTIONS_RARE) {
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
describe('SRD magic items — Potions ≥ Rare D29.4 (anti-fabrication vs source SRD EN)', () => {
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
    for (const entry of SRD_MAGIC_ITEMS_POTIONS_RARE) {
      const firstParagraph = entry.magicDescription.en.split('\n\n')[0];
      const probe = normalize(firstParagraph.split('\n')[0]).slice(0, 90);
      expect(source.includes(probe), `${entry.id} : EN introuvable verbatim → « ${probe} »`).toBe(true);
    }
  });
});
