import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Membership } from '@/shared/types/campaign';
import type { Character } from '@/shared/types/character';

// ─────────────────────────────────────────────────────────────────────
// Mocks — on isole le panneau de Firestore : `useCharacter` (lecture live
// cross-owner) et `useInventoryDerived` (CA dérivée) sont stubés par holder
// contrôlable. La résolution de contenu (classes / conditions) suit le même
// stub que `dm-dashboard-screen.test`.
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

// CA dérivée stubée : on contrôle `acFromArmor` pour prouver que la carte
// affiche la VRAIE CA (armure) et non la valeur désarmée `character.ac`.
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

import { CampaignPartyPanel } from '../campaign-party-panel';

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

function mkMembership(overrides: Partial<Membership> = {}): Membership {
  return {
    userId: 'player-uid',
    role: 'member',
    characterId: 'char-aelys',
    joinedAt: null,
    schemaVersion: 1,
    ...overrides,
  };
}

function renderPanel(members: Membership[]): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <CampaignPartyPanel campaignId="camp-1" members={members} />
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

describe('<CampaignPartyPanel>', () => {
  it('empty state quand aucun membre n’a lié de personnage', () => {
    renderPanel([
      mkMembership({ userId: 'p1', characterId: null }),
      mkMembership({ userId: 'gm-1', role: 'gm', characterId: null }),
    ]);
    expect(
      screen.getByText('Aucun joueur n’a encore lié de personnage.'),
    ).toBeInTheDocument();
    // Aucune souscription de fiche déclenchée pour des membres non liés.
    expect(useCharacterCalls).toHaveLength(0);
  });

  it('ne rend une carte QUE pour les membres avec une fiche liée', () => {
    charByKey.set('char-aelys', {
      character: mkCharacter(),
      isLoading: false,
      error: null,
    });
    renderPanel([
      mkMembership({ userId: 'player-uid', characterId: 'char-aelys' }),
      mkMembership({ userId: 'p2', characterId: null }),
    ]);
    // 1 seule carte (p2 sans fiche est filtré, pas même de souscription).
    expect(screen.getByText('Aëlys')).toBeInTheDocument();
    expect(useCharacterCalls).toHaveLength(1);
    expect(useCharacterCalls[0]).toEqual({
      characterId: 'char-aelys',
      ownerUid: 'player-uid',
    });
  });

  it('identité du contenu : classe + niveau + état affichés exactement', () => {
    charByKey.set('char-aelys', {
      character: mkCharacter({ conditions: ['poisoned'] }),
      isLoading: false,
      error: null,
    });
    renderPanel([mkMembership()]);
    expect(screen.getByText('Aëlys')).toBeInTheDocument();
    expect(screen.getByText('Magicien · Niveau 5')).toBeInTheDocument();
    expect(screen.getByText('Empoisonné')).toBeInTheDocument();
  });

  it('affiche la VRAIE CA dérivée (armure), pas la valeur désarmée character.ac', () => {
    // character.ac = 12 (désarmé) mais armure de plates équipée → acFromArmor 18.
    derivedHolder.acFromArmor = 18;
    charByKey.set('char-aelys', {
      character: mkCharacter({ ac: 12 }),
      isLoading: false,
      error: null,
    });
    renderPanel([mkMembership()]);
    expect(screen.getByText('18')).toBeInTheDocument();
    // La valeur de base ne doit PAS s'afficher comme CA (c'était le bug).
    expect(screen.queryByText('12')).not.toBeInTheDocument();
  });

  it('tap sur une carte ouvre la lecture MJ cross-owner, pas /character/:id', () => {
    charByKey.set('char-aelys', {
      character: mkCharacter({ name: 'Aëlys' }),
      isLoading: false,
      error: null,
    });
    renderPanel([mkMembership({ userId: 'player-uid' })]);
    fireEvent.click(screen.getByRole('button', { name: /Ouvrir la fiche de Aëlys/i }));
    expect(navigateMock).toHaveBeenCalledWith(
      '/campaigns/camp-1/members/player-uid/sheet',
    );
  });

  it('placeholder de chargement tant que la fiche n’est pas résolue', () => {
    charByKey.set('char-aelys', {
      character: null,
      isLoading: true,
      error: null,
    });
    renderPanel([mkMembership()]);
    expect(screen.getByText('Chargement…')).toBeInTheDocument();
  });

  it('placeholder d’erreur quand la fiche est indisponible (permission / parse)', () => {
    charByKey.set('char-aelys', {
      character: null,
      isLoading: false,
      error: new Error('permission-denied'),
    });
    renderPanel([mkMembership()]);
    expect(screen.getByText('Fiche indisponible')).toBeInTheDocument();
  });

  it('placeholder « introuvable » quand le doc fiche n’existe pas', () => {
    charByKey.set('char-aelys', {
      character: null,
      isLoading: false,
      error: null,
    });
    renderPanel([mkMembership()]);
    expect(screen.getByText('Personnage introuvable')).toBeInTheDocument();
  });

  it('reflète l’état courant de la fiche (live) — un état ajouté apparaît au re-render', () => {
    charByKey.set('char-aelys', {
      character: mkCharacter({ conditions: [] }),
      isLoading: false,
      error: null,
    });
    const { rerender } = renderPanel([mkMembership()]);
    expect(screen.queryByText('Effrayé')).not.toBeInTheDocument();

    // Le joueur applique « effrayé » sur sa fiche → onSnapshot pousse la maj.
    charByKey.set('char-aelys', {
      character: mkCharacter({ conditions: ['frightened'] }),
      isLoading: false,
      error: null,
    });
    rerender(
      <MemoryRouter>
        <CampaignPartyPanel campaignId="camp-1" members={[mkMembership()]} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Effrayé')).toBeInTheDocument();
  });
});
