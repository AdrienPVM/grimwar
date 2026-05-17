import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import type { Character } from '@/shared/types/character';
import type { Ancestry } from '@/shared/types/content';

import { BreathWeaponCard } from '../breath-weapon-card';

/**
 * Plan 13.8 step 29 — la carte Souffle s'affiche pour les Drakéides
 * AVEC dragonAncestry choisi, et résout le type de dégâts depuis le
 * bundle.
 */

const DRAGONBORN_ANCESTRY: Ancestry = {
  id: 'dragonborn',
  name: { fr: 'Drakéide', en: 'Dragonborn' },
  size: 'medium',
  speed: 30,
  description: { fr: '', en: '' },
  abilityScoreIncrease: [],
  traits: [],
  languages: ['common'],
  source: 'srd-5.2.1',
  options: {
    dragonAncestries: [
      {
        id: 'red',
        name: { fr: 'Rouge', en: 'Red' },
        damageType: 'fire',
        damageTypeLabel: { fr: 'Feu', en: 'Fire' },
      },
      {
        id: 'silver',
        name: { fr: 'Argent', en: 'Silver' },
        damageType: 'cold',
        damageTypeLabel: { fr: 'Froid', en: 'Cold' },
      },
    ],
  },
};

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'ancestries') {
      return { data: [DRAGONBORN_ANCESTRY], isLoading: false, error: null };
    }
    return { data: [], isLoading: false, error: null };
  },
}));

function buildCharacter(overrides: Partial<Character> = {}): Character {
  const base: Character = {
    id: 'test',
    name: 'Test',
    status: 'alive',
    classes: [
      {
        classId: 'fighter',
        subclassId: null,
        level: 1,
        clericDivineOrder: null,
        druidPrimalOrder: null,
        fighterFightingStyle: null,
        weaponMasteries: [],
        expertiseSkills: [],
        eldritchInvocations: [],
        wizardSpellbookL1: [],
      },
    ],
    totalLevel: 1,
    primaryClassId: 'fighter',
    ancestryId: 'dragonborn',
    ancestrySubChoices: {
      dragonAncestry: 'red',
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
    alignment: 'NB',
    abilities: { for: 16, dex: 12, con: 14, int: 10, sag: 10, cha: 10 },
    saves: { for: true, dex: false, con: true, int: false, sag: false, cha: false },
    skills: {},
    hp: { current: 12, max: 12, temp: 0 },
    ac: 13,
    speed: 30,
    initiative: 1,
    hitDice: [{ classId: 'fighter', current: 1, max: 1, die: 'd10' }],
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
    createdAt: null as never,
    updatedAt: null as never,
    updatedBy: 'test-uid',
  };
  return { ...base, ...overrides };
}

describe('<BreathWeaponCard>', () => {
  it("ne rend rien pour une ascendance qui n'est pas Drakéide", () => {
    const character = buildCharacter({ ancestryId: 'human' });
    const { container } = render(
      <BreathWeaponCard character={character} readOnly={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('ne rend rien pour un Drakéide sans dragonAncestry choisi (sentinelle)', () => {
    const character = buildCharacter({
      ancestrySubChoices: {
        ...buildCharacter().ancestrySubChoices,
        dragonAncestry: null,
      },
    });
    const { container } = render(
      <BreathWeaponCard character={character} readOnly={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('Drakéide Rouge L1 → carte rendue avec type Feu + DC + 1d10', () => {
    const character = buildCharacter();
    render(<BreathWeaponCard character={character} readOnly={false} />);
    // Type de dégâts visible (dans le chip + dans la liste résistance).
    expect(screen.getAllByText('Feu').length).toBeGreaterThanOrEqual(1);
    // DC = 8 + Con mod (con 14 → +2) + PB (totalLevel 1 → +2) = 12.
    expect(screen.getByText('12')).toBeInTheDocument();
    // Échelle : L1 → 1d10.
    expect(screen.getByText('1d10')).toBeInTheDocument();
  });

  it('Drakéide L5 → 2d10', () => {
    const character = buildCharacter({ totalLevel: 5 });
    render(<BreathWeaponCard character={character} readOnly={false} />);
    expect(screen.getByText('2d10')).toBeInTheDocument();
  });

  it('Drakéide Argent → type Froid affiché', () => {
    const character = buildCharacter({
      ancestrySubChoices: {
        ...buildCharacter().ancestrySubChoices,
        dragonAncestry: 'silver',
      },
    });
    render(<BreathWeaponCard character={character} readOnly={false} />);
    expect(screen.getAllByText('Froid').length).toBeGreaterThanOrEqual(1);
  });
});
