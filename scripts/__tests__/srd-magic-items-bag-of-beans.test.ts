import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  SRD_MAGIC_ITEMS_BAG_OF_BEANS,
  SRD_MAGIC_ITEMS_BAG_OF_BEANS_COUNTS,
} from '../data/srd-magic-items-bag-of-beans';

/**
 * Batch D29.21 — Sac de haricots magiques SRD CC v5.2.1 : backfill EN + drift de
 * nom « Sac de haricots » → « Sac de haricots magiques ». 1 rare, 0 harmonisé.
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

describe('SRD magic items — Sac de haricots D29.21 (cat. 4 compteurs)', () => {
  it('module exporte 1 entrée rare, sans Harmonisation', () => {
    expect(SRD_MAGIC_ITEMS_BAG_OF_BEANS_COUNTS.total).toBe(1);
    expect(SRD_MAGIC_ITEMS_BAG_OF_BEANS_COUNTS.rare).toBe(1);
    expect(SRD_MAGIC_ITEMS_BAG_OF_BEANS_COUNTS.attuned).toBe(0);
  });
});

describe('SRD magic items — Sac de haricots D29.21 (cat. 3 pin valeurs SRD officielles)', () => {
  it('Bag of Beans — DRIFT « Sac de haricots magiques », rare, table 1d100', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'sac-de-haricots');
    expect(e?.name.fr).toBe('Sac de haricots magiques');
    expect(e?.name.fr).not.toBe('Sac de haricots');
    expect(e?.name.en).toBe('Bag of Beans');
    expect(e?.rarity).toBe('rare');
    expect(e?.attunement).toBe(false);
    expect(e?.magicDescription.en).toMatch(/contains 3d4 dry beans when\s+found/);
    // Table présente aux deux bouts.
    expect(e?.magicDescription.en).toMatch(/01, 5d4 toadstools sprout/);
    expect(e?.magicDescription.en).toMatch(/96–00, A giant beanstalk sprouts/);
    expect(e?.magicDescription.fr).toMatch(/01, 5d4 champignons poussent/);
    expect(e?.magicDescription.fr).toMatch(/96-00, Un plant de haricot géant surgit/);
  });
});

describe('SRD magic items — Sac de haricots D29.21 (cat. 1 référentielle bundle)', () => {
  it('présent dans le bundle avec name.en/fr + source srd', async () => {
    const bundle = await loadBundle();
    const inBundle = bundle.find((i) => i.id === 'sac-de-haricots');
    expect(inBundle?.name.en).toBe('Bag of Beans');
    expect(inBundle?.name.fr).toBe('Sac de haricots magiques');
    expect(inBundle?.source).toBe('srd-5.2.1');
  });
});

/**
 * Garde anti-fabrication : la 1re phrase de `magicDescription.en` doit être une
 * sous-chaîne verbatim de l'extraction SRD EN.
 */
describe('SRD magic items — Sac de haricots D29.21 (anti-fabrication vs source SRD EN)', () => {
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
    for (const entry of SRD_MAGIC_ITEMS_BAG_OF_BEANS) {
      const firstParagraph = entry.magicDescription.en.split('\n\n')[0];
      const probe = normalize(firstParagraph.split('\n')[0]).slice(0, 90);
      expect(source.includes(probe), `${entry.id} : EN introuvable verbatim → « ${probe} »`).toBe(true);
    }
  });
});
