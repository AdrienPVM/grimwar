import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

// ─────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────

const authHolder: { user: { uid: string } | null } = { user: { uid: 'uid-1' } };
vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => authHolder,
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

const joinByCodeMock =
  vi.fn<
    (code: string, uid: string) => Promise<{ campaignId: string; campaign: unknown }>
  >();
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
    joinByCode: (code: string, uid: string) => joinByCodeMock(code, uid),
    CampaignServiceError: FakeError,
  };
});

vi.mock('@/shared/lib/firebase', () => ({
  getDb: () => ({}),
}));

import { JoinByCodeScreen } from '../join-by-code-screen';
import { CampaignServiceError as FakeError } from '@/shared/lib/services/campaigns';

afterEach(() => {
  authHolder.user = { uid: 'uid-1' };
  navigateMock.mockReset();
  joinByCodeMock.mockReset();
});

function renderScreen(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <JoinByCodeScreen />
    </MemoryRouter>,
  );
}

// ─────────────────────────────────────────────────────────────────────
// Suites
// ─────────────────────────────────────────────────────────────────────

describe('<JoinByCodeScreen>', () => {
  it("affiche le titre + l'input code + le bouton Rejoindre", () => {
    renderScreen();
    expect(screen.getByRole('heading', { name: /Rejoindre une campagne/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Code d['']invitation/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rejoindre' })).toBeInTheDocument();
  });

  it("submit avec moins de 6 chars → erreur lengthInvalid, service jamais appelé", async () => {
    renderScreen();
    fireEvent.change(screen.getByLabelText(/Code d['']invitation/i), {
      target: { value: 'ABC' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Rejoindre' }));
    await waitFor(() => {
      expect(screen.getByText(/6 caractères/i)).toBeInTheDocument();
    });
    expect(joinByCodeMock).not.toHaveBeenCalled();
  });

  it("submit avec 6 chars contenant I/O → erreur formatInvalid", async () => {
    renderScreen();
    fireEvent.change(screen.getByLabelText(/Code d['']invitation/i), {
      target: { value: 'ABCDEO' }, // contient 'O' → interdit
    });
    fireEvent.click(screen.getByRole('button', { name: 'Rejoindre' }));
    await waitFor(() => {
      expect(screen.getByText(/sans 0, 1, I ni O/i)).toBeInTheDocument();
    });
    expect(joinByCodeMock).not.toHaveBeenCalled();
  });

  it("normalise (uppercase + strip espaces) avant le submit", async () => {
    joinByCodeMock.mockResolvedValueOnce({ campaignId: 'c-42', campaign: {} });
    renderScreen();
    fireEvent.change(screen.getByLabelText(/Code d['']invitation/i), {
      target: { value: ' abc 234 ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Rejoindre' }));
    await waitFor(() => {
      expect(joinByCodeMock).toHaveBeenCalledWith('ABC234', 'uid-1');
    });
  });

  it("succès → navigate vers /campaigns/:cid", async () => {
    joinByCodeMock.mockResolvedValueOnce({ campaignId: 'c-42', campaign: {} });
    renderScreen();
    fireEvent.change(screen.getByLabelText(/Code d['']invitation/i), {
      target: { value: 'ABC234' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Rejoindre' }));
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/campaigns/c-42');
    });
  });

  it("erreur invite-code-not-found → message dédié", async () => {
    joinByCodeMock.mockRejectedValueOnce(new FakeError('invite-code-not-found', 'test'));
    renderScreen();
    fireEvent.change(screen.getByLabelText(/Code d['']invitation/i), {
      target: { value: 'ABC234' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Rejoindre' }));
    await waitFor(() => {
      expect(screen.getByText(/Aucune campagne ne correspond/i)).toBeInTheDocument();
    });
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("erreur campaign-not-found → message dédié (code orphelin)", async () => {
    joinByCodeMock.mockRejectedValueOnce(new FakeError('campaign-not-found', 'test'));
    renderScreen();
    fireEvent.change(screen.getByLabelText(/Code d['']invitation/i), {
      target: { value: 'ABC234' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Rejoindre' }));
    await waitFor(() => {
      expect(screen.getByText(/n['']existe plus côté serveur/i)).toBeInTheDocument();
    });
  });

  it("erreur générique fallback", async () => {
    joinByCodeMock.mockRejectedValueOnce(new Error('network'));
    renderScreen();
    fireEvent.change(screen.getByLabelText(/Code d['']invitation/i), {
      target: { value: 'ABC234' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Rejoindre' }));
    await waitFor(() => {
      expect(screen.getByText(/L['']invitation n['']a pas abouti/i)).toBeInTheDocument();
    });
  });

  it("clic Annuler → navigate vers /campaigns", () => {
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(navigateMock).toHaveBeenCalledWith('/campaigns');
  });

  it("submit sans utilisateur connecté → erreur notSignedIn", async () => {
    authHolder.user = null;
    renderScreen();
    fireEvent.change(screen.getByLabelText(/Code d['']invitation/i), {
      target: { value: 'ABC234' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Rejoindre' }));
    await waitFor(() => {
      expect(screen.getByText(/Tu dois être connecté/i)).toBeInTheDocument();
    });
    expect(joinByCodeMock).not.toHaveBeenCalled();
  });
});
