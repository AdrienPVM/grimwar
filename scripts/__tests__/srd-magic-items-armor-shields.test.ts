import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  SRD_MAGIC_ITEMS_ARMOR_SHIELDS,
  SRD_MAGIC_ITEMS_ARMOR_SHIELDS_COUNTS,
} from '../data/srd-magic-items-armor-shields';

/**
 * Plan C tracer-bullet C.5 — Armures + boucliers Common + Uncommon SRD CC v5.2.1.
 * 4 entrées uncommon : Armure en adamantium, Armure de mithral, Bouclier +1, Bouclier sentinelle.
 */

const MAGIC_ITEMS_JSON = path.resolve(__dirname, '../../public/data/magic-items.json');

interface MagicItemEntry {
  id: string;
  name: { fr: string; en?: string };
  category: string;
  rarity: string;
  attunement: boolean | { fr: string };
  magicDescription: { fr: string; en?: string };
  description: { fr: string } | null;
  source: string;
}

async function loadBundle(): Promise<MagicItemEntry[]> {
  const raw = await readFile(MAGIC_ITEMS_JSON, 'utf-8');
  return JSON.parse(raw) as MagicItemEntry[];
}

describe('SRD magic items — Armor/Shields C.5 (cat. 4 compteurs)', () => {
  it('module exporte 0 common + 4 uncommon = 4 entrées', () => {
    expect(SRD_MAGIC_ITEMS_ARMOR_SHIELDS_COUNTS.total).toBe(4);
    expect(SRD_MAGIC_ITEMS_ARMOR_SHIELDS_COUNTS.common).toBe(0);
    expect(SRD_MAGIC_ITEMS_ARMOR_SHIELDS_COUNTS.uncommon).toBe(4);
  });
});

describe('SRD magic items — Armor/Shields C.5 (cat. 3 pin valeurs SRD officielles)', () => {
  it('Armure en adamantium — uncommon — Coup critique → coup normal (drift "d\'adamantium" → "en adamantium")', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'armure-d-adamantium');
    expect(entry).toBeDefined();
    expect(entry?.name.fr).toBe('Armure en adamantium');
    expect(entry?.name.fr).not.toBe("Armure d'adamantium");
    expect(entry?.magicDescription.fr).toMatch(/Coup critique contre vous devient un coup normal/);
  });

  it('Armure de mithral — uncommon — supprime Désavantage Discrétion + Force min', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'armure-de-mithral');
    expect(entry).toBeDefined();
    expect(entry?.attunement).toBe(false);
    expect(entry?.magicDescription.fr).toMatch(/Désavantage aux tests de Dextérité \(Discrétion\)/);
    expect(entry?.magicDescription.fr).toMatch(/valeur de Force minimale/);
  });

  it('Bouclier +1 — uncommon — bonus CA additionnel selon rareté', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'bouclier-1-2-ou-3');
    expect(entry).toBeDefined();
    expect(entry?.magicDescription.fr).toMatch(/bonus déterminé par la rareté du bouclier/);
    expect(entry?.magicDescription.fr).toMatch(/en plus du bonus normal du bouclier/);
  });

  it('Bouclier sentinelle — uncommon — NOUVEAU SLUG, Avantage Initiative + Perception', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'bouclier-sentinelle');
    expect(entry).toBeDefined();
    expect(entry?.rarity).toBe('uncommon');
    expect(entry?.attunement).toBe(false);
    expect(entry?.name.fr).toBe('Bouclier sentinelle');
    expect(entry?.magicDescription.fr).toMatch(/Avantage aux jets d['’]Initiative/);
    expect(entry?.magicDescription.fr).toMatch(/Sagesse \(Perception\)/);
  });
});

describe('SRD magic items — Armor/Shields C.5 (cat. 1 référentielle bundle)', () => {
  it('le bundle contient les 4 armures/boucliers SRD-sourced', async () => {
    const bundle = await loadBundle();
    for (const entry of SRD_MAGIC_ITEMS_ARMOR_SHIELDS) {
      const inBundle = bundle.find((i) => i.id === entry.id);
      expect(inBundle, `slug ${entry.id} absent du bundle`).toBeDefined();
      expect(inBundle?.source, `${entry.id}.source dans bundle`).toBe('srd-5.2.1');
    }
  });
});
