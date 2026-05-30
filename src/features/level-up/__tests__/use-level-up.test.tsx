import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';
import type { ClassEntity, Subclass } from '@/shared/types/content';

import { useLevelUp } from '../use-level-up';

/**
 * JALON 2B.5 — `useLevelUp(character)` bridge entre la modale UI (2B.4c) et
 * Firestore.
 *
 * Contrat :
 *   1. expose `applyAndPersist(draft) => Promise<void>` ;
 *   2. compose `applyLevelUp` (transformation pure) + `useUpdateCharacter`
 *      (persistance) — rien d'autre ;
 *   3. la payload Firestore est un Partial<Character> AVEC les champs mutés
 *      par `applyLevelUp` (totalLevel, classes, hp, spellSlots, knownSpells,
 *      abilities, hitDice, classResources) — pas le character entier (évite
 *      d'écraser `createdAt`/`schemaVersion`) ;
 *   4. les définitions de classe utilisées par `applyLevelUp` viennent de
 *      `useContent('classes')`.
 *
 * Red-before-green : le module `use-level-up.ts` n'existe pas avant ce
 * commit ; le `import` casse, le test rougit, puis verdit à la livraison.
 */

const championSubclass: Subclass = {
  id: 'champion',
  classId: 'fighter',
  name: { fr: 'Champion', en: 'Champion' },
  description: { fr: '', en: '' },
  features: [],
  source: 'srd-5.2.1',
};

const fighterClass: ClassEntity = {
  id: 'fighter',
  name: { fr: 'Guerrier', en: 'Fighter' },
  description: { fr: '', en: '' },
  hitDie: 'd10',
  primaryAbility: ['for'],
  saveProficiencies: ['for', 'con'],
  skillChoices: { count: 2, from: [] },
  armorProficiencies: [],
  weaponProficiencies: [],
  toolProficiencies: [],
  spellcasting: null,
  startingEquipment: { options: [{ items: [], coins: null }] },
  features: [],
  weaponMasteryCount: 0,
  source: 'srd-5.2.1',
};

const updateCharacterMock = vi.fn().mockResolvedValue(undefined);

vi.mock('@/features/sheet/use-update-character', () => ({
  useUpdateCharacter: () => ({
    updateCharacter: updateCharacterMock,
    isUpdating: false,
    error: null,
  }),
}));

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'classes') return { data: [fighterClass], loading: false, error: null };
    if (type === 'subclasses') return { data: [championSubclass], loading: false, error: null };
    return { data: [], loading: false, error: null };
  },
}));

function makeFighter(level: number): Character {
  return {
    id: 'pj-1',
    name: 'Garreth',
    status: 'alive',
    classes: [
      {
        classId: 'fighter',
        subclassId: null,
        level,
        clericDivineOrder: null,
        druidPrimalOrder: null,
        fighterFightingStyle: 'defense',
        weaponMasteries: [],
        expertiseSkills: [],
        eldritchInvocations: [],
        wizardSpellbookL1: [],
      },
    ],
    totalLevel: level,
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
    alignment: 'LN',
    abilities: { for: 16, dex: 12, con: 14, int: 10, sag: 12, cha: 8 },
    saves: { for: true, dex: false, con: true, int: false, sag: false, cha: false },
    skills: {},
    hp: { current: 12, max: 12, temp: 0 },
    ac: 16,
    speed: 30,
    initiative: 1,
    hitDice: [{ classId: 'fighter', current: level, max: level, die: 'd10' }],
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
    portrait: { type: 'letter', value: 'G' },
    schemaVersion: 2,
    createdAt: null as never,
    updatedAt: null as never,
    updatedBy: 'test-uid',
  };
}

describe('useLevelUp (JALON 2B.5)', () => {
  it('Fighter L1 → L2 (HP moyenne) : persiste le patch via updateCharacter', async () => {
    updateCharacterMock.mockClear();
    const character = makeFighter(1);
    const { result } = renderHook(() => useLevelUp(character));
    await act(async () => {
      await result.current.applyAndPersist({
        classId: 'fighter',
        newClassLevel: 2,
        hpRoll: { kind: 'average' },
      });
    });
    expect(updateCharacterMock).toHaveBeenCalledTimes(1);
    const patch = updateCharacterMock.mock.calls[0]![0];
    // SRD 5.2.1 : Fighter L2 = +6 HP (avg d10) + 2 (conMod 14) = +8.
    expect(patch.hp).toEqual({ current: 20, max: 20, temp: 0 });
    expect(patch.totalLevel).toBe(2);
    expect(patch.classes[0].level).toBe(2);
    expect(patch.classes[0].classId).toBe('fighter');
    // Les hit dice de la classe levée +1.
    const fighterDice = patch.hitDice.find((d: { classId: string }) => d.classId === 'fighter');
    expect(fighterDice).toEqual({ classId: 'fighter', current: 2, max: 2, die: 'd10' });
    // Le patch ne porte PAS id (Firestore le tient au niveau du doc path).
    expect(patch.id).toBeUndefined();
    // Et pas de timestamps (le hook updateCharacter pose `updatedAt` côté serveur).
    expect(patch.createdAt).toBeUndefined();
    expect(patch.updatedAt).toBeUndefined();
  });

  it('lève si la définition de classe est introuvable dans le bundle', async () => {
    updateCharacterMock.mockClear();
    const character = makeFighter(1);
    character.primaryClassId = 'orphan';
    character.classes[0]!.classId = 'orphan';
    const { result } = renderHook(() => useLevelUp(character));
    await expect(
      result.current.applyAndPersist({
        classId: 'orphan',
        newClassLevel: 2,
        hpRoll: { kind: 'average' },
      }),
    ).rejects.toThrow(/définition classe/);
    expect(updateCharacterMock).not.toHaveBeenCalled();
  });
});
