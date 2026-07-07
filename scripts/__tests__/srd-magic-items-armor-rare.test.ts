import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  SRD_MAGIC_ITEMS_ARMOR_RARE,
  SRD_MAGIC_ITEMS_ARMOR_RARE_COUNTS,
} from '../data/srd-magic-items-armor-rare';

/**
 * Batch D29.6 — Armures + boucliers ≥ Rare SRD CC v5.2.1 (backfill EN +
 * correction de l'Harmonisation héritée d'AideDD : 10 des 14 l'exigent au SRD).
 * 6 rare + 6 very rare + 2 legendary = 14.
 *
 * Hors scope : `armure-de-matelot` (Mariner's Armor) — PAS dans le SRD 5.2.1,
 * reste grandfathered sans name.en (comme `anneau-de-resistance-au-poison`).
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

describe('SRD magic items — Armures ≥ Rare D29.6 (compteurs)', () => {
  it('module exporte 6 rare + 6 very rare + 2 legendary = 14 entrées', () => {
    expect(SRD_MAGIC_ITEMS_ARMOR_RARE_COUNTS.total).toBe(14);
    expect(SRD_MAGIC_ITEMS_ARMOR_RARE_COUNTS.rare).toBe(6);
    expect(SRD_MAGIC_ITEMS_ARMOR_RARE_COUNTS.veryRare).toBe(6);
    expect(SRD_MAGIC_ITEMS_ARMOR_RARE_COUNTS.legendary).toBe(2);
  });

  it('toutes les entrées : category=armor, source=srd-5.2.1, name.en + magicDescription.en présents', () => {
    for (const entry of SRD_MAGIC_ITEMS_ARMOR_RARE) {
      expect(entry.category, `${entry.id}.category`).toBe('armor');
      expect(entry.source, `${entry.id}.source`).toBe('srd-5.2.1');
      expect(entry.name.en, `${entry.id}.name.en`).toBeTruthy();
      expect(entry.magicDescription.en, `${entry.id}.magicDescription.en`).toBeTruthy();
    }
  });

  it('exactement 10 entrées exigent l’Harmonisation (corrigé vs AideDD ; 4 sans)', () => {
    const attuned = SRD_MAGIC_ITEMS_ARMOR_RARE.filter((e) => e.attunement === true);
    expect(attuned).toHaveLength(10);
    const free = SRD_MAGIC_ITEMS_ARMOR_RARE.filter((e) => e.attunement === false);
    expect(free).toHaveLength(4);
  });

  it('aucun slug dupliqué dans le module', () => {
    const seen = new Set<string>();
    for (const entry of SRD_MAGIC_ITEMS_ARMOR_RARE) {
      expect(seen.has(entry.id), `slug dupliqué : ${entry.id}`).toBe(false);
      seen.add(entry.id);
    }
  });
});

describe('SRD magic items — Armures ≥ Rare D29.6 (pin valeurs SRD officielles)', () => {
  it('Armor of Invulnerability — legendary, Harmonisation requise — Résistance B/P/S', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'armure-d-invulnerabilite');
    expect(e?.name.fr).toBe("Armure d'invulnérabilité");
    expect(e?.name.en).toBe('Armor of Invulnerability');
    expect(e?.rarity).toBe('legendary');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/Resistance to Bludgeoning, Piercing, and\s+Slashing damage/);
    expect(e?.magicDescription.en).toMatch(/Metal Shell\./);
  });

  it('Demon Armor — very rare, Harmonisation requise — +1 CA, abyssal, mains nues 1d8', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'armure-demoniaque');
    expect(e?.name.en).toBe('Demon Armor');
    expect(e?.rarity).toBe('very rare');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/you know Abyssal/);
    expect(e?.magicDescription.en).toMatch(/1d8 Slashing damage/);
    expect(e?.magicDescription.en).toMatch(/Curse\./);
  });

  it('Dragon Scale Mail — very rare, Harmonisation requise — +1 CA, 30 miles (45 km FR)', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'armure-d-ecailles-de-dragon');
    expect(e?.name.en).toBe('Dragon Scale Mail');
    expect(e?.rarity).toBe('very rare');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/within 30 miles/);
    expect(e?.magicDescription.fr).toMatch(/45 km/);
  });

  it('Elven Chain — rare, AUCUNE Harmonisation — formé même sans armures lourdes/intermédiaires', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'mailles-elfiques');
    expect(e?.name.fr).toBe('Armure de mailles elfique');
    expect(e?.name.en).toBe('Elven Chain');
    expect(e?.rarity).toBe('rare');
    expect(e?.attunement).toBe(false);
    expect(e?.magicDescription.en).toMatch(/considered trained with this armor/);
  });

  it('Dwarven Plate — very rare, AUCUNE Harmonisation — +2 CA, réduit déplacement forcé 10 ft (3 m FR)', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'harnois-nain');
    expect(e?.name.en).toBe('Dwarven Plate');
    expect(e?.rarity).toBe('very rare');
    expect(e?.attunement).toBe(false);
    expect(e?.magicDescription.en).toMatch(/\+2 bonus to\s+Armor Class/);
    expect(e?.magicDescription.en).toMatch(/up to 10 feet/);
    expect(e?.magicDescription.fr).toMatch(/3 m/);
  });

  it('Plate Armor of Etherealness — legendary, Harmonisation requise — effet forme éthérée', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'harnois-ethere');
    expect(e?.name.fr).toBe('Harnois éthéré');
    expect(e?.name.en).toBe('Plate Armor of Etherealness');
    expect(e?.rarity).toBe('legendary');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/effect of the Etherealness spell/);
    expect(e?.magicDescription.fr).toMatch(/forme éthérée/);
  });

  it('Glamoured Studded Leather — rare, AUCUNE Harmonisation — +1 CA + apparence illusoire', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'armure-de-cuir-cloute-enchantee');
    expect(e?.name.en).toBe('Glamoured Studded Leather');
    expect(e?.rarity).toBe('rare');
    expect(e?.attunement).toBe(false);
    expect(e?.magicDescription.en).toMatch(/illusory appearance lasts/);
  });

  it('Animated Shield — very rare, Harmonisation requise — anime 1 minute', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'bouclier-anime');
    expect(e?.name.en).toBe('Animated Shield');
    expect(e?.rarity).toBe('very rare');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/remains animate for 1 minute/);
  });

  it('Arrow-Catching Shield — rare, Harmonisation requise — +2 CA contre attaques à distance', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'bouclier-antiprojectiles');
    expect(e?.name.fr).toBe('Bouclier antiprojectiles');
    expect(e?.name.en).toBe('Arrow-Catching Shield');
    expect(e?.rarity).toBe('rare');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/\+2 bonus to Armor Class against ranged\s+attack rolls/);
  });

  it('Shield of Missile Attraction — rare, Harmonisation requise — maudit', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'bouclier-d-attraction-des-projectiles');
    expect(e?.name.en).toBe('Shield of Missile Attraction');
    expect(e?.rarity).toBe('rare');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/Curse\./);
    expect(e?.magicDescription.en).toMatch(/Resistance to\s+damage from attacks made with Ranged weapons/);
  });

  it('Spellguard Shield — very rare, Harmonisation requise — Avantage vs sorts', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'bouclier-gardesort');
    expect(e?.name.en).toBe('Spellguard Shield');
    expect(e?.rarity).toBe('very rare');
    expect(e?.attunement).toBe(true);
    expect(e?.magicDescription.en).toMatch(/Advantage on\s+saving throws against spells/);
  });

  it('Armor of Resistance / Vulnerability — rare, Harmonisation requise', async () => {
    const bundle = await loadBundle();
    const res = bundle.find((i) => i.id === 'armure-de-resistance');
    expect(res?.name.en).toBe('Armor of Resistance');
    expect(res?.attunement).toBe(true);
    const vul = bundle.find((i) => i.id === 'armure-de-vulnerabilite');
    expect(vul?.name.en).toBe('Armor of Vulnerability');
    expect(vul?.attunement).toBe(true);
    expect(vul?.magicDescription.en).toMatch(/Curse\./);
  });

  it('Armor, +1, +2, or +3 — bonus CA déterminé par la rareté', async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'armure-1-2-ou-3');
    expect(e?.name.en).toBe('Armor, +1, +2, or +3');
    expect(e?.attunement).toBe(false);
    expect(e?.magicDescription.en).toMatch(/bonus to Armor Class while wearing this/);
  });
});

describe('SRD magic items — Armures ≥ Rare D29.6 (référentielle bundle)', () => {
  it('les 14 armures sont présentes dans le bundle avec name.en + source srd', async () => {
    const bundle = await loadBundle();
    for (const entry of SRD_MAGIC_ITEMS_ARMOR_RARE) {
      const inBundle = bundle.find((i) => i.id === entry.id);
      expect(inBundle, `slug ${entry.id} absent du bundle`).toBeDefined();
      expect(inBundle?.name.en, `${entry.id}.name.en dans bundle`).toBe(entry.name.en);
      expect(inBundle?.source, `${entry.id}.source dans bundle`).toBe('srd-5.2.1');
    }
  });

  it("l'Armure de matelot (non-SRD) reste sans name.en", async () => {
    const bundle = await loadBundle();
    const e = bundle.find((i) => i.id === 'armure-de-matelot');
    expect(e, 'armure-de-matelot présente dans le bundle').toBeDefined();
    expect(e?.name.en, "Mariner's Armor est hors SRD 5.2.1 → pas de name.en fabriqué").toBeUndefined();
  });
});

/**
 * Garde anti-fabrication : la 1re phrase de chaque `magicDescription.en` doit
 * être une sous-chaîne verbatim de l'extraction SRD EN. Source `.txt`
 * gitignorée → skip propre en CI.
 */
describe('SRD magic items — Armures ≥ Rare D29.6 (anti-fabrication vs source SRD EN)', () => {
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

  maybe('chaque phrase EN distinctive existe verbatim dans SRD_CC_v5.2.1.txt', () => {
    const source = normalize(readFileSync(SRD_EN_TXT, 'utf-8'));
    for (const entry of SRD_MAGIC_ITEMS_ARMOR_RARE) {
      const firstParagraph = entry.magicDescription.en.split('\n\n')[0];
      const probe = normalize(firstParagraph.split('\n')[0]).slice(0, 90);
      expect(source.includes(probe), `${entry.id} : EN introuvable verbatim → « ${probe} »`).toBe(true);
    }
  });
});
