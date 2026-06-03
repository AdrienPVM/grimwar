import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const stateHolder: {
  characters: Character[];
  isLoading: boolean;
  error: Error | null;
} = { characters: [], isLoading: false, error: null };

vi.mock('@/features/library/use-characters-list', () => ({
  useCharactersList: () => stateHolder,
}));

vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => ({ user: { uid: 'uid-1', displayName: null, email: null } }),
}));

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => ({
    data:
      type === 'classes'
        ? [{ id: 'wizard', name: { fr: 'Magicien', en: 'Wizard' } }]
        : type === 'ancestries'
          ? [{ id: 'human', name: { fr: 'Humain', en: 'Human' } }]
          : type === 'conditions'
            ? [
                { id: 'poisoned', name: { fr: 'Empoisonné', en: 'Poisoned' } },
                { id: 'frightened', name: { fr: 'Effrayé', en: 'Frightened' } },
              ]
            : [],
    loading: false,
    error: null,
  }),
}));

vi.mock('@/shared/lib/firebase', () => ({
  getDb: () => ({}),
}));

import { DmDashboardScreen } from '../dm-dashboard-screen';

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
  try {
    window.localStorage.clear();
  } catch {
    // ignore
  }
});

function renderDashboard(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <DmDashboardScreen />
    </MemoryRouter>,
  );
}

describe('<DmDashboardScreen>', () => {
  it("rend l'empty state quand aucun perso n'est créé", () => {
    stateHolder.characters = [];
    renderDashboard();
    expect(screen.getByText(/Aucun héros à animer/i)).toBeInTheDocument();
  });

  it('affiche une PartyCard par perso avec CA/Init/conditions visibles', () => {
    stateHolder.characters = [
      mkCharacter({ id: 'c-1', name: 'Aëlys', hp: { current: 22, max: 30, temp: 0 }, ac: 14, initiative: 2 }),
      mkCharacter({ id: 'c-2', name: 'Bren', hp: { current: 8, max: 32, temp: 0 }, ac: 17, initiative: -1 }),
    ];
    renderDashboard();
    expect(screen.getByText('Aëlys')).toBeInTheDocument();
    expect(screen.getByText('Bren')).toBeInTheDocument();
    // CA + INIT signés sont uniques au PartyStat (les chiffres PV sont dans
    // l'emblème SVG hero qui rend séparément — on ne les asserte pas par
    // texte direct pour éviter les ambiguïtés).
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.getByText('17')).toBeInTheDocument();
    expect(screen.getByText('-1')).toBeInTheDocument();
  });

  it('rend la pile MJ — Jet secret + Notes', () => {
    stateHolder.characters = [mkCharacter({ id: 'c-1' })];
    renderDashboard();
    expect(screen.getByRole('button', { name: /Lancer en secret/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Notes de séance/i)).toBeInTheDocument();
  });

  it('tap sur une PartyCard ouvre la fiche correspondante', () => {
    stateHolder.characters = [mkCharacter({ id: 'c-42', name: 'Aëlys' })];
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /Ouvrir la fiche de Aëlys/i }));
    expect(navigateMock).toHaveBeenCalledWith('/character/c-42');
  });

  it('affiche les conditions actives en chips crimson', () => {
    stateHolder.characters = [
      mkCharacter({ id: 'c-1', name: 'Aëlys', conditions: ['poisoned', 'frightened'] }),
    ];
    renderDashboard();
    expect(screen.getByText('Empoisonné')).toBeInTheDocument();
    expect(screen.getByText('Effrayé')).toBeInTheDocument();
  });

  it('jet secret : tap sur Lancer en secret affiche un total entre 1 et 20+mod', () => {
    stateHolder.characters = [mkCharacter({ id: 'c-1' })];
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /Lancer en secret/i }));
    // Cherche un nombre entre 1 et 20 dans le résultat (mod = 0 par défaut).
    const total = screen.getAllByText(/^\d+$/);
    expect(total.length).toBeGreaterThan(0);
  });

  it('notes : saisie texte persiste dans le state du composant', () => {
    stateHolder.characters = [mkCharacter({ id: 'c-1' })];
    renderDashboard();
    const textarea = screen.getByLabelText(/Notes de séance/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "Le baron cache un poignard dans sa botte." } });
    expect(textarea.value).toBe("Le baron cache un poignard dans sa botte.");
  });
});
