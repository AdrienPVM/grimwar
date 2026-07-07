import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  SRD_MAGIC_ITEMS_DEVICES,
  SRD_MAGIC_ITEMS_DEVICES_COUNTS,
} from '../data/srd-magic-items-devices';

/**
 * Batch D29.13 — Contrôle d'élémentaires, cors, fers & bottes SRD CC v5.2.1 :
 * backfill EN + correction de l'Harmonisation des bottes + drift de nom
 * « Fers de zéphyr » → « Fers du zéphyr ». 8 rare + 2 very rare = 10, dont 2
 * harmonisées (les 2 bottes).
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

describe('SRD magic items — Devices D29.13 (cat. 4 compteurs)', () => {
  it('module exporte 8 rare + 2 very rare = 10 entrées, 2 harmonisées', () => {
    expect(SRD_MAGIC_ITEMS_DEVICES_COUNTS.total).toBe(10);
    expect(SRD_MAGIC_ITEMS_DEVICES_COUNTS.rare).toBe(8);
    expect(SRD_MAGIC_ITEMS_DEVICES_COUNTS.veryRare).toBe(2);
    expect(SRD_MAGIC_ITEMS_DEVICES_COUNTS.attuned).toBe(2);
  });

  it('toutes les entrées : category=gear, source=srd-5.2.1, name.en + magicDescription.en présents', () => {
    for (const entry of SRD_MAGIC_ITEMS_DEVICES) {
      expect(entry.category, `${entry.id}.category`).toBe('gear');
      expect(entry.source, `${entry.id}.source`).toBe('srd-5.2.1');
      expect(entry.name.en, `${entry.id}.name.en`).toBeTruthy();
      expect(entry.magicDescription.en, `${entry.id}.magicDescription.en`).toBeTruthy();
    }
  });

  it('aucun slug dupliqué dans le module', () => {
    const seen = new Set<string>();
    for (const entry of SRD_MAGIC_ITEMS_DEVICES) {
      expect(seen.has(entry.id), `slug dupliqué : ${entry.id}`).toBe(false);
      seen.add(entry.id);
    }
  });
});

describe('SRD magic items — Devices D29.13 (cat. 3 pin valeurs SRD officielles)', () => {
  it('les 4 contrôles d\'élémentaires — rare, sans Harmonisation, convocation 1 h', async () => {
    const bundle = await loadBundle();
    const elementals: Array<[string, string, RegExp]> = [
      ['brasero-de-controle-des-elementaires-du-feu', 'Brazier of Commanding Fire Elementals', /summon a Fire Elemental/],
      ['encensoir-de-controle-des-elementaires-de-l-air', 'Censer of Controlling Air Elementals', /summon an Air Elemental/],
      ['jatte-de-controle-des-elementaires-de-l-eau', 'Bowl of Commanding Water Elementals', /summon a Water Elemental/],
      ['pierre-de-controle-des-elementaires-de-la-terre', 'Stone of Controlling Earth Elementals', /summon an Earth Elemental/],
    ];
    for (const [id, en, mech] of elementals) {
      const e = bundle.find((i) => i.id === id);
      expect(e?.name.en, `${id}.name.en`).toBe(en);
      expect(e?.rarity, `${id}.rarity`).toBe('rare');
      expect(e?.attunement, `${id}.attunement`).toBe(false);
      expect(e?.magicDescription.en, `${id}.mech`).toMatch(mech);
    }
  });

  it('Boots of Levitation & Speed — rare, Harmonisation (corrigé)', async () => {
    const bundle = await loadBundle();
    const lev = bundle.find((i) => i.id === 'bottes-de-levitation');
    expect(lev?.name.en).toBe('Boots of Levitation');
    expect(lev?.attunement).toBe(true);
    expect(lev?.magicDescription.en).toMatch(/cast Levitate\s+on yourself/);
    const speed = bundle.find((i) => i.id === 'bottes-de-rapidite');
    expect(speed?.name.en).toBe('Boots of Speed');
    expect(speed?.attunement).toBe(true);
    expect(speed?.magicDescription.en).toMatch(/the boots double your Speed/);
  });

  it('Horn of Valhalla — very rare, sans Harmonisation, table métaux', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'cor-du-valhalla');
    expect(e?.name.en).toBe('Horn of Valhalla');
    expect(e?.rarity).toBe('very rare');
    expect(e?.attunement).toBe(false);
    expect(e?.magicDescription.en).toMatch(/Silver 01–40, 2 spirits, None/);
    expect(e?.magicDescription.en).toMatch(/Iron 91–00, 5 spirits, Proficiency with all Martial weapons/);
  });

  it('Horn of Blasting — rare, sans Harmonisation, cône 5d8 tonnerre', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'cor-de-devastation');
    expect(e?.name.en).toBe('Horn of Blasting');
    expect(e?.attunement).toBe(false);
    expect(e?.magicDescription.en).toMatch(/30-foot Cone.*5d8 Thunder damage/s);
  });

  it('Horseshoes of a Zephyr — DRIFT « Fers du zéphyr », very rare', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'fers-de-zephyr');
    expect(e?.name.fr).toBe('Fers du zéphyr');
    expect(e?.name.fr).not.toBe('Fers de zéphyr');
    expect(e?.name.en).toBe('Horseshoes of a Zephyr');
    expect(e?.rarity).toBe('very rare');
    expect(e?.magicDescription.en).toMatch(/floating 4 inches above a\s+surface/);
  });
});

describe('SRD magic items — Devices D29.13 (cat. 1 référentielle bundle)', () => {
  it('les 10 objets sont présents dans le bundle avec name.en/fr + source srd', async () => {
    const bundle = await loadBundle();
    for (const entry of SRD_MAGIC_ITEMS_DEVICES) {
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
describe('SRD magic items — Devices D29.13 (anti-fabrication vs source SRD EN)', () => {
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
    for (const entry of SRD_MAGIC_ITEMS_DEVICES) {
      const firstParagraph = entry.magicDescription.en.split('\n\n')[0];
      const probe = normalize(firstParagraph.split('\n')[0]).slice(0, 90);
      expect(source.includes(probe), `${entry.id} : EN introuvable verbatim → « ${probe} »`).toBe(true);
    }
  });
});
