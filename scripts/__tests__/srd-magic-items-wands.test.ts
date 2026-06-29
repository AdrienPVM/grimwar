import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  SRD_MAGIC_ITEMS_WANDS,
  SRD_MAGIC_ITEMS_WANDS_COUNTS,
} from '../data/srd-magic-items-wands';

/**
 * Batch D29.2 — Baguettes SRD CC v5.2.1 (backfill EN + correction des drifts
 * FR/attunement hérités d'AideDD). 5 uncommon + 7 rare + 1 very rare = 13.
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

describe('SRD magic items — Wands D29.2 (cat. 4 compteurs)', () => {
  it('module exporte 5 uncommon + 7 rare + 1 very rare = 13 entrées', () => {
    expect(SRD_MAGIC_ITEMS_WANDS_COUNTS.total).toBe(13);
    expect(SRD_MAGIC_ITEMS_WANDS_COUNTS.uncommon).toBe(5);
    expect(SRD_MAGIC_ITEMS_WANDS_COUNTS.rare).toBe(7);
    expect(SRD_MAGIC_ITEMS_WANDS_COUNTS.veryRare).toBe(1);
  });

  it('toutes les entrées : category=gear, source=srd-5.2.1, name.en + magicDescription.en présents', () => {
    for (const entry of SRD_MAGIC_ITEMS_WANDS) {
      expect(entry.category, `${entry.id}.category`).toBe('gear');
      expect(entry.source, `${entry.id}.source`).toBe('srd-5.2.1');
      expect(entry.name.en, `${entry.id}.name.en`).toBeTruthy();
      expect(entry.magicDescription.en, `${entry.id}.magicDescription.en`).toBeTruthy();
    }
  });

  it('aucun slug dupliqué dans le module', () => {
    const seen = new Set<string>();
    for (const entry of SRD_MAGIC_ITEMS_WANDS) {
      expect(seen.has(entry.id), `slug dupliqué : ${entry.id}`).toBe(false);
      seen.add(entry.id);
    }
  });
});

describe('SRD magic items — Wands D29.2 (cat. 3 pin valeurs SRD officielles)', () => {
  it('Wand of Fireballs — rare — Harmonisation par un incantateur (corrige attunement false→objet)', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'baguette-de-boules-de-feu');
    expect(e?.name.en).toBe('Wand of Fireballs');
    expect(e?.rarity).toBe('rare');
    expect(e?.attunement).toEqual({
      fr: 'Harmonisation requise avec un incantateur',
      en: 'Requires Attunement by a Spellcaster',
    });
    expect(e?.magicDescription.en).toMatch(/expend no more than 3 charges to cast Fireball \(save DC 15\)/);
    expect(e?.magicDescription.fr).toMatch(/dépenser jusqu'à 3 charges pour lancer boule de feu/);
  });

  it("Baguette de terreur — rare — name.fr officiel (corrige le drift « Baguette de peur »)", async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'baguette-de-peur');
    expect(e?.name.fr).toBe('Baguette de terreur');
    expect(e?.name.en).toBe('Wand of Fear');
    expect(e?.attunement).toBe(true);
    // Table de sorts rendue en ligne.
    expect(e?.magicDescription.en).toMatch(/Command \("flee" or "grovel" only\): 1 charge; Fear \(60-foot Cone\): 3 charges\./);
    expect(e?.magicDescription.fr).toMatch(/terreur \(Cône de 18 m\) : 3 charges\./);
  });

  it('Baguette des toiles — uncommon — name.fr officiel (corrige « de toile d\'araignée »)', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'baguette-de-toile-d-araignee');
    expect(e?.name.fr).toBe('Baguette des toiles');
    expect(e?.name.en).toBe('Wand of Web');
    expect(e?.rarity).toBe('uncommon');
    expect(e?.attunement).toEqual({
      fr: 'Harmonisation requise avec un incantateur',
      en: 'Requires Attunement by a Spellcaster',
    });
  });

  it('Wand of Magic Missiles — uncommon — pas d\'attunement (false)', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'baguette-de-projectiles-magiques');
    expect(e?.name.en).toBe('Wand of Magic Missiles');
    expect(e?.attunement).toBe(false);
    expect(e?.magicDescription.en).toMatch(/cast the level 1 version of the spell/);
  });

  it('Wand of Binding — rare — table immobilisation (DD 17) + attunement true', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'baguette-des-entraves');
    expect(e?.name.en).toBe('Wand of Binding');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/Hold Monster: 5 charges; Hold Person: 2 charges\./);
    expect(e?.magicDescription.fr).toMatch(/immobilisation de monstre : 5 charges ; immobilisation de personne : 2 charges\./);
  });

  it('Wand of Wonder — rare — table 1d100 complète (98–00 = pétrification)', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'baguette-des-merveilles');
    expect(e?.name.en).toBe('Wand of Wonder');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/Wand of Wonder Effects \(1d100\):/);
    expect(e?.magicDescription.en).toMatch(/98–00 The creature closest to the chosen point of origin makes a DC 15 Constitution saving throw\./);
    // variante « dust » pour cette baguette (pas « ashes »)
    expect(e?.magicDescription.en).toMatch(/the wand crumbles into dust and is destroyed\./);
    expect(e?.magicDescription.fr).toMatch(/la baguette tombe en poussière, à jamais détruite\./);
  });

  it('Wand of Polymorph — very rare — incantateur', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'baguette-de-metamorphose');
    expect(e?.name.en).toBe('Wand of Polymorph');
    expect(e?.rarity).toBe('very rare');
    expect(e?.attunement).toEqual({
      fr: 'Harmonisation requise avec un incantateur',
      en: 'Requires Attunement by a Spellcaster',
    });
    expect(e?.magicDescription.en).toMatch(/cast Polymorph \(save DC 15\) from it/);
  });
});

describe('SRD magic items — Wands D29.2 (cat. 1 référentielle bundle)', () => {
  it('les 13 baguettes sont présentes dans le bundle avec name.en + source srd', async () => {
    const bundle = await loadBundle();
    for (const entry of SRD_MAGIC_ITEMS_WANDS) {
      const inBundle = bundle.find((i) => i.id === entry.id);
      expect(inBundle, `slug ${entry.id} absent du bundle`).toBeDefined();
      expect(inBundle?.name.en, `${entry.id}.name.en dans bundle`).toBe(entry.name.en);
      expect(inBundle?.source, `${entry.id}.source dans bundle`).toBe('srd-5.2.1');
    }
  });
});

/**
 * Garde anti-fabrication : la 1re phrase de chaque `magicDescription.en` doit
 * être une sous-chaîne verbatim de l'extraction SRD EN (modulo césures et sauts
 * de page). La source `.txt` est gitignorée → ce bloc se skippe proprement en
 * CI ; il tourne en local pour prouver qu'aucun EN n'a été inventé de mémoire.
 */
describe('SRD magic items — Wands D29.2 (anti-fabrication vs source SRD EN)', () => {
  const sourceAvailable = existsSync(SRD_EN_TXT);
  const maybe = sourceAvailable ? it : it.skip;

  function normalize(raw: string): string {
    return raw
      .replace(/-\n/g, '') // césure de fin de ligne
      .replace(/System Reference Document 5\.2\.1\s*\n?\s*\d+/g, ' ')
      .replace(/[’‘]/g, "'") // apostrophes courbes PDF → ASCII
      .replace(/[“”]/g, '"') // guillemets courbes PDF → ASCII
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
    for (const entry of SRD_MAGIC_ITEMS_WANDS) {
      const firstParagraph = entry.magicDescription.en.split('\n\n')[0];
      const probe = normalize(firstParagraph.split('\n')[0]).slice(0, 90);
      expect(source.includes(probe), `${entry.id} : EN introuvable verbatim → « ${probe} »`).toBe(true);
    }
  });
});
