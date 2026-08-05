import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';

/**
 * M26 — « Recopier Boule de feu depuis un parchemin trouvé ».
 *
 * `knownSpells` n'était écrit que par le wizard de création et la montée de
 * niveau : tout ce qui s'apprend EN JEU n'avait aucune porte. Le catalogue
 * proposé n'est PAS filtré par liste de classe — c'est précisément le mur.
 */

const { updateCharacterMock } = vi.hoisted(() => ({
  updateCharacterMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/sheet/use-update-character', () => ({
  useUpdateCharacter: () => ({
    updateCharacter: updateCharacterMock,
    isUpdating: false,
    error: null,
  }),
}));

import classesBundle from '../../../../../../public/data/classes.json';
import spellsBundle from '../../../../../../public/data/spells.json';

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) =>
    type === 'classes'
      ? { data: classesBundle, isLoading: false, error: null }
      : type === 'spells'
        ? { data: spellsBundle, isLoading: false, error: null }
        : { data: [], isLoading: false, error: null },
}));

import { AddSpellModal } from '../add-spell-modal';

function buildCleric(known: Record<string, string[]> = {}): Character {
  return {
    id: 'cl',
    name: 'Cler',
    status: 'alive',
    classes: [
      {
        classId: 'cleric',
        subclassId: null,
        level: 3,
        clericDivineOrder: 'protector',
        druidPrimalOrder: null,
        fighterFightingStyle: null,
        weaponMasteries: [],
        expertiseSkills: [],
        eldritchInvocations: [],
        wizardSpellbookL1: [],
      },
    ],
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
    ac: 13,
    speed: 9,
    initiative: 1,
    hitDice: [],
    deathSaves: { success: 0, fail: 0 },
    conditions: [],
    inspiration: false,
    exhaustion: 0,
    currentConcentration: null,
    classResources: {},
    spellSlots: {},
    preparedSpells: {},
    knownSpells: known,
    spellcastingAbility: { cleric: 'sag' },
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

beforeEach(() => {
  updateCharacterMock.mockClear();
});

describe('<AddSpellModal>', () => {
  it('ajoute un sort HORS liste de classe à knownSpells de la classe', async () => {
    const user = userEvent.setup();
    render(
      <AddSpellModal
        character={buildCleric()}
        spellcasterClassIds={['cleric']}
        open
        onClose={() => {}}
      />,
    );

    // « Armure du mage » est un sort d'Ensorceleur/Magicien : il DOIT être
    // proposé à un Clerc, sinon le parchemin recopié reste lettre morte.
    await user.type(screen.getByLabelText('Chercher un sort à ajouter'), 'armure du mage');
    await user.click(screen.getByRole('button', { name: /Armure du mage/ }));

    await waitFor(() => expect(updateCharacterMock).toHaveBeenCalledTimes(1));
    expect(updateCharacterMock).toHaveBeenCalledWith({
      knownSpells: { cleric: ['armure-du-mage'] },
    });
  });

  it('ne cherche rien sous deux lettres (le catalogue entier n’est pas une réponse)', async () => {
    const user = userEvent.setup();
    render(
      <AddSpellModal
        character={buildCleric()}
        spellcasterClassIds={['cleric']}
        open
        onClose={() => {}}
      />,
    );

    await user.type(screen.getByLabelText('Chercher un sort à ajouter'), 'a');
    expect(screen.getByText(/Tape au moins deux lettres/)).toBeInTheDocument();
  });

  it('marque « Déjà connu » et refuse le doublon', async () => {
    const user = userEvent.setup();
    render(
      <AddSpellModal
        character={buildCleric({ cleric: ['armure-du-mage'] })}
        spellcasterClassIds={['cleric']}
        open
        onClose={() => {}}
      />,
    );

    await user.type(screen.getByLabelText('Chercher un sort à ajouter'), 'armure du mage');
    const row = screen.getByRole('button', { name: /Armure du mage/ });
    expect(row).toBeDisabled();
    expect(screen.getByText('Déjà connu')).toBeInTheDocument();
  });

  it('cherche sans les accents (clavier de téléphone en pleine partie)', async () => {
    const user = userEvent.setup();
    render(
      <AddSpellModal
        character={buildCleric()}
        spellcasterClassIds={['cleric']}
        open
        onClose={() => {}}
      />,
    );

    await user.type(screen.getByLabelText('Chercher un sort à ajouter'), 'benediction');
    expect(screen.getByRole('button', { name: /Bénédiction/ })).toBeInTheDocument();
  });
});
