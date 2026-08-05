import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Character, CharacterClassEntry } from '@/shared/types/character';
import { createEmptyClassSubChoices } from '@/shared/types/character';

/**
 * M17 — les maîtrises deviennent pilotables depuis la fiche.
 *
 * Ce qui est vérifié n'est pas « un bouton existe » mais **ce qui part dans le
 * patch** : un cycle de maîtrise qui écrirait un zéro, ou une langue ajoutée
 * dans le mauvais tableau, seraient invisibles à l'œil et faux au document.
 */

const updateCharacterMock = vi.fn((..._args: unknown[]) => Promise.resolve());
vi.mock('../../../use-update-character', () => ({
  useUpdateCharacter: () => ({
    updateCharacter: (...args: unknown[]) => updateCharacterMock(...args),
    isUpdating: false,
    error: null,
  }),
}));

const rollWithFlagsMock = vi.fn(() => Promise.resolve(null));
vi.mock('@/features/dice/roll-with-flags', () => ({
  rollWithFlags: (...args: unknown[]) => rollWithFlagsMock(...args),
}));

import ancestriesBundle from '../../../../../../public/data/ancestries.json';
import backgroundsBundle from '../../../../../../public/data/backgrounds.json';
import classesBundle from '../../../../../../public/data/classes.json';
import itemsBundle from '../../../../../../public/data/items.json';

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'classes') return { data: classesBundle, isLoading: false, error: null };
    if (type === 'backgrounds') return { data: backgroundsBundle, isLoading: false, error: null };
    if (type === 'items') return { data: itemsBundle, isLoading: false, error: null };
    if (type === 'ancestries') return { data: ancestriesBundle, isLoading: false, error: null };
    return { data: [], isLoading: false, error: null };
  },
}));

import { PermissionProvider } from '../../../permissions-context';
import { LanguagesCard } from '../languages-card';
import { ProficienciesCard } from '../proficiencies-card';
import { SavesRow } from '../saves-row';
import { SkillsList } from '../skills-list';

function classEntry(classId: string): CharacterClassEntry {
  return { classId, subclassId: null, level: 1, ...createEmptyClassSubChoices() };
}

function buildCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'prof',
    name: 'Prof',
    status: 'alive',
    classes: [classEntry('fighter')],
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
    abilities: { for: 14, dex: 12, con: 12, int: 12, sag: 10, cha: 10 },
    saves: { for: true, dex: false, con: false, int: false, sag: false, cha: false },
    skills: {},
    hp: { current: 10, max: 10, temp: 0 },
    ac: 12,
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

/** Les cartes Maîtrises / Langues dérivent leur droit d'écrire du contexte. */
function editable(children: ReactNode): JSX.Element {
  return (
    <PermissionProvider
      value={{ canEdit: true, isDM: false, isDMEdit: false, lockedFields: [] }}
    >
      {children}
    </PermissionProvider>
  );
}

beforeEach(() => {
  updateCharacterMock.mockClear();
  rollWithFlagsMock.mockClear();
});

describe('SkillsList — mode maîtrises', () => {
  it('un tap fait tourner aucune → maîtrise, et ne lance PAS de dé', async () => {
    const user = userEvent.setup();
    render(<SkillsList character={buildCharacter()} readOnly={false} />);

    await user.click(screen.getByRole('button', { name: 'Maîtrises' }));
    await user.click(screen.getByRole('button', { name: /^Survie — Non maîtrisée/ }));

    await waitFor(() => expect(updateCharacterMock).toHaveBeenCalledTimes(1));
    expect(updateCharacterMock).toHaveBeenCalledWith({ skills: { survival: 1 } });
    // En mode édition le tap n'est plus un jet — sinon on lancerait un dé à
    // chaque correction de fiche.
    expect(rollWithFlagsMock).not.toHaveBeenCalled();
  });

  it('maîtrise → expertise', async () => {
    const user = userEvent.setup();
    render(
      <SkillsList character={buildCharacter({ skills: { survival: 1 } })} readOnly={false} />,
    );

    await user.click(screen.getByRole('button', { name: 'Maîtrises' }));
    await user.click(screen.getByRole('button', { name: /^Survie — Maîtrise/ }));

    await waitFor(() => expect(updateCharacterMock).toHaveBeenCalledTimes(1));
    expect(updateCharacterMock).toHaveBeenCalledWith({ skills: { survival: 2 } });
  });

  it('expertise → aucune RETIRE la clé au lieu d’écrire un zéro', async () => {
    const user = userEvent.setup();
    render(
      <SkillsList
        character={buildCharacter({ skills: { survival: 2, stealth: 1 } })}
        readOnly={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Maîtrises' }));
    await user.click(screen.getByRole('button', { name: /^Survie — Expertise/ }));

    await waitFor(() => expect(updateCharacterMock).toHaveBeenCalledTimes(1));
    expect(updateCharacterMock).toHaveBeenCalledWith({ skills: { stealth: 1 } });
  });

  it('hors mode édition, le tap reste un jet', async () => {
    const user = userEvent.setup();
    render(<SkillsList character={buildCharacter()} readOnly={false} />);

    await user.click(screen.getByText('Survie'));

    await waitFor(() => expect(rollWithFlagsMock).toHaveBeenCalledTimes(1));
    expect(updateCharacterMock).not.toHaveBeenCalled();
  });

  it('en lecture seule, le mode édition n’est pas proposé', () => {
    render(<SkillsList character={buildCharacter()} readOnly />);
    expect(screen.queryByRole('button', { name: 'Maîtrises' })).toBeNull();
  });
});

describe('SavesRow — mode maîtrises', () => {
  it('bascule la maîtrise d’une sauvegarde sans toucher aux autres', async () => {
    const user = userEvent.setup();
    render(<SavesRow character={buildCharacter()} readOnly={false} />);

    await user.click(screen.getByRole('button', { name: 'Maîtrises' }));
    await user.click(
      screen.getByRole('button', { name: 'Maîtrise de la sauvegarde de Sagesse' }),
    );

    await waitFor(() => expect(updateCharacterMock).toHaveBeenCalledTimes(1));
    expect(updateCharacterMock).toHaveBeenCalledWith({
      saves: { for: true, dex: false, con: false, int: false, sag: true, cha: false },
    });
    expect(rollWithFlagsMock).not.toHaveBeenCalled();
  });
});

describe('<ProficienciesCard> — maîtrises ajoutées à la main', () => {
  it('ajoute un outil en saisie libre dans extraProficiencies.tools', async () => {
    const user = userEvent.setup();
    render(editable(<ProficienciesCard character={buildCharacter()} />));

    await user.click(screen.getByRole('button', { name: 'Maîtrises' }));
    await user.type(
      screen.getByLabelText('Saisir une entrée libre — Outils'),
      'Outils de forgeron',
    );
    const addButtons = screen.getAllByRole('button', { name: 'Ajouter' });
    await user.click(addButtons[addButtons.length - 1]);

    await waitFor(() => expect(updateCharacterMock).toHaveBeenCalledTimes(1));
    expect(updateCharacterMock).toHaveBeenCalledWith({
      extraProficiencies: {
        armor: [],
        weapons: [],
        tools: ['Outils de forgeron'],
        languages: [],
      },
    });
  });

  it('affiche une maîtrise libre non normalisable au lieu de la perdre', () => {
    render(
      editable(
        <ProficienciesCard
          character={buildCharacter({
            extraProficiencies: {
              armor: ['Armure de plates naine'],
              weapons: [],
              tools: [],
              languages: [],
            },
          })}
        />,
      ),
    );
    // Le vocabulaire de normalisation est celui du SRD anglais : une saisie
    // libre n'y entre pas et disparaissait juste après avoir été écrite.
    expect(screen.getByText('Armure de plates naine')).toBeInTheDocument();
  });

  it('retire une entrée ajoutée (et seulement elle)', async () => {
    const user = userEvent.setup();
    render(
      editable(
        <ProficienciesCard
          character={buildCharacter({
            extraProficiencies: {
              armor: [],
              weapons: [],
              tools: ['Outils de forgeron', 'Cornemuse'],
              languages: [],
            },
          })}
        />,
      ),
    );

    await user.click(screen.getByRole('button', { name: 'Maîtrises' }));
    await user.click(screen.getByRole('button', { name: 'Retirer Cornemuse' }));

    await waitFor(() => expect(updateCharacterMock).toHaveBeenCalledTimes(1));
    expect(updateCharacterMock).toHaveBeenCalledWith({
      extraProficiencies: {
        armor: [],
        weapons: [],
        tools: ['Outils de forgeron'],
        languages: [],
      },
    });
  });

  it('sans droit d’écriture, aucun mode édition', () => {
    render(<ProficienciesCard character={buildCharacter()} />);
    expect(screen.queryByRole('button', { name: 'Maîtrises' })).toBeNull();
  });
});

describe('<LanguagesCard> — langues apprises en jeu', () => {
  it('ajoute une langue du registre par son id, pas par son libellé', async () => {
    const user = userEvent.setup();
    render(editable(<LanguagesCard character={buildCharacter()} />));

    await user.click(screen.getByRole('button', { name: 'Maîtrises' }));
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Drake' }));

    await waitFor(() => expect(updateCharacterMock).toHaveBeenCalledTimes(1));
    expect(updateCharacterMock).toHaveBeenCalledWith({
      extraProficiencies: { armor: [], weapons: [], tools: [], languages: ['draconic'] },
    });
  });

  it('affiche une langue hors registre saisie librement', () => {
    render(
      editable(
        <LanguagesCard
          character={buildCharacter({
            extraProficiencies: { armor: [], weapons: [], tools: [], languages: ['Thayen'] },
          })}
        />,
      ),
    );
    expect(screen.getByText('Thayen')).toBeInTheDocument();
  });
});
