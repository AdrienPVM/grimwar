import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CampaignVariants } from '@/shared/types/campaign';
import type { Character } from '@/shared/types/character';

import { LongRestButton } from '../long-rest-button';

import classesBundle from '../../../../../../public/data/classes.json';

/**
 * Bouton « Repos long » — Cat. 4 (le patch envoyé = règle SRD au chiffre) +
 * Cat. 6 (variantes). Confirmation à deux temps, patch via updateCharacter,
 * notes de variante, lecture seule. Bundle classes réel injecté pour la
 * dérivation des réserves.
 */

const { updateCharacterMock, showToastMock, logRestMock } = vi.hoisted(() => ({
  updateCharacterMock: vi.fn().mockResolvedValue(undefined),
  showToastMock: vi.fn(),
  // M44 — le repos devient un jalon journalisé, pas seulement un patch.
  logRestMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/shared/lib/event-logger', () => ({
  logRest: (...args: unknown[]) => logRestMock(...args),
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

vi.mock('@/shared/lib/slices/toast-slice', () => ({ showToast: showToastMock }));

beforeEach(() => {
  updateCharacterMock.mockClear();
  showToastMock.mockClear();
  logRestMock.mockClear();
});

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

function buildCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'lr',
    name: 'Lr',
    status: 'alive',
    classes: [classEntry('barbarian', 3)],
    totalLevel: 3,
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
    hp: { current: 5, max: 32, temp: 0 },
    ac: 14,
    speed: 30,
    initiative: 1,
    hitDice: [{ classId: 'barbarian', current: 0, max: 3, die: 'd12' }],
    deathSaves: { success: 0, fail: 0 },
    conditions: [],
    inspiration: false,
    exhaustion: 1,
    currentConcentration: null,
    classResources: { 'barbarian:rage': { current: 0, max: 3, restoresOn: 'long' } },
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
    portrait: { type: 'letter', value: 'L' },
    schemaVersion: 2,
    createdAt: null as never,
    updatedAt: null as never,
    updatedBy: 'uid',
    ...overrides,
  };
}

const slowHealing: CampaignVariants = {
  featAtLevel1: false,
  flanking: false,
  slowHealing: true,
  grittyRealism: false,
};
const gritty: CampaignVariants = {
  featAtLevel1: false,
  flanking: false,
  slowHealing: false,
  grittyRealism: true,
};

describe('<LongRestButton>', () => {
  it('premier tap arme la confirmation, ne patche pas encore', async () => {
    const user = userEvent.setup();
    render(<LongRestButton character={buildCharacter()} />);
    await user.click(screen.getByRole('button', { name: 'Repos long' }));
    expect(screen.getByRole('button', { name: 'Confirmer le repos long ?' })).toBeInTheDocument();
    expect(updateCharacterMock).not.toHaveBeenCalled();
  });

  it('second tap applique le repos long (PV max, dés regagnés, rage reset, épuisement −1)', async () => {
    const user = userEvent.setup();
    render(<LongRestButton character={buildCharacter()} />);
    await user.click(screen.getByRole('button', { name: 'Repos long' }));
    await user.click(screen.getByRole('button', { name: 'Confirmer le repos long ?' }));

    expect(updateCharacterMock).toHaveBeenCalledTimes(1);
    const patch = updateCharacterMock.mock.calls[0]![0] as Partial<Character>;
    expect(patch.hp!.current).toBe(32); // PV → max
    expect(patch.hitDice![0]!.current).toBe(1); // floor(3/2) = 1 regagné
    expect(patch.classResources!['barbarian:rage']!.current).toBe(3); // reset
    expect(patch.exhaustion).toBe(0); // 1 → 0
  });

  it('slowHealing : ne rend pas les PV + note affichée', async () => {
    const user = userEvent.setup();
    render(<LongRestButton character={buildCharacter()} variants={slowHealing} />);
    expect(screen.getByText(/Guérison naturelle lente/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Repos long' }));
    await user.click(screen.getByRole('button', { name: 'Confirmer le repos long ?' }));
    const patch = updateCharacterMock.mock.calls[0]![0] as Partial<Character>;
    expect(patch.hp!.current).toBe(5); // inchangé
  });

  it('grittyRealism : note de durée 7 jours affichée', () => {
    render(<LongRestButton character={buildCharacter()} variants={gritty} />);
    expect(screen.getByText(/7 jours/)).toBeInTheDocument();
  });

  it('lecture seule : rien rendu', () => {
    const { container } = render(<LongRestButton readOnly character={buildCharacter()} />);
    expect(container).toBeEmptyDOMElement();
  });
});

/**
 * M44 — un repos long remet PV, dés de vie et réserves d'un coup : le diff de
 * fiche produisait une pluie de lignes sans jamais dire « ils ont dormi ». Le
 * jalon dédié porte le bilan pour que le journal puisse le raconter.
 */
describe('<LongRestButton> — jalon journalisé (M44)', () => {
  it('journalise un repos long avec les PV rendus', async () => {
    const user = userEvent.setup();
    render(<LongRestButton character={buildCharacter()} />);
    await user.click(screen.getByRole('button', { name: 'Repos long' }));
    await user.click(screen.getByRole('button', { name: 'Confirmer le repos long ?' }));

    expect(logRestMock).toHaveBeenCalledTimes(1);
    const [characterId, type, summary] = logRestMock.mock.calls[0]! as [
      string,
      string,
      { hpHealed: number },
    ];
    expect(type).toBe('long');
    expect(characterId).toBe(buildCharacter().id);
    // Le personnage de test part à 5/32 PV → le repos en rend exactement 27.
    expect(summary.hpHealed).toBe(27);
  });

  it('slowHealing : le jalon est écrit, avec 0 PV rendu (et non un champ absent)', async () => {
    const user = userEvent.setup();
    render(<LongRestButton character={buildCharacter()} variants={slowHealing} />);
    await user.click(screen.getByRole('button', { name: 'Repos long' }));
    await user.click(screen.getByRole('button', { name: 'Confirmer le repos long ?' }));

    const [, , summary] = logRestMock.mock.calls[0]! as [string, string, { hpHealed: number }];
    expect(summary.hpHealed).toBe(0);
  });
});
