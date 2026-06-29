import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  SRD_MAGIC_ITEMS_RINGS_RARE,
  SRD_MAGIC_ITEMS_RINGS_RARE_COUNTS,
} from '../data/srd-magic-items-rings-rare';

/**
 * Batch D29.1 — Anneaux ≥Rare SRD CC v5.2.1 (backfill EN + correction des
 * drifts FR/attunement hérités d'AideDD). 9 rare + 3 very rare + 5 legendary.
 */

const MAGIC_ITEMS_JSON = path.resolve(__dirname, '../../public/data/magic-items.json');
const SRD_EN_TXT = path.resolve(__dirname, '../../content-sources/extracted/raw/SRD_CC_v5.2.1.txt');

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

describe('SRD magic items — Rings ≥Rare D29.1 (cat. 4 compteurs)', () => {
  it('module exporte 9 rare + 3 very rare + 5 legendary = 17 entrées', () => {
    expect(SRD_MAGIC_ITEMS_RINGS_RARE_COUNTS.total).toBe(17);
    expect(SRD_MAGIC_ITEMS_RINGS_RARE_COUNTS.rare).toBe(9);
    expect(SRD_MAGIC_ITEMS_RINGS_RARE_COUNTS.veryRare).toBe(3);
    expect(SRD_MAGIC_ITEMS_RINGS_RARE_COUNTS.legendary).toBe(5);
  });

  it('toutes les entrées : category=gear, source=srd-5.2.1, name.en + magicDescription.en présents', () => {
    for (const entry of SRD_MAGIC_ITEMS_RINGS_RARE) {
      expect(entry.category, `${entry.id}.category`).toBe('gear');
      expect(entry.source, `${entry.id}.source`).toBe('srd-5.2.1');
      expect(entry.name.en, `${entry.id}.name.en`).toBeTruthy();
      expect(entry.magicDescription.en, `${entry.id}.magicDescription.en`).toBeTruthy();
    }
  });

  it('aucun slug dupliqué dans le module', () => {
    const seen = new Set<string>();
    for (const entry of SRD_MAGIC_ITEMS_RINGS_RARE) {
      expect(seen.has(entry.id), `slug dupliqué : ${entry.id}`).toBe(false);
      seen.add(entry.id);
    }
  });
});

describe('SRD magic items — Rings ≥Rare D29.1 (cat. 3 pin valeurs SRD officielles)', () => {
  it('Anneau de protection — rare — +1 CA & JS, Harmonisation requise (corrige attunement false→true)', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'anneau-de-protection');
    expect(e?.name.en).toBe('Ring of Protection');
    expect(e?.rarity).toBe('rare');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toBe(
      'You gain a +1 bonus to Armor Class and saving throws while wearing this ring.',
    );
    expect(e?.magicDescription.fr).toMatch(/bonus de \+1 à la CA et aux jets de sauvegarde/);
  });

  it("Anneau d'influence animale — rare — name.fr officiel (corrige le drift « sur les animaux »)", async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'anneau-d-influence-sur-les-animaux');
    expect(e?.name.fr).toBe("Anneau d'influence animale");
    expect(e?.name.en).toBe('Ring of Animal Influence');
    expect(e?.attunement).toBe(false);
    expect(e?.magicDescription.en).toMatch(/• Animal Friendship/);
    expect(e?.magicDescription.en).toMatch(/• Fear \(affects Beasts only\)/);
    expect(e?.magicDescription.en).toMatch(/• Speak with Animals/);
  });

  it('Anneau de maîtrise élémentaire — legendary — structure SRD 5.2.1 (corrige le texte 2014)', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'anneau-de-controle-des-elementaires');
    expect(e?.name.fr).toBe('Anneau de maîtrise élémentaire');
    expect(e?.name.en).toBe('Ring of Elemental Command');
    expect(e?.rarity).toBe('legendary');
    expect(e?.attunement).toBe(true);
    // Le texte officiel 5.2.1 a 3 propriétés nommées ; l'ancien texte AideDD 2014
    // parlait de « domination de monstre » → doit avoir disparu.
    expect(e?.magicDescription.en).toMatch(/Elemental Bane\./);
    expect(e?.magicDescription.en).toMatch(/Elemental Compulsion\./);
    expect(e?.magicDescription.en).toMatch(/Elemental Focus\./);
    expect(e?.magicDescription.fr).toMatch(/Fléau élémentaire\./);
    expect(e?.magicDescription.fr).toMatch(/Coercition élémentaire\./);
    expect(e?.magicDescription.fr).toMatch(/Affinité élémentaire\./);
    expect(e?.magicDescription.fr).not.toMatch(/domination de monstre/i);
  });

  it('Anneau de feu d\'étoiles — very rare — 3 propriétés SRD + dés de la table', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'anneau-de-feu-d-etoiles');
    expect(e?.name.en).toBe('Ring of Shooting Stars');
    expect(e?.rarity).toBe('very rare');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/Faerie Fire\./);
    expect(e?.magicDescription.en).toMatch(/Lightning Spheres\./);
    expect(e?.magicDescription.en).toMatch(/Shooting Stars\./);
    expect(e?.magicDescription.en).toMatch(/1 sphere: 4d12; 2 spheres: 5d4; 3 spheres: 2d6; 4 spheres: 2d4\./);
  });

  it('Anneau de résistance — rare — table de gemmes (10 types), pas d\'attunement', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'anneau-de-resistance');
    expect(e?.name.en).toBe('Ring of Resistance');
    expect(e?.attunement).toBe(false);
    expect(e?.magicDescription.en).toMatch(/Acid \(Pearl\)/);
    expect(e?.magicDescription.en).toMatch(/Thunder \(Spinel\)\./);
    expect(e?.magicDescription.fr).toMatch(/Poison \(Améthyste\)/);
  });

  it('Anneau de triple souhait — legendary — lance souhait/Wish, pas d\'attunement', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'anneau-de-triple-souhait');
    expect(e?.name.en).toBe('Ring of Three Wishes');
    expect(e?.rarity).toBe('legendary');
    expect(e?.attunement).toBe(false);
    expect(e?.magicDescription.en).toMatch(/cast Wish from it/);
  });

  it('Anneau de stockage de sorts — name.fr officiel pluriel + 5 niveaux', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'anneau-de-stockage-de-sort');
    expect(e?.name.fr).toBe('Anneau de stockage de sorts');
    expect(e?.name.en).toBe('Ring of Spell Storing');
    expect(e?.magicDescription.en).toMatch(/up to 5 levels worth of spells/);
  });
});

describe('SRD magic items — Rings ≥Rare D29.1 (cat. 1 référentielle bundle)', () => {
  it('les 17 anneaux ≥rare sont présents dans le bundle avec name.en + source srd', async () => {
    const bundle = await loadBundle();
    for (const entry of SRD_MAGIC_ITEMS_RINGS_RARE) {
      const inBundle = bundle.find((i) => i.id === entry.id);
      expect(inBundle, `slug ${entry.id} absent du bundle`).toBeDefined();
      expect(inBundle?.name.en, `${entry.id}.name.en dans bundle`).toBe(entry.name.en);
      expect(inBundle?.source, `${entry.id}.source dans bundle`).toBe('srd-5.2.1');
    }
  });
});

/**
 * Garde anti-fabrication : chaque `magicDescription.en` doit être une
 * sous-chaîne verbatim de l'extraction SRD EN (modulo césures et sauts de
 * page). La source `.txt` est gitignorée → ce bloc se skippe proprement en CI ;
 * il tourne en local pour prouver qu'aucun EN n'a été inventé de mémoire.
 */
describe('SRD magic items — Rings ≥Rare D29.1 (anti-fabrication vs source SRD EN)', () => {
  const sourceAvailable = existsSync(SRD_EN_TXT);
  const maybe = sourceAvailable ? it : it.skip;

  // Normalise le texte source ET le candidat de la même façon : on retire les
  // césures de fin de ligne, les artefacts de saut de page, et on aplatit tous
  // les espaces (les sauts de ligne du candidat = espaces dans la source).
  function normalize(raw: string): string {
    return raw
      .replace(/-\n/g, '') // césure de fin de ligne « be-\ncomes »
      .replace(/System Reference Document 5\.2\.1\s*\n?\s*\d+/g, ' ')
      .replace(/[’‘]/g, "'") // apostrophes courbes PDF → ASCII (module convention)
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
    // On vérifie la 1re phrase de chaque entrée (avant tout saut de paragraphe,
    // table reformatée, ou liste à puces qu'on a sciemment mis en forme).
    for (const entry of SRD_MAGIC_ITEMS_RINGS_RARE) {
      const firstParagraph = entry.magicDescription.en.split('\n\n')[0];
      // Retire une éventuelle liste à puces / table en fin de 1er paragraphe.
      const probe = normalize(firstParagraph.split('\n')[0]).slice(0, 90);
      expect(source.includes(probe), `${entry.id} : EN introuvable verbatim → « ${probe} »`).toBe(true);
    }
  });
});
