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
    CampaignServiceError: FakeError,
  };
});

vi.mock('@/shared/lib/firebase', () => ({
  getDb: () => ({}),
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
      mkMember({ userId: 'uid-3', role: 'member' }),
    ];
    renderScreen();

    expect(screen.queryByText(/Inviter à la table/i)).not.toBeInTheDocument();
    expect(screen.queryByText('ABC234')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Promouvoir meneur/i })).not.toBeInTheDocument();
    // Mais le bouton Quitter reste visible.
    expect(screen.getByRole('button', { name: /Quitter la campagne/i })).toBeInTheDocument();
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
});
