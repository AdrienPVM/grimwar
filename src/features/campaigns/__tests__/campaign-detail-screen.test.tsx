import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Campaign, Membership } from '@/shared/types/campaign';

// ─────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────

const authHolder: { user: { uid: string } | null } = { user: { uid: 'uid-1' } };
vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => authHolder,
}));

const stateHolder: {
  campaign: Campaign | null;
  members: Membership[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
} = {
  campaign: null,
  members: [],
  isLoading: false,
  error: null,
  refresh: vi.fn(),
};
vi.mock('../use-campaign', () => ({
  useCampaign: () => stateHolder,
}));

// La notification de handouts ouvre un listener Firestore (`onSnapshot`) —
// hors périmètre de ce test d'écran, couverte par son propre test unitaire.
vi.mock('../use-handout-notifications', () => ({
  useHandoutNotifications: () => undefined,
}));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const leaveCampaignMock = vi.fn();
const promoteToGmMock = vi.fn();
const linkCharacterMock = vi.fn();
vi.mock('@/shared/lib/services/campaigns', () => {
  class FakeError extends Error {
    readonly kind: string;
    constructor(kind: string, message?: string) {
      super(message ?? kind);
      this.name = 'CampaignServiceError';
      this.kind = kind;
    }
  }
  return {
    leaveCampaign: (cid: string, uid: string) => leaveCampaignMock(cid, uid),
    promoteToGm: (cid: string, target: string) => promoteToGmMock(cid, target),
    linkCharacterToMembership: (cid: string, uid: string, charId: string | null) =>
      linkCharacterMock(cid, uid, charId),
    CampaignServiceError: FakeError,
  };
});

// La section « Mon personnage » (MyCharacterLink) abonne useCharactersList ;
// on le stube pour qu'il ne touche pas Firestore dans le test d'écran.
const charactersHolder: {
  characters: { id: string; name: string; totalLevel: number }[];
  isLoading: boolean;
} = { characters: [], isLoading: false };
vi.mock('@/features/library/use-characters-list', () => ({
  useCharactersList: () => ({ ...charactersHolder, error: null }),
}));

vi.mock('@/shared/lib/firebase', () => ({
  getDb: () => ({}),
}));

// Le feed d'activité (JALON 22.3) abonne `useCampaignEvents` (onSnapshot
// Firestore) ; on le stube pour le test d'écran — la couverture de la query/du
// rendu vit dans use-campaign-events.test.tsx + campaign-event-feed.test.tsx.
const eventsHolder: {
  events: { id: string; kind: string; visibility: string; payload: Record<string, unknown>; actorUserId: string; actorCharacterId: string | null; targetCharacterId: string | null; createdAt: unknown }[];
  isLoading: boolean;
  error: Error | null;
} = { events: [], isLoading: false, error: null };
vi.mock('../use-campaign-events', () => ({
  CAMPAIGN_EVENTS_LIMIT: 20,
  useCampaignEvents: () => eventsHolder,
}));

// La carte live d'un membre lié (`CampaignMemberItem` → `PartyMemberCard`) abonne
// `useCharacter` (onSnapshot) ; on stube la carte pour le test d'écran — sa
// couverture (rendu live, CA dérivée, navigation cross-owner, gating) vit dans
// campaign-member-item.test.tsx. Le stub expose `onOpen` via un bouton « Ouvrir
// la fiche » pour vérifier le câblage de navigation côté écran.
vi.mock('../party-member-card', () => ({
  PartyMemberCard: ({ onOpen }: { onOpen: () => void }) => (
    <button type="button" onClick={onOpen}>
      Ouvrir la fiche
    </button>
  ),
}));

import { CampaignDetailScreen, buildRoster } from '../campaign-detail-screen';

// ─────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────

function mkCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'c-1',
    name: 'Tempête sur Caer Dûn',
    description: 'Une cité brumeuse au bord d’un fjord glacé.',
    gmIds: ['uid-1'],
    createdBy: 'uid-1',
    inviteCode: 'ABC234',
    settings: {
      language: 'fr',
      diceMode: 'digital',
      variants: {
        featAtLevel1: false,
        flanking: false,
        slowHealing: false,
        grittyRealism: false,
      },
    },
    status: 'active',
    schemaVersion: 1,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

function mkMember(overrides: Partial<Membership> = {}): Membership {
  return {
    userId: 'uid-2',
    role: 'member',
    characterId: null,
    joinedAt: null,
    schemaVersion: 1,
    ...overrides,
  };
}

afterEach(() => {
  stateHolder.campaign = null;
  stateHolder.members = [];
  stateHolder.isLoading = false;
  stateHolder.error = null;
  stateHolder.refresh = vi.fn();
  authHolder.user = { uid: 'uid-1' };
  navigateMock.mockReset();
  leaveCampaignMock.mockReset();
  promoteToGmMock.mockReset();
  linkCharacterMock.mockReset();
  charactersHolder.characters = [];
  charactersHolder.isLoading = false;
  eventsHolder.events = [];
  eventsHolder.isLoading = false;
  eventsHolder.error = null;
});

function renderScreen(cid = 'c-1'): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[`/campaigns/${cid}`]}>
      <Routes>
        <Route path="/campaigns/:cid" element={<CampaignDetailScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

// ─────────────────────────────────────────────────────────────────────
// buildRoster — fonction pure
// ─────────────────────────────────────────────────────────────────────

describe('buildRoster', () => {
  it('renvoie les MJ en premier, puis les joueurs', () => {
    const camp = mkCampaign({ gmIds: ['uid-1', 'uid-gm2'] });
    const members = [
      mkMember({ userId: 'uid-p1', role: 'member' }),
      mkMember({ userId: 'uid-p2', role: 'member' }),
    ];
    const roster = buildRoster(camp, members, 'uid-1');
    expect(roster.map((r) => r.uid)).toEqual([
      'uid-1',
      'uid-gm2',
      'uid-p1',
      'uid-p2',
    ]);
    expect(roster[0]?.role).toBe('gm');
    expect(roster[1]?.role).toBe('gm');
    expect(roster[2]?.role).toBe('member');
  });

  it("dédoublonne un MJ qui a aussi un doc member 'gm' (cas promoteToGm)", () => {
    const camp = mkCampaign({ gmIds: ['uid-1', 'uid-2'] });
    // uid-2 a son doc member avec role=gm (cas après promoteToGm 4.0.3).
    const members = [mkMember({ userId: 'uid-2', role: 'gm' })];
    const roster = buildRoster(camp, members, 'uid-1');
    expect(roster).toHaveLength(2);
    expect(roster.map((r) => r.uid)).toEqual(['uid-1', 'uid-2']);
  });

  it("flag isSelf=true sur l'entrée correspondant à myUid", () => {
    const camp = mkCampaign({ gmIds: ['uid-gm'] });
    const members = [mkMember({ userId: 'uid-me' })];
    const roster = buildRoster(camp, members, 'uid-me');
    expect(roster.find((r) => r.uid === 'uid-me')?.isSelf).toBe(true);
    expect(roster.find((r) => r.uid === 'uid-gm')?.isSelf).toBe(false);
  });

  it("tronque les UIDs longs avec ellipsis", () => {
    const camp = mkCampaign({ gmIds: ['aBcDeFgHiJkLmNoPqRsT'] });
    const roster = buildRoster(camp, [], null);
    expect(roster[0]?.label).toBe('aBcDeFgH…');
  });

  it("propage characterId du membre, null pour les entrées MJ", () => {
    const camp = mkCampaign({ gmIds: ['uid-gm'] });
    const members = [
      mkMember({ userId: 'uid-p1', characterId: 'char-7' }),
      mkMember({ userId: 'uid-p2', characterId: null }),
    ];
    const roster = buildRoster(camp, members, null);
    expect(roster.find((r) => r.uid === 'uid-gm')?.characterId).toBeNull();
    expect(roster.find((r) => r.uid === 'uid-p1')?.characterId).toBe('char-7');
    expect(roster.find((r) => r.uid === 'uid-p2')?.characterId).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────
// CampaignDetailScreen
// ─────────────────────────────────────────────────────────────────────

describe('<CampaignDetailScreen> — chargement et erreurs', () => {
  it('rend un Splash en loading', () => {
    stateHolder.isLoading = true;
    const { container } = renderScreen();
    expect(container.textContent ?? '').not.toContain('Tempête');
  });

  it('rend l’écran d’erreur générique avec Réessayer', () => {
    stateHolder.error = new Error('network down');
    renderScreen();
    expect(screen.getByText(/Lecture impossible/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Réessayer/i }));
    expect(stateHolder.refresh).toHaveBeenCalled();
  });

  it("rend l'écran 'Campagne introuvable' sur kind=campaign-not-found", () => {
    const err = Object.assign(new Error('gone'), {
      name: 'CampaignServiceError',
      kind: 'campaign-not-found',
    });
    stateHolder.error = err as Error;
    renderScreen('c-missing');
    expect(screen.getByText(/Campagne introuvable/i)).toBeInTheDocument();
    // Pas de bouton Réessayer sur ce cas.
    expect(screen.queryByRole('button', { name: /Réessayer/i })).not.toBeInTheDocument();
  });
});

describe('<CampaignDetailScreen> — viewer est MJ', () => {
  it("affiche le bloc invite + roster + bouton Quitter", () => {
    stateHolder.campaign = mkCampaign({
      id: 'c-1',
      name: 'Tempête sur Caer Dûn',
      gmIds: ['uid-1'],
      inviteCode: 'ABC234',
    });
    stateHolder.members = [mkMember({ userId: 'uid-2', role: 'member' })];
    renderScreen();

    expect(screen.getByRole('heading', { name: /Tempête sur Caer Dûn/i })).toBeInTheDocument();
    // Bloc invitation visible pour le MJ.
    expect(screen.getByText(/Inviter à la table/i)).toBeInTheDocument();
    expect(screen.getByText('ABC234')).toBeInTheDocument();
    // Roster avec un joueur.
    expect(screen.getByText(/La compagnie/i)).toBeInTheDocument();
    expect(screen.getByText(/uid-2/)).toBeInTheDocument();
    // Bouton Promouvoir visible (MJ → joueur).
    expect(screen.getByRole('button', { name: /Promouvoir meneur/i })).toBeInTheDocument();
    // Bouton Quitter en pied de page.
    expect(screen.getByRole('button', { name: /Quitter la campagne/i })).toBeInTheDocument();
  });

  it('affiche le feed d’activité (JALON 22.3) avec un événement rendu', () => {
    stateHolder.campaign = mkCampaign({ id: 'c-1', gmIds: ['uid-1'] });
    stateHolder.members = [mkMember({ userId: 'uid-2', role: 'member' })];
    eventsHolder.events = [
      {
        id: 'ev-1',
        kind: 'roll',
        visibility: 'all',
        payload: { label: 'Épée longue', total: 18 },
        actorUserId: 'uid-2',
        actorCharacterId: 'char-2',
        targetCharacterId: null,
        createdAt: null,
      },
    ];
    renderScreen();

    expect(
      screen.getByRole('region', { name: /Journal de bord de la campagne/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Activité récente')).toBeInTheDocument();
    expect(screen.getByText('Jet de dés')).toBeInTheDocument();
    expect(screen.getByText('Épée longue · 18')).toBeInTheDocument();
  });

  it("rend la carte live d'un joueur lié et le tap navigue vers la fiche cross-owner (4A.3)", () => {
    stateHolder.campaign = mkCampaign({ id: 'c-1', gmIds: ['uid-1'] });
    stateHolder.members = [
      mkMember({ userId: 'uid-2', role: 'member', characterId: 'char-9' }),
    ];
    renderScreen();

    // La carte live (stub) expose l'ouverture de fiche — tap → route cross-owner.
    const viewBtn = screen.getByRole('button', { name: /Ouvrir la fiche/i });
    fireEvent.click(viewBtn);
    expect(navigateMock).toHaveBeenCalledWith(
      '/campaigns/c-1/members/uid-2/sheet',
    );
  });

  it("masque la carte live pour un joueur SANS fiche liée (ligne compacte seule)", () => {
    stateHolder.campaign = mkCampaign({ id: 'c-1', gmIds: ['uid-1'] });
    stateHolder.members = [
      mkMember({ userId: 'uid-2', role: 'member', characterId: null }),
    ];
    renderScreen();

    expect(
      screen.queryByRole('button', { name: /Ouvrir la fiche/i }),
    ).not.toBeInTheDocument();
  });

  it("clic Promouvoir → ouvre la modale + clic Promouvoir confirme → appelle promoteToGm + refresh", async () => {
    stateHolder.campaign = mkCampaign({ id: 'c-1', gmIds: ['uid-1'] });
    stateHolder.members = [mkMember({ userId: 'uid-2', role: 'member' })];
    promoteToGmMock.mockResolvedValueOnce(undefined);
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: /Promouvoir meneur/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Le bouton "Promouvoir" dans la modale (variant primary).
    const confirmBtn = screen.getByRole('button', { name: 'Promouvoir' });
    fireEvent.click(confirmBtn);
    await waitFor(() => {
      expect(promoteToGmMock).toHaveBeenCalledWith('c-1', 'uid-2');
    });
    await waitFor(() => {
      expect(stateHolder.refresh).toHaveBeenCalled();
    });
  });
});

describe('<CampaignDetailScreen> — viewer est joueur', () => {
  it("masque le bloc invite + masque le bouton Promouvoir", () => {
    authHolder.user = { uid: 'uid-2' };
    stateHolder.campaign = mkCampaign({
      id: 'c-1',
      gmIds: ['uid-1'],
      inviteCode: 'ABC234',
    });
    stateHolder.members = [
      mkMember({ userId: 'uid-2', role: 'member' }),
      // uid-3 a une fiche liée : si l'affordance MJ fuitait côté joueur, ce
      // membre la déclencherait — le test resterait donc rouge sur la régression.
      mkMember({ userId: 'uid-3', role: 'member', characterId: 'char-3' }),
    ];
    renderScreen();

    expect(screen.queryByText(/Inviter à la table/i)).not.toBeInTheDocument();
    expect(screen.queryByText('ABC234')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Promouvoir meneur/i })).not.toBeInTheDocument();
    // Un joueur ne voit JAMAIS la carte live d'un autre membre, même lié (la
    // lecture cross-owner est réservée au MJ) → pas d'affordance d'ouverture.
    expect(
      screen.queryByRole('button', { name: /Ouvrir la fiche/i }),
    ).not.toBeInTheDocument();
    // Mais le bouton Quitter reste visible.
    expect(screen.getByRole('button', { name: /Quitter la campagne/i })).toBeInTheDocument();
    // Le feed d'activité est un outil MJ — masqué côté joueur (JALON 22.3).
    expect(
      screen.queryByRole('region', { name: /Journal de bord de la campagne/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Activité récente')).not.toBeInTheDocument();
  });

  it('clic retour navigue vers /campaigns', () => {
    authHolder.user = { uid: 'uid-2' };
    stateHolder.campaign = mkCampaign({ gmIds: ['uid-1'] });
    stateHolder.members = [mkMember({ userId: 'uid-2' })];
    renderScreen();

    // Le bouton de retour utilise le même label que aria-label.
    const backButtons = screen.getAllByRole('button', { name: /Mes campagnes/i });
    fireEvent.click(backButtons[0]!);
    expect(navigateMock).toHaveBeenCalledWith('/campaigns');
  });

  it('affiche la section « Mon personnage » avec le CTA « Créer un personnage » quand aucune fiche liée', () => {
    authHolder.user = { uid: 'uid-2' };
    stateHolder.campaign = mkCampaign({ gmIds: ['uid-1'] });
    stateHolder.members = [mkMember({ userId: 'uid-2', characterId: null })];
    renderScreen();

    expect(screen.getByText(/Mon personnage/i)).toBeInTheDocument();
    expect(screen.getByText(/Aucun personnage lié/i)).toBeInTheDocument();
    // Chemin guidé : sans fiche existante, on propose de créer (le picker « Lier
    // un existant » serait vide → masqué).
    expect(
      screen.getByRole('button', { name: /Créer un personnage/i }),
    ).toBeInTheDocument();
  });

  it('affiche le nom de la fiche liée + CTA Changer quand une fiche est liée', () => {
    authHolder.user = { uid: 'uid-2' };
    charactersHolder.characters = [
      { id: 'char-9', name: 'Lyra du Crépuscule', totalLevel: 4 },
    ];
    stateHolder.campaign = mkCampaign({ gmIds: ['uid-1'] });
    stateHolder.members = [
      mkMember({ userId: 'uid-2', characterId: 'char-9' }),
    ];
    renderScreen();

    expect(screen.getByText('Lyra du Crépuscule')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Changer/i }),
    ).toBeInTheDocument();
  });
});

describe('<CampaignDetailScreen> — section Mon personnage masquée pour le MJ pur', () => {
  it("ne rend PAS la section pour un MJ sans doc member", () => {
    authHolder.user = { uid: 'uid-1' };
    stateHolder.campaign = mkCampaign({ gmIds: ['uid-1'] });
    stateHolder.members = [mkMember({ userId: 'uid-2', role: 'member' })];
    renderScreen();

    expect(screen.queryByText(/Mon personnage/i)).not.toBeInTheDocument();
  });
});
