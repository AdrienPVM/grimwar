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
 * JALON 2D.3 — Tests TDD pour le path "ajouter une nouvelle classe" dans
 * `applyLevelUp`.
 *
 * Scénarios :
 *   - Fighter L3 ajoute Wizard L1 → classes.length 1→2, slots L1 = 1×1
 *     (full caster floor(3/2)+1 = 2 ? Non : casterLevel utilisé. Fighter
 *     pure non-caster, Wizard ajouté = full → unifié = 1 → 2 slots L1).
 *   - Cap classes.length à 4 (borne schéma) — refus si déjà 4 classes.
 *   - Refus si `multiclassPrerequisite` non satisfait (defense in depth).
 *   - Refus si newClassLevel === 1 mais classId DÉJÀ dans classes[] (refus
 *     d'ajouter en double).
 *   - HP : avg + conMod (PAS dé max — réservé à primaryClassId au L1).
 *   - Hit dice pool : append nouvelle entrée (préserve les autres).
 *   - extraProficiencies : append multiclassProficiencies de la nouvelle classe.
 */

function loadClasses(): Record<string, ClassEntity> {
  const path = join(process.cwd(), 'public', 'data', 'classes.json');
  const arr = JSON.parse(readFileSync(path, 'utf8')) as ClassEntity[];
  return Object.fromEntries(arr.map((c) => [c.id, c]));
}

const ALL_CLASSES = loadClasses();

function mkClassEntry(classId: string, level: number): CharacterClassEntry {
  return {
    classId,
    subclassId: null,
    level,
    ...createEmptyClassSubChoices(),
  };
}

/**
 * Construit un Character pour les scénarios multiclass. `abilitiesOverride`
 * permet d'ajuster les scores pour bloquer/débloquer les prereqs.
 */
function buildMulticlassCharacter(args: {
  classes: CharacterClassEntry[];
  primaryClassId: string;
  abilitiesOverride?: Partial<Character['abilities']>;
}): Character {
  const abilities: Character['abilities'] = {
    for: 14,
    dex: 14,
    con: 14,
    int: 14,
    sag: 14,
    cha: 14,
    ...args.abilitiesOverride,
  };
  const totalLevel = args.classes.reduce((acc, c) => acc + c.level, 0);
  const hitDice = args.classes.map((c) => {
    const def = ALL_CLASSES[c.classId]!;
    return { classId: c.classId, current: c.level, max: c.level, die: def.hitDie };
  });
  return {
    id: 'pc-mc',
    name: 'MC test',
    status: 'alive',
    classes: args.classes,
    totalLevel,
    primaryClassId: args.primaryClassId,
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
    abilities,
    saves: { for: false, dex: false, con: false, int: false, sag: false, cha: false },
    skills: {},
    hp: { current: 20, max: 20, temp: 0 },
    ac: 13,
    speed: 9,
    initiative: 2,
    hitDice,
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
    inventory: {
      items: [],
      coins: { cu: 0, ar: 0, el: 0, or: 0, pl: 0 },
      weightCache: 0,
    },
    personality: { trait: '', ideal: '', bond: '', flaw: '', backstory: '' },
    featureUsage: {},
    extraProficiencies: { armor: [], weapons: [], tools: [], languages: [] },
    presentInCampaigns: [],
    homeCampaignId: null,
    stats: { totalRolls: 0, totalD20Sum: 0, crits: 0, fumbles: 0, skillUses: {} },
    portrait: { type: 'letter', value: 'M' },
    schemaVersion: 2,
    createdAt: null,
    updatedAt: null,
    updatedBy: 'test',
  };
}

describe('applyLevelUp — ajout d\'une nouvelle classe (multiclass)', () => {
  it('Fighter L3 ajoute Wizard L1 : classes.length 1→2, slots L1 unifiés', () => {
    const fighter = buildMulticlassCharacter({
      classes: [mkClassEntry('fighter', 3)],
      primaryClassId: 'fighter',
      abilitiesOverride: { int: 13 }, // satisfait le prereq Wizard
    });
    const draft: LevelUpDraft = {
      classId: 'wizard',
      newClassLevel: 1,
      hpRoll: { kind: 'average' },
    };
    const result = applyLevelUp({
      character: fighter,
      draft,
      classDefinitions: { fighter: ALL_CLASSES.fighter!, wizard: ALL_CLASSES.wizard! },
    });

    expect(result.classes).toHaveLength(2);
    expect(result.classes[1]?.classId).toBe('wizard');
    expect(result.classes[1]?.level).toBe(1);
    expect(result.totalLevel).toBe(4);

    // Slots unifiés : Fighter non-caster (0) + Wizard full L1 (+1) = casterLevel 1
    // → 2 slots L1 (cf. SLOT_TABLE[1]).
    expect(result.spellSlots['1']?.max).toBe(2);
  });

  it('refus si character.classes.length >= 4 (borne schéma)', () => {
    const character = buildMulticlassCharacter({
      classes: [
        mkClassEntry('fighter', 1),
        mkClassEntry('wizard', 1),
        mkClassEntry('rogue', 1),
        mkClassEntry('cleric', 1),
      ],
      primaryClassId: 'fighter',
      abilitiesOverride: { for: 16, dex: 16, int: 16, sag: 16, cha: 16 },
    });
    const draft: LevelUpDraft = {
      classId: 'bard',
      newClassLevel: 1,
      hpRoll: { kind: 'average' },
    };
    expect(() =>
      applyLevelUp({
        character,
        draft,
        classDefinitions: {
          fighter: ALL_CLASSES.fighter!,
          wizard: ALL_CLASSES.wizard!,
          rogue: ALL_CLASSES.rogue!,
          cleric: ALL_CLASSES.cleric!,
          bard: ALL_CLASSES.bard!,
        },
      }),
    ).toThrow(/borne|max.*4|classes\.length/i);
  });

  it('refus si multiclassPrerequisite non satisfait (Paladin sans CHA 13)', () => {
    const fighter = buildMulticlassCharacter({
      classes: [mkClassEntry('fighter', 2)],
      primaryClassId: 'fighter',
      abilitiesOverride: { for: 16, cha: 8 }, // Paladin requiert FOR 13 ET CHA 13
    });
    const draft: LevelUpDraft = {
      classId: 'paladin',
      newClassLevel: 1,
      hpRoll: { kind: 'average' },
    };
    expect(() =>
      applyLevelUp({
        character: fighter,
        draft,
        classDefinitions: { fighter: ALL_CLASSES.fighter!, paladin: ALL_CLASSES.paladin! },
      }),
    ).toThrow(/prereq|prérequis|multiclass/i);
  });

  it('refus si classId DÉJÀ présent dans classes[] avec newClassLevel === 1', () => {
    const fighter = buildMulticlassCharacter({
      classes: [mkClassEntry('fighter', 3)],
      primaryClassId: 'fighter',
    });
    const draft: LevelUpDraft = {
      classId: 'fighter',
      newClassLevel: 1,
      hpRoll: { kind: 'average' },
    };
    expect(() =>
      applyLevelUp({
        character: fighter,
        draft,
        classDefinitions: { fighter: ALL_CLASSES.fighter! },
      }),
    ).toThrow(/déjà|already|attendu/i);
  });

  it('HP : avg + conMod (jamais dé max — réservé primaryClassId)', () => {
    const fighter = buildMulticlassCharacter({
      classes: [mkClassEntry('fighter', 3)],
      primaryClassId: 'fighter',
      abilitiesOverride: { int: 13, con: 14 }, // CON 14 → +2 mod
    });
    const hpBefore = fighter.hp.max;
    const draft: LevelUpDraft = {
      classId: 'wizard',
      newClassLevel: 1,
      hpRoll: { kind: 'average' },
    };
    const result = applyLevelUp({
      character: fighter,
      draft,
      classDefinitions: { fighter: ALL_CLASSES.fighter!, wizard: ALL_CLASSES.wizard! },
    });
    // Wizard d6 avg = 4, + CON mod 2 = 6
    expect(result.hp.max - hpBefore).toBe(6);
  });

  it('hit dice pool : append nouvelle entrée, préserve les existantes', () => {
    const fighter = buildMulticlassCharacter({
      classes: [mkClassEntry('fighter', 3)],
      primaryClassId: 'fighter',
      abilitiesOverride: { int: 13 },
    });
    const draft: LevelUpDraft = {
      classId: 'wizard',
      newClassLevel: 1,
      hpRoll: { kind: 'average' },
    };
    const result = applyLevelUp({
      character: fighter,
      draft,
      classDefinitions: { fighter: ALL_CLASSES.fighter!, wizard: ALL_CLASSES.wizard! },
    });
    expect(result.hitDice).toHaveLength(2);
    expect(result.hitDice[0]).toEqual({ classId: 'fighter', current: 3, max: 3, die: 'd10' });
    expect(result.hitDice[1]).toEqual({ classId: 'wizard', current: 1, max: 1, die: 'd6' });
  });

  it('extraProficiencies : append multiclassProficiencies de la nouvelle classe', () => {
    const wizard = buildMulticlassCharacter({
      classes: [mkClassEntry('wizard', 3)],
      primaryClassId: 'wizard',
      abilitiesOverride: { for: 13, dex: 13 }, // Fighter OR
    });
    const draft: LevelUpDraft = {
      classId: 'fighter',
      newClassLevel: 1,
      hpRoll: { kind: 'average' },
    };
    const result = applyLevelUp({
      character: wizard,
      draft,
      classDefinitions: { wizard: ALL_CLASSES.wizard!, fighter: ALL_CLASSES.fighter! },
    });
    // Fighter multiclass donne Light + Medium armor + Shields + Martial weapons
    expect(result.extraProficiencies.armor).toContain('Light');
    expect(result.extraProficiencies.armor).toContain('Medium armor');
    expect(result.extraProficiencies.armor).toContain('Shields');
    expect(result.extraProficiencies.weapons).toContain('Martial weapons');
  });

  it("classDefinitions doit inclure la nouvelle classe (sinon throw)", () => {
    const fighter = buildMulticlassCharacter({
      classes: [mkClassEntry('fighter', 3)],
      primaryClassId: 'fighter',
      abilitiesOverride: { int: 13 },
    });
    const draft: LevelUpDraft = {
      classId: 'wizard',
      newClassLevel: 1,
      hpRoll: { kind: 'average' },
    };
    expect(() =>
      applyLevelUp({
        character: fighter,
        draft,
        classDefinitions: { fighter: ALL_CLASSES.fighter! }, // wizard absent
      }),
    ).toThrow(/wizard.*absente|définition/i);
  });
});
