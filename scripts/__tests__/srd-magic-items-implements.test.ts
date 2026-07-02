import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  SRD_MAGIC_ITEMS_IMPLEMENTS,
  SRD_MAGIC_ITEMS_IMPLEMENTS_COUNTS,
} from '../data/srd-magic-items-implements';

/**
 * Batch D29.16 — Heaumes, gemmes & instruments SRD CC v5.2.1 : backfill EN +
 * correction de l'Harmonisation (4/9) + drift de nom « Liens de fer de Bilarro »
 * → « Liens de fer ». 6 rare + 3 very rare = 9, dont 4 harmonisées.
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

describe('SRD magic items — Instruments D29.16 (cat. 4 compteurs)', () => {
  it('module exporte 6 rare + 3 very rare = 9 entrées, 4 harmonisées', () => {
    expect(SRD_MAGIC_ITEMS_IMPLEMENTS_COUNTS.total).toBe(9);
    expect(SRD_MAGIC_ITEMS_IMPLEMENTS_COUNTS.rare).toBe(6);
    expect(SRD_MAGIC_ITEMS_IMPLEMENTS_COUNTS.veryRare).toBe(3);
    expect(SRD_MAGIC_ITEMS_IMPLEMENTS_COUNTS.attuned).toBe(4);
  });

  it('toutes les entrées : category=gear, source=srd-5.2.1, name.en + magicDescription.en présents', () => {
    for (const entry of SRD_MAGIC_ITEMS_IMPLEMENTS) {
      expect(entry.category, `${entry.id}.category`).toBe('gear');
      expect(entry.source, `${entry.id}.source`).toBe('srd-5.2.1');
      expect(entry.name.en, `${entry.id}.name.en`).toBeTruthy();
      expect(entry.magicDescription.en, `${entry.id}.magicDescription.en`).toBeTruthy();
    }
  });

  it('aucun slug dupliqué dans le module', () => {
    const seen = new Set<string>();
    for (const entry of SRD_MAGIC_ITEMS_IMPLEMENTS) {
      expect(seen.has(entry.id), `slug dupliqué : ${entry.id}`).toBe(false);
      seen.add(entry.id);
    }
  });
});

describe('SRD magic items — Instruments D29.16 (cat. 3 pin valeurs SRD officielles)', () => {
  it('Crystal Ball — very rare, Harmonisation (corrigé), Scrying DD 17', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'boule-de-cristal');
    expect(e?.name.en).toBe('Crystal Ball');
    expect(e?.rarity).toBe('very rare');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/cast Scrying \(save DC 17\)/);
  });

  it('Helm of Brilliance — very rare, Harmonisation (corrigé), gemmes/sorts', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'heaume-scintillant');
    expect(e?.name.en).toBe('Helm of Brilliance');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/Diamond Light\./);
    expect(e?.magicDescription.en).toMatch(/Taking Fire Damage\./);
  });

  it('Helm of Teleportation & Gem of Seeing — rare, Harmonisation (corrigé)', async () => {
    const bundle = await loadBundle();
    const helm = bundle.find((i) => i.id === 'heaume-de-teleportation');
    expect(helm?.name.en).toBe('Helm of Teleportation');
    expect(helm?.attunement).toBe(true);
    expect(helm?.magicDescription.en).toMatch(/cast Teleport from it/);
    const gem = bundle.find((i) => i.id === 'gemme-de-vision');
    expect(gem?.name.en).toBe('Gem of Seeing');
    expect(gem?.attunement).toBe(true);
  });

  it('Iron Bands — DRIFT « Liens de fer », rare, sans Harmonisation', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'liens-de-fer-de-bilarro');
    expect(e?.name.fr).toBe('Liens de fer');
    expect(e?.name.fr).not.toBe('Liens de fer de Bilarro');
    expect(e?.name.en).toBe('Iron Bands');
    expect(e?.attunement).toBe(false);
    expect(e?.magicDescription.en).toMatch(/opens into a tangle of\s+metal bands/);
  });

  it('Mirror of Life Trapping — very rare, sans Harmonisation, 12 cachots', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'miroir-d-emprisonnement');
    expect(e?.name.en).toBe('Mirror of Life Trapping');
    expect(e?.rarity).toBe('very rare');
    expect(e?.attunement).toBe(false);
    expect(e?.magicDescription.en).toMatch(/twelve\s+extradimensional cells/);
  });

  it('Dimensional Shackles, Chime, Rope — rare, sans Harmonisation', async () => {
    const bundle = await loadBundle();
    for (const id of ['menottes-dimensionnelles', 'carillon-d-ouverture', 'corde-d-enchevetrement']) {
      const e = bundle.find((i) => i.id === id);
      expect(e?.rarity, `${id}.rarity`).toBe('rare');
      expect(e?.attunement, `${id}.attunement`).toBe(false);
    }
  });
});

describe('SRD magic items — Instruments D29.16 (cat. 1 référentielle bundle)', () => {
  it('les 9 objets sont présents dans le bundle avec name.en/fr + source srd', async () => {
    const bundle = await loadBundle();
    for (const entry of SRD_MAGIC_ITEMS_IMPLEMENTS) {
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
describe('SRD magic items — Instruments D29.16 (anti-fabrication vs source SRD EN)', () => {
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
    for (const entry of SRD_MAGIC_ITEMS_IMPLEMENTS) {
      const firstParagraph = entry.magicDescription.en.split('\n\n')[0];
      const probe = normalize(firstParagraph.split('\n')[0]).slice(0, 90);
      expect(source.includes(probe), `${entry.id} : EN introuvable verbatim → « ${probe} »`).toBe(true);
    }
  });
});
