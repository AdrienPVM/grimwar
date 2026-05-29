import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  createEmptyClassSubChoices,
  type Character,
  type CharacterClassEntry,
} from '@/shared/types/character';
import type { ClassEntity } from '@/shared/types/content';

import { applyLevelUp } from '../apply-level-up';
import type { LevelUpDraft } from '../level-up-types';

/**
 * JALON 2B.3a — Tests TDD de `applyLevelUp` sur 3 classes échantillon :
 *   - Fighter (martial, L1→L2 — Action Surge, pas d'ASI à 2)
 *   - Wizard (full caster, L1→L2 — emplacements 1×L1 → 3×L1)
 *   - Rogue (skill-monkey, L1→L2 — Cunning Action, pas de cast)
 *
 * Couvre aussi :
 *   - L3→L4 = ASI level → application ASI ou feat
 *   - max level → no-op (refus)
 *   - subclassId requis à newClassLevel=3
 *
 * JALON 2B.3b — Extension à 3 classes complémentaires :
 *   - Barbarian (martial pur, classResourceProgression `rage` + `rage-damage`)
 *   - Bard (full caster, classResourceProgression textuelle `bardic-inspiration-die`
 *     — vérifie que les valeurs textuelles type "d6" ne polluent PAS `classResources`)
 *   - Cleric (full caster prepared, classResourceProgression `channel-divinity` qui
 *     passe de 0 (L1, non matérialisé) à 2 (L2, matérialisé en {2/2, short rest}))
 *
 * JALON 2B.3c — Extension à 3 classes supplémentaires :
 *   - Druid (full caster prepared, `wild-shape` passe de 0 (L1, non matérialisé)
 *     à 2 (L2, short rest))
 *   - Monk (martial pur, `focus-points` passe de 0 (L1) à 2 (L2, short rest) +
 *     vérifie que le `martial-arts-die` textuel ("1d6") n'est PAS matérialisé)
 *   - Paladin (half caster, `lay-on-hands` passe de 5 (L1) à 10 (L2, long rest) +
 *     déblocage des emplacements à L2 (casterLevel=floor(2/2)=1 → 2×L1))
 *
 * JALON 2B.3d — Extension aux 3 dernières classes SRD :
 *   - Ranger (half caster sans `classResourceProgression` — vérifie qu'absence
 *     de table n'erre PAS + déblocage des emplacements à L2 via half caster)
 *   - Sorcerer (full caster, `sorcery-points` passe de 0 (L1) à 2 (L2, long rest))
 *   - Warlock (pact caster — `pact-magic-slots` à 2/2 short rest,
 *     `pact-magic-slot-level` à 1/1 short, `eldritch-invocations` à 3/3 short,
 *     `mystic-arcanum` non matérialisé à L2 car progression=0)
 *
 * Cible explicite : test-vérité du contenu catégorie 4 — résultat chiffré
 * (HP, slots, classResources max) contre la table SRD 5.2.1.
 *
 * Couverture cumulée 2B.3a→d : 12/12 classes SRD applyLevelUp.
 */

// ─────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────

function loadClasses(): Record<string, ClassEntity> {
  const path = join(process.cwd(), 'public', 'data', 'classes.json');
  const arr = JSON.parse(readFileSync(path, 'utf8')) as ClassEntity[];
  return Object.fromEntries(arr.map((c) => [c.id, c]));
}

const ALL_CLASSES = loadClasses();

/** Crée une entrée `classes[]` minimale avec sentinelles v2. */
function mkClassEntry(classId: string, level: number): CharacterClassEntry {
  return {
    classId,
    subclassId: null,
    level,
    ...createEmptyClassSubChoices(),
  };
}

/**
 * Construit un Character L1 minimal pour la classe demandée. Seulement les
 * champs touchés par `applyLevelUp` sont représentés fidèlement ; le reste
 * vient de défauts stubs pour satisfaire le type. Le cast final `as Character`
 * est volontaire — l'objectif est de tester la transformation, pas la
 * validation Zod du Character entier (couvert ailleurs).
 */
function buildL1Character(args: {
  classId: string;
  hitDie: 'd6' | 'd8' | 'd10' | 'd12';
  abilities?: Partial<Character['abilities']>;
}): Character {
  const con = args.abilities?.con ?? 14;
  const conMod = Math.floor((con - 10) / 2);
  const base: Character['abilities'] = {
    for: 10,
    dex: 14,
    con,
    int: 14,
    sag: 10,
    cha: 10,
    ...args.abilities,
  };
  const l1Hp = ({ d6: 6, d8: 8, d10: 10, d12: 12 } as const)[args.hitDie] + conMod;
  return {
    id: 'pc-test',
    name: 'Test',
    status: 'alive',
    classes: [mkClassEntry(args.classId, 1)],
    totalLevel: 1,
    primaryClassId: args.classId,
    ancestryId: 'human',
    ancestrySubChoices: {
      dragonAncestry: null,
      tieflingLegacy: null,
      elfLineage: null,
      gnomeLineage: null,
      goliathAncestry: null,
      ancestryCastingAbility: null,
      ancestryExtraSkill: null,
      ancestrySize: null,
    },
    backgroundId: 'soldier',
    extraLanguages: [],
    experience: 0,
    alignment: 'N',
    abilities: base,
    saves: { for: false, dex: false, con: false, int: false, sag: false, cha: false },
    skills: {},
    hp: { current: l1Hp, max: l1Hp, temp: 0 },
    ac: 13,
    speed: 9,
    initiative: Math.floor((base.dex - 10) / 2),
    hitDice: [{ classId: args.classId, current: 1, max: 1, die: args.hitDie }],
    deathSaves: { success: 0, fail: 0 },
    conditions: [],
    inspiration: false,
    exhaustion: 0,
    currentConcentration: null,
    classResources: {},
    spellSlots: {},
    preparedSpells: {},
    knownSpells: {},
    spellcastingAbility: {},
    inventory: { items: [], coins: { cu: 0, ar: 0, el: 0, or: 0, pl: 0 }, weightCache: 0 },
    personality: { trait: '', ideal: '', bond: '', flaw: '', backstory: '' },
    featureUsage: {},
    extraProficiencies: { armor: [], weapons: [], tools: [], languages: [] },
    presentInCampaigns: [],
    homeCampaignId: null,
    stats: { totalRolls: 0, totalD20Sum: 0, crits: 0, fumbles: 0, skillUses: {} },
    portrait: { type: 'letter', value: 'T' },
    schemaVersion: 2,
    createdAt: null,
    updatedAt: null,
    updatedBy: 'test',
  };
}

const averageRoll = { kind: 'average' as const };

// ─────────────────────────────────────────────────────────────────────
// Fighter — L1 → L2
// ─────────────────────────────────────────────────────────────────────

describe('applyLevelUp · Fighter L1→L2', () => {
  const fighter = buildL1Character({ classId: 'fighter', hitDie: 'd10' });

  it('bumps class level + totalLevel', () => {
    const next = applyLevelUp({
      character: fighter,
      draft: { classId: 'fighter', newClassLevel: 2, hpRoll: averageRoll },
      classDefinitions: ALL_CLASSES,
    });
    expect(next.classes[0]!.level).toBe(2);
    expect(next.totalLevel).toBe(2);
  });

  it('adds 6 + CON-mod HP on average (d10 → 6, CON 14 → +2) → +8', () => {
    const next = applyLevelUp({
      character: fighter,
      draft: { classId: 'fighter', newClassLevel: 2, hpRoll: averageRoll },
      classDefinitions: ALL_CLASSES,
    });
    expect(next.hp.max).toBe(fighter.hp.max + 8);
    expect(next.hp.current).toBe(fighter.hp.current + 8);
  });

  it('bumps Fighter hit dice pool to 2/2', () => {
    const next = applyLevelUp({
      character: fighter,
      draft: { classId: 'fighter', newClassLevel: 2, hpRoll: averageRoll },
      classDefinitions: ALL_CLASSES,
    });
    expect(next.hitDice[0]!.max).toBe(2);
    expect(next.hitDice[0]!.current).toBe(2);
  });

  it('Fighter L2 gagne action-surge (1 use, classResourceProgression)', () => {
    const next = applyLevelUp({
      character: fighter,
      draft: { classId: 'fighter', newClassLevel: 2, hpRoll: averageRoll },
      classDefinitions: ALL_CLASSES,
    });
    expect(next.classResources['action-surge']).toEqual({
      current: 1,
      max: 1,
      restoresOn: 'short',
    });
  });

  it('uses rolled HP if provided', () => {
    const next = applyLevelUp({
      character: fighter,
      draft: {
        classId: 'fighter',
        newClassLevel: 2,
        hpRoll: { kind: 'rolled', rolled: 9 },
      },
      classDefinitions: ALL_CLASSES,
    });
    // rolled 9 + CON 14 (+2) = 11 HP added
    expect(next.hp.max).toBe(fighter.hp.max + 11);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Wizard — L1 → L2 (full caster slot recompute)
// ─────────────────────────────────────────────────────────────────────

describe('applyLevelUp · Wizard L1→L2', () => {
  const wizard = buildL1Character({ classId: 'wizard', hitDie: 'd6' });
  const draft: LevelUpDraft = {
    classId: 'wizard',
    newClassLevel: 2,
    hpRoll: averageRoll,
  };

  it('recompute spellSlots à L2 wizard : 3×L1', () => {
    const next = applyLevelUp({
      character: wizard,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.spellSlots['1']).toEqual({ current: 3, max: 3 });
    expect(next.spellSlots['2']).toBeUndefined();
  });

  it('preserves les emplacements consommés au mieux (delta only)', () => {
    const wizardWithCast = {
      ...wizard,
      spellSlots: { '1': { current: 1, max: 2 } } satisfies Character['spellSlots'],
    };
    const next = applyLevelUp({
      character: wizardWithCast,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    // Delta = 3 - 2 = 1, donc current passe de 1 à 2 (l'utilisateur garde l'emplacement consommé)
    expect(next.spellSlots['1']).toEqual({ current: 2, max: 3 });
  });

  it('Wizard L2 expose arcane-recovery-slot-level = 1 (long rest, threshold)', () => {
    // L'`arcane-recovery-slot-level` du bundle SRD 5.2.1 encode le NIVEAU
    // d'emplacement maximum récupérable (ceil(level/2)) — pas un compteur de
    // pool. À L2 wizard la valeur est 1 (1×L1 récupérable une fois par jour).
    const next = applyLevelUp({
      character: wizard,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.classResources['arcane-recovery-slot-level']).toEqual({
      current: 1,
      max: 1,
      restoresOn: 'long',
    });
  });

  it('adds 4 + CON-mod HP en moyenne (d6 → 4, CON +2) → +6', () => {
    const next = applyLevelUp({
      character: wizard,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.hp.max).toBe(wizard.hp.max + 6);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Rogue — L1 → L2 + L3 (subclass) + L4 (ASI)
// ─────────────────────────────────────────────────────────────────────

describe('applyLevelUp · Rogue progression', () => {
  const rogue = buildL1Character({ classId: 'rogue', hitDie: 'd8' });

  it('L1→L2 : sneak-attack-dice reste à 1 (table SRD : L1=1, L2=1, L3=2)', () => {
    const next = applyLevelUp({
      character: rogue,
      draft: { classId: 'rogue', newClassLevel: 2, hpRoll: averageRoll },
      classDefinitions: ALL_CLASSES,
    });
    expect(next.classResources['sneak-attack-dice']).toBeUndefined();
    // Note : sneak-attack-dice est encodé en string "1d6" / "2d6" — pas
    // matérialisé en pool. Ce test vérifie que la table textuelle n'entre pas
    // dans classResources (pas de pollution).
  });

  it("L2→L3 exige subclassId (sinon throw)", () => {
    const rogueL2 = applyLevelUp({
      character: rogue,
      draft: { classId: 'rogue', newClassLevel: 2, hpRoll: averageRoll },
      classDefinitions: ALL_CLASSES,
    });
    expect(() =>
      applyLevelUp({
        character: rogueL2,
        draft: { classId: 'rogue', newClassLevel: 3, hpRoll: averageRoll },
        classDefinitions: ALL_CLASSES,
      }),
    ).toThrow(/subclassId requis/);
  });

  it('L2→L3 avec subclassId pose subclass sur la classe entry', () => {
    const rogueL2 = applyLevelUp({
      character: rogue,
      draft: { classId: 'rogue', newClassLevel: 2, hpRoll: averageRoll },
      classDefinitions: ALL_CLASSES,
    });
    const rogueL3 = applyLevelUp({
      character: rogueL2,
      draft: {
        classId: 'rogue',
        newClassLevel: 3,
        hpRoll: averageRoll,
        subclassId: 'thief',
      },
      classDefinitions: ALL_CLASSES,
    });
    expect(rogueL3.classes[0]!.subclassId).toBe('thief');
  });

  it('L3→L4 applique ASI (+2 sur DEX)', () => {
    const rogueL3 = applyLevelUp({
      character: applyLevelUp({
        character: rogue,
        draft: { classId: 'rogue', newClassLevel: 2, hpRoll: averageRoll },
        classDefinitions: ALL_CLASSES,
      }),
      draft: {
        classId: 'rogue',
        newClassLevel: 3,
        hpRoll: averageRoll,
        subclassId: 'thief',
      },
      classDefinitions: ALL_CLASSES,
    });
    const rogueL4 = applyLevelUp({
      character: rogueL3,
      draft: {
        classId: 'rogue',
        newClassLevel: 4,
        hpRoll: averageRoll,
        asiOrFeat: {
          kind: 'asi',
          abilityIncreases: [{ ability: 'dex', bonus: 2 }],
        },
      },
      classDefinitions: ALL_CLASSES,
    });
    expect(rogueL4.abilities.dex).toBe(rogue.abilities.dex + 2);
  });

  it("L3→L4 accepte ASI répartie 1/1 sur 2 stats", () => {
    const rogueL3 = applyLevelUp({
      character: applyLevelUp({
        character: rogue,
        draft: { classId: 'rogue', newClassLevel: 2, hpRoll: averageRoll },
        classDefinitions: ALL_CLASSES,
      }),
      draft: {
        classId: 'rogue',
        newClassLevel: 3,
        hpRoll: averageRoll,
        subclassId: 'thief',
      },
      classDefinitions: ALL_CLASSES,
    });
    const rogueL4 = applyLevelUp({
      character: rogueL3,
      draft: {
        classId: 'rogue',
        newClassLevel: 4,
        hpRoll: averageRoll,
        asiOrFeat: {
          kind: 'asi',
          abilityIncreases: [
            { ability: 'dex', bonus: 1 },
            { ability: 'con', bonus: 1 },
          ],
        },
      },
      classDefinitions: ALL_CLASSES,
    });
    expect(rogueL4.abilities.dex).toBe(rogue.abilities.dex + 1);
    expect(rogueL4.abilities.con).toBe(rogue.abilities.con + 1);
  });

  it("ASI plafonne à 20 et throw si tentative au-delà", () => {
    const maxStrFighter = buildL1Character({
      classId: 'fighter',
      hitDie: 'd10',
      abilities: { for: 19 },
    });
    expect(() =>
      applyLevelUp({
        character: maxStrFighter,
        draft: {
          classId: 'fighter',
          newClassLevel: 2,
          hpRoll: averageRoll,
          asiOrFeat: {
            kind: 'asi',
            abilityIncreases: [{ ability: 'for', bonus: 2 }],
          },
        },
        classDefinitions: ALL_CLASSES,
      }),
    ).toThrow(/dépasse 20/);
  });

  it("Feat choice accepté sans muter les stats", () => {
    const rogueL3 = applyLevelUp({
      character: applyLevelUp({
        character: rogue,
        draft: { classId: 'rogue', newClassLevel: 2, hpRoll: averageRoll },
        classDefinitions: ALL_CLASSES,
      }),
      draft: {
        classId: 'rogue',
        newClassLevel: 3,
        hpRoll: averageRoll,
        subclassId: 'thief',
      },
      classDefinitions: ALL_CLASSES,
    });
    const rogueL4 = applyLevelUp({
      character: rogueL3,
      draft: {
        classId: 'rogue',
        newClassLevel: 4,
        hpRoll: averageRoll,
        asiOrFeat: { kind: 'feat', featId: 'alert' },
      },
      classDefinitions: ALL_CLASSES,
    });
    expect(rogueL4.abilities).toEqual(rogueL3.abilities);
  });
});

// ─────────────────────────────────────────────────────────────────────
// JALON 2B.3b — Barbarian L1 → L2 → L3 (martial + rage progression)
// ─────────────────────────────────────────────────────────────────────

describe('applyLevelUp · Barbarian progression', () => {
  const barbarian = buildL1Character({ classId: 'barbarian', hitDie: 'd12' });

  it('L1→L2 : matérialise `rage` à 2/2 (long rest, table SRD)', () => {
    const next = applyLevelUp({
      character: barbarian,
      draft: { classId: 'barbarian', newClassLevel: 2, hpRoll: averageRoll },
      classDefinitions: ALL_CLASSES,
    });
    expect(next.classResources['rage']).toEqual({
      current: 2,
      max: 2,
      restoresOn: 'long',
    });
  });

  it('L1→L2 : matérialise `rage-damage` à 2/2 (bonus dégâts SRD)', () => {
    const next = applyLevelUp({
      character: barbarian,
      draft: { classId: 'barbarian', newClassLevel: 2, hpRoll: averageRoll },
      classDefinitions: ALL_CLASSES,
    });
    expect(next.classResources['rage-damage']).toEqual({
      current: 2,
      max: 2,
      restoresOn: 'long',
    });
  });

  it('L1→L2 : pas de spellSlots (Barbarian non-incantateur)', () => {
    const next = applyLevelUp({
      character: barbarian,
      draft: { classId: 'barbarian', newClassLevel: 2, hpRoll: averageRoll },
      classDefinitions: ALL_CLASSES,
    });
    expect(Object.keys(next.spellSlots)).toEqual([]);
  });

  it('L1→L2 : adds 7 + CON-mod HP (d12 → 7, CON 14 → +2) → +9', () => {
    const next = applyLevelUp({
      character: barbarian,
      draft: { classId: 'barbarian', newClassLevel: 2, hpRoll: averageRoll },
      classDefinitions: ALL_CLASSES,
    });
    expect(next.hp.max).toBe(barbarian.hp.max + 9);
  });

  it('L2→L3 (avec subclass `berserker`) : `rage` bump à 3/3 (table SRD)', () => {
    const barbL2 = applyLevelUp({
      character: barbarian,
      draft: { classId: 'barbarian', newClassLevel: 2, hpRoll: averageRoll },
      classDefinitions: ALL_CLASSES,
    });
    const barbL3 = applyLevelUp({
      character: barbL2,
      draft: {
        classId: 'barbarian',
        newClassLevel: 3,
        hpRoll: averageRoll,
        subclassId: 'berserker',
      },
      classDefinitions: ALL_CLASSES,
    });
    expect(barbL3.classResources['rage']).toEqual({
      current: 3,
      max: 3,
      restoresOn: 'long',
    });
    expect(barbL3.classes[0]!.subclassId).toBe('berserker');
  });
});

// ─────────────────────────────────────────────────────────────────────
// JALON 2B.3b — Bard L1 → L2 (full caster + die textuel non matérialisé)
// ─────────────────────────────────────────────────────────────────────

describe('applyLevelUp · Bard L1→L2', () => {
  const bard = buildL1Character({ classId: 'bard', hitDie: 'd8' });
  const draft: LevelUpDraft = {
    classId: 'bard',
    newClassLevel: 2,
    hpRoll: averageRoll,
  };

  it('recompute spellSlots à L2 bard : 3×L1 (full caster table SRD)', () => {
    const next = applyLevelUp({
      character: bard,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.spellSlots['1']).toEqual({ current: 3, max: 3 });
    expect(next.spellSlots['2']).toBeUndefined();
  });

  it('`bardic-inspiration-die` textuel ("d6") n\'est PAS matérialisé en pool', () => {
    const next = applyLevelUp({
      character: bard,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    // La progression encode "d6" (string) à L1/L2 — l'engine ignore les
    // valeurs textuelles et ne crée pas d'entrée pool. La taille du dé est
    // dérivée à l'usage, pas stockée comme compteur de charges.
    expect(next.classResources['bardic-inspiration-die']).toBeUndefined();
  });

  it('adds 5 + CON-mod HP en moyenne (d8 → 5, CON +2) → +7', () => {
    const next = applyLevelUp({
      character: bard,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.hp.max).toBe(bard.hp.max + 7);
  });

  it('bumps Bard hit dice pool à 2/2', () => {
    const next = applyLevelUp({
      character: bard,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.hitDice[0]!.max).toBe(2);
    expect(next.hitDice[0]!.current).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────
// JALON 2B.3b — Cleric L1 → L2 (full caster prepared + channel divinity)
// ─────────────────────────────────────────────────────────────────────

describe('applyLevelUp · Cleric L1→L2', () => {
  const cleric = buildL1Character({ classId: 'cleric', hitDie: 'd8' });
  const draft: LevelUpDraft = {
    classId: 'cleric',
    newClassLevel: 2,
    hpRoll: averageRoll,
  };

  it('recompute spellSlots à L2 cleric : 3×L1 (full caster table SRD)', () => {
    const next = applyLevelUp({
      character: cleric,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.spellSlots['1']).toEqual({ current: 3, max: 3 });
    expect(next.spellSlots['2']).toBeUndefined();
  });

  it('matérialise `channel-divinity` à 2/2 (short rest, SRD L2 = 2 uses)', () => {
    const next = applyLevelUp({
      character: cleric,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.classResources['channel-divinity']).toEqual({
      current: 2,
      max: 2,
      restoresOn: 'short',
    });
  });

  it('adds 5 + CON-mod HP en moyenne (d8 → 5, CON +2) → +7', () => {
    const next = applyLevelUp({
      character: cleric,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.hp.max).toBe(cleric.hp.max + 7);
  });
});

// ─────────────────────────────────────────────────────────────────────
// JALON 2B.3c — Druid L1 → L2 (full caster prepared + wild-shape)
// ─────────────────────────────────────────────────────────────────────

describe('applyLevelUp · Druid L1→L2', () => {
  const druid = buildL1Character({ classId: 'druid', hitDie: 'd8' });
  const draft: LevelUpDraft = {
    classId: 'druid',
    newClassLevel: 2,
    hpRoll: averageRoll,
  };

  it('recompute spellSlots à L2 druid : 3×L1 (full caster table SRD)', () => {
    const next = applyLevelUp({
      character: druid,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.spellSlots['1']).toEqual({ current: 3, max: 3 });
    expect(next.spellSlots['2']).toBeUndefined();
  });

  it('matérialise `wild-shape` à 2/2 (short rest, SRD L2 = 2 uses)', () => {
    const next = applyLevelUp({
      character: druid,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.classResources['wild-shape']).toEqual({
      current: 2,
      max: 2,
      restoresOn: 'short',
    });
  });

  it('adds 5 + CON-mod HP en moyenne (d8 → 5, CON +2) → +7', () => {
    const next = applyLevelUp({
      character: druid,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.hp.max).toBe(druid.hp.max + 7);
  });

  it('bumps Druid hit dice pool à 2/2', () => {
    const next = applyLevelUp({
      character: druid,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.hitDice[0]!.max).toBe(2);
    expect(next.hitDice[0]!.current).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────
// JALON 2B.3c — Monk L1 → L2 (martial pur + focus-points + die textuel)
// ─────────────────────────────────────────────────────────────────────

describe('applyLevelUp · Monk L1→L2', () => {
  const monk = buildL1Character({ classId: 'monk', hitDie: 'd8' });
  const draft: LevelUpDraft = {
    classId: 'monk',
    newClassLevel: 2,
    hpRoll: averageRoll,
  };

  it('matérialise `focus-points` à 2/2 (short rest, SRD L2 = 2 points)', () => {
    const next = applyLevelUp({
      character: monk,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.classResources['focus-points']).toEqual({
      current: 2,
      max: 2,
      restoresOn: 'short',
    });
  });

  it('`martial-arts-die` textuel ("1d6") n\'est PAS matérialisé en pool', () => {
    const next = applyLevelUp({
      character: monk,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    // La progression encode "1d6" (string) à L1/L2 — l'engine ignore les
    // valeurs textuelles et ne crée pas d'entrée pool. Le die de l'art martial
    // est dérivé à l'usage, pas stocké comme compteur de charges.
    expect(next.classResources['martial-arts-die']).toBeUndefined();
  });

  it('L1→L2 : pas de spellSlots (Monk non-incantateur)', () => {
    const next = applyLevelUp({
      character: monk,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(Object.keys(next.spellSlots)).toEqual([]);
  });

  it('adds 5 + CON-mod HP en moyenne (d8 → 5, CON +2) → +7', () => {
    const next = applyLevelUp({
      character: monk,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.hp.max).toBe(monk.hp.max + 7);
  });
});

// ─────────────────────────────────────────────────────────────────────
// JALON 2B.3c — Paladin L1 → L2 (half caster + lay-on-hands)
// ─────────────────────────────────────────────────────────────────────

describe('applyLevelUp · Paladin L1→L2', () => {
  const paladin = buildL1Character({ classId: 'paladin', hitDie: 'd10' });
  const draft: LevelUpDraft = {
    classId: 'paladin',
    newClassLevel: 2,
    hpRoll: averageRoll,
  };

  it('recompute spellSlots à L2 paladin : 2×L1 (half caster, casterLevel=floor(2/2)=1)', () => {
    const next = applyLevelUp({
      character: paladin,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.spellSlots['1']).toEqual({ current: 2, max: 2 });
    expect(next.spellSlots['2']).toBeUndefined();
  });

  it('bumps `lay-on-hands` à 10/10 (long rest, SRD L1=5 → L2=10)', () => {
    // Édge case important : la progression existe déjà à L1 (5 pts) — vérifie
    // que la matérialisation passe bien à 10/10 et que le `current` est reset
    // au max (le moteur de repos long fera autorité plus tard, mais la
    // transformation level-up rétablit `current = max` à l'application).
    const next = applyLevelUp({
      character: paladin,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.classResources['lay-on-hands']).toEqual({
      current: 10,
      max: 10,
      restoresOn: 'long',
    });
  });

  it('pas de `channel-divinity` à L2 (SRD L1=0, L2=0 → matérialisation à L3 seulement)', () => {
    const next = applyLevelUp({
      character: paladin,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.classResources['channel-divinity']).toBeUndefined();
  });

  it('adds 6 + CON-mod HP en moyenne (d10 → 6, CON +2) → +8', () => {
    const next = applyLevelUp({
      character: paladin,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.hp.max).toBe(paladin.hp.max + 8);
  });

  it('bumps Paladin hit dice pool à 2/2', () => {
    const next = applyLevelUp({
      character: paladin,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.hitDice[0]!.max).toBe(2);
    expect(next.hitDice[0]!.current).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────
// JALON 2B.3d — Ranger L1 → L2 (half caster sans classResourceProgression)
// ─────────────────────────────────────────────────────────────────────

describe('applyLevelUp · Ranger L1→L2', () => {
  const ranger = buildL1Character({ classId: 'ranger', hitDie: 'd10' });
  const draft: LevelUpDraft = {
    classId: 'ranger',
    newClassLevel: 2,
    hpRoll: averageRoll,
  };

  it('recompute spellSlots à L2 ranger : 2×L1 (half caster, casterLevel=floor(2/2)=1)', () => {
    const next = applyLevelUp({
      character: ranger,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.spellSlots['1']).toEqual({ current: 2, max: 2 });
    expect(next.spellSlots['2']).toBeUndefined();
  });

  it('classResources reste vide (Ranger SRD 5.2.1 n\'a pas de classResourceProgression)', () => {
    // Garde-fou : si la classe n'a aucune table de progression ressources, le
    // moteur ne doit ni throw ni polluer `classResources`. Le Ranger SRD 5.2.1
    // gère ses signature features (Favored Enemy, Hunter's Mark) comme des
    // sorts/features sans pool de charges dédié au niveau du resource tracker.
    const next = applyLevelUp({
      character: ranger,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.classResources).toEqual({});
  });

  it('adds 6 + CON-mod HP en moyenne (d10 → 6, CON +2) → +8', () => {
    const next = applyLevelUp({
      character: ranger,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.hp.max).toBe(ranger.hp.max + 8);
  });

  it('bumps Ranger hit dice pool à 2/2', () => {
    const next = applyLevelUp({
      character: ranger,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.hitDice[0]!.max).toBe(2);
    expect(next.hitDice[0]!.current).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────
// JALON 2B.3d — Sorcerer L1 → L2 (full caster + sorcery-points)
// ─────────────────────────────────────────────────────────────────────

describe('applyLevelUp · Sorcerer L1→L2', () => {
  const sorcerer = buildL1Character({ classId: 'sorcerer', hitDie: 'd6' });
  const draft: LevelUpDraft = {
    classId: 'sorcerer',
    newClassLevel: 2,
    hpRoll: averageRoll,
  };

  it('recompute spellSlots à L2 sorcerer : 3×L1 (full caster table SRD)', () => {
    const next = applyLevelUp({
      character: sorcerer,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.spellSlots['1']).toEqual({ current: 3, max: 3 });
    expect(next.spellSlots['2']).toBeUndefined();
  });

  it('matérialise `sorcery-points` à 2/2 (long rest, SRD L2 = 2 points)', () => {
    const next = applyLevelUp({
      character: sorcerer,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.classResources['sorcery-points']).toEqual({
      current: 2,
      max: 2,
      restoresOn: 'long',
    });
  });

  it('adds 4 + CON-mod HP en moyenne (d6 → 4, CON +2) → +6', () => {
    const next = applyLevelUp({
      character: sorcerer,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.hp.max).toBe(sorcerer.hp.max + 6);
  });

  it('bumps Sorcerer hit dice pool à 2/2', () => {
    const next = applyLevelUp({
      character: sorcerer,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.hitDice[0]!.max).toBe(2);
    expect(next.hitDice[0]!.current).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────
// JALON 2B.3d — Warlock L1 → L2 (pact caster + invocations + slot-level)
// ─────────────────────────────────────────────────────────────────────

describe('applyLevelUp · Warlock L1→L2', () => {
  const warlock = buildL1Character({ classId: 'warlock', hitDie: 'd8' });
  const draft: LevelUpDraft = {
    classId: 'warlock',
    newClassLevel: 2,
    hpRoll: averageRoll,
  };

  it('PAS de spellSlots `pact` standards (le pact magic vit dans classResources, pas dans spellSlots)', () => {
    // Garde-fou architectural : la progression Warlock est `pact` (pas full/half/
    // third), donc `casterLevel(pact)` renvoie 0 et `spellSlotsForCasterLevel(0)`
    // renvoie 0 partout. Aucun emplacement standard n'est créé. Le pact magic
    // est encodé séparément via `pact-magic-slots` + `pact-magic-slot-level`.
    const next = applyLevelUp({
      character: warlock,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(Object.keys(next.spellSlots)).toEqual([]);
  });

  it('matérialise `pact-magic-slots` à 2/2 (short rest, SRD L2 = 2 slots)', () => {
    const next = applyLevelUp({
      character: warlock,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.classResources['pact-magic-slots']).toEqual({
      current: 2,
      max: 2,
      restoresOn: 'short',
    });
  });

  it('matérialise `pact-magic-slot-level` à 1/1 (short rest, SRD L1=1, L2=1 — pas de bump)', () => {
    const next = applyLevelUp({
      character: warlock,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.classResources['pact-magic-slot-level']).toEqual({
      current: 1,
      max: 1,
      restoresOn: 'short',
    });
  });

  it('matérialise `eldritch-invocations` à 3/3 (short rest, SRD 5.2.1 L2 = 3 invocations connues)', () => {
    const next = applyLevelUp({
      character: warlock,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.classResources['eldritch-invocations']).toEqual({
      current: 3,
      max: 3,
      restoresOn: 'short',
    });
  });

  it('PAS de `mystic-arcanum` à L2 (SRD progression = 0 jusqu\'à L11)', () => {
    const next = applyLevelUp({
      character: warlock,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.classResources['mystic-arcanum']).toBeUndefined();
  });

  it('adds 5 + CON-mod HP en moyenne (d8 → 5, CON +2) → +7', () => {
    const next = applyLevelUp({
      character: warlock,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.hp.max).toBe(warlock.hp.max + 7);
  });

  it('bumps Warlock hit dice pool à 2/2', () => {
    const next = applyLevelUp({
      character: warlock,
      draft,
      classDefinitions: ALL_CLASSES,
    });
    expect(next.hitDice[0]!.max).toBe(2);
    expect(next.hitDice[0]!.current).toBe(2);
  });

  it('newInvocations dans le draft s\'append à `classes[].eldritchInvocations`', () => {
    // Le chooser d'invocations est wiré côté UI (à venir) ; en attendant, on
    // valide que le moteur respecte la sémantique : append, pas remplacement.
    const next = applyLevelUp({
      character: warlock,
      draft: {
        ...draft,
        newInvocations: ['agonizing-blast', 'devils-sight'],
      },
      classDefinitions: ALL_CLASSES,
    });
    expect(next.classes[0]!.eldritchInvocations).toEqual([
      'agonizing-blast',
      'devils-sight',
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Cas-limites
// ─────────────────────────────────────────────────────────────────────

describe('applyLevelUp · cas-limites', () => {
  const fighter = buildL1Character({ classId: 'fighter', hitDie: 'd10' });

  it("throw si classId absent des classes[]", () => {
    expect(() =>
      applyLevelUp({
        character: fighter,
        draft: { classId: 'wizard', newClassLevel: 2, hpRoll: averageRoll },
        classDefinitions: ALL_CLASSES,
      }),
    ).toThrow(/introuvable/);
  });

  it("throw si newClassLevel ≠ current + 1", () => {
    expect(() =>
      applyLevelUp({
        character: fighter,
        draft: { classId: 'fighter', newClassLevel: 3, hpRoll: averageRoll },
        classDefinitions: ALL_CLASSES,
      }),
    ).toThrow(/attendu 2/);
  });

  it("throw si totalLevel === 20 (refus avant parse Zod)", () => {
    // Multi-class fictif : fighter L19 + wizard L1 → total 20. On tente de
    // bumper wizard à L2 — valide côté Zod (newClassLevel ≤ 20) mais refusé
    // par la garde plafond SRD avant tout calcul.
    const fighterPlusWizardL20: Character = {
      ...fighter,
      classes: [
        { ...fighter.classes[0]!, level: 19 },
        mkClassEntry('wizard', 1),
      ],
      totalLevel: 20,
    };
    expect(() =>
      applyLevelUp({
        character: fighterPlusWizardL20,
        draft: { classId: 'wizard', newClassLevel: 2, hpRoll: averageRoll },
        classDefinitions: ALL_CLASSES,
      }),
    ).toThrow(/totalLevel déjà à 20/);
  });

  it("throw si ASI total ≠ 2 points", () => {
    expect(() =>
      applyLevelUp({
        character: fighter,
        draft: {
          classId: 'fighter',
          newClassLevel: 2,
          hpRoll: averageRoll,
          asiOrFeat: {
            kind: 'asi',
            // 2 + 2 = 4 points → la transformation refuse (total > 2). Le
            // schéma Zod ne capture pas la somme (chaque bonus est ∈ {1,2}).
            abilityIncreases: [{ ability: 'for', bonus: 2 }, { ability: 'dex', bonus: 2 }],
          },
        },
        classDefinitions: ALL_CLASSES,
      }),
    ).toThrow(/2 points/);
  });
});
