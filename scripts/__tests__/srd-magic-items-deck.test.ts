import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { SRD_MAGIC_ITEMS_DECK, SRD_MAGIC_ITEMS_DECK_COUNTS } from '../data/srd-magic-items-deck';

/**
 * Batch D29.23 — Tarot mystérieux SRD CC v5.2.1 (Mysterious Deck, 22 cartes) :
 * backfill EN + drift de nom « Cartes merveilleuses » → « Tarot mystérieux ».
 * 1 legendary, 0 harmonisé. Clôt le backfill des magic-items présents au SRD.
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

describe('SRD magic items — Tarot mystérieux D29.23 (cat. 4 compteurs)', () => {
  it('module exporte 1 entrée legendary, sans Harmonisation', () => {
    expect(SRD_MAGIC_ITEMS_DECK_COUNTS.total).toBe(1);
    expect(SRD_MAGIC_ITEMS_DECK_COUNTS.legendary).toBe(1);
    expect(SRD_MAGIC_ITEMS_DECK_COUNTS.attuned).toBe(0);
  });
});

describe('SRD magic items — Tarot mystérieux D29.23 (cat. 3 pin valeurs SRD officielles)', () => {
  it('Mysterious Deck — DRIFT « Tarot mystérieux », legendary, 22 cartes EN + FR', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'cartes-merveilleuses');
    expect(e?.name.fr).toBe('Tarot mystérieux');
    expect(e?.name.fr).not.toBe('Cartes merveilleuses');
    expect(e?.name.en).toBe('Mysterious Deck');
    expect(e?.rarity).toBe('legendary');
    expect(e?.attunement).toBe(false);
    // Les 22 cartes EN.
    for (const c of [
      'Balance.',
      'Comet.',
      'Donjon.',
      'Euryale.',
      'Fates.',
      'Flames.',
      'Fool.',
      'Gem.',
      'Jester.',
      'Key.',
      'Knight.',
      'Moon.',
      'Puzzle.',
      'Rogue.',
      'Ruin.',
      'Sage.',
      'Skull.',
      'Star.',
      'Sun.',
      'Talons.',
      'Throne.',
      'Void.',
    ]) {
      expect(e?.magicDescription.en, `EN carte manquante : ${c}`).toContain(`\n\n${c}`);
    }
    // Les 22 cartes FR (noms français, ordre différent).
    for (const c of [
      'La Balance.',
      'Le Bouffon.',
      'Le Chevalier.',
      'La Clef.',
      'La Comète.',
      'Le Crâne.',
      'Le Donjon.',
      "L'Énigme.",
      "L'Étoile.",
      'Euryale.',
      'Les Flammes.',
      'Le Fou.',
      'La Gemme.',
      'La Lune.',
      'Le Néant.',
      'Les Parques.',
      'La Ruine.',
      'Les Serres.',
      'Le Soleil.',
      'Le Traître.',
      'Le Trône.',
      'Le Vizir.',
    ]) {
      expect(e?.magicDescription.fr, `FR carte manquante : ${c}`).toContain(`\n\n${c}`);
    }
    // Tables de pioche divergentes EN/FR.
    expect(e?.magicDescription.en).toMatch(/Void: 97–00 \/ 97–00/);
    expect(e?.magicDescription.fr).toMatch(/Le Vizir : — \/ 96-00/);
  });
});

describe('SRD magic items — Tarot mystérieux D29.23 (cat. 1 référentielle bundle)', () => {
  it('présent dans le bundle avec name.en/fr + source srd', async () => {
    const bundle = await loadBundle();
    const inBundle = bundle.find((i) => i.id === 'cartes-merveilleuses');
    expect(inBundle?.name.en).toBe('Mysterious Deck');
    expect(inBundle?.name.fr).toBe('Tarot mystérieux');
    expect(inBundle?.source).toBe('srd-5.2.1');
  });
});

/**
 * Garde anti-fabrication : la 1re phrase de `magicDescription.en` doit être une
 * sous-chaîne verbatim de l'extraction SRD EN.
 */
describe('SRD magic items — Tarot mystérieux D29.23 (anti-fabrication vs source SRD EN)', () => {
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
    for (const entry of SRD_MAGIC_ITEMS_DECK) {
      const firstParagraph = entry.magicDescription.en.split('\n\n')[0];
      const probe = normalize(firstParagraph.split('\n')[0]).slice(0, 90);
      expect(source.includes(probe), `${entry.id} : EN introuvable verbatim → « ${probe} »`).toBe(true);
    }
  });
});
