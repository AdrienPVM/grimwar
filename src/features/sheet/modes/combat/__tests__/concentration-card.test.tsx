import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';

import { ConcentrationCard } from '../concentration-card';
import { expectNoForbiddenEnglish } from '../../../../../../tests/helpers/i18n-guard';

import spellsBundle from '../../../../../../public/data/spells.json';

/**
 * Carte « Concentration » — Cat. 2 (identité du contenu : le nom affiché est
 * EXACTEMENT le `name.fr` du slug résolu dans spells.json, pas « contient ») +
 * Cat. 5 (le bouton « Rompre » écrit `currentConcentration: null`).
 *
 * Valeurs de référence figées contre le bundle réel (Cat. 3) :
 *  - `benediction` → « Bénédiction » (sort de niveau 1, concentration) ;
 *  - `assistance`  → « Assistance »  (sort mineur, concentration).
 * Bundle spells réel injecté (pas de fixture inventée).
 */

const { updateCharacterMock } = vi.hoisted(() => ({
  updateCharacterMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) =>
    type === 'spells'
      ? { data: spellsBundle, isLoading: false, error: null }
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

function buildCharacter(
  conc: Character['currentConcentration'],
): Character {
  return {
    id: 'co',
    name: 'Co',
    status: 'alive',
    classes: [],
    totalLevel: 3,
    primaryClassId: 'cleric',
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
    backgroundId: 'acolyte',
    extraLanguages: [],
    experience: 0,
    alignment: 'N',
    abilities: { for: 10, dex: 12, con: 14, int: 10, sag: 16, cha: 10 },
    saves: { for: false, dex: false, con: false, int: false, sag: true, cha: true },
    skills: {},
    hp: { current: 20, max: 20, temp: 0 },
    ac: 14,
    speed: 30,
    initiative: 1,
    hitDice: [],
    deathSaves: { success: 0, fail: 0 },
    conditions: [],
    inspiration: false,
    exhaustion: 0,
    currentConcentration: conc,
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
  };
}

describe('<ConcentrationCard>', () => {
  it('aucune concentration → ne rend rien', () => {
    const { container } = render(<ConcentrationCard character={buildCharacter(null)} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('concentration active → nom EXACT du sort (name.fr du slug benediction)', () => {
    render(
      <ConcentrationCard
        character={buildCharacter({ spellId: 'benediction', slotLevel: 1 })}
      />,
    );
    // Identité, pas présence : le name.fr exact de l'entrée benediction.
    expect(screen.getByText('Bénédiction')).toBeInTheDocument();
    expect(screen.getByText('Lancé au niveau 1')).toBeInTheDocument();
  });

  it('upcast → « Lancé au niveau 3 »', () => {
    render(
      <ConcentrationCard
        character={buildCharacter({ spellId: 'benediction', slotLevel: 3 })}
      />,
    );
    expect(screen.getByText('Lancé au niveau 3')).toBeInTheDocument();
  });

  it('sort mineur de concentration (slotLevel 0) → « Sort mineur »', () => {
    render(
      <ConcentrationCard
        character={buildCharacter({ spellId: 'assistance', slotLevel: 0 })}
      />,
    );
    expect(screen.getByText('Assistance')).toBeInTheDocument();
    expect(screen.getByText('Sort mineur')).toBeInTheDocument();
  });

  it('rappelle la règle officielle de jet sur dégâts (DD 10 / moitié des dégâts)', () => {
    render(
      <ConcentrationCard
        character={buildCharacter({ spellId: 'benediction', slotLevel: 1 })}
      />,
    );
    expect(
      screen.getByText(/jet de sauvegarde de Constitution, DD 10 ou la moitié des dégâts subis/),
    ).toBeInTheDocument();
  });

  it('« Rompre la concentration » écrit currentConcentration: null', async () => {
    const user = userEvent.setup();
    render(
      <ConcentrationCard
        character={buildCharacter({ spellId: 'benediction', slotLevel: 1 })}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Rompre la concentration' }));
    expect(updateCharacterMock).toHaveBeenCalledWith({ currentConcentration: null });
  });

  it('lecture seule : pas de bouton « Rompre », rappel + sort visibles', () => {
    render(
      <ConcentrationCard
        readOnly
        character={buildCharacter({ spellId: 'benediction', slotLevel: 1 })}
      />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Bénédiction')).toBeInTheDocument();
  });

  it('sort introuvable dans le bundle → fallback « Sort en cours » (pas de crash)', () => {
    render(
      <ConcentrationCard
        character={buildCharacter({ spellId: 'sort-inexistant-xyz', slotLevel: 2 })}
      />,
    );
    expect(screen.getByText('Sort en cours')).toBeInTheDocument();
    expect(screen.getByText('Lancé au niveau 2')).toBeInTheDocument();
  });

  it('aucun anglicisme dans les libellés', () => {
    const { container } = render(
      <ConcentrationCard
        character={buildCharacter({ spellId: 'benediction', slotLevel: 1 })}
      />,
    );
    expectNoForbiddenEnglish(container.textContent ?? '', 'concentration-card');
  });
});
