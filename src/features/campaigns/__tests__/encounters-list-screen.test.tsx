import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Campaign, Membership } from '@/shared/types/campaign';
import type { Encounter } from '@/shared/types/encounter';
import type { CreateEncounterInput } from '@/shared/lib/services/encounters';
import type { PlayerParticipantDraft } from '../use-encounter-party-draft';

// ─────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────

const authHolder: { user: { uid: string } | null } = { user: { uid: 'uid-1' } };
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

const encountersHolder: {
  encounters: Encounter[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
} = {
  encounters: [],
  isLoading: false,
  error: null,
  refresh: vi.fn(),
};
vi.mock('../use-encounters', () => ({
  useEncounters: () => encountersHolder,
}));

// Party-draft — pilote les joueurs auto-inclus dans la modale.
const partyHolder: {
  drafts: PlayerParticipantDraft[];
  isLoading: boolean;
  hadReadError: boolean;
} = { drafts: [], isLoading: false, hadReadError: false };
vi.mock('../use-encounter-party-draft', () => ({
  useEncounterPartyDraft: () => partyHolder,
}));

const createEncounterMock = vi.fn();
const renameEncounterMock = vi.fn();
const deleteEncounterMock = vi.fn();
vi.mock('@/shared/lib/services/encounters', () => ({
  createEncounter: (cid: string, input: CreateEncounterInput) =>
    createEncounterMock(cid, input),
  renameEncounter: (...a: unknown[]) => renameEncounterMock(...a),
  deleteEncounter: (...a: unknown[]) => deleteEncounterMock(...a),
  ENCOUNTER_NAME_MAX: 120,
}));

vi.mock('@/shared/lib/firebase', () => ({
  getDb: () => ({}),
}));

import { EncountersListScreen } from '../encounters-list-screen';

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

function mkEncounter(overrides: Partial<Encounter> = {}): Encounter {
  return {
    id: 'e-1',
    name: 'L’embuscade des gobelins',
    sessionId: null,
    status: 'planned',
    round: 0,
    turnIndex: 0,
    participants: [],
    mapId: null,
    fogState: null,
    createdAt: null,
    updatedAt: null,
    startedAt: null,
    endedAt: null,
    ...overrides,
  };
}

function mkDraft(overrides: Partial<PlayerParticipantDraft> = {}): PlayerParticipantDraft {
  return {
    characterId: 'char-a',
    ownerUid: 'p-a',
    name: 'Lyralei',
    maxHp: 24,
    currentHp: 17,
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
  encountersHolder.encounters = [];
  encountersHolder.isLoading = false;
  encountersHolder.error = null;
  encountersHolder.refresh = vi.fn();
  partyHolder.drafts = [];
  partyHolder.isLoading = false;
  partyHolder.hadReadError = false;
  createEncounterMock.mockReset();
  renameEncounterMock.mockReset().mockResolvedValue(undefined);
  deleteEncounterMock.mockReset().mockResolvedValue(undefined);
});

function renderScreen(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={['/campaigns/c-1/encounters']}>
      <Routes>
        <Route path="/campaigns/:cid/encounters" element={<EncountersListScreen />} />
        <Route
          path="/campaigns/:cid/encounters/:eid"
          element={<div>TRACKER {/* EncounterScreen stub */}</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

// ─────────────────────────────────────────────────────────────────────
// Suites
// ─────────────────────────────────────────────────────────────────────

describe('<EncountersListScreen> — empty state', () => {
  it('MJ : message vide + bouton « Créer une rencontre » actif', () => {
    campaignHolder.campaign = mkCampaign({ gmIds: ['uid-1'] });
    renderScreen();
    expect(screen.getByText(/Aucune rencontre pour le moment/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Créer une rencontre' })).toBeEnabled();
  });

  it('joueur (pas MJ) : message vide membre + AUCUN bouton créer', () => {
    campaignHolder.campaign = mkCampaign({ gmIds: ['uid-other'] });
    renderScreen();
    expect(screen.getByText(/Le meneur en créera une au prochain combat/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Créer une rencontre' }),
    ).not.toBeInTheDocument();
  });
});

describe('<EncountersListScreen> — liste avec items', () => {
  it('rend une ligne par rencontre avec nom exact + nb de participants', () => {
    campaignHolder.campaign = mkCampaign();
    encountersHolder.encounters = [
      mkEncounter({
        id: 'e-2',
        name: 'Le pont effondré',
        participants: [
          // 3 participants → « 3 participants » (pluriel)
          { instanceId: 'a' } as never,
          { instanceId: 'b' } as never,
          { instanceId: 'c' } as never,
        ],
      }),
      // 1 participant → « 1 participant » (singulier, pas « 1 participants »)
      mkEncounter({
        id: 'e-1',
        name: 'L’embuscade des gobelins',
        participants: [{ instanceId: 'a' } as never],
      }),
    ];
    renderScreen();
    expect(screen.getByText('Le pont effondré')).toBeInTheDocument();
    expect(screen.getByText('L’embuscade des gobelins')).toBeInTheDocument();
    expect(screen.getByText('3 participants')).toBeInTheDocument();
    expect(screen.getByText('1 participant')).toBeInTheDocument();
    expect(screen.queryByText('1 participants')).not.toBeInTheDocument();
  });

  it('un clic sur une ligne navigue vers le tracker de combat (24.3)', () => {
    campaignHolder.campaign = mkCampaign();
    encountersHolder.encounters = [
      mkEncounter({ id: 'e-7', name: 'Le pont effondré', participants: [{ instanceId: 'a' } as never] }),
    ];
    renderScreen();
    // Ancré au début : la ligne s'appelle « Le pont effondré … », le bouton de
    // gestion « Gérer la rencontre — Le pont effondré » (M7).
    fireEvent.click(screen.getByRole('button', { name: /^Le pont effondré/i }));
    expect(screen.getByText(/TRACKER/)).toBeInTheDocument();
  });

  it('affiche le libellé de statut EXACT pour chaque statut (identité)', () => {
    campaignHolder.campaign = mkCampaign();
    encountersHolder.encounters = [
      mkEncounter({ id: 'e-1', status: 'planned' }),
      mkEncounter({ id: 'e-2', status: 'active' }),
      mkEncounter({ id: 'e-3', status: 'completed' }),
      mkEncounter({ id: 'e-4', status: 'aborted' }),
    ];
    renderScreen();
    expect(screen.getByText('Préparée')).toBeInTheDocument();
    expect(screen.getByText('En cours')).toBeInTheDocument();
    expect(screen.getByText('Terminée')).toBeInTheDocument();
    expect(screen.getByText('Abandonnée')).toBeInTheDocument();
  });
});

describe('<EncountersListScreen> — état erreur', () => {
  it('affiche le panneau erreur + Réessayer relance le refresh', () => {
    campaignHolder.campaign = mkCampaign();
    encountersHolder.error = new Error('permission-denied');
    renderScreen();
    expect(screen.getByText(/Lecture impossible/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Réessayer/i }));
    expect(encountersHolder.refresh).toHaveBeenCalled();
  });
});

describe('<EncounterCreateModal> via screen', () => {
  function openModal(): void {
    fireEvent.click(screen.getByRole('button', { name: 'Créer une rencontre' }));
  }

  it('submit sans nom → erreur visible, service jamais appelé', async () => {
    campaignHolder.campaign = mkCampaign();
    partyHolder.drafts = [mkDraft()];
    renderScreen();
    openModal();
    fireEvent.click(screen.getByRole('button', { name: 'Créer' }));
    await waitFor(() => {
      expect(screen.getByText(/Le nom est obligatoire/i)).toBeInTheDocument();
    });
    expect(createEncounterMock).not.toHaveBeenCalled();
  });

  it('joueurs auto-inclus : createEncounter reçoit les participants joueurs', async () => {
    campaignHolder.campaign = mkCampaign();
    partyHolder.drafts = [mkDraft({ characterId: 'char-a', name: 'Lyralei', maxHp: 24, currentHp: 17 })];
    createEncounterMock.mockResolvedValueOnce({ encounterId: 'e-new' });
    renderScreen();
    openModal();
    // Le joueur auto-inclus est visible dans la section « Personnages de la table ».
    expect(screen.getByText('Lyralei')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Nom de la rencontre/i), {
      target: { value: 'Combat test' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Créer' }));
    await waitFor(() => {
      expect(createEncounterMock).toHaveBeenCalledWith('c-1', {
        name: 'Combat test',
        participants: [
          {
            type: 'player',
            characterId: 'char-a',
            name: 'Lyralei',
            maxHp: 24,
            currentHp: 17,
          },
        ],
      });
    });
    expect(encountersHolder.refresh).toHaveBeenCalled();
  });

  it('monstre qty=2 → 2 participants numérotés + joueurs', async () => {
    campaignHolder.campaign = mkCampaign();
    partyHolder.drafts = [mkDraft({ characterId: 'char-a', name: 'Lyralei', maxHp: 24, currentHp: 24 })];
    createEncounterMock.mockResolvedValueOnce({ encounterId: 'e-new' });
    renderScreen();
    openModal();
    fireEvent.change(screen.getByLabelText(/Nom de la rencontre/i), {
      target: { value: 'Gobelins' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Saisir à la main/i }));
    fireEvent.change(screen.getByPlaceholderText('Ex. « Gobelin »'), {
      target: { value: 'Gobelin' },
    });
    fireEvent.change(screen.getByPlaceholderText('PV'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Créer' }));
    await waitFor(() => {
      expect(createEncounterMock).toHaveBeenCalledTimes(1);
    });
    const [, input] = createEncounterMock.mock.calls[0]!;
    expect((input as CreateEncounterInput).participants).toEqual([
      { type: 'player', characterId: 'char-a', name: 'Lyralei', maxHp: 24, currentHp: 24 },
      { type: 'monster', monsterContentId: null, name: 'Gobelin 1', maxHp: 7 },
      { type: 'monster', monsterContentId: null, name: 'Gobelin 2', maxHp: 7 },
    ]);
  });

  it('monstre sans PV → erreur PV, service jamais appelé', async () => {
    campaignHolder.campaign = mkCampaign();
    partyHolder.drafts = [mkDraft()];
    renderScreen();
    openModal();
    fireEvent.change(screen.getByLabelText(/Nom de la rencontre/i), {
      target: { value: 'Combat' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Saisir à la main/i }));
    fireEvent.change(screen.getByPlaceholderText('Ex. « Gobelin »'), {
      target: { value: 'Gobelin' },
    });
    // PV laissé vide.
    fireEvent.click(screen.getByRole('button', { name: 'Créer' }));
    await waitFor(() => {
      expect(screen.getByText(/PV de chaque monstre doivent être supérieurs à 0/i)).toBeInTheDocument();
    });
    expect(createEncounterMock).not.toHaveBeenCalled();
  });

  it('aucun participant (ni joueur ni monstre) → erreur dédiée', async () => {
    campaignHolder.campaign = mkCampaign();
    partyHolder.drafts = []; // aucune fiche liée
    renderScreen();
    openModal();
    fireEvent.change(screen.getByLabelText(/Nom de la rencontre/i), {
      target: { value: 'Vide' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Créer' }));
    await waitFor(() => {
      expect(
        screen.getByText(/Ajoute au moins un personnage ou un monstre/i),
      ).toBeInTheDocument();
    });
    expect(createEncounterMock).not.toHaveBeenCalled();
  });

  it('erreur create → message générique, refresh non appelé', async () => {
    campaignHolder.campaign = mkCampaign();
    partyHolder.drafts = [mkDraft()];
    createEncounterMock.mockRejectedValueOnce(new Error('boom'));
    renderScreen();
    openModal();
    fireEvent.change(screen.getByLabelText(/Nom de la rencontre/i), {
      target: { value: 'Test' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Créer' }));
    await waitFor(() => {
      expect(screen.getByText(/La création n['']a pas abouti/i)).toBeInTheDocument();
    });
    expect(encountersHolder.refresh).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────
// Gestion d'une rencontre — M7 (audit de malléabilité)
//
// Ni renommage ni suppression n'existaient : une rencontre mal nommée le
// restait, une rencontre créée par erreur encombrait la liste pour toujours —
// alors que `firestore.rules:338` autorisait déjà les deux.
// ─────────────────────────────────────────────────────────────────────

describe('<EncountersListScreen> — gestion MJ (M7)', () => {
  it('le geste de gestion est réservé au MJ', () => {
    campaignHolder.campaign = mkCampaign({ gmIds: ['uid-other'] });
    encountersHolder.encounters = [mkEncounter()];
    renderScreen();
    expect(
      screen.queryByRole('button', { name: /Gérer la rencontre/ }),
    ).not.toBeInTheDocument();
  });

  it('renomme une rencontre saisie à la hâte', async () => {
    campaignHolder.campaign = mkCampaign();
    encountersHolder.encounters = [mkEncounter({ name: 'Embuscade' })];
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: /Gérer la rencontre — Embuscade/ }));
    fireEvent.change(screen.getByLabelText('Nom de la rencontre'), {
      target: { value: 'Le guet-apens du col' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Renommer' }));

    await waitFor(() =>
      expect(renameEncounterMock).toHaveBeenCalledWith('c-1', 'e-1', 'Le guet-apens du col'),
    );
    await waitFor(() => expect(encountersHolder.refresh).toHaveBeenCalled());
  });

  it('« Renommer » reste désactivé tant que le nom n’a pas changé', () => {
    campaignHolder.campaign = mkCampaign();
    encountersHolder.encounters = [mkEncounter({ name: 'Embuscade' })];
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /Gérer la rencontre — Embuscade/ }));
    expect(screen.getByRole('button', { name: 'Renommer' })).toBeDisabled();
  });

  it('la suppression se fait en deux temps', async () => {
    campaignHolder.campaign = mkCampaign();
    encountersHolder.encounters = [mkEncounter({ name: 'Embuscade' })];
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: /Gérer la rencontre — Embuscade/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer la rencontre' }));
    expect(deleteEncounterMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la suppression' }));
    await waitFor(() => expect(deleteEncounterMock).toHaveBeenCalledWith('c-1', 'e-1'));
  });
});
