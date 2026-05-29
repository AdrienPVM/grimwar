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
  summary?: { fr?: string; en?: string };
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

    it('ASI levels par classe = SRD 5.2.1 (JALON 2B.2a)', async () => {
      // SRD 5.2.1 — niveaux ASI génériques (Epic Boon L19 hors compte, c'est
      // une feature distincte « Faveur épique »).
      // Source : `content-sources/extracted/raw/SRD_CC_v5.2.1.txt`, tables de
      // progression de classe.
      const expected: Record<string, number[]> = {
        barbarian: [4, 8, 12, 16],
        bard: [4, 8, 12, 16],
        cleric: [4, 8, 12, 16],
        druid: [4, 8, 12, 16],
        fighter: [4, 6, 8, 12, 14, 16], // 2 ASIs supplémentaires (L6, L14)
        monk: [4, 8, 12, 16],
        paladin: [4, 8, 12, 16],
        ranger: [4, 8, 12, 16],
        rogue: [4, 8, 10, 12, 16], // 1 ASI supplémentaire (L10)
        sorcerer: [4, 8, 12, 16],
        warlock: [4, 8, 12, 16],
        wizard: [4, 8, 12, 16],
      };
      const classes = await loadJson<
        (ClassEntry & {
          features: { level: number; name: { fr: string; en: string } }[];
        })[]
      >('public/data/classes.json');
      for (const cls of classes) {
        const asiLevels = cls.features
          .filter((f) => f.name.en === 'Ability Score Improvement')
          .map((f) => f.level);
        expect(asiLevels).toEqual(expected[cls.id]);
      }
      // Compte total SRD-vérifié : 10 normales × 4 + Fighter 6 + Rogue 5 = 51.
      const total = classes.reduce(
        (sum, cls) =>
          sum +
          cls.features.filter((f) => f.name.en === 'Ability Score Improvement').length,
        0,
      );
      expect(total).toBe(51);
    });

    it('chaque entrée ASI a la description SRD 2024 canonique (JALON 2B.2a)', async () => {
      // Test de vérité du contenu (cat. 2 — identité, pas présence). La
      // description française et anglaise des entrées ASI doit suivre la
      // forme SRD officielle, jamais une approximation.
      const classes = await loadJson<
        (ClassEntry & {
          features: {
            level: number;
            name: { fr: string; en: string };
            description: { fr: string; en: string };
          }[];
        })[]
      >('public/data/classes.json');
      const expectedFr = /(Vous (recevez|gagnez) le don Amélioration de caractéristique)/;
      const expectedEn = /(You gain the Ability Score Improvement feat)/;
      for (const cls of classes) {
        const asiFeatures = cls.features.filter(
          (f) => f.name.en === 'Ability Score Improvement',
        );
        expect(asiFeatures.length).toBeGreaterThanOrEqual(4);
        for (const asi of asiFeatures) {
          expect(asi.name.fr).toBe('Amélioration de caractéristique');
          expect(asi.description.fr).toMatch(expectedFr);
          expect(asi.description.en).toMatch(expectedEn);
        }
      }
    });

    it('classResourceProgression SRD 5.2.1 — couverture des 11 classes (JALON 2B.2b)', async () => {
      // 11 des 12 classes ont une table de progression de ressources dans le
      // SRD 5.2.1. Le Ranger n'en a pas en V1 jalon 2 (favored-enemy est
      // déclaré dans une colonne dédiée mais hors scope V1).
      const classes = await loadJson<
        (ClassEntry & {
          classResourceProgression?: Record<string, (number | string)[]>;
        })[]
      >('public/data/classes.json');
      const expectedClassesWithProgression = [
        'barbarian',
        'bard',
        'cleric',
        'druid',
        'fighter',
        'monk',
        'paladin',
        'rogue',
        'sorcerer',
        'warlock',
        'wizard',
      ];
      for (const id of expectedClassesWithProgression) {
        const cls = classes.find((c) => c.id === id);
        expect(cls?.classResourceProgression, `${id} doit avoir classResourceProgression`).toBeDefined();
        const progression = cls?.classResourceProgression ?? {};
        expect(Object.keys(progression).length).toBeGreaterThan(0);
        for (const [resourceId, values] of Object.entries(progression)) {
          expect(values, `${id}.${resourceId} doit avoir 20 entrées`).toHaveLength(20);
        }
      }
      // Ranger en V1 jalon 2 : pas de classResourceProgression (out of scope).
      const ranger = classes.find((c) => c.id === 'ranger');
      expect(ranger?.classResourceProgression).toBeUndefined();
    });

    it('classResourceProgression — vérité du contenu cat. 3 (18 valeurs SRD figées, JALON 2B.2b)', async () => {
      // Vérification humaine UNE FOIS contre SRD 5.2.1 (cf.
      // `content-sources/extracted/raw/SRD_CC_v5.2.1.txt`, tables
      // « <Class> Features »). Le test fige la vérité ensuite.
      // Pour chaque progression : un niveau d'inflexion + sa valeur SRD canonique.
      const classes = await loadJson<
        (ClassEntry & {
          classResourceProgression?: Record<string, (number | string)[]>;
        })[]
      >('public/data/classes.json');
      const get = (classId: string, resourceId: string, level: number): number | string => {
        const cls = classes.find((c) => c.id === classId);
        const progression = cls?.classResourceProgression?.[resourceId];
        if (!progression) {
          throw new Error(`Progression ${classId}.${resourceId} introuvable`);
        }
        const value = progression[level - 1];
        if (value === undefined) {
          throw new Error(`Progression ${classId}.${resourceId} sans valeur à L${level}`);
        }
        return value;
      };
      // Barbarian (SRD L2909) — Rages, Rage Damage
      expect(get('barbarian', 'rage', 1)).toBe(2);
      expect(get('barbarian', 'rage', 17)).toBe(6);
      expect(get('barbarian', 'rage-damage', 9)).toBe(3); // SRD : +3 à partir de L9
      // Bard (SRD L3194) — Bardic Inspiration die
      expect(get('bard', 'bardic-inspiration-die', 1)).toBe('d6');
      expect(get('bard', 'bardic-inspiration-die', 5)).toBe('d8'); // SRD : « d8 à partir du niveau 5 »
      expect(get('bard', 'bardic-inspiration-die', 15)).toBe('d12');
      // Cleric (SRD L3625) — Channel Divinity (none L1)
      expect(get('cleric', 'channel-divinity', 1)).toBe(0);
      expect(get('cleric', 'channel-divinity', 2)).toBe(2); // SRD : gagné L2
      expect(get('cleric', 'channel-divinity', 18)).toBe(4);
      // Druid (SRD L4054) — Wild Shape (none L1, gained L2)
      expect(get('druid', 'wild-shape', 2)).toBe(2);
      expect(get('druid', 'wild-shape', 17)).toBe(4);
      // Fighter (SRD L4613) — Second Wind, Action Surge
      expect(get('fighter', 'second-wind', 1)).toBe(2);
      expect(get('fighter', 'second-wind', 10)).toBe(4);
      expect(get('fighter', 'action-surge', 2)).toBe(1); // SRD : « one use » L2
      expect(get('fighter', 'action-surge', 17)).toBe(2); // SRD : « two uses » L17
      // Monk (SRD L4868) — Martial Arts die, Focus Points
      expect(get('monk', 'martial-arts-die', 1)).toBe('1d6');
      expect(get('monk', 'martial-arts-die', 11)).toBe('1d10');
      expect(get('monk', 'martial-arts-die', 17)).toBe('1d12');
      expect(get('monk', 'focus-points', 1)).toBe(0); // pas de focus L1
      expect(get('monk', 'focus-points', 10)).toBe(10); // SRD : FP = level
      // Paladin (SRD L5136) — Channel Divinity, Lay On Hands pool
      expect(get('paladin', 'channel-divinity', 2)).toBe(0); // pas de CD L2
      expect(get('paladin', 'channel-divinity', 3)).toBe(2); // SRD : gagné L3
      expect(get('paladin', 'lay-on-hands', 1)).toBe(5); // SRD : pool = level × 5
      expect(get('paladin', 'lay-on-hands', 20)).toBe(100);
      // Rogue (SRD L5928) — Sneak Attack dice
      expect(get('rogue', 'sneak-attack-dice', 1)).toBe('1d6');
      expect(get('rogue', 'sneak-attack-dice', 19)).toBe('10d6');
      // Sorcerer (SRD L6193) — Sorcery Points (none L1)
      expect(get('sorcerer', 'sorcery-points', 1)).toBe(0);
      expect(get('sorcerer', 'sorcery-points', 20)).toBe(20);
      // Warlock (SRD L6760) — Pact Magic slots/slot-level + Mystic Arcanum + EI
      expect(get('warlock', 'pact-magic-slots', 1)).toBe(1);
      expect(get('warlock', 'pact-magic-slots', 17)).toBe(4);
      expect(get('warlock', 'pact-magic-slot-level', 9)).toBe(5); // cap L5 atteint à L9
      expect(get('warlock', 'mystic-arcanum', 11)).toBe(1); // SRD : MA L6 spell débloqué L11
      expect(get('warlock', 'mystic-arcanum', 17)).toBe(4);
      expect(get('warlock', 'eldritch-invocations', 1)).toBe(1);
      expect(get('warlock', 'eldritch-invocations', 20)).toBe(10);
      // Wizard (SRD L7426) — Arcane Recovery combined slot level = ceil(level/2)
      expect(get('wizard', 'arcane-recovery-slot-level', 1)).toBe(1);
      expect(get('wizard', 'arcane-recovery-slot-level', 20)).toBe(10);
    });

    it('spellProgression SRD 5.2.1 — couverture des 8 classes incantatrices de base (JALON 2B.2c)', async () => {
      // 8 classes ont une `spellProgression` au niveau classe SRD CC 5.2.1 :
      // Bard, Cleric, Druid, Paladin, Ranger, Sorcerer, Warlock, Wizard.
      // Eldritch Knight (Fighter) et Arcane Trickster (Rogue) sont des sous-
      // classes traitées sur `subclasses.json` — hors scope 2B.2c.
      const classes = await loadJson<
        (ClassEntry & {
          spellProgression?: {
            cantripsKnown?: number[];
            spellsKnownOrPrepared?: number[];
          };
        })[]
      >('public/data/classes.json');
      const expectedClassesWithSpells = [
        'bard',
        'cleric',
        'druid',
        'paladin',
        'ranger',
        'sorcerer',
        'warlock',
        'wizard',
      ];
      for (const id of expectedClassesWithSpells) {
        const cls = classes.find((c) => c.id === id);
        expect(cls?.spellProgression, `${id} doit avoir spellProgression`).toBeDefined();
        expect(
          cls?.spellProgression?.spellsKnownOrPrepared,
          `${id}.spellsKnownOrPrepared doit avoir 20 entrées`,
        ).toHaveLength(20);
      }
      // Paladin et Ranger n'ont PAS de colonne Cantrips dans leur table SRD.
      const paladin = classes.find((c) => c.id === 'paladin');
      const ranger = classes.find((c) => c.id === 'ranger');
      expect(paladin?.spellProgression?.cantripsKnown).toBeUndefined();
      expect(ranger?.spellProgression?.cantripsKnown).toBeUndefined();
      // Les 6 autres incantatrices DOIVENT avoir cantripsKnown.
      for (const id of ['bard', 'cleric', 'druid', 'sorcerer', 'warlock', 'wizard']) {
        const cls = classes.find((c) => c.id === id);
        expect(
          cls?.spellProgression?.cantripsKnown,
          `${id} doit avoir cantripsKnown`,
        ).toHaveLength(20);
      }
      // Les 4 classes non-incantatrices NE DOIVENT PAS avoir spellProgression.
      for (const id of ['barbarian', 'fighter', 'monk', 'rogue']) {
        const cls = classes.find((c) => c.id === id);
        expect(
          cls?.spellProgression,
          `${id} (non-incantateur) ne doit PAS avoir spellProgression`,
        ).toBeUndefined();
      }
    });

    it('spellProgression — vérité du contenu cat. 3 (valeurs SRD figées, JALON 2B.2c)', async () => {
      // Vérification humaine UNE FOIS contre SRD 5.2.1 (cf.
      // `content-sources/extracted/raw/SRD_CC_v5.2.1.txt`, tables
      // « <Class> Features », colonnes Cantrips + Prepared Spells).
      // Le test fige la vérité ensuite. Niveaux d'inflexion choisis pour
      // attraper les sauts (L4/L10 cantrips, L1/L5/L11/L17 prep).
      const classes = await loadJson<
        (ClassEntry & {
          spellProgression?: {
            cantripsKnown?: number[];
            spellsKnownOrPrepared?: number[];
          };
        })[]
      >('public/data/classes.json');
      const prep = (classId: string, level: number): number => {
        const cls = classes.find((c) => c.id === classId);
        const arr = cls?.spellProgression?.spellsKnownOrPrepared;
        if (!arr) throw new Error(`${classId}.spellsKnownOrPrepared introuvable`);
        const v = arr[level - 1];
        if (v === undefined) throw new Error(`${classId}.spellsKnownOrPrepared sans L${level}`);
        return v;
      };
      const cantrips = (classId: string, level: number): number => {
        const cls = classes.find((c) => c.id === classId);
        const arr = cls?.spellProgression?.cantripsKnown;
        if (!arr) throw new Error(`${classId}.cantripsKnown introuvable`);
        const v = arr[level - 1];
        if (v === undefined) throw new Error(`${classId}.cantripsKnown sans L${level}`);
        return v;
      };
      // Bard (SRD L3194) — Prep L1=4, L5=9, L11=16, L20=22 ; Cantrips L1=2 → L10=4.
      expect(prep('bard', 1)).toBe(4);
      expect(prep('bard', 5)).toBe(9);
      expect(prep('bard', 20)).toBe(22);
      expect(cantrips('bard', 1)).toBe(2);
      expect(cantrips('bard', 4)).toBe(3);
      expect(cantrips('bard', 10)).toBe(4);
      // Cleric (SRD L3625) — Prep L1=4, L11=16, L20=22 ; Cantrips L1=3 → L10=5.
      expect(prep('cleric', 1)).toBe(4);
      expect(prep('cleric', 20)).toBe(22);
      expect(cantrips('cleric', 1)).toBe(3);
      expect(cantrips('cleric', 10)).toBe(5);
      // Druid (SRD L4054) — colonne Prepared identique aux full prepared casters.
      expect(prep('druid', 1)).toBe(4);
      expect(prep('druid', 11)).toBe(16);
      // Paladin (SRD L5136) — half caster, pas de cantrips. Prep L1=2, L20=15.
      expect(prep('paladin', 1)).toBe(2);
      expect(prep('paladin', 5)).toBe(6);
      expect(prep('paladin', 20)).toBe(15);
      // Ranger (SRD L5584) — half caster, prep identique Paladin.
      expect(prep('ranger', 1)).toBe(2);
      expect(prep('ranger', 20)).toBe(15);
      // Sorcerer (SRD L6193) — Prep L1=2 (différent Bard/Cleric/Druid à L1-2).
      expect(prep('sorcerer', 1)).toBe(2);
      expect(prep('sorcerer', 2)).toBe(4);
      expect(prep('sorcerer', 20)).toBe(22);
      expect(cantrips('sorcerer', 1)).toBe(4);
      expect(cantrips('sorcerer', 10)).toBe(6);
      // Warlock (SRD L6760) — Pact Magic. Prep L1=2 → L20=15.
      expect(prep('warlock', 1)).toBe(2);
      expect(prep('warlock', 9)).toBe(10);
      expect(prep('warlock', 20)).toBe(15);
      expect(cantrips('warlock', 1)).toBe(2);
      // Wizard (SRD L7310) — diverge à L14+ (spellbook > prepared standard).
      expect(prep('wizard', 1)).toBe(4);
      expect(prep('wizard', 13)).toBe(17);
      expect(prep('wizard', 14)).toBe(18); // L14 = 18 (vs 17 Cleric/Druid/Bard)
      expect(prep('wizard', 20)).toBe(25); // SRD L20 = 25 (max prep wizard)
      expect(cantrips('wizard', 1)).toBe(3);
      expect(cantrips('wizard', 10)).toBe(5);
    });

    it('spellProgression aligné avec spellcasting (JALON 2B.2c)', async () => {
      // Invariant : `spellProgression` présent ⇔ `spellcasting` non null.
      // Une classe non-incantatrice (spellcasting=null) NE DOIT PAS avoir
      // de progression de sorts ; une classe incantatrice DOIT en avoir.
      const classes = await loadJson<
        (ClassEntry & {
          spellcasting?: { ability: string; progression: string } | null;
          spellProgression?: { spellsKnownOrPrepared?: number[] };
        })[]
      >('public/data/classes.json');
      for (const cls of classes) {
        const isCaster = cls.spellcasting !== null && cls.spellcasting !== undefined;
        const hasProgression = cls.spellProgression !== undefined;
        expect(hasProgression, `${cls.id}: spellProgression doit refléter spellcasting`).toBe(
          isCaster,
        );
      }
    });

    it('weaponMasteryEligibility cohérent avec weaponMasteryCount (JALON 2A.5)', async () => {
      // Invariant : count > 0 ⇔ eligibility présent (et inversement).
      // Sémantique data-driven : 4 classes 'all-proficient' (Barb/Fighter/
      // Pala/Ranger), 1 classe 'rogue-finesse-light' (Rogue), 7 classes
      // sans champ (Bard/Cleric/Druid/Monk/Sorcerer/Warlock/Wizard).
      const classes = await loadJson<
        (ClassEntry & {
          weaponMasteryEligibility?: 'all-proficient' | 'rogue-finesse-light';
        })[]
      >('public/data/classes.json');
      let allProficient = 0;
      let rogueFinesseLight = 0;
      let withoutEligibility = 0;
      for (const cls of classes) {
        const hasCount = (cls.weaponMasteryCount ?? 0) > 0;
        const hasEligibility = cls.weaponMasteryEligibility !== undefined;
        expect(hasCount).toBe(hasEligibility);
        if (cls.weaponMasteryEligibility === 'all-proficient') allProficient += 1;
        else if (cls.weaponMasteryEligibility === 'rogue-finesse-light')
          rogueFinesseLight += 1;
        else withoutEligibility += 1;
      }
      expect(allProficient).toBe(4);
      expect(rogueFinesseLight).toBe(1);
      expect(withoutEligibility).toBe(7);
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

    /**
     * D13d-followup-summary (résolu 2026-05-28) : le summary de Pact of the
     * Chain doit lister les **7 formes spéciales** SRD 5.2.1 officielles avec
     * la terminologie WotC FR exacte (FR_SRD_CC_v5.2.1.pdf p. 142).
     *
     * Garde cat. 3 (fidélité bundle vs SRD officiel) : un test plus laxe (« contient
     * Imp ») laisserait passer un drift « Démon mineur » ou « Sprite » non-WotC-FR
     * — d'où l'assertion explicite par terme.
     */
    it('D13d-followup-summary — pact-of-the-chain.summary liste les 7 formes WotC FR + EN officielles', async () => {
      const inv = await loadJson<InvocationEntry[]>('public/data/invocations.json');
      const chain = inv.find((i) => i.id === 'pact-of-the-chain');
      expect(chain).toBeDefined();
      const fr = chain?.summary?.fr ?? '';
      const en = chain?.summary?.en ?? '';

      // FR — terminologie WotC officielle SRD 5.2.1 (PAS « Démon mineur », PAS « Sprite »)
      expect(fr, 'FR summary doit citer Diablotin (PAS Démon mineur)').toMatch(/Diablotin/i);
      expect(fr, 'FR summary doit citer esprit follet (PAS Sprite anglicisme)').toMatch(/esprit follet/i);
      expect(fr).toMatch(/pseudodragon/i);
      expect(fr).toMatch(/quasit/i);
      expect(fr).toMatch(/sphinx merveilleux/i);
      expect(fr).toMatch(/serpent venimeux/i);
      expect(fr).toMatch(/squelette/i);
      // Garde anti-régression sur les drifts terminologiques EN→FR :
      expect(fr, 'FR summary ne doit PAS contenir l\'ancien drift « Démon mineur »').not.toMatch(/Démon mineur/i);
      expect(fr, 'FR summary ne doit PAS contenir l\'anglicisme « Sprite »').not.toMatch(/\bSprite\b/);

      // EN — terminologie SRD CC EN officielle
      expect(en).toMatch(/\bImp\b/);
      expect(en).toMatch(/Pseudodragon/i);
      expect(en).toMatch(/Quasit/i);
      expect(en).toMatch(/Skeleton/i);
      expect(en).toMatch(/Sphinx of Wonder/i);
      expect(en).toMatch(/\bSprite\b/i);
      expect(en).toMatch(/Venomous Snake/i);
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
