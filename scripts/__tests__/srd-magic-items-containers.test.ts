import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  SRD_MAGIC_ITEMS_CONTAINERS,
  SRD_MAGIC_ITEMS_CONTAINERS_COUNTS,
} from '../data/srd-magic-items-containers';

/**
 * Batch D29.18 — Conteneurs, véhicules & utilitaires SRD CC v5.2.1 : backfill EN +
 * correction de l'Harmonisation (3/10) + 5 drifts de nom (noms propres 2024
 * abandonnés). 1 uncommon + 4 rare + 5 very rare = 10, dont 3 harmonisées.
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

describe('SRD magic items — Conteneurs D29.18 (cat. 4 compteurs)', () => {
  it('module exporte 1 uncommon + 4 rare + 5 very rare = 10 entrées, 3 harmonisées', () => {
    expect(SRD_MAGIC_ITEMS_CONTAINERS_COUNTS.total).toBe(10);
    expect(SRD_MAGIC_ITEMS_CONTAINERS_COUNTS.uncommon).toBe(1);
    expect(SRD_MAGIC_ITEMS_CONTAINERS_COUNTS.rare).toBe(4);
    expect(SRD_MAGIC_ITEMS_CONTAINERS_COUNTS.veryRare).toBe(5);
    expect(SRD_MAGIC_ITEMS_CONTAINERS_COUNTS.attuned).toBe(3);
  });

  it('toutes les entrées : category=gear, source=srd-5.2.1, name.en + magicDescription.en présents', () => {
    for (const entry of SRD_MAGIC_ITEMS_CONTAINERS) {
      expect(entry.category, `${entry.id}.category`).toBe('gear');
      expect(entry.source, `${entry.id}.source`).toBe('srd-5.2.1');
      expect(entry.name.en, `${entry.id}.name.en`).toBeTruthy();
      expect(entry.magicDescription.en, `${entry.id}.magicDescription.en`).toBeTruthy();
    }
  });

  it('aucun slug dupliqué dans le module', () => {
    const seen = new Set<string>();
    for (const entry of SRD_MAGIC_ITEMS_CONTAINERS) {
      expect(seen.has(entry.id), `slug dupliqué : ${entry.id}`).toBe(false);
      seen.add(entry.id);
    }
  });
});

describe('SRD magic items — Conteneurs D29.18 (cat. 3 drifts de nom + Harmonisation)', () => {
  it('Efreeti Bottle — DRIFT « Bouteille du mauvais génie », very rare', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'bouteille-de-l-efrit');
    expect(e?.name.fr).toBe('Bouteille du mauvais génie');
    expect(e?.name.fr).not.toBe("Bouteille de l'éfrit");
    expect(e?.name.en).toBe('Efreeti Bottle');
    expect(e?.magicDescription.en).toMatch(/can cast Wish once for you/);
  });

  it('Handy Haversack — DRIFT « Havresac magique » (sans « d\'Hévard »)', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'havresac-magique-d-hevard');
    expect(e?.name.fr).toBe('Havresac magique');
    expect(e?.name.en).toBe('Handy Haversack');
    expect(e?.attunement).toBe(false);
  });

  it('Instant Fortress — DRIFT « Forteresse instantanée » (sans « de Daern »), Harmonisation', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'forteresse-instantanee-de-daern');
    expect(e?.name.fr).toBe('Forteresse instantanée');
    expect(e?.name.en).toBe('Instant Fortress');
    expect(e?.attunement).toBe(true);
  });

  it('Marvelous Pigments — DRIFT « Pigments merveilleux » (sans « de Nolzur »)', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'pigments-merveilleux-de-nolzur');
    expect(e?.name.fr).toBe('Pigments merveilleux');
    expect(e?.name.en).toBe('Marvelous Pigments');
  });

  it('Feather Token — DRIFT « Plume magique » (sans « de Quaal »), types divergents', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'plume-de-quaal');
    expect(e?.name.fr).toBe('Plume magique');
    expect(e?.name.en).toBe('Feather Token');
    // Table EN vs FR (ordre et tranches distincts).
    expect(e?.magicDescription.en).toMatch(/Anchor 01–20, Uncommon; Bird 21–35, Rare/);
    expect(e?.magicDescription.fr).toMatch(/Ancre 01-20, peu courante ; Arbre 21-45, peu courante/);
  });

  it('Broom of Flying & Candle of Invocation — Harmonisation (corrigé)', async () => {
    const bundle = await loadBundle();
    const broom = bundle.find((i) => i.id === 'balai-volant');
    expect(broom?.name.en).toBe('Broom of Flying');
    expect(broom?.attunement).toBe(true);
    const candle = bundle.find((i) => i.id === 'cierge-d-invocation');
    expect(candle?.name.en).toBe('Candle of Invocation');
    expect(candle?.attunement).toBe(true);
    // Table Plan Extérieur divergente EN/FR.
    expect(candle?.magicDescription.en).toMatch(/Beastlands 26–33/);
    expect(candle?.magicDescription.fr).toMatch(/Terres des Bêtes 88-95/);
  });

  it('Carpet of Flying, Bag of Devouring, Folding Boat — very rare/rare, sans Harmonisation', async () => {
    const bundle = await loadBundle();
    for (const id of ['tapis-volant', 'sac-devoreur', 'bateau-pliable']) {
      const e = bundle.find((i) => i.id === id);
      expect(e?.attunement, `${id}.attunement`).toBe(false);
    }
  });
});

describe('SRD magic items — Conteneurs D29.18 (cat. 1 référentielle bundle)', () => {
  it('les 10 objets sont présents dans le bundle avec name.en/fr + source srd', async () => {
    const bundle = await loadBundle();
    for (const entry of SRD_MAGIC_ITEMS_CONTAINERS) {
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
describe('SRD magic items — Conteneurs D29.18 (anti-fabrication vs source SRD EN)', () => {
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
    for (const entry of SRD_MAGIC_ITEMS_CONTAINERS) {
      const firstParagraph = entry.magicDescription.en.split('\n\n')[0];
      const probe = normalize(firstParagraph.split('\n')[0]).slice(0, 90);
      expect(source.includes(probe), `${entry.id} : EN introuvable verbatim → « ${probe} »`).toBe(true);
    }
  });
});
