import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  SRD_MAGIC_ITEMS_RELIQUAT,
  SRD_MAGIC_ITEMS_RELIQUAT_COUNTS,
} from '../data/srd-magic-items-reliquat';

/**
 * Plan C tracer-bullet C.7 — Reliquat Common + Uncommon SRD CC v5.2.1 — CLÔTURE.
 * 8 entrées (1 common + 7 uncommon) : Parchemin de sort, Corde d'ascension,
 * Éventail enchanté, Huile d'insaisissabilité, Philtre d'amour, Pierre
 * porte-bonheur, Pierres messagères (NOUVEAU), Sceptre inamovible.
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

describe('SRD magic items — Reliquat C.7 (cat. 4 compteurs)', () => {
  it('module exporte 1 common + 7 uncommon = 8 entrées', () => {
    expect(SRD_MAGIC_ITEMS_RELIQUAT_COUNTS.total).toBe(8);
    expect(SRD_MAGIC_ITEMS_RELIQUAT_COUNTS.common).toBe(1);
    expect(SRD_MAGIC_ITEMS_RELIQUAT_COUNTS.uncommon).toBe(7);
  });
});

describe('SRD magic items — Reliquat C.7 (cat. 3 pin valeurs SRD officielles)', () => {
  it('Parchemin de sort — common — DD par niveau de sort', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'parchemin-de-sort');
    expect(entry).toBeDefined();
    expect(entry?.rarity).toBe('common');
    expect(entry?.magicDescription.fr).toMatch(/test de caractéristique avec votre caractéristique d['’]incantation/);
    expect(entry?.magicDescription.fr).toMatch(/Sort mineur\/L1 → courant/);
    expect(entry?.magicDescription.fr).toMatch(/Magicien peut être copié/);
  });

  it('Corde d’ascension — uncommon — drift FR corrigé ("d\'escalade" → "d\'ascension")', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'corde-d-escalade');
    expect(entry).toBeDefined();
    expect(entry?.name.fr).toBe("Corde d'ascension");
    expect(entry?.name.fr).not.toBe("Corde d'escalade");
    expect(entry?.magicDescription.fr).toMatch(/18 m de long/);
    expect(entry?.magicDescription.fr).toMatch(/1 500 kg/);
  });

  it('Éventail enchanté — uncommon — bourrasque DD 13, 20% cumulatif de désagrégation', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'eventail-enchante');
    expect(entry).toBeDefined();
    expect(entry?.magicDescription.fr).toMatch(/bourrasque \(DD de sauvegarde 13\)/);
    expect(entry?.magicDescription.fr).toMatch(/20 % à chaque fois/);
  });

  it('Pierre porte-bonheur — uncommon — +1 tests carac + jets sauvegarde (attunement)', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'pierre-porte-bonheur');
    expect(entry).toBeDefined();
    expect(entry?.attunement).toBe(true);
    expect(entry?.magicDescription.fr).toMatch(/agate polie/);
    expect(entry?.magicDescription.fr).toMatch(/bonus de \+1/);
  });

  it('Pierres messagères — uncommon — NOUVEAU SLUG, paire, communication à distance', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'pierres-messageres');
    expect(entry).toBeDefined();
    expect(entry?.rarity).toBe('uncommon');
    expect(entry?.attunement).toBe(false);
    expect(entry?.name.fr).toBe('Pierres messagères');
    expect(entry?.magicDescription.fr).toMatch(/Les pierres messagères vont par deux/);
    expect(entry?.magicDescription.fr).toMatch(/communication à distance/);
  });

  it('Sceptre inamovible — uncommon — 4 000 kg max, DC 30 Force pour déplacer', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'sceptre-inamovible');
    expect(entry).toBeDefined();
    expect(entry?.magicDescription.fr).toMatch(/4 000 kg/);
    expect(entry?.magicDescription.fr).toMatch(/Force \(Athlétisme\) DD 30/);
  });

  it('Philtre d’amour — uncommon — Charmé 1 heure après 10 minutes', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'philtre-d-amour');
    expect(entry).toBeDefined();
    expect(entry?.magicDescription.fr).toMatch(/10 minutes après avoir bu/);
    expect(entry?.magicDescription.fr).toMatch(/état Charmé pendant 1 heure/);
  });

  it('Huile d’insaisissabilité — uncommon — liberté de mouvement 8h ou graisse 8h', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'huile-d-insaisissabilite');
    expect(entry).toBeDefined();
    expect(entry?.magicDescription.fr).toMatch(/liberté de mouvement pendant 8 heures/);
    expect(entry?.magicDescription.fr).toMatch(/sort graisse/);
  });
});

describe('SRD magic items — Reliquat C.7 (cat. 1 référentielle bundle)', () => {
  it('le bundle contient les 8 entrées reliquat SRD-sourced', async () => {
    const bundle = await loadBundle();
    for (const entry of SRD_MAGIC_ITEMS_RELIQUAT) {
      const inBundle = bundle.find((i) => i.id === entry.id);
      expect(inBundle, `slug ${entry.id} absent du bundle`).toBeDefined();
      expect(inBundle?.source, `${entry.id}.source dans bundle`).toBe('srd-5.2.1');
    }
  });
});
