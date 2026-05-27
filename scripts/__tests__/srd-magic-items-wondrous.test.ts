import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  SRD_MAGIC_ITEMS_WONDROUS,
  SRD_MAGIC_ITEMS_WONDROUS_COUNTS,
} from '../data/srd-magic-items-wondrous';

/**
 * Plan C tracer-bullet C.2 — Wondrous wearables Common + Uncommon SRD CC v5.2.1.
 *
 * Catégories de tests (cf. CLAUDE.md « Vérité du contenu — 6 catégories ») :
 *   - 1. Cohérence référentielle : pas de double slug, ids valides.
 *   - 2. Identité contenu : la formulation officielle SRD FR doit apparaître
 *        VERBATIM dans la `magicDescription.fr` du bundle servi.
 *   - 3. Fidélité bundle — pin 6 valeurs figées vérifiées contre PDF FR officiel.
 *   - 4. Compteurs : 0 common + 24 uncommon = 24 entrées.
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

describe('SRD magic items — Wondrous wearables C.2 (cat. 4 compteurs)', () => {
  it('module exporte 0 common + 24 uncommon = 24 entrées', () => {
    expect(SRD_MAGIC_ITEMS_WONDROUS_COUNTS.total).toBe(24);
    expect(SRD_MAGIC_ITEMS_WONDROUS_COUNTS.common).toBe(0);
    expect(SRD_MAGIC_ITEMS_WONDROUS_COUNTS.uncommon).toBe(24);
  });

  it('toutes les entrées ont category=gear, source=srd-5.2.1', () => {
    for (const entry of SRD_MAGIC_ITEMS_WONDROUS) {
      expect(entry.category, `${entry.id}.category`).toBe('gear');
      expect(entry.source, `${entry.id}.source`).toBe('srd-5.2.1');
    }
  });

  it('aucun slug dupliqué dans le module', () => {
    const seen = new Set<string>();
    for (const entry of SRD_MAGIC_ITEMS_WONDROUS) {
      expect(seen.has(entry.id), `slug dupliqué : ${entry.id}`).toBe(false);
      seen.add(entry.id);
    }
  });

  it('toutes les entrées ont des champs FR et EN non vides (name + magicDescription)', () => {
    for (const entry of SRD_MAGIC_ITEMS_WONDROUS) {
      expect(entry.name.fr.length, `${entry.id}.name.fr`).toBeGreaterThan(0);
      expect(entry.name.en.length, `${entry.id}.name.en`).toBeGreaterThan(0);
      expect(entry.magicDescription.fr.length, `${entry.id}.magicDescription.fr`).toBeGreaterThan(20);
      expect(entry.magicDescription.en.length, `${entry.id}.magicDescription.en`).toBeGreaterThan(20);
    }
  });
});

describe('SRD magic items — Wondrous wearables C.2 (cat. 3 pin valeurs SRD officielles)', () => {
  // Vérifié UNE FOIS contre PDF SRD FR CC v5.2.1.

  it('Bracelets d’archer — uncommon — maîtrise arc long + arc court, +2 dégâts', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'bracelets-d-archer');
    expect(entry).toBeDefined();
    expect(entry?.rarity).toBe('uncommon');
    expect(entry?.name.fr).toBe("Bracelets d'archer");
    expect(entry?.magicDescription.fr).toMatch(/maîtrise de l['’]arc long et de l['’]arc court/);
    expect(entry?.magicDescription.fr).toMatch(/\+2 aux jets de dégâts/);
  });

  it('Cape de protection — uncommon — +1 CA et jets de sauvegarde (attunement requis)', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'cape-de-protection');
    expect(entry).toBeDefined();
    expect(entry?.rarity).toBe('uncommon');
    expect(entry?.attunement).toBe(true);
    expect(entry?.magicDescription.fr).toMatch(/\+1 à la classe d['’]armure et aux jets de sauvegarde/);
  });

  it('Lunettes du nyctalope — uncommon — name.fr OFFICIEL (drift "Lunettes de nuit" corrigé)', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'lunettes-de-nuit');
    expect(entry).toBeDefined();
    expect(entry?.name.fr).toBe('Lunettes du nyctalope');
    expect(entry?.name.fr).not.toBe('Lunettes de nuit');
    expect(entry?.magicDescription.fr).toMatch(/Vision dans le noir à 18 m/);
  });

  it('Lentilles de netteté — uncommon — name.fr OFFICIEL (drift "Yeux grossissants" corrigé)', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'yeux-grossissants');
    expect(entry).toBeDefined();
    expect(entry?.name.fr).toBe('Lentilles de netteté');
    expect(entry?.name.fr).not.toBe('Yeux grossissants');
    expect(entry?.magicDescription.fr).toMatch(/Vision dans le noir/);
  });

  it('Gantelets de puissance d’ogre — uncommon — Force 19, no-effect si Force ≥ 19', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'gantelets-de-puissance-d-ogre');
    expect(entry).toBeDefined();
    expect(entry?.attunement).toBe(true);
    expect(entry?.magicDescription.fr).toMatch(/Force passe à 19/);
    expect(entry?.magicDescription.fr).toMatch(/sans effet sur vous si votre Force est supérieure ou égale à 19/);
  });

  it('Gants de chapardeur — uncommon — NOUVEAU SLUG ajouté (absent du bundle baseline)', async () => {
    const bundle = await loadBundle();
    const entry = bundle.find((i) => i.id === 'gants-de-chapardeur');
    expect(entry).toBeDefined();
    expect(entry?.rarity).toBe('uncommon');
    expect(entry?.attunement).toBe(false);
    expect(entry?.name.fr).toBe('Gants de chapardeur');
    expect(entry?.magicDescription.fr).toMatch(/\+5 à vos tests de Dextérité \(Escamotage\)/);
  });
});

describe('SRD magic items — Wondrous wearables C.2 (cat. 1 référentielle bundle)', () => {
  it('le bundle contient les 24 wondrous SRD-sourced', async () => {
    const bundle = await loadBundle();
    for (const entry of SRD_MAGIC_ITEMS_WONDROUS) {
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
