import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  SRD_MAGIC_ITEMS_WEAPONS,
  SRD_MAGIC_ITEMS_WEAPONS_COUNTS,
} from '../data/srd-magic-items-weapons';

/**
 * Plan C tracer-bullet C.4 — Armes + munitions Common + Uncommon SRD CC v5.2.1.
 * 5 entrées uncommon : Arme +1, Projectile +1, Javeline de foudre,
 * Trident de domination aquatique, Arme vigilante.
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

describe('SRD magic items — Weapons C.4 (cat. 4 compteurs)', () => {
  it('module exporte 0 common + 5 uncommon = 5 entrées', () => {
    expect(SRD_MAGIC_ITEMS_WEAPONS_COUNTS.total).toBe(5);
    expect(SRD_MAGIC_ITEMS_WEAPONS_COUNTS.common).toBe(0);
    expect(SRD_MAGIC_ITEMS_WEAPONS_COUNTS.uncommon).toBe(5);
  });

  it('toutes les entrées ont category=weapon, source=srd-5.2.1', () => {
    for (const entry of SRD_MAGIC_ITEMS_WEAPONS) {
      expect(entry.category, `${entry.id}.category`).toBe('weapon');
      expect(entry.source, `${entry.id}.source`).toBe('srd-5.2.1');
    }
  });
});

describe('SRD magic items — Weapons C.4 (cat. 3 pin valeurs SRD officielles)', () => {
  it('Arme +1 — uncommon — bonus déterminé par rareté, PAS d’attunement (générique)', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'arme-1-2-ou-3');
    expect(entry).toBeDefined();
    expect(entry?.rarity).toBe('uncommon');
    expect(entry?.attunement).toBe(false);
    expect(entry?.magicDescription.fr).toMatch(/bonus aux jets d['’]attaque et de dégâts/);
  });

  it('Projectile +1 — uncommon — drift FR corrigé ("Munition" → "Projectile")', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'munition-1-2-ou-3');
    expect(entry).toBeDefined();
    expect(entry?.name.fr).toBe('Projectile +1, +2 ou +3');
    expect(entry?.name.fr).not.toBe('Munition +1, +2 ou +3');
    expect(entry?.magicDescription.fr).toMatch(/dix ou vingt/);
  });

  it('Javeline de foudre — uncommon — 4d6 dégâts foudre, DD 13, portée 36 m', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'javeline-de-foudre');
    expect(entry).toBeDefined();
    expect(entry?.attunement).toBe(false);
    expect(entry?.magicDescription.fr).toMatch(/4d6 dégâts/);
    expect(entry?.magicDescription.fr).toMatch(/Dextérité DD 13/);
    expect(entry?.magicDescription.fr).toMatch(/36 m/);
    expect(entry?.magicDescription.fr).toMatch(/Ligne de 1,50 m de large/);
  });

  it('Trident de domination aquatique — uncommon — 3 charges, domination de bête DD 15', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'trident-de-domination-aquatique');
    expect(entry).toBeDefined();
    expect(entry?.attunement).toBe(true);
    expect(entry?.magicDescription.fr).toMatch(/3 charges/);
    expect(entry?.magicDescription.fr).toMatch(/domination de bête \(DD de sauvegarde 15\)/);
    expect(entry?.magicDescription.fr).toMatch(/Bête dotée d['’]une Vitesse de nage/);
  });

  it('Arme vigilante — uncommon — NOUVEAU SLUG ajouté, +Avantage Initiative dans 9 m', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'arme-vigilante');
    expect(entry).toBeDefined();
    expect(entry?.rarity).toBe('uncommon');
    expect(entry?.attunement).toBe(true);
    expect(entry?.name.fr).toBe('Arme vigilante');
    expect(entry?.magicDescription.fr).toMatch(/Avantage aux jets d['’]Initiative/);
    expect(entry?.magicDescription.fr).toMatch(/réveille magiquement chaque sujet endormi/);
  });
});

describe('SRD magic items — Weapons C.4 (cat. 1 référentielle bundle)', () => {
  it('le bundle contient les 5 armes SRD-sourced', async () => {
    const bundle = await loadBundle();
    for (const entry of SRD_MAGIC_ITEMS_WEAPONS) {
      const inBundle = bundle.find((i) => i.id === entry.id);
      expect(inBundle, `slug ${entry.id} absent du bundle`).toBeDefined();
      expect(inBundle?.source, `${entry.id}.source dans bundle`).toBe('srd-5.2.1');
    }
  });
});
