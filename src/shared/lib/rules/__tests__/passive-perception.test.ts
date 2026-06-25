import { describe, expect, it } from 'vitest';

import type { Character } from '@/shared/types/character';

import { passivePerception } from '../passive-perception';

/**
 * Perception passive (SRD 5.2.1) = 10 + mod de Perception.
 *
 * Catégorie 4 de la règle « Vérité du contenu » : on asserte le NOMBRE exact
 * issu de la règle SRD, jamais « > 0 ». Les trois cas couvrent les trois
 * niveaux de maîtrise (aucune / maîtrise / expertise) qui changent le résultat.
 */

function buildCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'pp',
    name: 'PP',
    status: 'alive',
    classes: [{ classId: 'fighter', subclassId: null, level: 1 } as Character['classes'][number]],
    totalLevel: 1,
    primaryClassId: 'fighter',
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
    abilities: { for: 10, dex: 10, con: 10, int: 10, sag: 10, cha: 10 },
    saves: { for: false, dex: false, con: false, int: false, sag: false, cha: false },
    skills: {},
    hp: { current: 10, max: 10, temp: 0 },
    ac: 10,
    speed: 9,
    initiative: 0,
    hitDice: [],
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
    portrait: { type: 'letter', value: 'P' },
    schemaVersion: 2,
    createdAt: null as never,
    updatedAt: null as never,
    updatedBy: 'uid',
    ...overrides,
  };
}

describe('passivePerception', () => {
  it('vaut 10 pour SAG 10 sans maîtrise de Perception (niveau 1)', () => {
    expect(passivePerception(buildCharacter())).toBe(10);
  });

  it('vaut 12 pour SAG 14 sans maîtrise (10 + mod SAG +2)', () => {
    const c = buildCharacter({
      abilities: { for: 10, dex: 10, con: 10, int: 10, sag: 14, cha: 10 },
    });
    expect(passivePerception(c)).toBe(12);
  });

  it('vaut 14 pour SAG 14 avec maîtrise de Perception au niveau 1 (10 + 2 + PB 2)', () => {
    const c = buildCharacter({
      abilities: { for: 10, dex: 10, con: 10, int: 10, sag: 14, cha: 10 },
      skills: { perception: 1 },
    });
    expect(passivePerception(c)).toBe(14);
  });

  it('vaut 16 pour SAG 14 avec expertise de Perception au niveau 1 (10 + 2 + 2×PB)', () => {
    const c = buildCharacter({
      abilities: { for: 10, dex: 10, con: 10, int: 10, sag: 14, cha: 10 },
      skills: { perception: 2 },
    });
    expect(passivePerception(c)).toBe(16);
  });

  it('rescale le bonus de maîtrise au niveau 5 (PB 3 → 10 + 2 + 3 = 15)', () => {
    const c = buildCharacter({
      classes: [
        { classId: 'fighter', subclassId: null, level: 5 } as Character['classes'][number],
      ],
      totalLevel: 5,
      abilities: { for: 10, dex: 10, con: 10, int: 10, sag: 14, cha: 10 },
      skills: { perception: 1 },
    });
    expect(passivePerception(c)).toBe(15);
  });
});
