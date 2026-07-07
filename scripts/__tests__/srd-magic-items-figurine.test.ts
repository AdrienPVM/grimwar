import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  SRD_MAGIC_ITEMS_FIGURINE,
  SRD_MAGIC_ITEMS_FIGURINE_COUNTS,
} from '../data/srd-magic-items-figurine';

/**
 * Batch D29.22 — Figurine merveilleuse SRD CC v5.2.1 (9 types) : backfill EN +
 * correction rareté (common→rare représentatif). Ordre des types divergent EN/FR.
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

describe('SRD magic items — Figurine D29.22 (cat. 4 compteurs)', () => {
  it('module exporte 1 entrée rare, sans Harmonisation', () => {
    expect(SRD_MAGIC_ITEMS_FIGURINE_COUNTS.total).toBe(1);
    expect(SRD_MAGIC_ITEMS_FIGURINE_COUNTS.rare).toBe(1);
    expect(SRD_MAGIC_ITEMS_FIGURINE_COUNTS.attuned).toBe(0);
  });
});

describe('SRD magic items — Figurine D29.22 (cat. 3 pin valeurs SRD officielles)', () => {
  it('Figurine of Wondrous Power — rare (corrigé de common), 9 types EN + FR', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'figurine-merveilleuse');
    expect(e?.name.en).toBe('Figurine of Wondrous Power');
    expect(e?.name.fr).toBe('Figurine merveilleuse');
    expect(e?.rarity).toBe('rare');
    expect(e?.rarity).not.toBe('common');
    expect(e?.attunement).toBe(false);
    for (const v of [
      'Bronze Griffon (Rare)',
      'Ebony Fly (Rare)',
      'Golden Lions (Rare)',
      'Ivory Goats (Rare)',
      'Goat of Terror',
      'Goat of Traveling',
      'Goat of Travail',
      'Marble Elephant (Rare)',
      'Obsidian Steed (Very Rare)',
      'Onyx Dog (Rare)',
      'Serpentine Owl (Rare)',
      'Silver Raven (Uncommon)',
    ]) {
      expect(e?.magicDescription.en, `EN type manquant : ${v}`).toContain(v);
    }
    for (const v of [
      "Chèvres d'ivoire (rare)",
      "Chien d'onyx (rare)",
      'Chouette de serpentine (rare)',
      "Corbeau d'argent (peu courant)",
      "Destrier d'obsidienne (très rare)",
      'Éléphant de marbre (rare)',
      'Griffon de bronze (rare)',
      "Lions d'or (rare)",
      "Mouche d'ébène (rare)",
    ]) {
      expect(e?.magicDescription.fr, `FR type manquant : ${v}`).toContain(v);
    }
    // Coquille FR corrigée.
    expect(e?.magicDescription.fr).toMatch(/sous peine de subir l'état Effrayé/);
  });
});

describe('SRD magic items — Figurine D29.22 (cat. 1 référentielle bundle)', () => {
  it('présente dans le bundle avec name.en/fr + source srd', async () => {
    const bundle = await loadBundle();
    const inBundle = bundle.find((i) => i.id === 'figurine-merveilleuse');
    expect(inBundle?.name.en).toBe('Figurine of Wondrous Power');
    expect(inBundle?.source).toBe('srd-5.2.1');
  });
});

/**
 * Garde anti-fabrication : la 1re phrase de `magicDescription.en` doit être une
 * sous-chaîne verbatim de l'extraction SRD EN.
 */
describe('SRD magic items — Figurine D29.22 (anti-fabrication vs source SRD EN)', () => {
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

  maybe('la phrase EN distinctive existe verbatim dans SRD_CC_v5.2.1.txt', () => {
    const source = normalize(readFileSync(SRD_EN_TXT, 'utf-8'));
    for (const entry of SRD_MAGIC_ITEMS_FIGURINE) {
      const firstParagraph = entry.magicDescription.en.split('\n\n')[0];
      const probe = normalize(firstParagraph.split('\n')[0]).slice(0, 90);
      expect(source.includes(probe), `${entry.id} : EN introuvable verbatim → « ${probe} »`).toBe(true);
    }
  });
});
