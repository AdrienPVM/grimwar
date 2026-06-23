import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';
import type { Campaign, Membership } from '@/shared/types/campaign';

// ─────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────

const authHolder: { user: { uid: string } | null } = { user: { uid: 'gm-1' } };
vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => authHolder,
}));

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

// La souscription cross-owner est mockée : on contrôle (characterId, ownerUid)
// reçus pour vérifier que l'écran cible bien le bon sous-arbre.
const charHolder: {
  character: Character | null;
  isLoading: boolean;
  error: Error | null;
} = { character: null, isLoading: false, error: null };
const useCharacterSpy = vi.fn();
vi.mock('@/features/sheet/use-character', () => ({
  useCharacter: (characterId: string | undefined, ownerUid?: string) => {
    useCharacterSpy(characterId, ownerUid);
    return charHolder;
  },
}));

// CharacterSheet stubé en marqueur : on n'a pas besoin de toute la machinerie de
// fiche, juste de vérifier qu'il reçoit le bon personnage en lecture seule.
const characterSheetSpy = vi.fn();
vi.mock('@/features/sheet/character-sheet', () => ({
  CharacterSheet: (props: { character: Character; showRollHistory?: boolean }) => {
    characterSheetSpy(props);
    return (
      <div data-testid="character-sheet" data-show-history={String(props.showRollHistory)}>
        {props.character.name}
      </div>
    );
  },
}));

// PermissionProvider stubé pour capturer la valeur du contexte (canEdit/isDM).
const permissionValueHolder: { value: unknown } = { value: undefined };
vi.mock('@/features/sheet/permissions-context', () => ({
  PermissionProvider: ({
    value,
    children,
  }: {
    value: unknown;
    children: ReactNode;
  }) => {
    permissionValueHolder.value = value;
    return <>{children}</>;
  },
}));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return { ...actual, useNavigate: () => navigateMock };
});

import { CampaignMemberSheetScreen } from '../campaign-member-sheet-screen';

// ─────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────

function mkCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'c-1',
    name: 'Tempête sur Caer Dûn',
    description: '',
    gmIds: ['gm-1'],
    createdBy: 'gm-1',
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
    userId: 'player-2',
    role: 'member',
    characterId: null,
    joinedAt: null,
    schemaVersion: 1,
    ...overrides,
  };
}

const FAKE_CHARACTER = { id: 'char-9', name: 'Lyra du Crépuscule' } as unknown as Character;

afterEach(() => {
  campaignHolder.campaign = null;
  campaignHolder.members = [];
  campaignHolder.isLoading = false;
  campaignHolder.error = null;
  charHolder.character = null;
  charHolder.isLoading = false;
  charHolder.error = null;
  authHolder.user = { uid: 'gm-1' };
  navigateMock.mockReset();
  useCharacterSpy.mockReset();
  characterSheetSpy.mockReset();
  permissionValueHolder.value = undefined;
});

function renderScreen(
  cid = 'c-1',
  memberUid = 'player-2',
): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[`/campaigns/${cid}/members/${memberUid}/sheet`]}>
      <Routes>
        <Route
          path="/campaigns/:cid/members/:memberUid/sheet"
          element={<CampaignMemberSheetScreen />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

// ─────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────

describe('<CampaignMemberSheetScreen>', () => {
  it('rend un Splash pendant le chargement de la campagne', () => {
    campaignHolder.isLoading = true;
    renderScreen();
    expect(screen.queryByTestId('character-sheet')).not.toBeInTheDocument();
    expect(screen.queryByText(/Accès réservé/i)).not.toBeInTheDocument();
  });

  it('refuse un viewer qui n’est pas MJ de la campagne', () => {
    authHolder.user = { uid: 'player-2' };
    campaignHolder.campaign = mkCampaign({ gmIds: ['gm-1'] });
    campaignHolder.members = [mkMember({ userId: 'player-2', characterId: 'char-9' })];
    renderScreen();
    expect(screen.getByText(/Accès réservé au meneur/i)).toBeInTheDocument();
    expect(screen.queryByTestId('character-sheet')).not.toBeInTheDocument();
  });

  it('affiche « Membre introuvable » si le memberUid n’est pas dans le roster', () => {
    campaignHolder.campaign = mkCampaign({ gmIds: ['gm-1'] });
    campaignHolder.members = [mkMember({ userId: 'autre-joueur' })];
    renderScreen('c-1', 'player-2');
    expect(screen.getByText(/Membre introuvable/i)).toBeInTheDocument();
  });

  it('affiche « Aucune fiche liée » quand le membre n’a pas de characterId', () => {
    campaignHolder.campaign = mkCampaign({ gmIds: ['gm-1'] });
    campaignHolder.members = [mkMember({ userId: 'player-2', characterId: null })];
    renderScreen();
    expect(screen.getByText(/Aucune fiche liée/i)).toBeInTheDocument();
    // La souscription cross-owner reste inerte (pas de characterId).
    expect(useCharacterSpy).toHaveBeenCalledWith(undefined, 'player-2');
  });

  it('affiche « Fiche inaccessible » sur erreur de lecture cross-owner', () => {
    campaignHolder.campaign = mkCampaign({ gmIds: ['gm-1'] });
    campaignHolder.members = [mkMember({ userId: 'player-2', characterId: 'char-9' })];
    charHolder.error = new Error('permission-denied');
    renderScreen();
    expect(screen.getByText(/Fiche inaccessible/i)).toBeInTheDocument();
  });

  it('rend la fiche en LECTURE SEULE quand MJ + membre lié + fiche chargée', () => {
    campaignHolder.campaign = mkCampaign({ gmIds: ['gm-1'] });
    campaignHolder.members = [mkMember({ userId: 'player-2', characterId: 'char-9' })];
    charHolder.character = FAKE_CHARACTER;
    renderScreen();

    // Cible bien le sous-arbre du joueur (ownerUid = player-2).
    expect(useCharacterSpy).toHaveBeenCalledWith('char-9', 'player-2');
    // Sheet rendu, FAB historique masqué (lecture cross-owner).
    const sheet = screen.getByTestId('character-sheet');
    expect(sheet).toHaveTextContent('Lyra du Crépuscule');
    expect(characterSheetSpy).toHaveBeenCalledWith(
      expect.objectContaining({ showRollHistory: false }),
    );
    // Contexte de permission : non éditable, vue MJ.
    expect(permissionValueHolder.value).toEqual({ canEdit: false, isDM: true });
    // Bandeau « Lecture seule » + identité du joueur.
    expect(screen.getByText(/Lecture seule/i)).toBeInTheDocument();
    expect(screen.getByText(/Fiche de/i)).toBeInTheDocument();
  });

  it('clic « Retour à la campagne » navigue vers le détail de la campagne', () => {
    campaignHolder.campaign = mkCampaign({ gmIds: ['gm-1'] });
    campaignHolder.members = [mkMember({ userId: 'player-2', characterId: 'char-9' })];
    charHolder.character = FAKE_CHARACTER;
    renderScreen();

    const backButtons = screen.getAllByRole('button', {
      name: /Retour à la campagne/i,
    });
    fireEvent.click(backButtons[0]!);
    expect(navigateMock).toHaveBeenCalledWith('/campaigns/c-1');
  });
});
