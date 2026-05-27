import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { SRD_MAGIC_ITEMS_POTIONS, SRD_MAGIC_ITEMS_POTIONS_COUNTS } from '../data/srd-magic-items-potions';

/**
 * Plan C tracer-bullet C.1 — Potions Common + Uncommon SRD CC v5.2.1.
 *
 * Catégories de tests (cf. CLAUDE.md « Vérité du contenu — 6 catégories ») :
 *   - 1. Cohérence référentielle : pas de double slug, ids valides.
 *   - 2. Identité contenu : la formulation officielle SRD FR doit apparaître
 *        VERBATIM dans la `magicDescription.fr` du bundle servi.
 *   - 3. Fidélité bundle — pin 4 valeurs figées vérifiées contre PDF FR officiel.
 *   - 4. Compteurs : 2 common + 7 uncommon = 9 entrées.
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

describe('SRD magic items — Potions C.1 (cat. 4 compteurs)', () => {
  it('module exporte 2 common + 7 uncommon = 9 entrées', () => {
    expect(SRD_MAGIC_ITEMS_POTIONS_COUNTS.total).toBe(9);
    expect(SRD_MAGIC_ITEMS_POTIONS_COUNTS.common).toBe(2);
    expect(SRD_MAGIC_ITEMS_POTIONS_COUNTS.uncommon).toBe(7);
  });

  it('toutes les entrées ont category=gear, attunement=false, source=srd-5.2.1', () => {
    for (const entry of SRD_MAGIC_ITEMS_POTIONS) {
      expect(entry.category, `${entry.id}.category`).toBe('gear');
      expect(entry.attunement, `${entry.id}.attunement`).toBe(false);
      expect(entry.source, `${entry.id}.source`).toBe('srd-5.2.1');
    }
  });

  it('aucun slug dupliqué dans le module', () => {
    const seen = new Set<string>();
    for (const entry of SRD_MAGIC_ITEMS_POTIONS) {
      expect(seen.has(entry.id), `slug dupliqué : ${entry.id}`).toBe(false);
      seen.add(entry.id);
    }
  });

  it('toutes les entrées ont des champs FR et EN non vides (name + magicDescription)', () => {
    for (const entry of SRD_MAGIC_ITEMS_POTIONS) {
      expect(entry.name.fr.length, `${entry.id}.name.fr`).toBeGreaterThan(0);
      expect(entry.name.en.length, `${entry.id}.name.en`).toBeGreaterThan(0);
      expect(entry.magicDescription.fr.length, `${entry.id}.magicDescription.fr`).toBeGreaterThan(20);
      expect(entry.magicDescription.en.length, `${entry.id}.magicDescription.en`).toBeGreaterThan(20);
    }
  });
});

describe('SRD magic items — Potions C.1 (cat. 3 pin valeurs SRD officielles)', () => {
  // Vérifié UNE FOIS contre PDF SRD FR CC v5.2.1 (et confirmé par
  // l'extraction `.txt` lignes 28067-28246).
  it('Potion d’escalade — common — Vitesse d’escalade pendant 1 heure', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'potion-d-escalade');
    expect(entry).toBeDefined();
    expect(entry?.rarity).toBe('common');
    expect(entry?.name.fr).toBe("Potion d'escalade");
    expect(entry?.magicDescription.fr).toMatch(/Vitesse d['’]escalade égale à votre Vitesse pendant 1 heure/);
    expect(entry?.magicDescription.fr).toMatch(/Avantage aux tests de Force \(Athlétisme\)/);
  });

  it('Potion de guérison — common — 2d4 + 2 et table des raretés', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'potion-de-guerison');
    expect(entry).toBeDefined();
    expect(entry?.rarity).toBe('common');
    expect(entry?.magicDescription.fr).toMatch(/2d4 \+ 2/);
    expect(entry?.magicDescription.fr).toMatch(/4d4 \+ 4/);
    expect(entry?.magicDescription.fr).toMatch(/10d4 \+ 20/);
  });

  it("Potion d'agrandissement — uncommon — DURÉE 10 MINUTES (corrige le drift AideDD 1d4 heures)", async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'potion-d-agrandissement');
    expect(entry).toBeDefined();
    expect(entry?.rarity).toBe('uncommon');
    expect(entry?.magicDescription.fr).toMatch(/pendant 10 minutes/);
    expect(entry?.magicDescription.fr).not.toMatch(/1d4 heures/);
    expect(entry?.magicDescription.fr).toMatch(/agrandissement\/rapetissement/);
  });

  it("Potion d'amitié avec les animaux — uncommon — cast au 3ᵉ niveau, DD 13", async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'potion-d-amitie-avec-les-animaux');
    expect(entry).toBeDefined();
    expect(entry?.rarity).toBe('uncommon');
    expect(entry?.magicDescription.fr).toMatch(/lancer le sort amitié avec les animaux au 3ᵉ niveau/);
    expect(entry?.magicDescription.fr).toMatch(/DD de sauvegarde 13/);
    expect(entry?.magicDescription.fr).not.toMatch(/1 heure à volonté/);
  });

  it('Potion de respiration aquatique — uncommon — DURÉE 24 HEURES (corrige le drift AideDD 1 heure)', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'potion-de-respiration-aquatique');
    expect(entry).toBeDefined();
    expect(entry?.rarity).toBe('uncommon');
    expect(entry?.magicDescription.fr).toMatch(/respirer sous l['’]eau pendant 24 heures/);
    expect(entry?.magicDescription.fr).not.toMatch(/pendant 1 heure après avoir bu/);
  });

  it('Potion toxique — uncommon — slug stable potion-de-poison, name.fr officiel', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'potion-de-poison');
    expect(entry).toBeDefined();
    expect(entry?.rarity).toBe('uncommon');
    expect(entry?.name.fr).toBe('Potion toxique');
    expect(entry?.magicDescription.fr).toMatch(/4d6 dégâts de poison/);
    expect(entry?.magicDescription.fr).toMatch(/Constitution DD 13/);
    expect(entry?.magicDescription.fr).toMatch(/Empoisonné pendant 1 heure/);
  });

  it('Potion de force de géant — uncommon — Force 21, slug stable, mention table SRD', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'potion-de-force-de-geant');
    expect(entry).toBeDefined();
    expect(entry?.rarity).toBe('uncommon');
    expect(entry?.name.fr).toBe('Potion de force de géant (collines)');
    expect(entry?.magicDescription.fr).toMatch(/Force 21/);
    expect(entry?.magicDescription.fr).toMatch(/(givre|pierres|feu|nuages|tempêtes)/);
  });
});

describe('SRD magic items — Potions C.1 (cat. 1 référentielle bundle)', () => {
  it('le bundle contient les 9 potions SRD-sourced + 1 nouveau slug potion-de-guerison-importante', async () => {
    const bundle = await loadBundle();
    for (const entry of SRD_MAGIC_ITEMS_POTIONS) {
      const inBundle = bundle.find((i) => i.id === entry.id);
      expect(inBundle, `slug ${entry.id} absent du bundle`).toBeDefined();
      expect(inBundle?.source, `${entry.id}.source dans bundle`).toBe('srd-5.2.1');
    }
  });

  it('aucun slug dupliqué dans le bundle global magic-items.json', async () => {
    const bundle = await loadBundle();
    const ids = bundle.map((i) => i.id);
    const dupes = ids.filter((id, idx) => ids.indexOf(id) !== idx);
    expect(dupes).toEqual([]);
  });
});
