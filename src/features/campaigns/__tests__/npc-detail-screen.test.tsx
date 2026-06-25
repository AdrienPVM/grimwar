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
    useParams: () => ({ cid: 'c-1', npcId: 'npc-1' }),
  };
});

const authHolder: { uid: string } = { uid: 'dm-1' };
vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => ({ user: { uid: authHolder.uid } }),
}));

const npcHolder: { npc: Npc } = { npc: makeNpc() };
vi.mock('../use-campaign', () => ({
  useCampaign: () => ({
    campaign: { id: 'c-1', gmIds: ['dm-1'] },
    members: [{ userId: 'p-1', characterId: 'pj-1' }],
    isLoading: false,
  }),
}));
vi.mock('../use-npcs', () => ({
  useNpc: () => ({ npc: npcHolder.npc, isLoading: false, notFound: false, refresh: vi.fn() }),
}));
vi.mock('../use-linked-character-names', () => ({
  useLinkedCharacterNames: () => ({ 'pj-1': 'Théa' }),
}));
// Modales enfant neutralisées — le test cible le masquage des sections.
vi.mock('../npc-edit-modal', () => ({ NpcEditModal: () => null }));
vi.mock('../npc-relation-modal', () => ({ NpcRelationModal: () => null }));
vi.mock('@/features/journal/journal-markdown', () => ({
  JournalMarkdown: ({ markdown }: { markdown: string }) => <div>{markdown}</div>,
}));

import { NpcDetailScreen } from '../npc-detail-screen';

function makeNpc(overrides: Partial<Npc> = {}): Npc {
  return {
    id: 'npc-1',
    name: 'Aldric',
    role: 'enemy',
    location: 'Donjon',
    shortDescription: 'Un antagoniste.',
    publicDescription: 'DESCRIPTION-PUBLIQUE',
    dmNotes: 'NOTE-SECRETE-MJ',
    portrait: { type: 'letter', value: 'A' },
    combatStats: { hp: 30, ac: 15 },
    relationships: [{ characterId: 'pj-1', attitude: 'hostile' }],
    tags: ['recurring'],
    visibility: 'dm',
    createdBy: 'dm-1',
    createdAt: { seconds: 1 },
    updatedAt: { seconds: 1 },
    ...overrides,
  };
}

function renderScreen(): void {
  render(
    <MemoryRouter>
      <NpcDetailScreen />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  authHolder.uid = 'dm-1';
  npcHolder.npc = makeNpc();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('NpcDetailScreen — masquage MJ', () => {
  it('le MJ voit la description publique, les notes secrètes ET le bloc combat', () => {
    authHolder.uid = 'dm-1';
    renderScreen();
    expect(screen.getByText('DESCRIPTION-PUBLIQUE')).toBeInTheDocument();
    expect(screen.getByText('NOTE-SECRETE-MJ')).toBeInTheDocument();
    expect(screen.getByText(t('npcs.detail.combatHeading'))).toBeInTheDocument();
    expect(screen.getByText(t('npcs.detail.dmNotesHeading'))).toBeInTheDocument();
  });

  it('le joueur voit la description publique mais PAS les notes secrètes ni le bloc combat', () => {
    authHolder.uid = 'p-1';
    // Un PNJ visible des joueurs (sinon il serait notFound côté joueur via les rules).
    npcHolder.npc = makeNpc({ visibility: 'all' });
    renderScreen();
    expect(screen.getByText('DESCRIPTION-PUBLIQUE')).toBeInTheDocument();
    expect(screen.queryByText('NOTE-SECRETE-MJ')).not.toBeInTheDocument();
    expect(screen.queryByText(t('npcs.detail.combatHeading'))).not.toBeInTheDocument();
    expect(screen.queryByText(t('npcs.detail.dmNotesHeading'))).not.toBeInTheDocument();
  });

  it('le MJ voit le badge Secret sur un PNJ dm ; le joueur ne voit pas le bouton Modifier', () => {
    authHolder.uid = 'dm-1';
    renderScreen();
    expect(screen.getByText(t('npcs.detail.secretBadge'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('npcs.detail.edit') })).toBeInTheDocument();
  });
});
