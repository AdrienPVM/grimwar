import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Campaign, Membership } from '@/shared/types/campaign';
import type { Session } from '@/shared/types/session';

// ─────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────

const authHolder: { user: { uid: string } | null } = { user: { uid: 'uid-1' } };
vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => authHolder,
}));

// useCampaign — pilote le statut MJ (gmIds) + nom + erreur campagne.
const campaignHolder: {
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
  useCampaign: () => campaignHolder,
}));

// useSessions — pilote la liste + erreur + refresh.
const sessionsHolder: {
  sessions: Session[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
} = {
  sessions: [],
  isLoading: false,
  error: null,
  refresh: vi.fn(),
};
vi.mock('../use-sessions', () => ({
  useSessions: () => sessionsHolder,
}));

// Service sessions — on contrôle le create (modale).
const createSessionMock = vi.fn();
vi.mock('@/shared/lib/services/sessions', () => ({
  createSession: (cid: string, input: unknown) => createSessionMock(cid, input),
}));

vi.mock('@/shared/lib/firebase', () => ({
  getDb: () => ({}),
}));

import { SessionsListScreen } from '../sessions-list-screen';

// ─────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────

function mkCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'c-1',
    name: 'Tempête sur Caer Dûn',
    description: '',
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

function mkSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 's-1',
    number: 1,
    title: 'La première veillée',
    plannedDate: null,
    startedAt: null,
    endedAt: null,
    status: 'planned',
    attendance: [],
    notes: '',
    journalCompiled: null,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

afterEach(() => {
  authHolder.user = { uid: 'uid-1' };
  campaignHolder.campaign = null;
  campaignHolder.members = [];
  campaignHolder.isLoading = false;
  campaignHolder.error = null;
  campaignHolder.refresh = vi.fn();
  sessionsHolder.sessions = [];
  sessionsHolder.isLoading = false;
  sessionsHolder.error = null;
  sessionsHolder.refresh = vi.fn();
  createSessionMock.mockReset();
});

function renderScreen(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={['/campaigns/c-1/sessions']}>
      <Routes>
        <Route path="/campaigns/:cid/sessions" element={<SessionsListScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

// ─────────────────────────────────────────────────────────────────────
// Suites
// ─────────────────────────────────────────────────────────────────────

describe('<SessionsListScreen> — empty state', () => {
  it('MJ : message vide + bouton « Planifier une séance » actif', () => {
    campaignHolder.campaign = mkCampaign({ gmIds: ['uid-1'] });
    sessionsHolder.sessions = [];
    renderScreen();
    expect(screen.getByText(/Aucune séance pour le moment/i)).toBeInTheDocument();
    const plan = screen.getByRole('button', { name: /Planifier une séance/i });
    expect(plan).toBeEnabled();
  });

  it('joueur (pas MJ) : message vide membre + AUCUN bouton planifier', () => {
    campaignHolder.campaign = mkCampaign({ gmIds: ['uid-other'] });
    sessionsHolder.sessions = [];
    renderScreen();
    expect(screen.getByText(/n'a encore été planifiée par le meneur/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Planifier une séance/i }),
    ).not.toBeInTheDocument();
  });
});

describe('<SessionsListScreen> — liste avec items', () => {
  it('rend une ligne par séance avec numéro + titre exacts', () => {
    campaignHolder.campaign = mkCampaign();
    sessionsHolder.sessions = [
      mkSession({ id: 's-2', number: 2, title: 'L’embuscade de la passe' }),
      mkSession({ id: 's-1', number: 1, title: 'La première veillée' }),
    ];
    renderScreen();
    expect(screen.getByText('L’embuscade de la passe')).toBeInTheDocument();
    expect(screen.getByText('La première veillée')).toBeInTheDocument();
    // Le numéro de la séance est rendu (identité, pas juste présence d'une ligne).
    // Le préfixe et le numéro partagent le même <span> → texte « Séance 2 ».
    expect(screen.getByText(/Séance 2/)).toBeInTheDocument();
    expect(screen.getByText(/Séance 1/)).toBeInTheDocument();
  });

  it('affiche le libellé de statut EXACT pour chaque statut (identité)', () => {
    campaignHolder.campaign = mkCampaign();
    sessionsHolder.sessions = [
      mkSession({ id: 's-1', number: 1, status: 'planned' }),
      mkSession({ id: 's-2', number: 2, status: 'active' }),
      mkSession({ id: 's-3', number: 3, status: 'completed' }),
      mkSession({ id: 's-4', number: 4, status: 'cancelled' }),
    ];
    renderScreen();
    expect(screen.getByText('Planifiée')).toBeInTheDocument();
    expect(screen.getByText('En cours')).toBeInTheDocument();
    expect(screen.getByText('Terminée')).toBeInTheDocument();
    expect(screen.getByText('Annulée')).toBeInTheDocument();
  });

  it('la date prévue est rendue en label FR court quand fournie', () => {
    campaignHolder.campaign = mkCampaign();
    sessionsHolder.sessions = [
      mkSession({ id: 's-1', number: 1, plannedDate: new Date('2026-07-10T00:00:00') }),
    ];
    renderScreen();
    expect(screen.getByText(/10 juil\./i)).toBeInTheDocument();
  });
});

describe('<SessionsListScreen> — état erreur', () => {
  it('affiche le panneau erreur + Réessayer relance le refresh sessions', () => {
    campaignHolder.campaign = mkCampaign();
    sessionsHolder.error = new Error('permission-denied');
    renderScreen();
    expect(screen.getByText(/Lecture impossible/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Réessayer/i }));
    expect(sessionsHolder.refresh).toHaveBeenCalled();
  });
});

describe('<SessionCreateModal> via screen', () => {
  it('submit sans titre → erreur visible, service jamais appelé', async () => {
    campaignHolder.campaign = mkCampaign();
    sessionsHolder.sessions = [];
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /Planifier une séance/i }));
    // Le bouton submit de la modale est « Planifier » (≠ « Planifier une séance »).
    fireEvent.click(screen.getByRole('button', { name: 'Planifier' }));
    await waitFor(() => {
      expect(screen.getByText(/Le titre est obligatoire/i)).toBeInTheDocument();
    });
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  it('submit avec titre → createSession(cid, {title, plannedDate:null}) + refresh + ferme', async () => {
    campaignHolder.campaign = mkCampaign();
    sessionsHolder.sessions = [];
    createSessionMock.mockResolvedValueOnce({ sessionId: 's-new', number: 1 });
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /Planifier une séance/i }));
    fireEvent.change(screen.getByLabelText(/Titre de la séance/i), {
      target: { value: 'Le réveil du dragon' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Planifier' }));
    await waitFor(() => {
      expect(createSessionMock).toHaveBeenCalledWith('c-1', {
        title: 'Le réveil du dragon',
        plannedDate: null,
      });
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(sessionsHolder.refresh).toHaveBeenCalled();
  });

  it('submit avec date → plannedDate passé en Date', async () => {
    campaignHolder.campaign = mkCampaign();
    sessionsHolder.sessions = [];
    createSessionMock.mockResolvedValueOnce({ sessionId: 's-new', number: 1 });
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /Planifier une séance/i }));
    fireEvent.change(screen.getByLabelText(/Titre de la séance/i), {
      target: { value: 'Datée' },
    });
    fireEvent.change(screen.getByLabelText(/Date prévue/i), {
      target: { value: '2026-07-10' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Planifier' }));
    await waitFor(() => {
      expect(createSessionMock).toHaveBeenCalledTimes(1);
    });
    const [, input] = createSessionMock.mock.calls[0]!;
    expect((input as { plannedDate: Date }).plannedDate).toBeInstanceOf(Date);
  });

  it('erreur create → message générique, refresh non appelé', async () => {
    campaignHolder.campaign = mkCampaign();
    sessionsHolder.sessions = [];
    createSessionMock.mockRejectedValueOnce(new Error('boom'));
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /Planifier une séance/i }));
    fireEvent.change(screen.getByLabelText(/Titre de la séance/i), {
      target: { value: 'Test' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Planifier' }));
    await waitFor(() => {
      expect(screen.getByText(/La création n['']a pas abouti/i)).toBeInTheDocument();
    });
    expect(sessionsHolder.refresh).not.toHaveBeenCalled();
  });
});
