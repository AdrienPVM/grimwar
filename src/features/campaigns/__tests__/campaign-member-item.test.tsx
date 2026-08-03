import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';

import type { RosterEntry } from '../roster';

// ─────────────────────────────────────────────────────────────────────
// Mocks — la carte live abonne `useCharacter` (lecture cross-owner A2) et
// `useInventoryDerived` (CA dérivée). On les stube par holder contrôlable, comme
// l'ancien test du panneau compagnie (dont ce fichier hérite les invariants).
// ─────────────────────────────────────────────────────────────────────

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

interface CharState {
  character: Character | null;
  isLoading: boolean;
  error: Error | null;
}
const charByKey = new Map<string, CharState>();
const useCharacterCalls: Array<{ characterId?: string; ownerUid?: string }> = [];
vi.mock('@/features/sheet/use-character', () => ({
  useCharacter: (characterId?: string, ownerUid?: string): CharState => {
    useCharacterCalls.push({ characterId, ownerUid });
    return (
      (characterId ? charByKey.get(characterId) : undefined) ?? {
        character: null,
        isLoading: false,
        error: null,
      }
    );
  },
}));

const derivedHolder = {
  acFromArmor: null as number | null,
  hasEquippedBodyArmor: false,
  magicItemsAcBonus: 0,
};
vi.mock('@/features/sheet/modes/avoir/use-inventory-derived', () => ({
  useInventoryDerived: () => ({
    resolvedItems: [],
    weightTotal: 0,
    carryingCapacity: 0,
    encumbranceLevel: 'unburdened',
    acFromArmor: derivedHolder.acFromArmor,
    hasEquippedBodyArmor: derivedHolder.hasEquippedBodyArmor,
    attunedCount: 0,
    activeMagicEffects: [],
    magicItemsAcBonus: derivedHolder.magicItemsAcBonus,
    loading: false,
    refreshUserItems: async () => {},
  }),
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

vi.mock('@/shared/lib/firebase', () => ({ getDb: () => ({}) }));

import { CampaignMemberItem } from '../campaign-member-item';

function mkCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'char-aelys',
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
    updatedBy: 'player-uid',
    ...overrides,
  };
}

function mkEntry(overrides: Partial<RosterEntry> = {}): RosterEntry {
  return {
    uid: 'player-uid',
    label: 'player-u…',
    hasName: false,
    role: 'member',
    isSelf: false,
    characterId: 'char-aelys',
    ...overrides,
  };
}

function renderItem(
  entry: RosterEntry,
  opts: { viewerIsGm?: boolean; onPromote?: () => void; onViewSheet?: () => void } = {},
): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <CampaignMemberItem
        entry={entry}
        viewerIsGm={opts.viewerIsGm ?? true}
        onPromote={opts.onPromote ?? vi.fn()}
        onViewSheet={opts.onViewSheet ?? vi.fn()}
      />
    </MemoryRouter>,
  );
}

afterEach(() => {
  navigateMock.mockClear();
  charByKey.clear();
  useCharacterCalls.length = 0;
  derivedHolder.acFromArmor = null;
  derivedHolder.hasEquippedBodyArmor = false;
  derivedHolder.magicItemsAcBonus = 0;
});

// ─────────────────────────────────────────────────────────────────────
// Carte LIVE — MJ + joueur avec fiche liée (hérite les invariants 4A.4)
// ─────────────────────────────────────────────────────────────────────

describe('<CampaignMemberItem> — carte live (MJ + joueur lié)', () => {
  it('abonne la fiche du joueur en cross-owner (characterId + ownerUid)', () => {
    charByKey.set('char-aelys', { character: mkCharacter(), isLoading: false, error: null });
    renderItem(mkEntry({ uid: 'player-uid', characterId: 'char-aelys' }));
    expect(useCharacterCalls).toHaveLength(1);
    expect(useCharacterCalls[0]).toEqual({
      characterId: 'char-aelys',
      ownerUid: 'player-uid',
    });
  });

  it('identité du contenu : nom + classe·niveau + état affichés exactement', () => {
    charByKey.set('char-aelys', {
      character: mkCharacter({ conditions: ['poisoned'] }),
      isLoading: false,
      error: null,
    });
    renderItem(mkEntry());
    expect(screen.getByText('Aëlys')).toBeInTheDocument();
    expect(screen.getByText('Magicien · Niveau 5')).toBeInTheDocument();
    expect(screen.getByText('Empoisonné')).toBeInTheDocument();
  });

  it('affiche la VRAIE CA dérivée (armure), pas la valeur désarmée character.ac', () => {
    derivedHolder.acFromArmor = 18;
    charByKey.set('char-aelys', {
      character: mkCharacter({ ac: 12 }),
      isLoading: false,
      error: null,
    });
    renderItem(mkEntry());
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.queryByText('12')).not.toBeInTheDocument();
  });

  it('tap sur la carte ouvre la fiche via onViewSheet (route cross-owner injectée)', () => {
    const onViewSheet = vi.fn();
    charByKey.set('char-aelys', {
      character: mkCharacter({ name: 'Aëlys' }),
      isLoading: false,
      error: null,
    });
    renderItem(mkEntry(), { onViewSheet });
    fireEvent.click(screen.getByRole('button', { name: /Ouvrir la fiche de Aëlys/i }));
    expect(onViewSheet).toHaveBeenCalledTimes(1);
  });

  it('affiche « Promouvoir » sous la carte d’un joueur lié et le clic appelle onPromote', () => {
    const onPromote = vi.fn();
    charByKey.set('char-aelys', { character: mkCharacter(), isLoading: false, error: null });
    renderItem(mkEntry(), { onPromote });
    fireEvent.click(screen.getByRole('button', { name: /Promouvoir meneur/i }));
    expect(onPromote).toHaveBeenCalledTimes(1);
  });

  it('placeholder de chargement tant que la fiche n’est pas résolue', () => {
    charByKey.set('char-aelys', { character: null, isLoading: true, error: null });
    renderItem(mkEntry());
    expect(screen.getByText('Chargement…')).toBeInTheDocument();
  });

  it('placeholder d’erreur quand la fiche est indisponible (permission / parse)', () => {
    charByKey.set('char-aelys', {
      character: null,
      isLoading: false,
      error: new Error('permission-denied'),
    });
    renderItem(mkEntry());
    expect(screen.getByText('Fiche indisponible')).toBeInTheDocument();
  });

  it('placeholder « introuvable » quand le doc fiche n’existe pas', () => {
    charByKey.set('char-aelys', { character: null, isLoading: false, error: null });
    renderItem(mkEntry());
    expect(screen.getByText('Personnage introuvable')).toBeInTheDocument();
  });

  it('reflète l’état courant de la fiche (live) — un état ajouté apparaît au re-render', () => {
    charByKey.set('char-aelys', {
      character: mkCharacter({ conditions: [] }),
      isLoading: false,
      error: null,
    });
    const { rerender } = renderItem(mkEntry());
    expect(screen.queryByText('Effrayé')).not.toBeInTheDocument();

    charByKey.set('char-aelys', {
      character: mkCharacter({ conditions: ['frightened'] }),
      isLoading: false,
      error: null,
    });
    rerender(
      <MemoryRouter>
        <CampaignMemberItem
          entry={mkEntry()}
          viewerIsGm
          onPromote={vi.fn()}
          onViewSheet={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Effrayé')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────
// Ligne compacte — pas de fiche live (gating cross-owner A2)
// ─────────────────────────────────────────────────────────────────────

describe('<CampaignMemberItem> — ligne compacte', () => {
  it('joueur SANS fiche liée → ligne compacte, aucune souscription de fiche', () => {
    renderItem(mkEntry({ characterId: null, label: 'player-u…' }));
    expect(screen.getByText('player-u…')).toBeInTheDocument();
    // Aucune carte live → aucun abonnement Firestore déclenché.
    expect(useCharacterCalls).toHaveLength(0);
  });

  it('entrée MJ → chip rôle MJ, jamais de bouton Promouvoir (le MJ ne se promeut pas)', () => {
    renderItem(mkEntry({ role: 'gm', characterId: null, label: 'gm-uid…' }));
    expect(screen.getByText('Meneur')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Promouvoir meneur/i }),
    ).not.toBeInTheDocument();
  });

  it('spectateur NON-MJ → ligne compacte même pour un joueur lié (gating cross-owner)', () => {
    // Un joueur lambda ne peut pas lire la fiche d'un autre (rule A2 = MJ only) :
    // l'item ne doit PAS rendre de carte live ni s'abonner à la fiche.
    charByKey.set('char-aelys', { character: mkCharacter(), isLoading: false, error: null });
    renderItem(mkEntry({ characterId: 'char-aelys', label: 'player-u…' }), {
      viewerIsGm: false,
    });
    expect(screen.getByText('player-u…')).toBeInTheDocument();
    expect(useCharacterCalls).toHaveLength(0);
    expect(screen.queryByText('Aëlys')).not.toBeInTheDocument();
    // Pas d'affordance d'autorité pour un non-MJ.
    expect(
      screen.queryByRole('button', { name: /Promouvoir meneur/i }),
    ).not.toBeInTheDocument();
  });

  it('joueur non lié + MJ → bouton Promouvoir présent et clic appelle onPromote', () => {
    const onPromote = vi.fn();
    renderItem(mkEntry({ characterId: null }), { onPromote });
    fireEvent.click(screen.getByRole('button', { name: /Promouvoir meneur/i }));
    expect(onPromote).toHaveBeenCalledTimes(1);
  });

  it('marqueur (toi) sur l’entrée du spectateur', () => {
    renderItem(mkEntry({ characterId: null, isSelf: true }));
    expect(screen.getByText('(toi)')).toBeInTheDocument();
  });
});
