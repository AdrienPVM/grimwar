import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { SRD_MAGIC_ITEMS_BOOKS, SRD_MAGIC_ITEMS_BOOKS_COUNTS } from '../data/srd-magic-items-books';

/**
 * Batch D29.12 — Manuels & traités SRD CC v5.2.1 (backfill EN). 7 very rare, 0
 * harmonisé. Aucun drift (rareté/attunement/nom déjà conformes). Vérifie surtout
 * la correspondance ability-boost EN↔FR.
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

describe('SRD magic items — Manuels/traités D29.12 (cat. 4 compteurs)', () => {
  it('module exporte 7 very rare = 7 entrées, 0 harmonisée', () => {
    expect(SRD_MAGIC_ITEMS_BOOKS_COUNTS.total).toBe(7);
    expect(SRD_MAGIC_ITEMS_BOOKS_COUNTS.veryRare).toBe(7);
    expect(SRD_MAGIC_ITEMS_BOOKS_COUNTS.attuned).toBe(0);
  });

  it('toutes les entrées : category=gear, source=srd-5.2.1, very rare, sans Harmonisation', () => {
    for (const entry of SRD_MAGIC_ITEMS_BOOKS) {
      expect(entry.category, `${entry.id}.category`).toBe('gear');
      expect(entry.source, `${entry.id}.source`).toBe('srd-5.2.1');
      expect(entry.rarity, `${entry.id}.rarity`).toBe('very rare');
      expect(entry.attunement, `${entry.id}.attunement`).toBe(false);
      expect(entry.name.en, `${entry.id}.name.en`).toBeTruthy();
      expect(entry.magicDescription.en, `${entry.id}.magicDescription.en`).toBeTruthy();
    }
  });
});

describe('SRD magic items — Manuels/traités D29.12 (cat. 3 correspondance ability-boost)', () => {
  const cases: Array<{ id: string; en: string; fr: string; abilityEn: RegExp; abilityFr: RegExp }> = [
    { id: 'manuel-de-vitalite', en: 'Manual of Bodily Health', fr: 'Manuel de vitalité', abilityEn: /Constitution increases by 2/, abilityFr: /Constitution augmente de 2/ },
    { id: 'manuel-d-exercices-physiques', en: 'Manual of Gainful Exercise', fr: "Manuel d'exercices physiques", abilityEn: /Strength in.*creases by 2/s, abilityFr: /Force augmente de 2/ },
    { id: 'manuel-de-vivacite', en: 'Manual of Quickness of Action', fr: 'Manuel de vivacité', abilityEn: /Dexterity increases by 2/, abilityFr: /Dextérité augmente de 2/ },
    { id: 'traite-de-perspicacite', en: 'Tome of Clear Thought', fr: 'Traité de perspicacité', abilityEn: /Intelligence increases by 2/, abilityFr: /Intelligence augmente de 2/ },
    { id: 'traite-d-autorite-et-d-influence', en: 'Tome of Leadership and Influence', fr: "Traité d'autorité et d'influence", abilityEn: /Charisma increases by 2/, abilityFr: /Charisme augmente de 2/ },
    { id: 'traite-de-comprehension', en: 'Tome of Understanding', fr: 'Traité de compréhension', abilityEn: /Wisdom increases by 2/, abilityFr: /Sagesse augmente de 2/ },
  ];

  for (const c of cases) {
    it(`${c.en} (${c.id}) — very rare, bon ability-boost EN↔FR`, async () => {
      const bundle = await loadBundle();
      const e = bundle.find((i) => i.id === c.id);
      expect(e?.name.en).toBe(c.en);
      expect(e?.name.fr).toBe(c.fr);
      expect(e?.rarity).toBe('very rare');
      expect(e?.attunement).toBe(false);
      expect(e?.magicDescription.en).toMatch(c.abilityEn);
      expect(e?.magicDescription.fr).toMatch(c.abilityFr);
    });
  }

  it('Manual of Golems — very rare, incantateur 2 emplacements niv.5, table golems', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'manuel-des-golems');
    expect(e?.name.en).toBe('Manual of Golems');
    expect(e?.rarity).toBe('very rare');
    expect(e?.attunement).toBe(false);
    expect(e?.magicDescription.en).toMatch(/at\s+least two level 5 spell slots/);
    expect(e?.magicDescription.en).toMatch(/Clay Golem 1–5, 30 days, 65,000 GP/);
    expect(e?.magicDescription.fr).toMatch(/Golem d'argile 1-5, 30 jours, 65 000 po/);
  });
});

describe('SRD magic items — Manuels/traités D29.12 (cat. 1 référentielle bundle)', () => {
  it('les 7 livres sont présents dans le bundle avec name.en/fr + source srd', async () => {
    const bundle = await loadBundle();
    for (const entry of SRD_MAGIC_ITEMS_BOOKS) {
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
describe('SRD magic items — Manuels/traités D29.12 (anti-fabrication vs source SRD EN)', () => {
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
    for (const entry of SRD_MAGIC_ITEMS_BOOKS) {
      const firstParagraph = entry.magicDescription.en.split('\n\n')[0];
      const probe = normalize(firstParagraph.split('\n')[0]).slice(0, 90);
      expect(source.includes(probe), `${entry.id} : EN introuvable verbatim → « ${probe} »`).toBe(true);
    }
  });
});
