import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { candidatePreparableSpells } from '@/shared/lib/rules/spell-preparation';
import type { Character } from '@/shared/types/character';
import type { Spell } from '@/shared/types/content';

import { PreparationEditor } from '../preparation-editor';
import { expectNoForbiddenEnglish } from '../../../../../../tests/helpers/i18n-guard';

import classesBundle from '../../../../../../public/data/classes.json';
import spellsBundle from '../../../../../../public/data/spells.json';

/**
 * Éditeur de préparation — Cat. 4 (plafond chiffré : Clerc L1 = 4) + Cat. 5
 * (le toggle écrit `preparedSpells.cleric`) + cas-limite plafond. Bundles SRD
 * réels injectés (classes pour le plafond, spells pour le pool de candidats).
 */

const spells = spellsBundle as unknown as Spell[];
const clericCandidatesL1 = candidatePreparableSpells(spells, 'cleric', 1);

const { updateCharacterMock } = vi.hoisted(() => ({
  updateCharacterMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) =>
    type === 'classes'
      ? { data: classesBundle, isLoading: false, error: null }
      : type === 'spells'
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

function buildCleric(prepared: string[]): Character {
  return {
    id: 'cl',
    name: 'Cler',
    status: 'alive',
    classes: [
      {
        classId: 'cleric',
        subclassId: null,
        level: 1,
        clericDivineOrder: 'protector',
        druidPrimalOrder: null,
        fighterFightingStyle: null,
        weaponMasteries: [],
        expertiseSkills: [],
        eldritchInvocations: [],
        wizardSpellbookL1: [],
      },
    ],
    totalLevel: 1,
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
    hp: { current: 9, max: 9, temp: 0 },
    ac: 13,
    speed: 30,
    initiative: 1,
    hitDice: [],
    deathSaves: { success: 0, fail: 0 },
    conditions: [],
    inspiration: false,
    exhaustion: 0,
    currentConcentration: null,
    classResources: {},
    spellSlots: {},
    preparedSpells: { cleric: prepared },
    knownSpells: {},
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

function renderEditor(character: Character, props?: { readOnly?: boolean; classLevel?: number }) {
  return render(
    <PreparationEditor
      character={character}
      classId="cleric"
      className="Clerc"
      classLevel={props?.classLevel ?? 1}
      readOnly={props?.readOnly}
    />,
  );
}

describe('<PreparationEditor>', () => {
  it('affiche le titre de classe et le compteur « 0 / 4 préparés » (plafond Clerc L1)', () => {
    renderEditor(buildCleric([]));
    expect(screen.getByText('Préparation · Clerc')).toBeInTheDocument();
    expect(screen.getByText('0 / 4 préparés')).toBeInTheDocument();
  });

  it('toggle d’un candidat → écrit preparedSpells.cleric', async () => {
    const user = userEvent.setup();
    renderEditor(buildCleric([]));
    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    const first = clericCandidatesL1[0]!;
    await user.click(screen.getByRole('button', { name: new RegExp(first.name.fr) }));
    expect(updateCharacterMock).toHaveBeenCalledWith({
      preparedSpells: { cleric: [first.id] },
    });
  });

  it('au plafond (4/4) : le dépassement est permis et signalé, pas refusé (M26)', async () => {
    const user = userEvent.setup();
    const fourIds = clericCandidatesL1.slice(0, 4).map((s) => s.id);
    renderEditor(buildCleric(fourIds));
    expect(screen.getByText('4 / 4 préparés')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    const fifth = clericCandidatesL1[4]!;
    const fifthRow = screen.getByRole('button', { name: new RegExp(fifth.name.fr) });
    expect(fifthRow).toBeEnabled();
    await user.click(fifthRow);
    expect(updateCharacterMock).toHaveBeenCalledWith({
      preparedSpells: { cleric: [...fourIds, fifth.id] },
    });
  });

  it('au-delà du plafond : un avertissement est rendu', () => {
    const fiveIds = clericCandidatesL1.slice(0, 5).map((s) => s.id);
    renderEditor(buildCleric(fiveIds));
    expect(screen.getByText('5 / 4 préparés')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/dépasses le plafond de 4/);
  });

  it('retrait possible même au plafond', async () => {
    const user = userEvent.setup();
    const fourIds = clericCandidatesL1.slice(0, 4).map((s) => s.id);
    renderEditor(buildCleric(fourIds));
    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    const first = clericCandidatesL1[0]!;
    await user.click(screen.getByRole('button', { name: new RegExp(first.name.fr) }));
    expect(updateCharacterMock).toHaveBeenCalledWith({
      preparedSpells: { cleric: fourIds.slice(1) },
    });
  });

  it('un sort appris HORS liste de classe devient préparable (M26)', async () => {
    const user = userEvent.setup();
    // « Armure du mage » est un sort d'Ensorceleur/Magicien : un Clerc ne
    // pouvait pas le préparer, même une fois recopié d'un parchemin. Il était
    // ajouté, visible, et mort.
    const cleric = buildCleric([]);
    renderEditor({ ...cleric, knownSpells: { cleric: ['armure-du-mage'] } });

    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    const row = screen.getByRole('button', { name: /Armure du mage/ });
    await user.click(row);

    expect(updateCharacterMock).toHaveBeenCalledWith({
      preparedSpells: { cleric: ['armure-du-mage'] },
    });
  });

  it('lecture seule : pas de bouton « Modifier », lignes désactivées', () => {
    renderEditor(buildCleric([]), { readOnly: true });
    expect(screen.queryByRole('button', { name: 'Modifier' })).not.toBeInTheDocument();
    const first = clericCandidatesL1[0]!;
    expect(screen.getByRole('button', { name: new RegExp(first.name.fr) })).toBeDisabled();
  });

  it('ne rend rien quand rien n’est préparable (plafond 0)', () => {
    const { container } = renderEditor(buildCleric([]), { classLevel: 0 });
    expect(container).toBeEmptyDOMElement();
  });

  it('aucun anglicisme dans les libellés', () => {
    const { container } = renderEditor(buildCleric([]));
    expectNoForbiddenEnglish(container.textContent ?? '', 'preparation-editor');
  });
});
