import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';

import { ClassResourcesCard } from '../class-resources-card';
import { expectNoForbiddenEnglish } from '../../../../../../tests/helpers/i18n-guard';

import classesBundle from '../../../../../../public/data/classes.json';

/**
 * Carte « Réserves de classe » — Cat. 2 (identité : libellé FR officiel résolu)
 * + Cat. 4 (ratio courant/max au NOMBRE, dérivé de la table SRD réelle) + Cat. 5
 * (le bouton dépense/récupère écrit bien le bon patch `classResources`). Le
 * bundle `classes.json` réel est injecté → les valeurs assertées sont la vérité
 * SRD figée.
 */

const { updateCharacterMock } = vi.hoisted(() => ({
  updateCharacterMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'classes') {
      return { data: classesBundle, isLoading: false, error: null };
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

/** Barbare 3 (3 Rages dérivées), avec `classResources` optionnellement posées. */
function barbarian3(
  classResources: Character['classResources'] = {},
): Character {
  return buildCharacter({
    classes: [classEntry('barbarian', 3)],
    totalLevel: 3,
    classResources,
  });
}

function buildCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'cr',
    name: 'Cr',
    status: 'alive',
    classes: [classEntry('barbarian', 1)],
    totalLevel: 1,
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
    hp: { current: 12, max: 12, temp: 0 },
    ac: 14,
    speed: 30,
    initiative: 1,
    hitDice: [{ classId: 'barbarian', current: 1, max: 1, die: 'd12' }],
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
    portrait: { type: 'letter', value: 'C' },
    schemaVersion: 2,
    createdAt: null as never,
    updatedAt: null as never,
    updatedBy: 'uid',
    ...overrides,
  };
}

describe('<ClassResourcesCard>', () => {
  it('Barbare L1 : libellé « Rage » + badge « Repos long » + ratio 2/2 par défaut', () => {
    render(<ClassResourcesCard character={buildCharacter()} />);
    expect(screen.getByText('Réserves de classe')).toBeInTheDocument();
    expect(screen.getByText('Rage')).toBeInTheDocument();
    expect(screen.getByText('Repos long')).toBeInTheDocument();
    // Réserve jamais touchée → pleine.
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('/ 2')).toBeInTheDocument();
  });

  it('Guerrier L2 : Second souffle (court) + Fougue (court)', () => {
    render(<ClassResourcesCard character={buildCharacter({ classes: [classEntry('fighter', 2)] })} />);
    expect(screen.getByText('Second souffle')).toBeInTheDocument();
    expect(screen.getByText('Fougue')).toBeInTheDocument();
  });

  it('ne rend rien si le personnage n\'a aucune réserve consommable (Roublard L1)', () => {
    const { container } = render(
      <ClassResourcesCard character={buildCharacter({ classes: [classEntry('rogue', 1)] })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('« Dépenser » écrit current-1 avec la bonne clé de stockage', async () => {
    const user = userEvent.setup();
    render(<ClassResourcesCard character={buildCharacter()} />);
    await user.click(screen.getByRole('button', { name: 'Dépenser un point de Rage' }));
    expect(updateCharacterMock).toHaveBeenCalledWith({
      classResources: { 'barbarian:rage': { current: 1, max: 2, restoresOn: 'long' } },
    });
  });

  it('« Dépenser » désactivé à 0, « Récupérer » désactivé au max', () => {
    render(
      <ClassResourcesCard
        character={buildCharacter({
          classResources: { 'barbarian:rage': { current: 0, max: 2, restoresOn: 'long' } },
        })}
      />,
    );
    expect(screen.getByRole('button', { name: 'Dépenser un point de Rage' })).toBeDisabled();
    // À 0 on peut récupérer.
    expect(screen.getByRole('button', { name: 'Récupérer un point de Rage' })).toBeEnabled();
  });

  it('« Récupérer » écrit current+1 (corrige une dépense)', async () => {
    const user = userEvent.setup();
    render(
      <ClassResourcesCard
        character={buildCharacter({
          classResources: { 'barbarian:rage': { current: 0, max: 2, restoresOn: 'long' } },
        })}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Récupérer un point de Rage' }));
    expect(updateCharacterMock).toHaveBeenCalledWith({
      classResources: { 'barbarian:rage': { current: 1, max: 2, restoresOn: 'long' } },
    });
  });

  it('lecture seule : aucun bouton', () => {
    render(<ClassResourcesCard readOnly character={buildCharacter()} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('aucun anglicisme dans les libellés rendus', () => {
    const { container } = render(<ClassResourcesCard character={buildCharacter()} />);
    expectNoForbiddenEnglish(container.textContent ?? '', 'class-resources-card');
  });

  /**
   * M24 — le maximum était RÉIMPOSÉ à chaque écriture depuis la progression de
   * classe : « le pacte lui donne une Rage de plus » disparaissait à la première
   * dépense.
   */
  describe('maximum éditable', () => {
    it('écrit le maximum saisi', async () => {
      const user = userEvent.setup();
      render(<ClassResourcesCard character={barbarian3()} />);
      await user.click(screen.getByTestId('resource-max-barbarian:rage'));
      const input = screen.getByTestId('resource-max-input-barbarian:rage');
      await user.clear(input);
      await user.type(input, '4');
      await user.tab();
      expect(updateCharacterMock).toHaveBeenCalledWith({
        classResources: expect.objectContaining({
          'barbarian:rage': expect.objectContaining({ max: 4 }),
        }),
      });
    });

    it('rabat la valeur courante si on baisse le plafond sous elle', async () => {
      const user = userEvent.setup();
      render(<ClassResourcesCard character={barbarian3()} />);
      await user.click(screen.getByTestId('resource-max-barbarian:rage'));
      const input = screen.getByTestId('resource-max-input-barbarian:rage');
      await user.clear(input);
      await user.type(input, '1');
      await user.tab();
      expect(updateCharacterMock).toHaveBeenCalledWith({
        classResources: expect.objectContaining({
          'barbarian:rage': expect.objectContaining({ current: 1, max: 1 }),
        }),
      });
    });

    it('conserve le maximum accordé quand on dépense ensuite', async () => {
      // Le cœur du mur : `− ` réécrivait `max: <dérivé>` et effaçait l'accordé.
      const user = userEvent.setup();
      render(
        <ClassResourcesCard
          character={barbarian3({
            'barbarian:rage': { current: 4, max: 4, restoresOn: 'long' },
          })}
        />,
      );
      await user.click(
        screen.getByRole('button', { name: /Dépenser|Utiliser/i }),
      );
      expect(updateCharacterMock).toHaveBeenCalledWith({
        classResources: expect.objectContaining({
          'barbarian:rage': expect.objectContaining({ current: 3, max: 4 }),
        }),
      });
    });
  });
});
