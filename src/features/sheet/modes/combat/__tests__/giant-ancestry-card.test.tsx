import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';

import type { Character } from '@/shared/types/character';
import type { Ancestry } from '@/shared/types/content';

import { GiantAncestryCard } from '../giant-ancestry-card';

/**
 * Carte « Ascendance gigante » (Goliath). Cat. 4 (max = bonus de maîtrise au
 * NOMBRE) + Cat. 5 (le bouton dépense écrit bien `featureUsage` à la clé
 * `ancestry-combat:giant-ancestry`) + lecture seule.
 */

const GOLIATH_ANCESTRY: Ancestry = {
  id: 'goliath',
  name: { fr: 'Goliath', en: 'Goliath' },
  size: 'medium',
  speed: 35,
  description: { fr: '', en: '' },
  abilityScoreIncrease: [],
  traits: [],
  languages: ['common'],
  source: 'srd-5.2.1',
  options: {
    giantAncestries: [
      {
        id: 'cloud',
        name: { fr: 'Nuage', en: 'Cloud' },
        effect: { fr: 'Téléportation de bénédiction du nuage.', en: '' },
      },
      {
        id: 'fire',
        name: { fr: 'Feu', en: 'Fire' },
        effect: { fr: 'Dégâts de feu de la cendre du géant du feu.', en: '' },
      },
    ],
  },
} as unknown as Ancestry;

const { updateCharacterMock } = vi.hoisted(() => ({
  updateCharacterMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'ancestries') {
      return { data: [GOLIATH_ANCESTRY], isLoading: false, error: null };
    }
    return { data: [], isLoading: false, error: null };
  },
}));

vi.mock('@/features/sheet/use-update-character', () => ({
  useUpdateCharacter: () => ({
    updateCharacter: updateCharacterMock,
    isUpdating: false,
    error: null,
  }),
}));

beforeEach(() => {
  updateCharacterMock.mockClear();
});

function buildCharacter(overrides: Partial<Character> = {}): Character {
  const base: Character = {
    id: 'test',
    name: 'Test',
    status: 'alive',
    classes: [
      {
        classId: 'barbarian',
        subclassId: null,
        level: 5,
        clericDivineOrder: null,
        druidPrimalOrder: null,
        fighterFightingStyle: null,
        weaponMasteries: [],
        expertiseSkills: [],
        eldritchInvocations: [],
        wizardSpellbookL1: [],
      },
    ],
    totalLevel: 5,
    primaryClassId: 'barbarian',
    ancestryId: 'goliath',
    ancestrySubChoices: {
      dragonAncestry: null,
      tieflingLegacy: null,
      elfLineage: null,
      gnomeLineage: null,
      goliathAncestry: 'fire',
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
    hp: { current: 45, max: 45, temp: 0 },
    ac: 13,
    speed: 35,
    initiative: 1,
    hitDice: [{ classId: 'barbarian', current: 5, max: 5, die: 'd12' }],
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

describe('<GiantAncestryCard>', () => {
  it("ne rend rien hors Goliath", () => {
    const { container } = render(
      <GiantAncestryCard character={buildCharacter({ ancestryId: 'human' })} readOnly={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('rend le nom + effet de l\'ascendance gigante choisie', () => {
    render(<GiantAncestryCard character={buildCharacter()} readOnly={false} />);
    expect(screen.getByText('Feu')).toBeInTheDocument();
    expect(
      screen.getByText('Dégâts de feu de la cendre du géant du feu.'),
    ).toBeInTheDocument();
  });

  it('L5 → compteur plein « 3 / 3 » (PB du niveau 5)', () => {
    render(<GiantAncestryCard character={buildCharacter()} readOnly={false} />);
    expect(screen.getByTestId('usage-counter-value').textContent).toContain('3');
    expect(screen.getByTestId('usage-counter-value').textContent).toContain('/ 3');
  });

  it('« Dépenser » écrit featureUsage current=2 (clé ancestry-combat:giant-ancestry)', () => {
    render(<GiantAncestryCard character={buildCharacter()} readOnly={false} />);
    fireEvent.click(
      screen.getByLabelText(/Dépenser une utilisation d’Ascendance gigante/),
    );
    expect(updateCharacterMock).toHaveBeenCalledTimes(1);
    expect(updateCharacterMock.mock.calls[0]![0]).toEqual({
      featureUsage: {
        'ancestry-combat:giant-ancestry': { current: 2, max: 3, restoresOn: 'long' },
      },
    });
  });

  it('« Récupérer » désactivé au plein', () => {
    render(<GiantAncestryCard character={buildCharacter()} readOnly={false} />);
    const restore = screen.getByLabelText(
      /Récupérer une utilisation d’Ascendance gigante/,
    ) as HTMLButtonElement;
    expect(restore.disabled).toBe(true);
  });

  it('lecture seule → aucun bouton, seul le ratio reste', () => {
    render(<GiantAncestryCard character={buildCharacter()} readOnly />);
    expect(screen.queryByLabelText(/Dépenser une utilisation/)).toBeNull();
    expect(screen.getByTestId('usage-counter-value')).toBeInTheDocument();
  });
});
