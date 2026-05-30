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
 * JALON 2D.4a — Tests TDD pour l'application des sous-choix L1 lors de l'ajout
 * d'une nouvelle classe via `applyLevelUp` (path multiclass).
 *
 * Contexte 2D.3 : `applyLevelUp` accepte `newClassLevel === 1` pour ajouter
 * une nouvelle classe — l'entrée `CharacterClassEntry` créée porte des
 * sentinelles vides via `createEmptyClassSubChoices()`. Le joueur DOIT
 * pouvoir poser les sous-choix L1 (style de combat, ordre divin, sorts du
 * grimoire, etc.) au moment de l'ajout, pas via une seconde étape post-hoc.
 *
 * 2D.4a expose ces sous-choix via `LevelUpDraft.addClassSubChoices` (objet
 * optionnel, applicable UNIQUEMENT quand `newClassLevel === 1`). Le schéma
 * rejette dur la présence de ce champ sur un level-up classique.
 *
 * Périmètre de tests :
 *  - Fighter ajouté avec `fighterFightingStyle` + `weaponMasteries`
 *  - Cleric ajouté avec `clericDivineOrder`
 *  - Wizard ajouté avec `wizardSpellbookL1` (6 sorts)
 *  - Warlock ajouté avec `eldritchInvocations` (1) + pact sub-choices (tome+blade)
 *  - Rogue ajouté avec `expertiseSkills` + `weaponMasteries`
 *  - Druid ajouté avec `druidPrimalOrder`
 *  - Refus schéma : `addClassSubChoices` présent quand `newClassLevel >= 2`
 *  - Absence d'`addClassSubChoices` → entrée créée avec sentinelles vides
 *    (rétrocompat avec 2D.3 — aucun caller ne casse)
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
    id: 'pc-mc-l1',
    name: 'MC L1 sub-choices test',
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

describe('applyLevelUp — sous-choix L1 lors de l\'ajout d\'une classe (2D.4a)', () => {
  it('Fighter ajouté avec fighterFightingStyle + weaponMasteries pose les champs', () => {
    const wizard = buildMulticlassCharacter({
      classes: [mkClassEntry('wizard', 3)],
      primaryClassId: 'wizard',
      abilitiesOverride: { for: 13, dex: 13 }, // Fighter OR
    });
    const draft: LevelUpDraft = {
      classId: 'fighter',
      newClassLevel: 1,
      hpRoll: { kind: 'average' },
      addClassSubChoices: {
        fighterFightingStyle: 'defense',
        weaponMasteries: ['longsword', 'greatsword', 'shortbow'],
      },
    };
    const result = applyLevelUp({
      character: wizard,
      draft,
      classDefinitions: { wizard: ALL_CLASSES.wizard!, fighter: ALL_CLASSES.fighter! },
    });
    const fighterEntry = result.classes.find((c) => c.classId === 'fighter');
    expect(fighterEntry).toBeDefined();
    expect(fighterEntry?.fighterFightingStyle).toBe('defense');
    expect(fighterEntry?.weaponMasteries).toEqual(['longsword', 'greatsword', 'shortbow']);
    // Sentinelles non écrasées
    expect(fighterEntry?.clericDivineOrder).toBeNull();
    expect(fighterEntry?.expertiseSkills).toEqual([]);
  });

  it('Cleric ajouté avec clericDivineOrder pose le champ', () => {
    const wizard = buildMulticlassCharacter({
      classes: [mkClassEntry('wizard', 3)],
      primaryClassId: 'wizard',
      abilitiesOverride: { sag: 13 }, // Cleric requires SAG 13
    });
    const draft: LevelUpDraft = {
      classId: 'cleric',
      newClassLevel: 1,
      hpRoll: { kind: 'average' },
      addClassSubChoices: {
        clericDivineOrder: 'protector',
      },
    };
    const result = applyLevelUp({
      character: wizard,
      draft,
      classDefinitions: { wizard: ALL_CLASSES.wizard!, cleric: ALL_CLASSES.cleric! },
    });
    const clericEntry = result.classes.find((c) => c.classId === 'cleric');
    expect(clericEntry?.clericDivineOrder).toBe('protector');
  });

  it('Druid ajouté avec druidPrimalOrder pose le champ', () => {
    const wizard = buildMulticlassCharacter({
      classes: [mkClassEntry('wizard', 3)],
      primaryClassId: 'wizard',
      abilitiesOverride: { sag: 13 }, // Druid requires SAG 13
    });
    const draft: LevelUpDraft = {
      classId: 'druid',
      newClassLevel: 1,
      hpRoll: { kind: 'average' },
      addClassSubChoices: {
        druidPrimalOrder: 'magician',
      },
    };
    const result = applyLevelUp({
      character: wizard,
      draft,
      classDefinitions: { wizard: ALL_CLASSES.wizard!, druid: ALL_CLASSES.druid! },
    });
    const druidEntry = result.classes.find((c) => c.classId === 'druid');
    expect(druidEntry?.druidPrimalOrder).toBe('magician');
  });

  it('Wizard ajouté avec wizardSpellbookL1 (6 sorts) pose le tableau', () => {
    const fighter = buildMulticlassCharacter({
      classes: [mkClassEntry('fighter', 3)],
      primaryClassId: 'fighter',
      abilitiesOverride: { int: 13 }, // Wizard INT 13
    });
    const draft: LevelUpDraft = {
      classId: 'wizard',
      newClassLevel: 1,
      hpRoll: { kind: 'average' },
      addClassSubChoices: {
        wizardSpellbookL1: [
          'mage-hand',
          'fire-bolt',
          'magic-missile',
          'shield',
          'detect-magic',
          'sleep',
        ],
      },
    };
    const result = applyLevelUp({
      character: fighter,
      draft,
      classDefinitions: { fighter: ALL_CLASSES.fighter!, wizard: ALL_CLASSES.wizard! },
    });
    const wizardEntry = result.classes.find((c) => c.classId === 'wizard');
    expect(wizardEntry?.wizardSpellbookL1).toHaveLength(6);
    expect(wizardEntry?.wizardSpellbookL1).toContain('shield');
  });

  it('Warlock ajouté avec eldritchInvocations + pact-of-the-tome + sous-choix tome', () => {
    const fighter = buildMulticlassCharacter({
      classes: [mkClassEntry('fighter', 3)],
      primaryClassId: 'fighter',
      abilitiesOverride: { cha: 13 }, // Warlock CHA 13
    });
    const draft: LevelUpDraft = {
      classId: 'warlock',
      newClassLevel: 1,
      hpRoll: { kind: 'average' },
      addClassSubChoices: {
        eldritchInvocations: ['pact-of-the-tome'],
        pactTomeCantrips: ['guidance', 'mending', 'thaumaturgy'],
        pactTomeRituals: ['bless', 'detect-magic'],
      },
    };
    const result = applyLevelUp({
      character: fighter,
      draft,
      classDefinitions: { fighter: ALL_CLASSES.fighter!, warlock: ALL_CLASSES.warlock! },
    });
    const warlockEntry = result.classes.find((c) => c.classId === 'warlock');
    expect(warlockEntry?.eldritchInvocations).toEqual(['pact-of-the-tome']);
    expect(warlockEntry?.pactTomeCantrips).toEqual(['guidance', 'mending', 'thaumaturgy']);
    expect(warlockEntry?.pactTomeRituals).toEqual(['bless', 'detect-magic']);
  });

  it('Warlock ajouté avec pact-of-the-blade pose pactBladeWeapon', () => {
    const fighter = buildMulticlassCharacter({
      classes: [mkClassEntry('fighter', 3)],
      primaryClassId: 'fighter',
      abilitiesOverride: { cha: 13 },
    });
    const draft: LevelUpDraft = {
      classId: 'warlock',
      newClassLevel: 1,
      hpRoll: { kind: 'average' },
      addClassSubChoices: {
        eldritchInvocations: ['pact-of-the-blade'],
        pactBladeWeapon: 'rapier',
      },
    };
    const result = applyLevelUp({
      character: fighter,
      draft,
      classDefinitions: { fighter: ALL_CLASSES.fighter!, warlock: ALL_CLASSES.warlock! },
    });
    const warlockEntry = result.classes.find((c) => c.classId === 'warlock');
    expect(warlockEntry?.eldritchInvocations).toEqual(['pact-of-the-blade']);
    expect(warlockEntry?.pactBladeWeapon).toBe('rapier');
  });

  it('Rogue ajouté avec expertiseSkills + weaponMasteries pose les tableaux', () => {
    const wizard = buildMulticlassCharacter({
      classes: [mkClassEntry('wizard', 3)],
      primaryClassId: 'wizard',
      abilitiesOverride: { dex: 13 }, // Rogue DEX 13
    });
    const draft: LevelUpDraft = {
      classId: 'rogue',
      newClassLevel: 1,
      hpRoll: { kind: 'average' },
      addClassSubChoices: {
        expertiseSkills: ['stealth', 'sleight-of-hand'],
        weaponMasteries: ['rapier', 'shortbow'],
      },
    };
    const result = applyLevelUp({
      character: wizard,
      draft,
      classDefinitions: { wizard: ALL_CLASSES.wizard!, rogue: ALL_CLASSES.rogue! },
    });
    const rogueEntry = result.classes.find((c) => c.classId === 'rogue');
    expect(rogueEntry?.expertiseSkills).toEqual(['stealth', 'sleight-of-hand']);
    expect(rogueEntry?.weaponMasteries).toEqual(['rapier', 'shortbow']);
  });

  it('absence de addClassSubChoices → entrée créée avec sentinelles vides (rétrocompat 2D.3)', () => {
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
    const wizardEntry = result.classes.find((c) => c.classId === 'wizard');
    expect(wizardEntry?.wizardSpellbookL1).toEqual([]);
    expect(wizardEntry?.weaponMasteries).toEqual([]);
    expect(wizardEntry?.fighterFightingStyle).toBeNull();
    expect(wizardEntry?.clericDivineOrder).toBeNull();
    expect(wizardEntry?.druidPrimalOrder).toBeNull();
    expect(wizardEntry?.eldritchInvocations).toEqual([]);
    expect(wizardEntry?.expertiseSkills).toEqual([]);
  });

  it('refus schéma : addClassSubChoices présent quand newClassLevel >= 2', () => {
    const fighter = buildMulticlassCharacter({
      classes: [mkClassEntry('fighter', 3)],
      primaryClassId: 'fighter',
    });
    const draft = {
      classId: 'fighter',
      newClassLevel: 4,
      hpRoll: { kind: 'average' as const },
      addClassSubChoices: {
        fighterFightingStyle: 'defense' as const,
      },
    } as LevelUpDraft;
    expect(() =>
      applyLevelUp({
        character: fighter,
        draft,
        classDefinitions: { fighter: ALL_CLASSES.fighter! },
      }),
    ).toThrow(/addClassSubChoices.*newClassLevel|level-up classique|add-class only/i);
  });

  it('partial addClassSubChoices : seuls les champs fournis sont posés', () => {
    const wizard = buildMulticlassCharacter({
      classes: [mkClassEntry('wizard', 3)],
      primaryClassId: 'wizard',
      abilitiesOverride: { for: 13 },
    });
    const draft: LevelUpDraft = {
      classId: 'fighter',
      newClassLevel: 1,
      hpRoll: { kind: 'average' },
      addClassSubChoices: {
        fighterFightingStyle: 'archery',
        // weaponMasteries omis → tableau vide (sentinelle)
      },
    };
    const result = applyLevelUp({
      character: wizard,
      draft,
      classDefinitions: { wizard: ALL_CLASSES.wizard!, fighter: ALL_CLASSES.fighter! },
    });
    const fighterEntry = result.classes.find((c) => c.classId === 'fighter');
    expect(fighterEntry?.fighterFightingStyle).toBe('archery');
    expect(fighterEntry?.weaponMasteries).toEqual([]);
  });
});
