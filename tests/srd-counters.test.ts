import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

/**
 * Plan 13.7 §0.4 — compteurs SRD attendus.
 *
 * Ce test est la GARANTIE que les scripts d'extraction `scripts/extract-srd-*.ts`
 * produisent ce que le SRD 5.2.1 impose. Il lit directement les JSON bundlés
 * (`public/data/*.json`) — pas les TS data tables — pour valider l'output réel
 * du pipeline.
 *
 * Red-before-green : avant 13.7, les compteurs étaient (feats=1, invocations=0,
 * options ancestries/classes=absents, masteryProperty sur items=absent). Ce
 * test était rouge avant l'extraction et est vert après.
 */

async function loadJson<T>(path: string): Promise<T> {
  const raw = await readFile(path, 'utf-8');
  return JSON.parse(raw) as T;
}

interface AncestryEntry {
  id: string;
  options?: Record<string, unknown>;
}

interface ClassEntry {
  id: string;
  divineOrders?: unknown[];
  primalOrders?: unknown[];
  weaponMasteryCount?: number;
}

interface FeatEntry {
  id: string;
  category?: string;
}

interface InvocationEntry {
  id: string;
  prerequisiteWarlockLevel: number | null;
}

interface ItemEntry {
  id: string;
  category?: string;
  masteryProperty?: string | null;
}

interface SpellEntry {
  id: string;
  classes?: string[];
}

describe('SRD 5.2.1 compteurs (plan 13.7 §0.4)', () => {
  describe('ancestries.json', () => {
    it('a 9 ascendances bundlées (= count SRD)', async () => {
      const ancestries = await loadJson<AncestryEntry[]>('public/data/ancestries.json');
      expect(ancestries).toHaveLength(9);
    });

    it('Drakéide expose 10 dragonAncestries (1 par couleur SRD)', async () => {
      const ancestries = await loadJson<AncestryEntry[]>('public/data/ancestries.json');
      const dragonborn = ancestries.find((a) => a.id === 'dragonborn');
      expect(dragonborn?.options).toBeDefined();
      const dragons = (dragonborn?.options as Record<string, unknown>).dragonAncestries;
      expect(Array.isArray(dragons)).toBe(true);
      expect((dragons as unknown[]).length).toBe(10);
    });

    it('Tieffelin expose 3 tieflingLegacies', async () => {
      const ancestries = await loadJson<AncestryEntry[]>('public/data/ancestries.json');
      const tiefling = ancestries.find((a) => a.id === 'tiefling');
      const legacies = (tiefling?.options as Record<string, unknown>).tieflingLegacies;
      expect((legacies as unknown[]).length).toBe(3);
    });

    it('Elfe expose 3 elfLineages', async () => {
      const ancestries = await loadJson<AncestryEntry[]>('public/data/ancestries.json');
      const elf = ancestries.find((a) => a.id === 'elf');
      const lineages = (elf?.options as Record<string, unknown>).elfLineages;
      expect((lineages as unknown[]).length).toBe(3);
    });

    it('Gnome expose 2 gnomeLineages', async () => {
      const ancestries = await loadJson<AncestryEntry[]>('public/data/ancestries.json');
      const gnome = ancestries.find((a) => a.id === 'gnome');
      const lineages = (gnome?.options as Record<string, unknown>).gnomeLineages;
      expect((lineages as unknown[]).length).toBe(2);
    });

    it('Goliath expose 6 giantAncestries', async () => {
      const ancestries = await loadJson<AncestryEntry[]>('public/data/ancestries.json');
      const goliath = ancestries.find((a) => a.id === 'goliath');
      const ancestriesG = (goliath?.options as Record<string, unknown>).giantAncestries;
      expect((ancestriesG as unknown[]).length).toBe(6);
    });

    it('Humain expose 4 versatileFeatIds + 18 skillfulOptions', async () => {
      const ancestries = await loadJson<AncestryEntry[]>('public/data/ancestries.json');
      const human = ancestries.find((a) => a.id === 'human');
      const opts = human?.options as Record<string, unknown>;
      expect((opts.versatileFeatIds as unknown[]).length).toBe(4);
      expect((opts.skillfulOptions as unknown[]).length).toBe(18);
    });
  });

  describe('classes.json', () => {
    it('a 12 classes', async () => {
      const classes = await loadJson<ClassEntry[]>('public/data/classes.json');
      expect(classes).toHaveLength(12);
    });

    it('Cleric expose 2 divineOrders (Protector + Thaumaturge)', async () => {
      const classes = await loadJson<ClassEntry[]>('public/data/classes.json');
      const cleric = classes.find((c) => c.id === 'cleric');
      expect(cleric?.divineOrders).toBeDefined();
      expect((cleric?.divineOrders as unknown[]).length).toBe(2);
    });

    it('Druid expose 2 primalOrders (Magician + Warden)', async () => {
      const classes = await loadJson<ClassEntry[]>('public/data/classes.json');
      const druid = classes.find((c) => c.id === 'druid');
      expect(druid?.primalOrders).toBeDefined();
      expect((druid?.primalOrders as unknown[]).length).toBe(2);
    });

    it('weaponMasteryCount présent sur toutes les classes (Monk = 0 explicite)', async () => {
      const classes = await loadJson<ClassEntry[]>('public/data/classes.json');
      for (const cls of classes) {
        expect(typeof cls.weaponMasteryCount).toBe('number');
      }
      const monk = classes.find((c) => c.id === 'monk');
      expect(monk?.weaponMasteryCount).toBe(0); // SRD : Monk N'A PAS Weapon Mastery.
      const fighter = classes.find((c) => c.id === 'fighter');
      expect(fighter?.weaponMasteryCount).toBe(3);
      const rogue = classes.find((c) => c.id === 'rogue');
      expect(rogue?.weaponMasteryCount).toBe(2);
    });

    it('total weaponMasteries alloués L1 = 11 (Barb 2 + Fighter 3 + Pala 2 + Ranger 2 + Rogue 2)', async () => {
      const classes = await loadJson<ClassEntry[]>('public/data/classes.json');
      const total = classes.reduce((sum, c) => sum + (c.weaponMasteryCount ?? 0), 0);
      expect(total).toBe(11);
    });
  });

  describe('feats.json', () => {
    it('a 17 feats SRD (4 Origin + 2 General + 4 Fighting Style + 7 Epic Boon)', async () => {
      const feats = await loadJson<FeatEntry[]>('public/data/feats.json');
      expect(feats).toHaveLength(17);
      const byCat = (cat: string) => feats.filter((f) => f.category === cat).length;
      expect(byCat('origin')).toBe(4);
      expect(byCat('general')).toBe(2);
      expect(byCat('fighting-style')).toBe(4);
      expect(byCat('epic-boon')).toBe(7);
    });
  });

  describe('invocations.json', () => {
    it('a 28 invocations SRD dont 5 éligibles L1 (Warlock)', async () => {
      const inv = await loadJson<InvocationEntry[]>('public/data/invocations.json');
      expect(inv).toHaveLength(28);
      const l1 = inv.filter((i) => i.prerequisiteWarlockLevel === null);
      expect(l1).toHaveLength(5);
      // Les 5 doivent être les invocations sans prérequis SRD 5.2.1.
      const l1Ids = l1.map((i) => i.id).sort();
      expect(l1Ids).toEqual(
        [
          'armor-of-shadows',
          'eldritch-mind',
          'pact-of-the-blade',
          'pact-of-the-chain',
          'pact-of-the-tome',
        ].sort(),
      );
    });
  });

  describe('spells.json — couverture par classe lanceuse (Hardening D, post-13.7)', () => {
    /**
     * Garde anti-régression sur la couverture spells par classe.
     *
     * Pourquoi : c'est la 3e occurrence du bug « sorts vides pour une
     * classe lanceuse » (cf. plans/DEBT.md > D7). Un compteur exact attrape
     * une régression silencieuse (un re-build qui perd une classe d'une
     * liste de filtres) AVANT que le SpellsStep affiche un écran vide.
     *
     * Si ces nombres divergent à la baisse : enquêter le pipeline, ne pas
     * relâcher l'attente. Si à la hausse : confirmer qu'un sort SRD a bien
     * été ajouté et bumper le seuil. Vu rouge à coup sûr quand on supprime
     * intentionnellement une entrée wizard de spells.json.
     */
    // Seuils ré-dérivés du bundle SRD 5.2.1 bilingue régénéré au plan 13.10
    // commit 3 (`scripts/extract-srd-spells.ts`, 339 sorts). Remplacent les
    // anciennes valeurs AideDD (117/105/107/31/38/126/70/210), toutes
    // inférieures — la régénération SRD enrichit chaque classe lanceuse.
    // Rouge-avant-vert prouvé : ces planchers exécutés contre l'ancien
    // bundle AideDD échouent sur les 8 classes (cf. plan 13.10 commit 3).
    // Note : ces compteurs vivent ICI parce que c'est la seule garde
    // anti-régression structurelle entre les bundles et l'UI. Si une
    // valeur diverge à la baisse : enquêter le pipeline. À la hausse :
    // confirmer l'ajout SRD et bumper le plancher.
    const EXPECTED_PER_CLASS: Record<string, number> = {
      bard: 130,
      cleric: 109,
      druid: 124,
      paladin: 38,
      ranger: 48,
      sorcerer: 140,
      warlock: 72,
      wizard: 218,
    };

    it('a 339 sorts SRD 5.2.1 (compteur ré-dérivé du bundle régénéré, plan 13.10)', async () => {
      const spells = await loadJson<SpellEntry[]>('public/data/spells.json');
      expect(spells).toHaveLength(339);
    });

    it('chaque classe lanceuse SRD a au moins le volume attendu de sorts (anti-régression silencieuse)', async () => {
      const spells = await loadJson<SpellEntry[]>('public/data/spells.json');
      const counts: Record<string, number> = {};
      for (const sp of spells) {
        for (const c of sp.classes ?? []) {
          counts[c] = (counts[c] ?? 0) + 1;
        }
      }
      for (const [classId, expected] of Object.entries(EXPECTED_PER_CLASS)) {
        const actual = counts[classId] ?? 0;
        expect(
          actual,
          `Classe ${classId} : ${actual} sort(s) trouvé(s), attendu ≥ ${expected}.`,
        ).toBeGreaterThanOrEqual(expected);
      }
    });

    it('aucune classe lanceuse SRD n\'a 0 sort (la garde la plus minimale, redondante mais explicite)', async () => {
      const spells = await loadJson<SpellEntry[]>('public/data/spells.json');
      const emptyClasses: string[] = [];
      for (const classId of Object.keys(EXPECTED_PER_CLASS)) {
        const count = spells.filter((s) => (s.classes ?? []).includes(classId)).length;
        if (count === 0) emptyClasses.push(classId);
      }
      expect(
        emptyClasses,
        `Classes lanceuses sans aucun sort : ${emptyClasses.join(', ')}`,
      ).toEqual([]);
    });
  });

  describe('items.json — Weapon Mastery', () => {
    it('chaque arme bundlée porte une `masteryProperty` (string ou null)', async () => {
      const items = await loadJson<ItemEntry[]>('public/data/items.json');
      const weapons = items.filter((i) => i.category === 'weapon');
      for (const w of weapons) {
        expect('masteryProperty' in w).toBe(true);
      }
    });

    it('38 armes éligibles SRD ont une propriété Mastery non-null', async () => {
      const items = await loadJson<ItemEntry[]>('public/data/items.json');
      const withMastery = items.filter(
        (i) => i.category === 'weapon' && typeof i.masteryProperty === 'string',
      );
      expect(withMastery).toHaveLength(38);
    });
  });
});
