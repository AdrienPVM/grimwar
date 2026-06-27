import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';

import { PactSlotsCard } from '../pact-slots-card';

import classesBundle from '../../../../../../public/data/classes.json';

/**
 * Carte Magie de pacte — Cat. 4 (chiffres exacts : Occultiste L1 = 1 empl. niv.1,
 * L5 = 2 empl. niv.3) + Cat. 5 (le tap écrit `classResources['pact-magic-slots']`).
 * Bundle SRD réel injecté (warlock a `spellcasting.progression: 'pact'`).
 */

const { updateCharacterMock } = vi.hoisted(() => ({
  updateCharacterMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) =>
    type === 'classes'
      ? { data: classesBundle, isLoading: false, error: null }
      : { data: [], isLoading: false, error: null },
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

function buildWarlock(
  level: number,
  classResources: Character['classResources'] = {},
): Character {
  return {
    id: 'wl',
    name: 'Occul',
    status: 'alive',
    classes: [
      {
        classId: 'warlock',
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
    primaryClassId: 'warlock',
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
    backgroundId: 'sage',
    extraLanguages: [],
    experience: 0,
    alignment: 'N',
    abilities: { for: 10, dex: 14, con: 14, int: 10, sag: 10, cha: 16 },
    saves: { for: false, dex: false, con: false, int: false, sag: false, cha: true },
    skills: {},
    hp: { current: 9, max: 9, temp: 0 },
    ac: 12,
    speed: 30,
    initiative: 2,
    hitDice: [],
    deathSaves: { success: 0, fail: 0 },
    conditions: [],
    inspiration: false,
    exhaustion: 0,
    currentConcentration: null,
    classResources,
    spellSlots: {},
    preparedSpells: {},
    knownSpells: {},
    spellcastingAbility: { warlock: 'cha' },
    inventory: { items: [], coins: { cu: 0, ar: 0, el: 0, or: 0, pl: 0 }, weightCache: 0 },
    personality: { trait: '', ideal: '', bond: '', flaw: '', backstory: '' },
    featureUsage: {},
    extraProficiencies: { armor: [], weapons: [], tools: [], languages: [] },
    presentInCampaigns: [],
    homeCampaignId: null,
    stats: { totalRolls: 0, totalD20Sum: 0, crits: 0, fumbles: 0, skillUses: {} },
    portrait: { type: 'letter', value: 'O' },
    schemaVersion: 2,
    createdAt: null as never,
    updatedAt: null as never,
    updatedBy: 'uid',
  } as unknown as Character;
}

describe('<PactSlotsCard>', () => {
  it('rend null pour un personnage sans classe à pacte', () => {
    const cleric = { ...buildWarlock(1) };
    cleric.classes = [{ ...cleric.classes[0]!, classId: 'cleric' }];
    const { container } = render(<PactSlotsCard character={cleric} readOnly={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('Occultiste L1 (fiche fraîche) → 1 emplacement de niveau 1, lecture « 1/1 »', () => {
    render(<PactSlotsCard character={buildWarlock(1)} readOnly={false} />);
    expect(screen.getByText('Magie de pacte')).toBeInTheDocument();
    expect(
      screen.getByText('Emplacements de niveau 1 · récupérés au repos court.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('pact-slots-readout')).toHaveTextContent('1/1');
    expect(screen.getByTestId('pact-slots-row').querySelectorAll('button')).toHaveLength(1);
  });

  it('Occultiste L5 → 2 emplacements de niveau 3, lecture « 2/2 »', () => {
    render(<PactSlotsCard character={buildWarlock(5)} readOnly={false} />);
    expect(
      screen.getByText('Emplacements de niveau 3 · récupérés au repos court.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('pact-slots-readout')).toHaveTextContent('2/2');
    expect(screen.getByTestId('pact-slots-row').querySelectorAll('button')).toHaveLength(2);
  });

  it('tap sur un emplacement plein → consomme (écrit classResources current-1)', () => {
    render(<PactSlotsCard character={buildWarlock(1)} readOnly={false} />);
    const slot = screen.getByTestId('pact-slots-row').querySelector('button')!;
    // Tap = pointerDown puis pointerUp avant le délai long-press.
    fireEvent.pointerDown(slot, { button: 0 });
    fireEvent.pointerUp(slot);
    expect(updateCharacterMock).toHaveBeenCalledTimes(1);
    expect(updateCharacterMock.mock.calls[0]![0]).toEqual({
      classResources: {
        'pact-magic-slots': { current: 0, max: 1, restoresOn: 'short' },
      },
    });
  });

  it('« Restaurer » recharge tous les emplacements de pacte (repos court)', async () => {
    const user = userEvent.setup();
    const ch = buildWarlock(5, {
      'pact-magic-slots': { current: 0, max: 2, restoresOn: 'short' },
    });
    render(<PactSlotsCard character={ch} readOnly={false} />);
    await user.click(screen.getByRole('button', { name: 'Restaurer' }));
    expect(updateCharacterMock).toHaveBeenCalledTimes(1);
    expect(updateCharacterMock.mock.calls[0]![0]).toEqual({
      classResources: {
        'pact-magic-slots': { current: 2, max: 2, restoresOn: 'short' },
      },
    });
  });

  it('en lecture seule, le tap ne déclenche aucune écriture', () => {
    render(<PactSlotsCard character={buildWarlock(1)} readOnly />);
    const slot = screen.getByTestId('pact-slots-row').querySelector('button')!;
    fireEvent.pointerDown(slot, { button: 0 });
    fireEvent.pointerUp(slot);
    expect(updateCharacterMock).not.toHaveBeenCalled();
  });
});
