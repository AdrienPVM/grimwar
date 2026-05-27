import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  SRD_MAGIC_ITEMS_UTILITY,
  SRD_MAGIC_ITEMS_UTILITY_COUNTS,
} from '../data/srd-magic-items-utility';

/**
 * Plan C tracer-bullet C.6 — Wondrous utilitaires Common + Uncommon SRD CC v5.2.1.
 * 16 entrées (1 common + 15 uncommon) couvrant sacs, balais (déjà C.2), poudres,
 * gemmes, lanterne, perles, pipes, carafe, cartes, urne.
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

describe('SRD magic items — Utility C.6 (cat. 4 compteurs)', () => {
  it('module exporte 1 common + 15 uncommon = 16 entrées', () => {
    expect(SRD_MAGIC_ITEMS_UTILITY_COUNTS.total).toBe(16);
    expect(SRD_MAGIC_ITEMS_UTILITY_COUNTS.common).toBe(1);
    expect(SRD_MAGIC_ITEMS_UTILITY_COUNTS.uncommon).toBe(15);
  });
});

describe('SRD magic items — Utility C.6 (cat. 3 pin valeurs SRD officielles)', () => {
  it('Perle nutritive — common — NOUVEAU SLUG, 1 jour de rations', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'perle-nutritive');
    expect(entry).toBeDefined();
    expect(entry?.rarity).toBe('common');
    expect(entry?.attunement).toBe(false);
    expect(entry?.name.fr).toBe('Perle nutritive');
    expect(entry?.magicDescription.fr).toMatch(/1 jour de rations/);
  });

  it('Urne fumigène — uncommon — drift FR corrigé ("Bouteille" → "Urne")', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'bouteille-fumigene');
    expect(entry).toBeDefined();
    expect(entry?.name.fr).toBe('Urne fumigène');
    expect(entry?.name.fr).not.toBe('Bouteille fumigène');
    expect(entry?.magicDescription.fr).toMatch(/Émanation de 18 m/);
    expect(entry?.magicDescription.fr).toMatch(/taille maximale de 36 m/);
  });

  it('Carquois efficace — uncommon — drift FR corrigé ("d\'Ehlonna" → "efficace")', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'carquois-d-ehlonna');
    expect(entry).toBeDefined();
    expect(entry?.name.fr).toBe('Carquois efficace');
    expect(entry?.name.fr).not.toBe("Carquois d'Ehlonna");
    expect(entry?.magicDescription.fr).toMatch(/60 flèches/);
    expect(entry?.magicDescription.fr).toMatch(/18 javelines/);
  });

  it('Tarot fantasmagorique — uncommon — drift FR corrigé ("Cartes d\'illusion" → "Tarot")', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'cartes-d-illusion');
    expect(entry).toBeDefined();
    expect(entry?.name.fr).toBe('Tarot fantasmagorique');
    expect(entry?.name.fr).not.toBe("Cartes d'illusion");
    expect(entry?.magicDescription.fr).toMatch(/34 cartes/);
    expect(entry?.magicDescription.fr).toMatch(/1d20 − 1 cartes/);
  });

  it('Perle de thaumaturgie — uncommon — drift FR corrigé ("de pouvoir" → "de thaumaturgie")', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'perle-de-pouvoir');
    expect(entry).toBeDefined();
    expect(entry?.attunement).toBe(true);
    expect(entry?.name.fr).toBe('Perle de thaumaturgie');
    expect(entry?.name.fr).not.toBe('Perle de pouvoir');
    expect(entry?.magicDescription.fr).toMatch(/emplacement de sort dépensé du 3ᵉ niveau ou inférieur/);
  });

  it('Sac sans fond — uncommon — 250 kg, 1 800 litres, 2,5 kg', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'sac-sans-fond');
    expect(entry).toBeDefined();
    expect(entry?.magicDescription.fr).toMatch(/250 kg/);
    expect(entry?.magicDescription.fr).toMatch(/1 800 litres/);
    expect(entry?.magicDescription.fr).toMatch(/Plan Astral/);
  });

  it('Sac à malices — uncommon — 3 couleurs (gris/rouille/brun), 3 utilisations max/jour', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'sac-a-malices');
    expect(entry).toBeDefined();
    expect(entry?.magicDescription.fr).toMatch(/grise, rouille ou brune/);
    expect(entry?.magicDescription.fr).toMatch(/trois objets pelucheux/);
  });

  it('Gemme élémentaire — uncommon — table 4 gemmes → 4 élémentaires', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'gemme-elementaire');
    expect(entry).toBeDefined();
    expect(entry?.magicDescription.fr).toMatch(/Corindon rouge → feu/);
    expect(entry?.magicDescription.fr).toMatch(/Saphir bleu → air/);
  });

  it('Flûte des égouts — uncommon — attunement, swarm of rats DC 15', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'flute-des-egouts');
    expect(entry).toBeDefined();
    expect(entry?.attunement).toBe(true);
    expect(entry?.magicDescription.fr).toMatch(/Sagesse DD 15/);
    expect(entry?.magicDescription.fr).toMatch(/nuée de rats/);
  });
});

describe('SRD magic items — Utility C.6 (cat. 1 référentielle bundle)', () => {
  it('le bundle contient les 16 entrées utility SRD-sourced', async () => {
    const bundle = await loadBundle();
    for (const entry of SRD_MAGIC_ITEMS_UTILITY) {
      const inBundle = bundle.find((i) => i.id === entry.id);
      expect(inBundle, `slug ${entry.id} absent du bundle`).toBeDefined();
      expect(inBundle?.source, `${entry.id}.source dans bundle`).toBe('srd-5.2.1');
    }
  });
});
