import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Campaign } from '@/shared/types/campaign';

// ─────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────

// useAuth — driver via holder.
const authHolder: { user: { uid: string } | null } = { user: { uid: 'uid-1' } };
vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => authHolder,
}));

// useMyCampaigns — driver via holder mutable.
const stateHolder: {
  campaigns: Campaign[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
} = {
  campaigns: [],
  isLoading: false,
  error: null,
  refresh: vi.fn(),
};
vi.mock('../use-my-campaigns', () => ({
  useMyCampaigns: () => stateHolder,
}));

// Service campaigns — on contrôle créateur/leaver.
const createCampaignMock = vi.fn();
const leaveCampaignMock = vi.fn();
vi.mock('@/shared/lib/services/campaigns', () => {
  class FakeError extends Error {
    readonly kind: string;
    constructor(kind: string) {
      super(kind);
      this.name = 'CampaignServiceError';
      this.kind = kind;
    }
  }
  return {
    createCampaign: (input: unknown, uid: string) => createCampaignMock(input, uid),
    leaveCampaign: (cid: string, uid: string) => leaveCampaignMock(cid, uid),
    CampaignServiceError: FakeError,
  };
});


// Firebase shim — pas d'appel direct mais des imports transitifs.
vi.mock('@/shared/lib/firebase', () => ({
  getDb: () => ({}),
}));

import { CampaignsListScreen } from '../campaigns-list-screen';
// Import after the mock factory so we get the FakeError class — instanceof
// checks dans les modales utilisent cette classe.
import { CampaignServiceError as FakeError } from '@/shared/lib/services/campaigns';

// ─────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────

function mkCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'c-1',
    name: 'Les Compagnons du Crépuscule',
    description: 'Une longue route vers la cité ensevelie.',
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

afterEach(() => {
  stateHolder.campaigns = [];
  stateHolder.isLoading = false;
  stateHolder.error = null;
  stateHolder.refresh = vi.fn();
  authHolder.user = { uid: 'uid-1' };
  createCampaignMock.mockReset();
  leaveCampaignMock.mockReset();
});

function renderScreen(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <CampaignsListScreen />
    </MemoryRouter>,
  );
}

// ─────────────────────────────────────────────────────────────────────
// Suites
// ─────────────────────────────────────────────────────────────────────

describe('<CampaignsListScreen> — empty state', () => {
  it("rend le glass panel d'empty state avec CTA Créer + Rejoindre", () => {
    stateHolder.campaigns = [];
    renderScreen();
    expect(screen.getByText(/Aucune campagne/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Créer une campagne/i })).toBeInTheDocument();
    // 4.0.5 : Rejoindre par code n'est plus disabled, il navigue vers /campaigns/join.
    const join = screen.getByRole('button', { name: /Rejoindre par code/i });
    expect(join).toBeEnabled();
  });

  it("clic sur 'Créer une campagne' ouvre la modale", () => {
    stateHolder.campaigns = [];
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /Créer une campagne/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Nouvelle campagne/i)).toBeInTheDocument();
  });
});

describe('<CampaignsListScreen> — liste avec items', () => {
  it("rend une card par campagne avec le bon nom", () => {
    stateHolder.campaigns = [
      mkCampaign({ id: 'c-1', name: 'Tempête sur Caer Dûn' }),
      mkCampaign({ id: 'c-2', name: 'Le Sceau d’Ostromir' }),
    ];
    renderScreen();
    expect(screen.getByText('Tempête sur Caer Dûn')).toBeInTheDocument();
    expect(screen.getByText('Le Sceau d’Ostromir')).toBeInTheDocument();
  });

  it("rend le badge 'Meneur' si l'uid est dans gmIds, sinon 'Joueur'", () => {
    stateHolder.campaigns = [
      mkCampaign({ id: 'c-1', name: 'Cas MJ', gmIds: ['uid-1'] }),
      mkCampaign({ id: 'c-2', name: 'Cas Joueur', gmIds: ['uid-other'] }),
    ];
    renderScreen();
    expect(screen.getAllByText(/Meneur/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Joueur/i).length).toBeGreaterThan(0);
  });

  it("le bouton 'Ouvrir' est désormais actif et navigue vers le détail (4.0.5)", () => {
    stateHolder.campaigns = [mkCampaign({ id: 'c-1' })];
    renderScreen();
    const opens = screen.getAllByRole('button', { name: /Ouvrir/i });
    expect(opens.length).toBeGreaterThan(0);
    expect(opens[0]).toBeEnabled();
  });

  it("clic sur 'Quitter' ouvre la modale de confirmation avec le nom de la campagne", () => {
    stateHolder.campaigns = [
      mkCampaign({ id: 'c-42', name: 'Le Voyage du Sang' }),
    ];
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Quitter' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // Le nom apparaît à la fois sur la card et dans la confirmation modale.
    expect(screen.getAllByText(/Le Voyage du Sang/).length).toBeGreaterThan(0);
  });
});

describe('<CampaignsListScreen> — état erreur', () => {
  it("affiche le glass panel d'erreur + bouton Réessayer", () => {
    stateHolder.error = new Error('Firestore unreachable');
    renderScreen();
    expect(screen.getByText(/Lecture impossible/i)).toBeInTheDocument();
    const retry = screen.getByRole('button', { name: /Réessayer/i });
    fireEvent.click(retry);
    expect(stateHolder.refresh).toHaveBeenCalled();
  });
});

describe('<CreateCampaignModal> via screen', () => {
  it('submit sans nom → erreur visible, service jamais appelé', async () => {
    stateHolder.campaigns = [];
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /Créer une campagne/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Créer' }));
    await waitFor(() => {
      expect(screen.getByText(/Le nom est obligatoire/i)).toBeInTheDocument();
    });
    expect(createCampaignMock).not.toHaveBeenCalled();
  });

  it('submit avec nom valide → appelle createCampaign + refresh + ferme modale', async () => {
    stateHolder.campaigns = [];
    createCampaignMock.mockResolvedValueOnce({ campaignId: 'new', inviteCode: 'XYZ234' });
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /Créer une campagne/i }));
    const nameInput = screen.getByLabelText(/Nom de la campagne/i);
    fireEvent.change(nameInput, { target: { value: 'La Voie Brisée' } });
    fireEvent.click(screen.getByRole('button', { name: 'Créer' }));
    await waitFor(() => {
      expect(createCampaignMock).toHaveBeenCalledWith(
        { name: 'La Voie Brisée', description: '' },
        'uid-1',
      );
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(stateHolder.refresh).toHaveBeenCalled();
  });

  it('submit avec invite-code-collision-exhausted → message dédié', async () => {
    stateHolder.campaigns = [];
    createCampaignMock.mockRejectedValueOnce(new FakeError('invite-code-collision-exhausted', 'test'));
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /Créer une campagne/i }));
    fireEvent.change(screen.getByLabelText(/Nom de la campagne/i), {
      target: { value: 'Test' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Créer' }));
    await waitFor(() => {
      expect(screen.getByText(/code d['']invitation unique/i)).toBeInTheDocument();
    });
    expect(stateHolder.refresh).not.toHaveBeenCalled();
  });

  it('submit avec erreur générique → message générique', async () => {
    stateHolder.campaigns = [];
    createCampaignMock.mockRejectedValueOnce(new Error('boom'));
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /Créer une campagne/i }));
    fireEvent.change(screen.getByLabelText(/Nom de la campagne/i), {
      target: { value: 'Test' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Créer' }));
    await waitFor(() => {
      expect(screen.getByText(/La création n['']a pas abouti/i)).toBeInTheDocument();
    });
  });
});

describe('<LeaveCampaignModal> via screen', () => {
  it('confirme → appelle leaveCampaign + refresh + ferme', async () => {
    stateHolder.campaigns = [mkCampaign({ id: 'c-42', name: 'Cible' })];
    leaveCampaignMock.mockResolvedValueOnce(undefined);
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Quitter' }));
    // Le bouton "Quitter" du dialog (variant danger).
    const dialogButtons = screen.getAllByRole('button', { name: 'Quitter' });
    // Le 1er bouton sur la card a déjà été cliqué, on prend le dialog button (le dernier).
    fireEvent.click(dialogButtons[dialogButtons.length - 1]!);
    await waitFor(() => {
      expect(leaveCampaignMock).toHaveBeenCalledWith('c-42', 'uid-1');
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(stateHolder.refresh).toHaveBeenCalled();
  });

  it('erreur last-gm-cannot-leave → message dédié', async () => {
    stateHolder.campaigns = [mkCampaign({ id: 'c-42', name: 'Cible' })];
    leaveCampaignMock.mockRejectedValueOnce(new FakeError('last-gm-cannot-leave', 'test'));
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Quitter' }));
    const dialogButtons = screen.getAllByRole('button', { name: 'Quitter' });
    fireEvent.click(dialogButtons[dialogButtons.length - 1]!);
    await waitFor(() => {
      expect(screen.getByText(/dernier meneur/i)).toBeInTheDocument();
    });
  });

  it('erreur campaign-not-found → message dédié', async () => {
    stateHolder.campaigns = [mkCampaign({ id: 'c-42', name: 'Cible' })];
    leaveCampaignMock.mockRejectedValueOnce(new FakeError('campaign-not-found', 'test'));
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Quitter' }));
    const dialogButtons = screen.getAllByRole('button', { name: 'Quitter' });
    fireEvent.click(dialogButtons[dialogButtons.length - 1]!);
    await waitFor(() => {
      expect(screen.getByText(/n['']existe plus/i)).toBeInTheDocument();
    });
  });
});
