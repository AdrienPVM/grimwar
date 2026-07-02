import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { SRD_MAGIC_ITEMS_BLADES, SRD_MAGIC_ITEMS_BLADES_COUNTS } from '../data/srd-magic-items-blades';

/**
 * Batch D29.9 — Lames spéciales SRD CC v5.2.1 (backfill EN + correction de
 * l'Harmonisation héritée d'AideDD + 2 drifts de nom : « Cimeterre de rapidité »
 * → « Cimeterre de célérité », « Voleuse des neuf vies » → « Voleuse de vie »).
 * 1 rare + 2 very rare + 3 legendary = 6, dont 5 harmonisées (Dague venimeuse non).
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

describe('SRD magic items — Lames spéciales D29.9 (cat. 4 compteurs)', () => {
  it('module exporte 1 rare + 2 very rare + 3 legendary = 6 entrées, 5 harmonisées', () => {
    expect(SRD_MAGIC_ITEMS_BLADES_COUNTS.total).toBe(6);
    expect(SRD_MAGIC_ITEMS_BLADES_COUNTS.rare).toBe(1);
    expect(SRD_MAGIC_ITEMS_BLADES_COUNTS.veryRare).toBe(2);
    expect(SRD_MAGIC_ITEMS_BLADES_COUNTS.legendary).toBe(3);
    expect(SRD_MAGIC_ITEMS_BLADES_COUNTS.attuned).toBe(5);
  });

  it('toutes les entrées : category=weapon, source=srd-5.2.1, name.en + magicDescription.en présents', () => {
    for (const entry of SRD_MAGIC_ITEMS_BLADES) {
      expect(entry.category, `${entry.id}.category`).toBe('weapon');
      expect(entry.source, `${entry.id}.source`).toBe('srd-5.2.1');
      expect(entry.name.en, `${entry.id}.name.en`).toBeTruthy();
      expect(entry.magicDescription.en, `${entry.id}.magicDescription.en`).toBeTruthy();
    }
  });

  it('aucun slug dupliqué dans le module', () => {
    const seen = new Set<string>();
    for (const entry of SRD_MAGIC_ITEMS_BLADES) {
      expect(seen.has(entry.id), `slug dupliqué : ${entry.id}`).toBe(false);
      seen.add(entry.id);
    }
  });
});

describe('SRD magic items — Lames spéciales D29.9 (cat. 3 pin valeurs SRD officielles)', () => {
  it('Defender — legendary, Harmonisation, transfert bonus attaque → CA', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'gardienne');
    expect(e?.name.en).toBe('Defender');
    expect(e?.rarity).toBe('legendary');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/transfer some or all of the\s+weapon’s bonus to your Armor Class/);
  });

  it('Luck Blade — legendary, Harmonisation, relance + Wish', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'lame-porte-bonheur');
    expect(e?.name.en).toBe('Luck Blade');
    expect(e?.rarity).toBe('legendary');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/Luck\./);
    expect(e?.magicDescription.en).toMatch(/cast Wish from it/);
  });

  it('Holy Avenger — legendary, Harmonisation qualifiée « by a Paladin »', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'vengeresse-sacree');
    expect(e?.name.en).toBe('Holy Avenger');
    expect(e?.rarity).toBe('legendary');
    expect(typeof e?.attunement).toBe('object');
    expect((e?.attunement as { en: string }).en).toBe('Requires Attunement by a Paladin');
    expect(e?.magicDescription.en).toMatch(/extra\s+2d10 Radiant damage/);
    expect(e?.magicDescription.en).toMatch(/10-foot Emanation/);
  });

  it('Nine Lives Stealer — DRIFT « Voleuse de vie », very rare, Harmonisation, 1d8+1 charges', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'voleuse-des-neuf-vies');
    expect(e?.name.fr).toBe('Voleuse de vie');
    expect(e?.name.fr).not.toBe('Voleuse des neuf vies');
    expect(e?.name.en).toBe('Nine Lives Stealer');
    expect(e?.rarity).toBe('very rare');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/1d8 \+ 1 charges/);
    expect(e?.magicDescription.en).toMatch(/fewer than\s+100 Hit Points/);
  });

  it('Scimitar of Speed — DRIFT « Cimeterre de célérité », very rare, Harmonisation, attaque bonus', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'cimeterre-de-rapidite');
    expect(e?.name.fr).toBe('Cimeterre de célérité');
    expect(e?.name.fr).not.toBe('Cimeterre de rapidité');
    expect(e?.name.en).toBe('Scimitar of Speed');
    expect(e?.rarity).toBe('very rare');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/one attack with it as a Bonus Action/);
    // Coquille FR « vous tours » corrigée en « vos tours ».
    expect(e?.magicDescription.fr).toMatch(/à chacun de vos tours/);
    expect(e?.magicDescription.fr).not.toMatch(/à chacun de vous tours/);
  });

  it('Dagger of Venom — rare, AUCUNE Harmonisation, poison 2d10 DD 15', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'dague-venimeuse');
    expect(e?.name.en).toBe('Dagger of Venom');
    expect(e?.rarity).toBe('rare');
    expect(e?.attunement).toBe(false);
    expect(e?.magicDescription.en).toMatch(/magically coat the\s+blade with poison/);
    expect(e?.magicDescription.en).toMatch(/2d10 Poison damage/);
  });
});

describe('SRD magic items — Lames spéciales D29.9 (cat. 1 référentielle bundle)', () => {
  it('les 6 lames sont présentes dans le bundle avec name.en/fr + source srd', async () => {
    const bundle = await loadBundle();
    for (const entry of SRD_MAGIC_ITEMS_BLADES) {
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
describe('SRD magic items — Lames spéciales D29.9 (anti-fabrication vs source SRD EN)', () => {
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
    for (const entry of SRD_MAGIC_ITEMS_BLADES) {
      const firstParagraph = entry.magicDescription.en.split('\n\n')[0];
      const probe = normalize(firstParagraph.split('\n')[0]).slice(0, 90);
      expect(source.includes(probe), `${entry.id} : EN introuvable verbatim → « ${probe} »`).toBe(true);
    }
  });
});
