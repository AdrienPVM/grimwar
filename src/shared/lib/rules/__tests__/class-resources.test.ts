import { describe, expect, it } from 'vitest';

import type { Character } from '../../../types/character';
import type { ClassEntity } from '../../../types/content';
import {
  currentResourceValue,
  deriveClassResourcePools,
  resourceStorageKey,
} from '../class-resources';

/**
 * `deriveClassResourcePools` / `currentResourceValue` — Cat. 3+4 (fidélité
 * bundle + calcul chiffré contre la table SRD). Les tranches de progression
 * ci-dessous sont les valeurs RÉELLES de `classes.json` (vérifiées une fois
 * contre le SRD CC 5.2.1) ; le test fige la vérité ensuite.
 *
 * Invariants couverts :
 *   - seules les clés de la liste blanche sortent (pas les dés passifs ni les
 *     entrées d'emplacement) ;
 *   - une entrée `0` au niveau courant (aptitude pas débloquée) n'émet rien ;
 *   - une entrée chaîne (dé passif) n'émet rien ;
 *   - le `max` = valeur à `level - 1`, multiclasse-aware ;
 *   - `restoresOn` = court/long correct par ressource ;
 *   - `currentResourceValue` : défaut au max, lecture du stocké, capage au max.
 */

// Progressions SRD réelles (extraits de classes.json — index = level-1).
const BARBARIAN: ClassEntity = {
  id: 'barbarian',
  classResourceProgression: {
    rage: [2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6],
    'rage-damage': [2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4],
  },
} as unknown as ClassEntity;

const FIGHTER: ClassEntity = {
  id: 'fighter',
  classResourceProgression: {
    'second-wind': [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    'action-surge': [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2],
  },
} as unknown as ClassEntity;

const ROGUE: ClassEntity = {
  id: 'rogue',
  classResourceProgression: {
    'sneak-attack-dice': ['1d6', '1d6', '2d6', '2d6', '3d6', '3d6'] as unknown as never,
  },
} as unknown as ClassEntity;

const CLASSES = [BARBARIAN, FIGHTER, ROGUE];

function buildCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'cr',
    name: 'Cr',
    status: 'alive',
    classes: [],
    totalLevel: 1,
    primaryClassId: 'barbarian',
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
    abilities: { for: 16, dex: 12, con: 14, int: 10, sag: 10, cha: 10 },
    saves: { for: true, dex: false, con: true, int: false, sag: false, cha: false },
    skills: {},
    hp: { current: 12, max: 12, temp: 0 },
    ac: 14,
    speed: 30,
    initiative: 1,
    hitDice: [{ classId: 'barbarian', current: 1, max: 1, die: 'd12' }],
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
    portrait: { type: 'letter', value: 'C' },
    schemaVersion: 2,
    createdAt: null as never,
    updatedAt: null as never,
    updatedBy: 'uid',
    ...overrides,
  };
}

function classEntry(classId: string, level: number): Character['classes'][number] {
  return {
    classId,
    subclassId: null,
    level,
    clericDivineOrder: null,
    druidPrimalOrder: null,
    fighterFightingStyle: null,
    weaponMasteries: [],
    expertiseSkills: [],
    eldritchInvocations: [],
    wizardSpellbookL1: [],
  } as Character['classes'][number];
}

describe('deriveClassResourcePools', () => {
  it('Barbare L1 : Rage = 2/long, le bonus de dégâts passif est exclu', () => {
    const char = buildCharacter({ classes: [classEntry('barbarian', 1)] });
    const pools = deriveClassResourcePools(char, CLASSES);

    expect(pools).toHaveLength(1);
    expect(pools[0]).toMatchObject({
      resourceKey: 'rage',
      classId: 'barbarian',
      max: 2,
      restoresOn: 'long',
      storageKey: 'barbarian:rage',
    });
  });

  it('Guerrier L1 : Second souffle = 2/court, Fougue exclue (0 au niveau 1)', () => {
    const char = buildCharacter({ classes: [classEntry('fighter', 1)] });
    const pools = deriveClassResourcePools(char, CLASSES);

    expect(pools).toHaveLength(1);
    expect(pools[0]).toMatchObject({ resourceKey: 'second-wind', max: 2, restoresOn: 'short' });
  });

  it('Guerrier L2 : Fougue débloquée → 1/court en plus du Second souffle', () => {
    const char = buildCharacter({ classes: [classEntry('fighter', 2)] });
    const pools = deriveClassResourcePools(char, CLASSES);

    const keys = pools.map((p) => p.resourceKey).sort();
    expect(keys).toEqual(['action-surge', 'second-wind']);
    const surge = pools.find((p) => p.resourceKey === 'action-surge');
    expect(surge).toMatchObject({ max: 1, restoresOn: 'short' });
  });

  it('Roublard : aucune réserve (les dés d\'Attaque sournoise sont passifs)', () => {
    const char = buildCharacter({ classes: [classEntry('rogue', 5)] });
    expect(deriveClassResourcePools(char, CLASSES)).toEqual([]);
  });

  it('Barbare 11 : Rage = 4 (SRD), pas la valeur de niveau 1', () => {
    const char = buildCharacter({ classes: [classEntry('barbarian', 11)] });
    const pool = deriveClassResourcePools(char, CLASSES)[0];
    expect(pool!.max).toBe(4);
  });

  it('multiclasse : réserves cumulées par classe, clés distinctes', () => {
    const char = buildCharacter({
      classes: [classEntry('barbarian', 3), classEntry('fighter', 2)],
    });
    const pools = deriveClassResourcePools(char, CLASSES);
    const byKey = Object.fromEntries(pools.map((p) => [p.storageKey, p.max]));

    expect(byKey['barbarian:rage']).toBe(3); // Barbare 3 → 3 rages
    expect(byKey['fighter:second-wind']).toBe(2);
    expect(byKey['fighter:action-surge']).toBe(1);
  });

  it('classe inconnue du bundle → aucune réserve, pas de crash', () => {
    const char = buildCharacter({ classes: [classEntry('artificer', 5)] });
    expect(deriveClassResourcePools(char, CLASSES)).toEqual([]);
  });
});

describe('currentResourceValue', () => {
  const char = buildCharacter({ classes: [classEntry('barbarian', 3)] });
  const pool = deriveClassResourcePools(char, CLASSES)[0]!; // rage, max 3

  it('réserve jamais touchée → considérée pleine (défaut = max)', () => {
    expect(currentResourceValue(char, pool)).toBe(3);
  });

  it('lit la valeur stockée quand présente', () => {
    const spent = buildCharacter({
      classes: [classEntry('barbarian', 3)],
      classResources: {
        [resourceStorageKey('barbarian', 'rage')]: { current: 1, max: 3, restoresOn: 'long' },
      },
    });
    expect(currentResourceValue(spent, pool)).toBe(1);
  });

  it('cape au max courant si le stocké le dépasse (défensif)', () => {
    const stale = buildCharacter({
      classes: [classEntry('barbarian', 3)],
      classResources: {
        [resourceStorageKey('barbarian', 'rage')]: { current: 9, max: 9, restoresOn: 'long' },
      },
    });
    expect(currentResourceValue(stale, pool)).toBe(3);
  });
});
