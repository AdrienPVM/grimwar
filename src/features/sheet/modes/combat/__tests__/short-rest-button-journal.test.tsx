import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';

import { ShortRestButton } from '../short-rest-button';

/**
 * M44 — le repos court devient un jalon journalisé.
 *
 * Le point non évident : `applyShortRest` ne patche RIEN quand aucune réserve
 * n'est à recharger, et le composant sortait alors sans écrire. Or « la troupe
 * souffle une heure » est un fait narratif indépendant de son bilan mécanique —
 * un occultiste qui n'a pas dépensé ses emplacements se repose quand même. Le
 * jalon est donc écrit dans les deux cas ; le patch, lui, reste conditionnel.
 */

const { updateCharacterMock, showToastMock, logRestMock } = vi.hoisted(() => ({
  updateCharacterMock: vi.fn().mockResolvedValue(undefined),
  showToastMock: vi.fn(),
  logRestMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/sheet/use-update-character', () => ({
  useUpdateCharacter: () => ({
    updateCharacter: updateCharacterMock,
    isUpdating: false,
    error: null,
  }),
}));

vi.mock('@/shared/lib/slices/toast-slice', () => ({ showToast: showToastMock }));

vi.mock('@/shared/lib/event-logger', () => ({
  logRest: (...args: unknown[]) => logRestMock(...args),
}));

beforeEach(() => {
  updateCharacterMock.mockClear();
  showToastMock.mockClear();
  logRestMock.mockClear();
});

function buildCharacter(classResources: Character['classResources']): Character {
  return {
    id: 'sr',
    name: 'Sr',
    status: 'alive',
    classes: [
      {
        classId: 'warlock',
        subclassId: null,
        level: 3,
        clericDivineOrder: null,
        druidPrimalOrder: null,
        fighterFightingStyle: null,
        weaponMasteries: [],
        expertiseSkills: [],
        eldritchInvocations: [],
        wizardSpellbookL1: [],
      },
    ],
    totalLevel: 3,
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
    backgroundId: 'soldier',
    extraLanguages: [],
    experience: 0,
    alignment: 'N',
    abilities: { for: 10, dex: 12, con: 14, int: 10, sag: 10, cha: 16 },
    saves: { for: false, dex: false, con: false, int: false, sag: true, cha: true },
    skills: {},
    hp: { current: 8, max: 21, temp: 0 },
    ac: 13,
    speed: 30,
    initiative: 1,
    hitDice: [{ classId: 'warlock', current: 3, max: 3, die: 'd8' }],
    deathSaves: { success: 0, fail: 0 },
    conditions: [],
    inspiration: false,
    exhaustion: 0,
    currentConcentration: null,
    classResources,
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
  } as unknown as Character;
}

async function takeRest(): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Repos court' }));
  await user.click(screen.getByRole('button', { name: 'Confirmer le repos court ?' }));
}

describe('<ShortRestButton> — jalon journalisé (M44)', () => {
  it('journalise le repos avec le nombre de réserves rechargées', async () => {
    render(
      <ShortRestButton
        character={buildCharacter({
          'pact-magic-slots': { current: 0, max: 2, restoresOn: 'short' },
        })}
      />,
    );
    await takeRest();

    expect(logRestMock).toHaveBeenCalledTimes(1);
    expect(logRestMock).toHaveBeenCalledWith('sr', 'short', { resourcesReset: 1 });
    // Le patch part aussi : il y avait bien quelque chose à recharger.
    expect(updateCharacterMock).toHaveBeenCalledTimes(1);
  });

  it('journalise même quand il n’y a rien à recharger (le repos a eu lieu)', async () => {
    render(
      <ShortRestButton
        character={buildCharacter({
          // Déjà pleine → `applyShortRest` ne produit aucun patch.
          'pact-magic-slots': { current: 2, max: 2, restoresOn: 'short' },
        })}
      />,
    );
    await takeRest();

    expect(logRestMock).toHaveBeenCalledWith('sr', 'short', { resourcesReset: 0 });
    // C'est le point du test : aucune écriture de fiche, mais un jalon quand même.
    expect(updateCharacterMock).not.toHaveBeenCalled();
  });
});
