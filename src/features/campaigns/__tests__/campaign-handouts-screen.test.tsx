import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Campaign, Membership } from '@/shared/types/campaign';
import type { Handout } from '@/shared/types/handout';

/**
 * Écran des documents de table — volet M12 (audit de malléabilité) :
 *   - les destinataires sont NOMMÉS (l'écran construisait sa propre liste avec
 *     `formatUid`, si bien que le meneur ciblait des « aBc12dEf… ») ;
 *   - un document envoyé se corrige, se désarchive et se supprime.
 */

const archiveHandout = vi.fn();
const unarchiveHandout = vi.fn();
const deleteHandout = vi.fn();

vi.mock('@/shared/lib/services/handouts', () => ({
  archiveHandout: (...a: unknown[]) => archiveHandout(...a),
  unarchiveHandout: (...a: unknown[]) => unarchiveHandout(...a),
  deleteHandout: (...a: unknown[]) => deleteHandout(...a),
}));

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn(), useParams: () => ({ cid: 'c-1' }) };
});

vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => ({ user: { uid: 'dm-1', displayName: 'Adrien' } }),
}));

const handoutsHolder: { handouts: Handout[] } = { handouts: [] };
const refreshMock = vi.fn();
vi.mock('../use-handouts', () => ({
  useHandouts: () => ({
    handouts: handoutsHolder.handouts,
    isLoading: false,
    error: null,
    refresh: refreshMock,
  }),
}));

const campaignHolder: { campaign: Campaign | null; members: Membership[] } = {
  campaign: null,
  members: [],
};
vi.mock('../use-campaign', () => ({
  useCampaign: () => ({
    campaign: campaignHolder.campaign,
    members: campaignHolder.members,
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

// La modale d'édition tire event-logger / toast — stubée, son comportement est
// couvert par `handout-editor-modal.test.tsx`.
vi.mock('../handout-editor-modal', () => ({
  HandoutEditorModal: ({ editing }: { editing: Handout | null }) =>
    editing ? <div data-testid="editor-open">{editing.title}</div> : null,
}));
vi.mock('../handout-viewer-modal', () => ({
  HandoutViewerModal: () => null,
}));

import { CampaignHandoutsScreen } from '../campaign-handouts-screen';

function mkCampaign(): Campaign {
  return {
    id: 'c-1',
    name: 'La Marche des Ombres',
    description: '',
    gmIds: ['dm-1'],
    createdBy: 'dm-1',
    inviteCode: 'ABC234',
    status: 'active',
    schemaVersion: 1,
    createdAt: null,
    updatedAt: null,
  } as unknown as Campaign;
}

function mkMember(uid: string, displayName: string | null): Membership {
  return {
    userId: uid,
    role: 'member',
    characterId: null,
    displayName,
    photoURL: null,
    joinedAt: null,
    schemaVersion: 1,
  } as unknown as Membership;
}

function mkHandout(over: Partial<Handout> = {}): Handout {
  return {
    id: 'hd-1',
    title: 'La lettre du baron',
    type: 'text',
    content: { text: 'Mon cher ami…' },
    recipients: ['p-marie'],
    revealedTo: [],
    visibility: 'sent',
    createdBy: 'dm-1',
    createdAt: null,
    ...over,
  } as Handout;
}

function renderScreen(): void {
  render(
    <MemoryRouter>
      <CampaignHandoutsScreen />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  archiveHandout.mockReset().mockResolvedValue(undefined);
  unarchiveHandout.mockReset().mockResolvedValue(undefined);
  deleteHandout.mockReset().mockResolvedValue(undefined);
  refreshMock.mockReset();
  campaignHolder.campaign = mkCampaign();
  campaignHolder.members = [
    mkMember('p-marie', 'Marie'),
    mkMember('p-bob', null), // pas de displayName → repli UID tronqué
  ];
  handoutsHolder.handouts = [mkHandout()];
});

describe('<CampaignHandoutsScreen> — destinataires nommés (M12)', () => {
  it('nomme le destinataire au lieu de le compter', () => {
    renderScreen();
    expect(screen.getByText(/Marie/)).toBeInTheDocument();
    // L'UID brut ne doit jamais s'afficher tel quel.
    expect(screen.queryByText(/p-marie/)).not.toBeInTheDocument();
  });

  it('membre sans nom d’affichage → repli UID tronqué, pas de plantage', () => {
    handoutsHolder.handouts = [mkHandout({ recipients: ['p-bob'] })];
    renderScreen();
    // `formatUid` ne tronque qu'au-delà de 10 caractères — « p-bob » passe tel
    // quel. L'invariant testé est qu'un membre anonyme reste RENDU.
    expect(screen.getByText(/p-bob/)).toBeInTheDocument();
  });

  it('diffusion à toute la table → libellé dédié', () => {
    handoutsHolder.handouts = [mkHandout({ recipients: 'all' })];
    renderScreen();
    expect(screen.getByText(/Toute la table/i)).toBeInTheDocument();
  });
});

describe('<CampaignHandoutsScreen> — cycle de vie du document (M12)', () => {
  it('« Corriger » ouvre l’éditeur sur CE document', () => {
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Corriger' }));
    expect(screen.getByTestId('editor-open')).toHaveTextContent('La lettre du baron');
  });

  it('document actif → « Archiver » ; document archivé → « Désarchiver »', () => {
    handoutsHolder.handouts = [mkHandout({ visibility: 'archived' })];
    renderScreen();
    expect(
      screen.queryByRole('button', { name: 'Archiver' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Désarchiver' }));
    expect(unarchiveHandout).toHaveBeenCalledWith('c-1', 'hd-1');
  });

  it('la suppression exige une confirmation explicite', async () => {
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    expect(deleteHandout).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la suppression' }));
    await waitFor(() => expect(deleteHandout).toHaveBeenCalledWith('c-1', 'hd-1'));
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });

  it('la confirmation ne s’arme que sur LE document visé', () => {
    handoutsHolder.handouts = [
      mkHandout({ id: 'hd-1', title: 'Un' }),
      mkHandout({ id: 'hd-2', title: 'Deux' }),
    ];
    renderScreen();
    fireEvent.click(screen.getAllByRole('button', { name: 'Supprimer' })[0]!);
    // Un seul bouton de confirmation, l'autre carte reste en état de repos.
    expect(
      screen.getAllByRole('button', { name: 'Confirmer la suppression' }),
    ).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Supprimer' })).toHaveLength(1);
  });
});
