import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Campaign, Membership } from '@/shared/types/campaign';
import type { Session } from '@/shared/types/session';

const authHolder: { user: { uid: string } | null } = { user: { uid: 'gm-uid' } };
vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => authHolder,
}));

const campaignHolder: {
  campaign: Campaign | null;
  members: Membership[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
} = { campaign: null, members: [], isLoading: false, error: null, refresh: vi.fn() };
vi.mock('../use-campaign', () => ({ useCampaign: () => campaignHolder }));

const sessionHolder: {
  session: Session | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
} = { session: null, isLoading: false, error: null, refresh: vi.fn() };
vi.mock('../use-session', () => ({ useSession: () => sessionHolder }));

const updateNotesMock = vi.fn().mockResolvedValue(undefined);
const setAttendanceMock = vi.fn().mockResolvedValue(undefined);
vi.mock('@/shared/lib/services/sessions', () => ({
  updateSessionNotes: (...args: unknown[]) => updateNotesMock(...args),
  setSessionAttendance: (...args: unknown[]) => setAttendanceMock(...args),
}));

vi.mock('@/shared/lib/firebase', () => ({ getDb: () => ({}) }));

import { SessionScreen } from '../session-screen';

function mkCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'c-1',
    name: 'Tempête sur Caer Dûn',
    description: '',
    gmIds: ['gm-uid'],
    createdBy: 'gm-uid',
    inviteCode: 'ABC234',
    settings: {
      language: 'fr',
      diceMode: 'digital',
      variants: { featAtLevel1: false, flanking: false, slowHealing: false, grittyRealism: false },
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
    userId: 'player-uid-abcdefgh',
    role: 'member',
    characterId: null,
    joinedAt: null,
    ...overrides,
  } as Membership;
}

function mkSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 's-1',
    number: 3,
    title: 'L’embuscade de la passe',
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
  authHolder.user = { uid: 'gm-uid' };
  campaignHolder.campaign = null;
  campaignHolder.members = [];
  campaignHolder.error = null;
  campaignHolder.isLoading = false;
  sessionHolder.session = null;
  sessionHolder.error = null;
  sessionHolder.isLoading = false;
  sessionHolder.refresh = vi.fn();
  updateNotesMock.mockClear();
  setAttendanceMock.mockClear();
});

function renderScreen(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={['/campaigns/c-1/sessions/s-1']}>
      <Routes>
        <Route path="/campaigns/:cid/sessions/:sid" element={<SessionScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('<SessionScreen> — en-tête + onglets', () => {
  it('affiche numéro + titre + chip statut exacts', () => {
    campaignHolder.campaign = mkCampaign();
    sessionHolder.session = mkSession({ number: 3, title: 'L’embuscade de la passe', status: 'planned' });
    renderScreen();
    expect(screen.getByRole('heading', { name: 'L’embuscade de la passe' })).toBeInTheDocument();
    expect(screen.getByText(/Séance 3/)).toBeInTheDocument();
    expect(screen.getByText('Planifiée')).toBeInTheDocument();
  });

  it('rend les 4 onglets', () => {
    campaignHolder.campaign = mkCampaign();
    sessionHolder.session = mkSession();
    renderScreen();
    expect(screen.getByRole('tab', { name: 'Notes' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Présence' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Événements' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Journal' })).toBeInTheDocument();
  });

  it('onglet Notes actif par défaut → textarea éditable pour le MJ', () => {
    campaignHolder.campaign = mkCampaign({ gmIds: ['gm-uid'] });
    sessionHolder.session = mkSession();
    renderScreen();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('Events / Journal montrent un placeholder', () => {
    campaignHolder.campaign = mkCampaign();
    sessionHolder.session = mkSession();
    renderScreen();
    fireEvent.click(screen.getByRole('tab', { name: 'Événements' }));
    expect(screen.getByText(/une fois la séance démarrée/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Journal' }));
    expect(screen.getByText(/journal compilé/i)).toBeInTheDocument();
  });
});

describe('<SessionScreen> — présence (MJ)', () => {
  it('toggler un membre appelle setSessionAttendance avec la liste mise à jour', async () => {
    campaignHolder.campaign = mkCampaign({ gmIds: ['gm-uid'] });
    campaignHolder.members = [mkMember({ userId: 'player-uid-abcdefgh' })];
    sessionHolder.session = mkSession({ attendance: [] });
    renderScreen();
    fireEvent.click(screen.getByRole('tab', { name: 'Présence' }));
    const boxes = screen.getAllByRole('checkbox');
    // Roster = [gm-uid (gmIds d'abord), player-uid] → on coche le joueur.
    fireEvent.click(boxes[1]!);
    await waitFor(() => {
      expect(setAttendanceMock).toHaveBeenCalledWith('c-1', 's-1', ['player-uid-abcdefgh']);
    });
  });
});

describe('<SessionScreen> — lecture seule (membre non-MJ)', () => {
  it('Notes en lecture seule (pas de textarea) + cases présence désactivées', () => {
    campaignHolder.campaign = mkCampaign({ gmIds: ['other-gm'] });
    campaignHolder.members = [mkMember({ userId: 'player-uid-abcdefgh' })];
    sessionHolder.session = mkSession({ notes: 'Notes du MJ', attendance: ['player-uid-abcdefgh'] });
    renderScreen();
    // Notes : aucun textarea, le texte brut est rendu.
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('Notes du MJ')).toBeInTheDocument();
    // Présence : cases désactivées.
    fireEvent.click(screen.getByRole('tab', { name: 'Présence' }));
    for (const box of screen.getAllByRole('checkbox')) {
      expect(box).toBeDisabled();
    }
  });
});

describe('<SessionScreen> — erreurs', () => {
  it('session-not-found → écran dédié', () => {
    campaignHolder.campaign = mkCampaign();
    sessionHolder.session = null;
    sessionHolder.error = Object.assign(new Error('nope'), {
      name: 'SessionServiceError',
      kind: 'session-not-found',
    });
    renderScreen();
    expect(screen.getByText(/Séance introuvable/i)).toBeInTheDocument();
  });
});
