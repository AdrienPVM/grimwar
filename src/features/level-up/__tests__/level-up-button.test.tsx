import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';
import type { ClassEntity } from '@/shared/types/content';

import { LevelUpButton } from '../level-up-button';

/**
 * JALON 2B.4c — LevelUpButton : visible quand level<20, ouvre la modale,
 * la modale appelle onConfirm avec un draft valide, le bouton la referme.
 */

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

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'classes') return { data: [fighterClass], loading: false, error: null };
    return { data: [], loading: false, error: null };
  },
}));

function makeChar(level: number, classId = 'fighter'): Character {
  return {
    id: 'pj',
    name: 'X',
    status: 'alive',
    classes: [
      {
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
      },
    ],
    totalLevel: level,
    primaryClassId: classId,
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
    abilities: { for: 14, dex: 12, con: 14, int: 10, sag: 10, cha: 10 },
    saves: { for: true, dex: false, con: true, int: false, sag: false, cha: false },
    skills: {},
    hp: { current: 10, max: 10, temp: 0 },
    ac: 14,
    speed: 30,
    initiative: 1,
    hitDice: [{ classId, current: level, max: level, die: 'd10' }],
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
    portrait: { type: 'letter', value: 'X' },
    schemaVersion: 2,
    createdAt: null as never,
    updatedAt: null as never,
    updatedBy: 'test-uid',
  };
}

describe('LevelUpButton (JALON 2B.4c)', () => {
  it('rend un bouton avec aria-label « Monter au niveau N+1 »', () => {
    render(<LevelUpButton character={makeChar(5)} />);
    expect(screen.getByRole('button', { name: /monter au niveau 6/i })).toBeInTheDocument();
  });

  it('ne rend rien si la classe primaire est au cap L20', () => {
    const { container } = render(<LevelUpButton character={makeChar(20)} />);
    expect(container.querySelector('button')).toBeNull();
  });

  it('clic ouvre la modale, qui se ferme au confirm', () => {
    const onConfirm = vi.fn();
    render(<LevelUpButton character={makeChar(1)} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: /monter au niveau 2/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // Choisir « Moyenne » et confirmer ferme la modale + appelle onConfirm.
    fireEvent.click(screen.getByRole('button', { name: /moyenne/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirmer/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
