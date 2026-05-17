import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';

// react-router : on remplace useNavigate par un mock pour assert sur les redirections.
const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

// useCharactersList : data driver injectée via mutable holder pour pivoter par test.
const stateHolder: {
  characters: Character[];
  isLoading: boolean;
  error: Error | null;
} = { characters: [], isLoading: false, error: null };

vi.mock('@/features/library/use-characters-list', () => ({
  useCharactersList: () => stateHolder,
}));

// useContent : on retourne des bundles minimaux pour que CharacterCard puisse
// résoudre classes/ancestries sans charger le vrai content.
vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => ({
    data:
      type === 'classes'
        ? [{ id: 'wizard', name: { fr: 'Magicien', en: 'Wizard' } }]
        : type === 'ancestries'
          ? [{ id: 'human', name: { fr: 'Humain', en: 'Human' } }]
          : [],
    loading: false,
    error: null,
  }),
}));

// Firebase : aucun appel direct depuis LibraryScreen (le hook est mocké), mais
// les imports en cascade peuvent toucher getDb. Stub safe.
vi.mock('@/shared/lib/firebase', () => ({
  getDb: () => ({}),
}));

import { LibraryScreen } from '../library-screen';

function mkCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'c-1',
    name: 'Aëlys',
    status: 'alive',
    classes: [
      {
        classId: 'wizard',
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
    primaryClassId: 'wizard',
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
    alignment: 'NB',
    abilities: { for: 10, dex: 12, con: 12, int: 16, sag: 10, cha: 10 },
    saves: { for: false, dex: false, con: false, int: true, sag: true, cha: false },
    skills: {},
    hp: { current: 22, max: 30, temp: 0 },
    ac: 12,
    speed: 9,
    initiative: 1,
    hitDice: [{ classId: 'wizard', current: 5, max: 5, die: 'd6' }],
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
    portrait: { type: 'letter', value: 'A' },
    schemaVersion: 2,
    createdAt: null,
    updatedAt: null,
    updatedBy: 'uid-1',
    ...overrides,
  };
}

afterEach(() => {
  navigateMock.mockClear();
  stateHolder.characters = [];
  stateHolder.isLoading = false;
  stateHolder.error = null;
});

function renderLibrary(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <LibraryScreen />
    </MemoryRouter>,
  );
}

describe('<LibraryScreen>', () => {
  it("rend l'empty state quand l'utilisateur n'a aucun personnage", () => {
    stateHolder.characters = [];
    renderLibrary();
    expect(screen.getByText(/Aucun héros/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Créer un personnage/i }).length).toBeGreaterThan(0);
  });

  it('tap sur le CTA Créer depuis empty state navigue vers /create', () => {
    stateHolder.characters = [];
    renderLibrary();
    fireEvent.click(screen.getByRole('button', { name: /Créer un personnage/i }));
    expect(navigateMock).toHaveBeenCalledWith('/create');
  });

  it('rend une card par personnage dans la grille', () => {
    stateHolder.characters = [
      mkCharacter({ id: 'c-1', name: 'Aëlys' }),
      mkCharacter({ id: 'c-2', name: 'Bren' }),
      mkCharacter({ id: 'c-3', name: 'Cyrus' }),
    ];
    renderLibrary();
    expect(screen.getByText('Aëlys')).toBeInTheDocument();
    expect(screen.getByText('Bren')).toBeInTheDocument();
    expect(screen.getByText('Cyrus')).toBeInTheDocument();
  });

  it('tap sur une card navigue vers /character/{id}', () => {
    stateHolder.characters = [mkCharacter({ id: 'c-42', name: 'Aëlys' })];
    renderLibrary();
    fireEvent.click(screen.getByRole('button', { name: /Ouvrir la fiche de Aëlys/i }));
    expect(navigateMock).toHaveBeenCalledWith('/character/c-42');
  });

  it("statut dead affiche le label 'Mort.e'", () => {
    stateHolder.characters = [mkCharacter({ id: 'c-d', name: 'Defunct', status: 'dead' })];
    renderLibrary();
    expect(screen.getByText(/Mort\.e/i)).toBeInTheDocument();
  });

  it("statut alive affiche le label 'En vie'", () => {
    stateHolder.characters = [mkCharacter({ id: 'c-a', name: 'Living', status: 'alive' })];
    renderLibrary();
    expect(screen.getByText(/En vie/i)).toBeInTheDocument();
  });

  it("état d'erreur rend le glass panel d'erreur + bouton Réessayer", () => {
    stateHolder.error = new Error('Firestore unreachable');
    renderLibrary();
    expect(screen.getByText(/Lecture impossible/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Réessayer/i })).toBeInTheDocument();
  });

  it('CTA Créer est aussi disponible quand la liste contient des persos', () => {
    stateHolder.characters = [mkCharacter({ id: 'c-1', name: 'Aëlys' })];
    renderLibrary();
    const ctas = screen.getAllByRole('button', { name: /Créer un personnage/i });
    expect(ctas.length).toBeGreaterThan(0);
    fireEvent.click(ctas[0]!);
    expect(navigateMock).toHaveBeenCalledWith('/create');
  });
});
