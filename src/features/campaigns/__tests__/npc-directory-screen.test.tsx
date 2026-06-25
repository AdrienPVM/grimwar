import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { t } from '@/shared/lib/i18n';
import type { Npc } from '@/shared/types/npc';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ cid: 'c-1' }),
  };
});

const authHolder: { uid: string } = { uid: 'dm-1' };
vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => ({ user: { uid: authHolder.uid } }),
}));

const listHolder: { npcs: Npc[] } = { npcs: [] };
vi.mock('../use-campaign', () => ({
  useCampaign: () => ({
    campaign: { id: 'c-1', gmIds: ['dm-1'] },
    members: [],
    isLoading: false,
  }),
}));
vi.mock('../use-npcs', () => ({
  useNpcs: () => ({ npcs: listHolder.npcs, isLoading: false, error: null, refresh: vi.fn() }),
}));
vi.mock('../npc-edit-modal', () => ({ NpcEditModal: () => null }));

import { NpcDirectoryScreen } from '../npc-directory-screen';

function makeNpc(overrides: Partial<Npc> = {}): Npc {
  return {
    id: 'npc-1',
    name: 'Aldric',
    role: 'merchant',
    location: 'Valombre',
    shortDescription: 'Marchand.',
    publicDescription: '',
    dmNotes: '',
    portrait: { type: 'letter', value: 'A' },
    combatStats: null,
    relationships: [],
    tags: [],
    visibility: 'all',
    createdBy: 'dm-1',
    createdAt: { seconds: 1 },
    updatedAt: { seconds: 1 },
    ...overrides,
  };
}

function renderScreen(): void {
  render(
    <MemoryRouter>
      <NpcDirectoryScreen />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  authHolder.uid = 'dm-1';
  listHolder.npcs = [
    makeNpc({ id: 'pub', name: 'Aldric', visibility: 'all' }),
    makeNpc({ id: 'secret', name: 'Le Masque', role: 'enemy', visibility: 'dm' }),
  ];
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('NpcDirectoryScreen', () => {
  it('le MJ voit le PNJ secret avec son badge', () => {
    authHolder.uid = 'dm-1';
    renderScreen();
    expect(screen.getByText('Le Masque')).toBeInTheDocument();
    expect(screen.getByText(t('npcs.card.secretBadge'))).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: t('npcs.screen.newCta') }),
    ).toBeInTheDocument();
  });

  it("le joueur ne voit ni le badge Secret ni le bouton de création (liste déjà bornée 'all')", () => {
    authHolder.uid = 'p-1';
    // Côté joueur, la rule/service ne renvoie que les 'all' — on simule ça.
    listHolder.npcs = [makeNpc({ id: 'pub', visibility: 'all' })];
    renderScreen();
    expect(screen.queryByText(t('npcs.card.secretBadge'))).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: t('npcs.screen.newCta') }),
    ).not.toBeInTheDocument();
  });
});
