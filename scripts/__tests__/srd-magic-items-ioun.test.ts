import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { SRD_MAGIC_ITEMS_IOUN, SRD_MAGIC_ITEMS_IOUN_COUNTS } from '../data/srd-magic-items-ioun';

/**
 * Batch D29.20 — Pierre de Ioun SRD CC v5.2.1 (14 variantes) : backfill EN +
 * correction Harmonisation + rareté (common→rare représentatif). Ordre des
 * variantes divergent EN/FR (chaque langue reproduit SON ordre officiel).
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

describe('SRD magic items — Pierre de Ioun D29.20 (cat. 4 compteurs)', () => {
  it('module exporte 1 entrée rare, harmonisée', () => {
    expect(SRD_MAGIC_ITEMS_IOUN_COUNTS.total).toBe(1);
    expect(SRD_MAGIC_ITEMS_IOUN_COUNTS.rare).toBe(1);
    expect(SRD_MAGIC_ITEMS_IOUN_COUNTS.attuned).toBe(1);
  });
});

describe('SRD magic items — Pierre de Ioun D29.20 (cat. 3 pin valeurs SRD officielles)', () => {
  it('Ioun Stone — rare (corrigé de common), Harmonisation, 14 variantes EN + FR', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'pierre-de-ioun');
    expect(e?.name.en).toBe('Ioun Stone');
    expect(e?.name.fr).toBe('Pierre de Ioun');
    expect(e?.rarity).toBe('rare');
    expect(e?.rarity).not.toBe('common');
    expect(e?.attunement).toBe(true);
    // Les 14 variantes EN présentes.
    for (const v of [
      'Absorption (Very Rare)',
      'Agility (Very Rare)',
      'Awareness (Rare)',
      'Fortitude (Very Rare)',
      'Greater Absorption (Legendary)',
      'Insight (Very Rare)',
      'Intellect (Very Rare)',
      'Leadership (Very Rare)',
      'Mastery (Legendary)',
      'Protection (Rare)',
      'Regeneration (Legendary)',
      'Reserve (Rare)',
      'Strength (Very Rare)',
      'Sustenance (Rare)',
    ]) {
      expect(e?.magicDescription.en, `EN variante manquante : ${v}`).toContain(v);
    }
    // Les 14 variantes FR présentes (ordre différent de l'EN).
    for (const v of [
      'Absorption (très rare)',
      'Absorption suprême (légendaire)',
      'Agilité (très rare)',
      'Commandement (très rare)',
      'Force (très rare)',
      'Intellect (très rare)',
      'Intuition (très rare)',
      'Maîtrise (légendaire)',
      'Protection (rare)',
      'Régénération (légendaire)',
      'Réserve (rare)',
      'Subsistance (rare)',
      'Vigilance (rare)',
      'Vigueur (très rare)',
    ]) {
      expect(e?.magicDescription.fr, `FR variante manquante : ${v}`).toContain(v);
    }
  });
});

describe('SRD magic items — Pierre de Ioun D29.20 (cat. 1 référentielle bundle)', () => {
  it('présente dans le bundle avec name.en/fr + source srd', async () => {
    const bundle = await loadBundle();
    const inBundle = bundle.find((i) => i.id === 'pierre-de-ioun');
    expect(inBundle?.name.en).toBe('Ioun Stone');
    expect(inBundle?.source).toBe('srd-5.2.1');
  });
});

/**
 * Garde anti-fabrication : la 1re phrase de `magicDescription.en` doit être une
 * sous-chaîne verbatim de l'extraction SRD EN.
 */
describe('SRD magic items — Pierre de Ioun D29.20 (anti-fabrication vs source SRD EN)', () => {
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
    for (const entry of SRD_MAGIC_ITEMS_IOUN) {
      const firstParagraph = entry.magicDescription.en.split('\n\n')[0];
      const probe = normalize(firstParagraph.split('\n')[0]).slice(0, 90);
      expect(source.includes(probe), `${entry.id} : EN introuvable verbatim → « ${probe} »`).toBe(true);
    }
  });
});
