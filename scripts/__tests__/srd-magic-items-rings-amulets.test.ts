import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  SRD_MAGIC_ITEMS_RINGS_AMULETS,
  SRD_MAGIC_ITEMS_RINGS_AMULETS_COUNTS,
} from '../data/srd-magic-items-rings-amulets';

/**
 * Plan C tracer-bullet C.3 — Anneaux + amulettes Common + Uncommon SRD CC v5.2.1.
 *
 * 5 anneaux uncommon + 4 wondrous "cou" uncommon = 9 entrées.
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

describe('SRD magic items — Rings + Amulets C.3 (cat. 4 compteurs)', () => {
  it('module exporte 0 common + 9 uncommon = 9 entrées', () => {
    expect(SRD_MAGIC_ITEMS_RINGS_AMULETS_COUNTS.total).toBe(9);
    expect(SRD_MAGIC_ITEMS_RINGS_AMULETS_COUNTS.common).toBe(0);
    expect(SRD_MAGIC_ITEMS_RINGS_AMULETS_COUNTS.uncommon).toBe(9);
  });

  it('toutes les entrées ont category=gear, source=srd-5.2.1', () => {
    for (const entry of SRD_MAGIC_ITEMS_RINGS_AMULETS) {
      expect(entry.category, `${entry.id}.category`).toBe('gear');
      expect(entry.source, `${entry.id}.source`).toBe('srd-5.2.1');
    }
  });

  it('aucun slug dupliqué dans le module', () => {
    const seen = new Set<string>();
    for (const entry of SRD_MAGIC_ITEMS_RINGS_AMULETS) {
      expect(seen.has(entry.id), `slug dupliqué : ${entry.id}`).toBe(false);
      seen.add(entry.id);
    }
  });
});

describe('SRD magic items — Rings + Amulets C.3 (cat. 3 pin valeurs SRD officielles)', () => {
  it('Anneau de saut — uncommon — cast saut sur soi (attunement requis)', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'anneau-de-saut');
    expect(entry).toBeDefined();
    expect(entry?.rarity).toBe('uncommon');
    expect(entry?.attunement).toBe(true);
    expect(entry?.magicDescription.fr).toMatch(/lancer saut/);
    expect(entry?.magicDescription.fr).toMatch(/cibler que vous-même/);
  });

  it('Anneau de nage — uncommon — Vitesse de nage 12 m, PAS d’attunement', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'anneau-de-nage');
    expect(entry).toBeDefined();
    expect(entry?.attunement).toBe(false);
    expect(entry?.magicDescription.fr).toMatch(/Vitesse de nage de 12 m/);
  });

  it('Anneau de chaleur constante — uncommon — réduit dégâts froid de 2d8', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'anneau-de-chaleur-constante');
    expect(entry).toBeDefined();
    expect(entry?.attunement).toBe(true);
    expect(entry?.magicDescription.fr).toMatch(/réduit ces dégâts de 2d8/);
    expect(entry?.magicDescription.fr).toMatch(/–18 °C/);
  });

  it('Amulette d’antidétection — uncommon — divination/scrutation bloqués', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'amulette-d-antidetection');
    expect(entry).toBeDefined();
    expect(entry?.attunement).toBe(true);
    expect(entry?.magicDescription.fr).toMatch(/sort de divination/);
    expect(entry?.magicDescription.fr).toMatch(/capteur de scrutation/);
  });

  it('Amulette de cicatrisation — uncommon — Préservation vie + Stimulation guérison', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'amulette-de-cicatrisation');
    expect(entry).toBeDefined();
    expect(entry?.attunement).toBe(true);
    expect(entry?.magicDescription.fr).toMatch(/Préservation de la vie/);
    expect(entry?.magicDescription.fr).toMatch(/Stimulation de la guérison/);
    expect(entry?.magicDescription.fr).toMatch(/résultat de 9 ou moins en 10/);
    expect(entry?.magicDescription.fr).toMatch(/doublez le nombre de points de vie/);
  });

  it('Médaillon des pensées — uncommon — 5 charges, lance détection des pensées DD 13', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'medaillon-des-pensees');
    expect(entry).toBeDefined();
    expect(entry?.attunement).toBe(true);
    expect(entry?.magicDescription.fr).toMatch(/5 charges/);
    expect(entry?.magicDescription.fr).toMatch(/détection des pensées \(DD de sauvegarde 13\)/);
    expect(entry?.magicDescription.fr).toMatch(/1d4 charges dépensées/);
  });
});

describe('SRD magic items — Rings + Amulets C.3 (cat. 1 référentielle bundle)', () => {
  it('le bundle contient les 9 anneaux+amulettes SRD-sourced', async () => {
    const bundle = await loadBundle();
    for (const entry of SRD_MAGIC_ITEMS_RINGS_AMULETS) {
      const inBundle = bundle.find((i) => i.id === entry.id);
      expect(inBundle, `slug ${entry.id} absent du bundle`).toBeDefined();
      expect(inBundle?.source, `${entry.id}.source dans bundle`).toBe('srd-5.2.1');
    }
  });
});
