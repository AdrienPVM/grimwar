import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Campaign, Membership } from '@/shared/types/campaign';
import type { Encounter, EncounterParticipant } from '@/shared/types/encounter';
import type { GameEvent } from '@/shared/types/event';

// ─────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────

const authHolder: { user: { uid: string } | null } = { user: { uid: 'uid-gm' } };
vi.mock('@/features/auth/use-auth', () => ({ useAuth: () => authHolder }));

const campaignHolder: {
  campaign: Campaign | null;
  members: Membership[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
} = { campaign: null, members: [], isLoading: false, error: null, refresh: vi.fn() };
vi.mock('../use-campaign', () => ({ useCampaign: () => campaignHolder }));

const encounterHolder: {
  encounter: Encounter | null;
  isLoading: boolean;
  error: Error | null;
} = { encounter: null, isLoading: false, error: null };
vi.mock('../use-encounter', () => ({ useEncounter: () => encounterHolder }));

// Feed d'événements — alimente le hand-off des dégâts (step 7b, tous modes).
const eventsHolder: { events: GameEvent[] } = { events: [] };
vi.mock('../use-campaign-events', () => ({
  useCampaignEvents: () => ({ events: eventsHolder.events, isLoading: false, error: null }),
  CAMPAIGN_EVENTS_LIMIT: 20,
}));

// d20 fixe → jets déterministes (init = 10 + mod).
vi.mock('@/shared/lib/dice/roller', () => ({ rollDieCrypto: () => 10 }));

// Modificateurs résolus à 0 (la résolution cross-owner est testée à part).
const resolveModsMock = vi.fn(
  async (participants: readonly EncounterParticipant[], _members: unknown) =>
    new Map<string, number>(participants.map((p) => [p.instanceId, 0])),
);
vi.mock('../resolve-initiative-modifiers', () => ({
  resolveInitiativeModifiers: (p: readonly EncounterParticipant[], m: unknown) =>
    resolveModsMock(p, m),
}));

// Partial mock du service : on garde les helpers PURS (rollInitiativeFor,
// applyInitiative, EncounterServiceError) et on mocke les écritures I/O.
const startEncounterMock = vi.fn();
const advanceTurnMock = vi.fn();
const endEncounterMock = vi.fn();
const setParticipantsMock = vi.fn();
const applyInitiativeRollsMock = vi.fn();
const applyParticipantHpDeltaMock = vi.fn();
const setParticipantConditionMock = vi.fn();
const updateParticipantMock = vi.fn();
const removeParticipantMock = vi.fn();
const addParticipantMock = vi.fn();
const rewindTurnMock = vi.fn();
const reopenEncounterMock = vi.fn();
vi.mock('@/shared/lib/services/encounters', async (importActual) => {
  const actual = await importActual<typeof import('@/shared/lib/services/encounters')>();
  return {
    ...actual,
    startEncounter: (...a: unknown[]) => startEncounterMock(...a),
    advanceTurn: (...a: unknown[]) => advanceTurnMock(...a),
    endEncounter: (...a: unknown[]) => endEncounterMock(...a),
    setParticipants: (...a: unknown[]) => setParticipantsMock(...a),
    applyInitiativeRolls: (...a: unknown[]) => applyInitiativeRollsMock(...a),
    applyParticipantHpDelta: (...a: unknown[]) => applyParticipantHpDeltaMock(...a),
    setParticipantCondition: (...a: unknown[]) => setParticipantConditionMock(...a),
    updateParticipant: (...a: unknown[]) => updateParticipantMock(...a),
    removeParticipant: (...a: unknown[]) => removeParticipantMock(...a),
    addParticipant: (...a: unknown[]) => addParticipantMock(...a),
    rewindTurn: (...a: unknown[]) => rewindTurnMock(...a),
    reopenEncounter: (...a: unknown[]) => reopenEncounterMock(...a),
  };
});

const logEncounterStartMock = vi.fn();
const logTurnStartMock = vi.fn();
const logEncounterEndMock = vi.fn();
const logMonsterHpChangeMock = vi.fn();
vi.mock('@/shared/lib/event-logger', () => ({
  logEncounterStart: (...a: unknown[]) => logEncounterStartMock(...a),
  logTurnStart: (...a: unknown[]) => logTurnStartMock(...a),
  logEncounterEnd: (...a: unknown[]) => logEncounterEndMock(...a),
  logMonsterHpChange: (...a: unknown[]) => logMonsterHpChangeMock(...a),
}));

// Catalogue d'états minimal pour le contrôle MJ (libellés localisés). Le mock
// est TYPÉ PAR CATÉGORIE : l'écran lit aussi `monsters` (modificateur d'init
// dérivé de la DEX, M3), et lui servir des états produirait des entrées sans
// `abilities` — une forme que le schéma de contenu interdit.
vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => ({
    data:
      type === 'conditions'
        ? [
            { id: 'prone', name: { fr: 'À terre', en: 'Prone' }, description: { fr: '', en: '' }, source: 'srd-5.2.1' },
            { id: 'poisoned', name: { fr: 'Empoisonné', en: 'Poisoned' }, description: { fr: '', en: '' }, source: 'srd-5.2.1' },
          ]
        : [],
    loading: false,
    error: null,
    scopeOf: () => ({ scope: 'public' as const }),
  }),
}));

vi.mock('@/shared/lib/firebase', () => ({ getDb: () => ({}) }));

// Le contrôle de PV d'un PJ (M5) tire toute la pile de fiche (`useCharacter`
// temps-réel + omni-edit). Ici on ne teste que le CÂBLAGE : quelle modale
// s'ouvre, sur quelle fiche, et ce que le tracker fait du retour. Le contenu de
// la modale a son propre test (`player-control-modal.test.tsx`).
vi.mock('../player-control-modal', () => ({
  PlayerControlModal: ({
    characterId,
    ownerUid,
    onApplied,
  }: {
    characterId: string;
    ownerUid: string;
    onApplied: (currentHp: number, maxHp: number) => void;
  }) => (
    <div data-testid="player-control">
      {characterId}@{ownerUid}
      <button type="button" onClick={() => onApplied(9, 20)}>
        STUB_APPLY
      </button>
    </div>
  ),
}));

import { EncounterScreen } from '../encounter-screen';
import { t } from '@/shared/lib/i18n';
import { EncounterServiceError } from '@/shared/lib/services/encounters';
import { useActiveCampaignStore } from '@/shared/lib/slices/active-campaign-slice';

// ─────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────

function mkCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'c-1',
    name: 'Tempête sur Caer Dûn',
    description: '',
    gmIds: ['uid-gm'],
    createdBy: 'uid-gm',
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

function mkMembership(overrides: Partial<Membership> = {}): Membership {
  return {
    userId: 'uid-player',
    role: 'member',
    characterId: null,
    displayName: 'Lyralei',
    photoURL: null,
    joinedAt: null,
    schemaVersion: 1,
    ...overrides,
  };
}

function mkParticipant(overrides: Partial<EncounterParticipant> = {}): EncounterParticipant {
  return {
    type: 'player',
    characterId: 'char-a',
    monsterContentId: null,
    instanceId: 'inst-a',
    name: 'Lyralei',
    initiative: 0,
    currentHp: 20,
    maxHp: 20,
    tempHp: 0,
    conditions: [],
    position: null,
    notes: '',
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
    participants: [
      mkParticipant(),
      mkParticipant({
        type: 'monster',
        characterId: null,
        instanceId: 'inst-gob',
        name: 'Gobelin 1',
        currentHp: 7,
        maxHp: 7,
      }),
    ],
    mapId: null,
    fogState: null,
    createdAt: null,
    updatedAt: null,
    startedAt: null,
    endedAt: null,
    ...overrides,
  };
}

function mkRollEvent(overrides: Partial<GameEvent> = {}): GameEvent {
  return {
    id: 'ev-roll',
    kind: 'roll',
    actorUserId: 'uid-player',
    actorCharacterId: 'char-a',
    targetCharacterId: null,
    sessionId: null,
    encounterId: 'e-1',
    visibility: 'all',
    createdAt: null,
    payload: { label: 'Épée longue', rollKind: 'damage', mode: 'physical', total: 6 },
    ...overrides,
  };
}

afterEach(() => {
  authHolder.user = { uid: 'uid-gm' };
  campaignHolder.campaign = null;
  campaignHolder.members = [];
  campaignHolder.isLoading = false;
  campaignHolder.error = null;
  encounterHolder.encounter = null;
  encounterHolder.isLoading = false;
  encounterHolder.error = null;
  eventsHolder.events = [];
  resolveModsMock.mockClear();
  startEncounterMock.mockReset();
  advanceTurnMock.mockReset();
  endEncounterMock.mockReset();
  setParticipantsMock.mockReset();
  applyInitiativeRollsMock.mockReset();
  applyParticipantHpDeltaMock.mockReset();
  setParticipantConditionMock.mockReset();
  logEncounterStartMock.mockReset();
  logTurnStartMock.mockReset();
  logEncounterEndMock.mockReset();
  logMonsterHpChangeMock.mockReset();
  useActiveCampaignStore.getState().clearActiveCampaign();
});

function renderScreen(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={['/campaigns/c-1/encounters/e-1']}>
      <Routes>
        <Route path="/campaigns/:cid/encounters/:eid" element={<EncounterScreen />} />
        <Route path="/campaigns/:cid/encounters" element={<div>LISTE RENCONTRES</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

// ─────────────────────────────────────────────────────────────────────
// Suites
// ─────────────────────────────────────────────────────────────────────

describe('<EncounterScreen> — état planned (MJ)', () => {
  it('affiche les boutons « Lancer l’initiative » et « Démarrer le combat »', () => {
    campaignHolder.campaign = mkCampaign();
    encounterHolder.encounter = mkEncounter();
    renderScreen();
    expect(screen.getByRole('button', { name: 'Lancer l’initiative' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Démarrer le combat' })).toBeEnabled();
    // Hint « ordre pas encore établi » + init affichée « — ».
    expect(screen.getByText(/Lance l’initiative pour établir l’ordre/i)).toBeInTheDocument();
  });

  // DEBT D31 volet 1 — l'écriture passe par `applyInitiativeRolls` (relecture
  // serveur), jamais par `setParticipants` depuis la closure : sinon un jet
  // d'initiative réécrase les PV/états appliqués entre-temps.
  it('« Lancer l’initiative » → applyInitiativeRolls reçoit les jets (total 10)', async () => {
    campaignHolder.campaign = mkCampaign();
    encounterHolder.encounter = mkEncounter();
    applyInitiativeRollsMock.mockResolvedValueOnce([]);
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Lancer l’initiative' }));
    await waitFor(() => expect(applyInitiativeRollsMock).toHaveBeenCalledTimes(1));
    const [cid, eid, rolls] = applyInitiativeRollsMock.mock.calls[0]!;
    expect(cid).toBe('c-1');
    expect(eid).toBe('e-1');
    expect((rolls as { total: number }[]).every((r) => r.total === 10)).toBe(true);
    // Le tableau complet n'est plus réécrit depuis la closure UI.
    expect(setParticipantsMock).not.toHaveBeenCalled();
  });

  it('« Démarrer le combat » → startEncounter + loggers + pointeur posé', async () => {
    campaignHolder.campaign = mkCampaign();
    encounterHolder.encounter = mkEncounter();
    startEncounterMock.mockResolvedValueOnce(undefined);
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Démarrer le combat' }));
    await waitFor(() => expect(startEncounterMock).toHaveBeenCalledWith('c-1', 'e-1'));
    expect(logEncounterStartMock).toHaveBeenCalledWith('e-1', {
      name: 'L’embuscade des gobelins',
      participantCount: 2,
    });
    // Tour du 1ᵉʳ participant journalisé.
    expect(logTurnStartMock).toHaveBeenCalledWith('e-1', {
      participantId: 'inst-a',
      participantName: 'Lyralei',
      round: 1,
    });
    // Pointeur de rencontre active posé pour le tag des events.
    expect(useActiveCampaignStore.getState().activeEncounterId).toBe('e-1');
    expect(useActiveCampaignStore.getState().activeCampaignId).toBe('c-1');
  });

  it('erreur « une autre rencontre active » → message dédié', async () => {
    campaignHolder.campaign = mkCampaign();
    encounterHolder.encounter = mkEncounter();
    startEncounterMock.mockRejectedValueOnce(
      new EncounterServiceError('another-encounter-active', 'boom'),
    );
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Démarrer le combat' }));
    await waitFor(() =>
      expect(screen.getByText(/Une autre rencontre est déjà en cours/i)).toBeInTheDocument(),
    );
  });
});

describe('<EncounterScreen> — état active (MJ)', () => {
  it('« Fin du tour » → advanceTurn + turn-start du nouveau participant actif', async () => {
    campaignHolder.campaign = mkCampaign();
    encounterHolder.encounter = mkEncounter({ status: 'active', round: 1, turnIndex: 0 });
    advanceTurnMock.mockResolvedValueOnce({ round: 1, turnIndex: 1 });
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Fin du tour' }));
    await waitFor(() => expect(advanceTurnMock).toHaveBeenCalledWith('c-1', 'e-1'));
    expect(logTurnStartMock).toHaveBeenCalledWith('e-1', {
      participantId: 'inst-gob',
      participantName: 'Gobelin 1',
      round: 1,
    });
  });

  it('« Clôturer » révèle le sélecteur d’issue ; « Victoire » → endEncounter + log + pointeur libéré', async () => {
    campaignHolder.campaign = mkCampaign();
    encounterHolder.encounter = mkEncounter({ status: 'active', round: 2, turnIndex: 0 });
    endEncounterMock.mockResolvedValueOnce(undefined);
    // Simule un combat en cours : pointeur déjà posé.
    useActiveCampaignStore.getState().setActiveEncounter('e-1');
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Clôturer le combat' }));
    expect(screen.getByText('Issue du combat')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Victoire' }));
    await waitFor(() => expect(endEncounterMock).toHaveBeenCalledWith('c-1', 'e-1'));
    expect(logEncounterEndMock).toHaveBeenCalledWith('e-1', {
      name: 'L’embuscade des gobelins',
      outcome: 'victory',
    });
    expect(useActiveCampaignStore.getState().activeEncounterId).toBeNull();
  });

  it('affiche « Round N » et surligne le participant dont c’est le tour', () => {
    campaignHolder.campaign = mkCampaign();
    encounterHolder.encounter = mkEncounter({
      status: 'active',
      round: 3,
      turnIndex: 1,
      participants: [
        mkParticipant({ initiative: 18 }),
        mkParticipant({
          type: 'monster',
          characterId: null,
          instanceId: 'inst-gob',
          name: 'Gobelin 1',
          initiative: 12,
          currentHp: 7,
          maxHp: 7,
        }),
      ],
    });
    renderScreen();
    expect(screen.getByText(/Round\s*3/)).toBeInTheDocument();
    // Le participant actif (index 1 = Gobelin 1) porte aria-current. On scope la
    // strip d'ordre d'initiative (le nom apparaît aussi dans la vue de groupe).
    const turnList = screen.getByRole('list', { name: /Ordre d’initiative/ });
    const active = within(turnList).getByText('Gobelin 1').closest('li');
    expect(active).toHaveAttribute('aria-current', 'true');
    // Init affichée (ordre établi).
    expect(within(turnList).getByText(/Init\.\s*18/)).toBeInTheDocument();
  });
});

describe('<EncounterScreen> — contrôle MJ des monstres (step 7)', () => {
  it('le MJ voit « PV / États » sur la carte monstre', () => {
    campaignHolder.campaign = mkCampaign();
    encounterHolder.encounter = mkEncounter({ status: 'active', round: 1, turnIndex: 0 });
    renderScreen();
    expect(
      screen.getByRole('button', { name: /PV \/ États — Gobelin 1/ }),
    ).toBeInTheDocument();
    // La modale de monstre ne s'ouvre jamais sur un PJ : ses PV vivent sur sa
    // fiche, et c'est un autre contrôle (M5).
    expect(
      screen.queryByRole('button', { name: /PV \/ États — Lyralei/ }),
    ).not.toBeInTheDocument();
  });

  it('un PJ dont la fiche n’est pas joignable n’offre aucun contrôle', () => {
    campaignHolder.campaign = mkCampaign();
    // Aucun membre lié : `characterId` du participant ne résout sur aucun
    // propriétaire, donc il n'y a nulle part où écrire.
    campaignHolder.members = [];
    encounterHolder.encounter = mkEncounter({ status: 'active', round: 1, turnIndex: 0 });
    renderScreen();
    expect(
      screen.queryByRole('button', { name: /Points de vie — Lyralei/ }),
    ).not.toBeInTheDocument();
  });

  it('ouvre la modale, applique −5 → applyParticipantHpDelta + logMonsterHpChange + pointeur', async () => {
    campaignHolder.campaign = mkCampaign();
    encounterHolder.encounter = mkEncounter({ status: 'active', round: 1, turnIndex: 0 });
    applyParticipantHpDeltaMock.mockResolvedValueOnce({ before: 7, after: 2 });
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /PV \/ États — Gobelin 1/ }));
    // La modale s'ouvre avec le nom du monstre.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '−5' }));
    await waitFor(() =>
      expect(applyParticipantHpDeltaMock).toHaveBeenCalledWith('c-1', 'e-1', 'inst-gob', -5),
    );
    expect(logMonsterHpChangeMock).toHaveBeenCalledWith('e-1', {
      monsterInstanceId: 'inst-gob',
      monsterName: 'Gobelin 1',
      before: 7,
      after: 2,
    });
    // Pointeur de rencontre posé pour le tag de l'event.
    expect(useActiveCampaignStore.getState().activeEncounterId).toBe('e-1');
  });

  it('ne journalise PAS si les PV n’ont pas changé (delta absorbé)', async () => {
    campaignHolder.campaign = mkCampaign();
    encounterHolder.encounter = mkEncounter({ status: 'active', round: 1, turnIndex: 0 });
    applyParticipantHpDeltaMock.mockResolvedValueOnce({ before: 7, after: 7 });
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /PV \/ États — Gobelin 1/ }));
    fireEvent.click(screen.getByRole('button', { name: '+5' }));
    await waitFor(() => expect(applyParticipantHpDeltaMock).toHaveBeenCalledTimes(1));
    expect(logMonsterHpChangeMock).not.toHaveBeenCalled();
  });

  it('bascule un état → setParticipantCondition(add)', async () => {
    campaignHolder.campaign = mkCampaign();
    encounterHolder.encounter = mkEncounter({ status: 'active', round: 1, turnIndex: 0 });
    setParticipantConditionMock.mockResolvedValueOnce(undefined);
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /PV \/ États — Gobelin 1/ }));
    fireEvent.click(screen.getByRole('button', { name: 'À terre' }));
    await waitFor(() =>
      expect(setParticipantConditionMock).toHaveBeenCalledWith('c-1', 'e-1', 'inst-gob', 'prone', 'add'),
    );
  });

  it('affiche les états actifs en chips sur la carte', () => {
    campaignHolder.campaign = mkCampaign();
    encounterHolder.encounter = mkEncounter({
      status: 'active',
      round: 1,
      turnIndex: 0,
      participants: [
        mkParticipant(),
        mkParticipant({
          type: 'monster',
          characterId: null,
          instanceId: 'inst-gob',
          name: 'Gobelin 1',
          currentHp: 7,
          maxHp: 7,
          conditions: ['poisoned'],
        }),
      ],
    });
    renderScreen();
    // En combat, le libellé localisé de l'état apparaît sur la carte d'initiative
    // (source unique : plus de doublon avec une vue de groupe).
    const turnList = screen.getByRole('list', { name: /Ordre d’initiative/ });
    expect(within(turnList).getByText('Empoisonné')).toBeInTheDocument();
  });
});

describe('<EncounterScreen> — dégâts sur un PJ depuis le tracker (M5)', () => {
  it('un PJ dont la fiche est liée ouvre le contrôle de PV', () => {
    campaignHolder.campaign = mkCampaign();
    campaignHolder.members = [mkMembership({ characterId: 'char-a' })];
    encounterHolder.encounter = mkEncounter({ status: 'active', round: 1, turnIndex: 0 });
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: /Points de vie — Lyralei/ }));
    expect(screen.getByTestId('player-control')).toHaveTextContent('char-a@uid-player');
  });

  it('les PV appliqués sur la fiche se reflètent sur la carte du tracker', async () => {
    campaignHolder.campaign = mkCampaign();
    campaignHolder.members = [mkMembership({ characterId: 'char-a' })];
    encounterHolder.encounter = mkEncounter({ status: 'active', round: 1, turnIndex: 0 });
    updateParticipantMock.mockResolvedValueOnce(undefined);
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: /Points de vie — Lyralei/ }));
    fireEvent.click(screen.getByRole('button', { name: 'STUB_APPLY' }));

    // Les PV du participant joueur étaient un instantané figé à la création :
    // la carte affichait 20/20 pendant que le PJ agonisait.
    await waitFor(() =>
      expect(updateParticipantMock).toHaveBeenCalledWith('c-1', 'e-1', 'inst-a', {
        currentHp: 9,
        maxHp: 20,
      }),
    );
  });

  it('le joueur ne voit aucun contrôle de PV, même sur sa propre carte', () => {
    campaignHolder.campaign = mkCampaign({ gmIds: ['uid-other'] });
    campaignHolder.members = [mkMembership({ characterId: 'char-a' })];
    encounterHolder.encounter = mkEncounter({ status: 'active', round: 1, turnIndex: 0 });
    renderScreen();
    expect(
      screen.queryByRole('button', { name: /Points de vie — Lyralei/ }),
    ).not.toBeInTheDocument();
  });
});

describe('<EncounterScreen> — cycle de vie réparable (M7)', () => {
  it('« Tour précédent » recule d’un tour sans réémettre `turn-start`', async () => {
    campaignHolder.campaign = mkCampaign();
    encounterHolder.encounter = mkEncounter({ status: 'active', round: 3, turnIndex: 1 });
    rewindTurnMock.mockResolvedValueOnce({ round: 3, turnIndex: 0 });
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: 'Tour précédent' }));
    await waitFor(() => expect(rewindTurnMock).toHaveBeenCalledWith('c-1', 'e-1'));
    // Revenir en arrière corrige la feuille de suivi ; le récit ne rejoue pas
    // le tour (sinon le journal l'inscrirait deux fois).
    expect(logTurnStartMock).not.toHaveBeenCalled();
  });

  it('« Tour précédent » est inerte au tout premier tour du combat', () => {
    campaignHolder.campaign = mkCampaign();
    encounterHolder.encounter = mkEncounter({ status: 'active', round: 1, turnIndex: 0 });
    renderScreen();
    expect(screen.getByRole('button', { name: 'Tour précédent' })).toBeDisabled();
  });

  it('« Abandonner » écrit le statut `aborted` et NE journalise aucune issue', async () => {
    campaignHolder.campaign = mkCampaign();
    encounterHolder.encounter = mkEncounter({ status: 'active', round: 2, turnIndex: 0 });
    endEncounterMock.mockResolvedValueOnce(undefined);
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: 'Clôturer le combat' }));
    fireEvent.click(screen.getByRole('button', { name: 'Abandonner le combat' }));

    await waitFor(() => expect(endEncounterMock).toHaveBeenCalledWith('c-1', 'e-1', 'aborted'));
    // Un combat abandonné n'a pas d'issue : victoire / défaite / fuite
    // mentiraient toutes les trois.
    expect(logEncounterEndMock).not.toHaveBeenCalled();
  });

  it('une rencontre close propose « Rouvrir » au MJ, et rien d’autre', async () => {
    campaignHolder.campaign = mkCampaign();
    encounterHolder.encounter = mkEncounter({ status: 'completed', round: 4, turnIndex: 2 });
    reopenEncounterMock.mockResolvedValueOnce(undefined);
    renderScreen();

    expect(screen.queryByRole('button', { name: 'Fin du tour' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rouvrir le combat' }));
    await waitFor(() => expect(reopenEncounterMock).toHaveBeenCalledWith('c-1', 'e-1'));
    // Le tracker redevient la scène en cours.
    expect(useActiveCampaignStore.getState().activeEncounterId).toBe('e-1');
  });

  it('le joueur ne voit pas « Rouvrir » sur une rencontre close', () => {
    campaignHolder.campaign = mkCampaign({ gmIds: ['uid-other'] });
    encounterHolder.encounter = mkEncounter({ status: 'completed', round: 4, turnIndex: 0 });
    renderScreen();
    expect(screen.queryByRole('button', { name: 'Rouvrir le combat' })).not.toBeInTheDocument();
  });

  it('une réouverture refusée (autre combat actif) affiche le message dédié', async () => {
    campaignHolder.campaign = mkCampaign();
    encounterHolder.encounter = mkEncounter({ status: 'completed', round: 2, turnIndex: 0 });
    reopenEncounterMock.mockRejectedValueOnce(
      new EncounterServiceError('another-encounter-active', 'busy'),
    );
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: 'Rouvrir le combat' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        t('encounters.action.error.anotherActive'),
      ),
    );
  });
});

describe('<EncounterScreen> — tracker éditable (M2 / M3)', () => {
  it('le MJ peut faire entrer un renfort EN PLEIN combat', async () => {
    campaignHolder.campaign = mkCampaign();
    encounterHolder.encounter = mkEncounter({ status: 'active', round: 3, turnIndex: 0 });
    addParticipantMock.mockResolvedValueOnce({ instanceId: 'inst-new' });
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un combattant' }));
    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Chef gobelin' } });
    fireEvent.change(screen.getByLabelText('PV'), { target: { value: '21' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter au combat' }));

    await waitFor(() =>
      expect(addParticipantMock).toHaveBeenCalledWith('c-1', 'e-1', {
        type: 'monster',
        name: 'Chef gobelin',
        maxHp: 21,
        monsterContentId: null,
      }),
    );
  });

  it('le joueur ne voit aucun bouton d’ajout (écriture MJ-only)', () => {
    campaignHolder.campaign = mkCampaign({ gmIds: ['uid-other'] });
    encounterHolder.encounter = mkEncounter({ status: 'active', round: 1, turnIndex: 0 });
    renderScreen();
    expect(
      screen.queryByRole('button', { name: 'Ajouter un combattant' }),
    ).not.toBeInTheDocument();
  });

  it('renomme un combattant depuis la modale de contrôle', async () => {
    campaignHolder.campaign = mkCampaign();
    encounterHolder.encounter = mkEncounter({ status: 'active', round: 1, turnIndex: 0 });
    updateParticipantMock.mockResolvedValueOnce(undefined);
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: /PV \/ États — Gobelin 1/ }));
    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Chef' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les corrections' }));

    await waitFor(() =>
      expect(updateParticipantMock).toHaveBeenCalledWith('c-1', 'e-1', 'inst-gob', {
        name: 'Chef',
      }),
    );
  });

  it('retirer un combattant ferme la modale — elle pointerait dans le vide', async () => {
    campaignHolder.campaign = mkCampaign();
    encounterHolder.encounter = mkEncounter({ status: 'active', round: 1, turnIndex: 0 });
    removeParticipantMock.mockResolvedValueOnce(undefined);
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: /PV \/ États — Gobelin 1/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Retirer du combat' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer le retrait' }));

    await waitFor(() =>
      expect(removeParticipantMock).toHaveBeenCalledWith('c-1', 'e-1', 'inst-gob'),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('<EncounterScreen> — hand-off dégâts (step 7b)', () => {
  it('le MJ voit le panneau de hand-off d’un jet physique récent, acteur résolu', () => {
    campaignHolder.campaign = mkCampaign();
    encounterHolder.encounter = mkEncounter({ status: 'active', round: 1, turnIndex: 0 });
    eventsHolder.events = [mkRollEvent()];
    renderScreen();
    expect(screen.getByText('Dégâts à appliquer')).toBeInTheDocument();
    // Acteur résolu via la fiche liée (characterId char-a → participant Lyralei).
    const panel = screen.getByRole('region', { name: 'Dégâts à appliquer' });
    expect(within(panel).getByText('Lyralei')).toBeInTheDocument();
    expect(within(panel).getByText('6 dégâts')).toBeInTheDocument();
  });

  it('« Appliquer à… » → cible Gobelin → applyParticipantHpDelta(−total) + logMonsterHpChange + retrait', async () => {
    campaignHolder.campaign = mkCampaign();
    encounterHolder.encounter = mkEncounter({ status: 'active', round: 1, turnIndex: 0 });
    eventsHolder.events = [mkRollEvent()];
    applyParticipantHpDeltaMock.mockResolvedValueOnce({ before: 7, after: 1 });
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: 'Appliquer à…' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gobelin 1' }));
    await waitFor(() =>
      expect(applyParticipantHpDeltaMock).toHaveBeenCalledWith('c-1', 'e-1', 'inst-gob', -6),
    );
    expect(logMonsterHpChangeMock).toHaveBeenCalledWith('e-1', {
      monsterInstanceId: 'inst-gob',
      monsterName: 'Gobelin 1',
      before: 7,
      after: 1,
    });
    // L'event quitte le panneau après application (dismiss local).
    await waitFor(() =>
      expect(screen.queryByText('Dégâts à appliquer')).not.toBeInTheDocument(),
    );
  });

  it('« Ignorer » retire l’event sans rien appliquer', () => {
    campaignHolder.campaign = mkCampaign();
    encounterHolder.encounter = mkEncounter({ status: 'active', round: 1, turnIndex: 0 });
    eventsHolder.events = [mkRollEvent()];
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /Ignorer/ }));
    expect(applyParticipantHpDeltaMock).not.toHaveBeenCalled();
    expect(screen.queryByText('Dégâts à appliquer')).not.toBeInTheDocument();
  });

  it('un joueur ne voit JAMAIS le panneau de hand-off', () => {
    campaignHolder.campaign = mkCampaign({ gmIds: ['uid-other'] });
    encounterHolder.encounter = mkEncounter({ status: 'active', round: 1, turnIndex: 0 });
    eventsHolder.events = [mkRollEvent()];
    renderScreen();
    expect(screen.queryByText('Dégâts à appliquer')).not.toBeInTheDocument();
  });

  it('pas de panneau hors combat (status planned)', () => {
    campaignHolder.campaign = mkCampaign();
    encounterHolder.encounter = mkEncounter({ status: 'planned' });
    eventsHolder.events = [mkRollEvent()];
    renderScreen();
    expect(screen.queryByText('Dégâts à appliquer')).not.toBeInTheDocument();
  });
});

describe('<EncounterScreen> — vue de groupe (préparation)', () => {
  it('en préparation (avant initiative), rend la vue de groupe PJ / adversaires avec PV exacts', () => {
    campaignHolder.campaign = mkCampaign({ gmIds: ['uid-other'] });
    encounterHolder.encounter = mkEncounter({
      // status planned + init 0 → ordre pas encore établi : c'est LE moment de la
      // vue de groupe (l'ordre d'initiative n'existe pas encore).
      status: 'planned',
      participants: [
        mkParticipant({ currentHp: 14, maxHp: 20 }),
        mkParticipant({
          type: 'monster',
          characterId: null,
          instanceId: 'inst-gob',
          name: 'Gobelin 1',
          currentHp: 3,
          maxHp: 7,
        }),
      ],
    });
    renderScreen();
    const party = screen.getByRole('region', { name: 'État de santé des participants' });
    expect(within(party).getByText('Votre groupe')).toBeInTheDocument();
    expect(within(party).getByText('Adversaires')).toBeInTheDocument();
    // PV exacts (cat. 4 « calculs / valeurs chiffrées »).
    expect(within(party).getByText('14/20')).toBeInTheDocument();
    expect(within(party).getByText('3/7')).toBeInTheDocument();
  });

  it('en combat (initiative lancée), la santé vit dans l’ordre d’initiative — PAS de vue de groupe en doublon', () => {
    // Garde-fou anti-régression du bug UAT 2026-06-25 : « ordre d'initiative » et
    // « état du groupe » affichaient exactement la même chose côte à côte.
    campaignHolder.campaign = mkCampaign({ gmIds: ['uid-other'] });
    encounterHolder.encounter = mkEncounter({
      status: 'active',
      round: 1,
      turnIndex: 0,
      participants: [
        mkParticipant({ initiative: 18, currentHp: 14, maxHp: 20 }),
        mkParticipant({
          type: 'monster',
          characterId: null,
          instanceId: 'inst-gob',
          name: 'Gobelin 1',
          initiative: 12,
          currentHp: 3,
          maxHp: 7,
        }),
      ],
    });
    renderScreen();
    // La vue de groupe n'est PLUS rendue pendant le combat (zéro doublon).
    expect(
      screen.queryByRole('region', { name: 'État de santé des participants' }),
    ).not.toBeInTheDocument();
    // …mais la santé reste visible de tous : portée par les cartes d'initiative.
    const turnList = screen.getByRole('list', { name: /Ordre d’initiative/ });
    expect(within(turnList).getByText('14/20')).toBeInTheDocument();
    expect(within(turnList).getByText('3/7')).toBeInTheDocument();
    // Chaque PV n'apparaît qu'UNE fois à l'écran (anti-duplication).
    expect(screen.getAllByText('14/20')).toHaveLength(1);
    expect(screen.getAllByText('3/7')).toHaveLength(1);
  });
});

describe('<EncounterScreen> — joueur (non MJ)', () => {
  it('voit l’ordre des tours mais AUCUN contrôle', () => {
    campaignHolder.campaign = mkCampaign({ gmIds: ['uid-other'] });
    encounterHolder.encounter = mkEncounter({ status: 'active', round: 1, turnIndex: 0 });
    renderScreen();
    // Noms présents dans l'ordre d'initiative (source unique en combat).
    expect(screen.getAllByText('Lyralei').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Gobelin 1').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Fin du tour' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Lancer l’initiative' }),
    ).not.toBeInTheDocument();
    // Aucun contrôle MJ des PV monstres pour un joueur.
    expect(screen.queryByRole('button', { name: /PV \/ États/ })).not.toBeInTheDocument();
  });
});

describe('<EncounterScreen> — erreurs', () => {
  it('encounter introuvable → panneau « Rencontre introuvable »', () => {
    campaignHolder.campaign = mkCampaign();
    encounterHolder.error = new Error('encounter-not-found');
    renderScreen();
    expect(screen.getByText(/Rencontre introuvable/i)).toBeInTheDocument();
  });
});

/**
 * Audit UX E6 / scénario M6 — consulter la règle d'un monstre ou d'un état en
 * plein combat. Avant, le Codex n'avait qu'un point d'entrée (le hub de
 * l'accueil) : il fallait QUITTER le tracker, donc perdre la position de
 * défilement, et le Retour du Codex ramenait à la bibliothèque, pas au combat.
 */
describe('<EncounterScreen> — Codex en superposition (E6)', () => {
  it('le bouton Codex ouvre le Codex par-dessus le tracker, sur les États', () => {
    campaignHolder.campaign = mkCampaign();
    encounterHolder.encounter = mkEncounter();
    renderScreen();

    expect(screen.queryByRole('dialog', { name: 'Le Codex' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Codex' }));

    expect(screen.getByRole('dialog', { name: 'Le Codex' })).toBeInTheDocument();
    // Les États, et NON le bestiaire : `monsters.json` est vide à ce jour, un
    // Codex ouvert sur le bestiaire afficherait « 0 résultat » à chaque combat.
    expect(screen.getByRole('tab', { name: /États/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    // Le tracker est toujours monté DERRIÈRE : on consulte sans quitter le combat.
    expect(screen.getAllByText('Gobelin 1').length).toBeGreaterThan(0);
  });

  it('le joueur y a droit aussi (contenu SRD, aucune permission requise)', () => {
    authHolder.user = { uid: 'uid-player' };
    campaignHolder.campaign = mkCampaign();
    encounterHolder.encounter = mkEncounter({ status: 'active', round: 1 });
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: 'Codex' }));
    expect(screen.getByRole('dialog', { name: 'Le Codex' })).toBeInTheDocument();
  });
});

/**
 * Audit UX E7 / scénario M5 — la fiche d'un joueur en plein combat.
 *
 * Avant : rencontre → retour aux rencontres → retour à la campagne → La
 * compagnie → Voir la fiche. Quatre gestes en plein tour de jeu, et le tracker
 * perdu en chemin. Le besoin fréquent (« où en est son personnage ? ») se règle
 * désormais sans quitter l'écran.
 */
describe('<EncounterScreen> — la compagnie en superposition (E7)', () => {
  it('le bouton ouvre la compagnie par-dessus le tracker, sans le démonter', () => {
    campaignHolder.campaign = mkCampaign();
    campaignHolder.members = [mkMembership()];
    encounterHolder.encounter = mkEncounter({ status: 'active', round: 2 });
    renderScreen();

    expect(screen.queryByRole('dialog', { name: 'La compagnie' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'La compagnie' }));

    const dialog = screen.getByRole('dialog', { name: 'La compagnie' });
    expect(within(dialog).getByText('Lyralei')).toBeInTheDocument();
    // Le MJ figure aussi dans la compagnie (il vient de `gmIds`).
    expect(within(dialog).getByText('Meneur')).toBeInTheDocument();
    expect(within(dialog).getByText('Joueur')).toBeInTheDocument();
    // Le combat est toujours là derrière.
    expect(screen.getAllByText('Gobelin 1').length).toBeGreaterThan(0);
  });

  it('« Promouvoir MJ » n’est pas proposé en pleine partie (administration)', () => {
    campaignHolder.campaign = mkCampaign();
    campaignHolder.members = [mkMembership()];
    encounterHolder.encounter = mkEncounter();
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'La compagnie' }));

    const dialog = screen.getByRole('dialog', { name: 'La compagnie' });
    expect(within(dialog).queryByRole('button', { name: /Promouvoir/ })).not.toBeInTheDocument();
  });

  it('un joueur voit la compagnie, sans les cartes live des autres (rule A2)', () => {
    authHolder.user = { uid: 'uid-player' };
    campaignHolder.campaign = mkCampaign();
    campaignHolder.members = [
      mkMembership(),
      mkMembership({ userId: 'uid-other', displayName: 'Brann', characterId: 'char-b' }),
    ];
    encounterHolder.encounter = mkEncounter();
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'La compagnie' }));

    const dialog = screen.getByRole('dialog', { name: 'La compagnie' });
    expect(within(dialog).getByText('Brann')).toBeInTheDocument();
    // Lecture cross-owner réservée au MJ : pas d'ouverture de fiche pour un joueur.
    expect(within(dialog).queryByRole('button', { name: /Voir la fiche/ })).not.toBeInTheDocument();
  });
});

/**
 * Audit UX E12 / scénario M8 — jet secret et bloc-notes en plein combat.
 *
 * Avant : ils n'existaient qu'en BAS du détail de campagne. Les atteindre
 * pendant un tour de jeu coûtait de quitter le tracker, de faire défiler un
 * écran long, puis de refaire le chemin en sens inverse.
 */
describe('<EncounterScreen> — outils du meneur en superposition (E12)', () => {
  it('le MJ ouvre jet secret + bloc-notes sans démonter le tracker', () => {
    campaignHolder.campaign = mkCampaign();
    encounterHolder.encounter = mkEncounter({ status: 'active', round: 2 });
    renderScreen();

    expect(
      screen.queryByRole('dialog', { name: 'Outils du meneur' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Outils' }));

    const dialog = screen.getByRole('dialog', { name: 'Outils du meneur' });
    // Identité du contenu : ce sont bien les deux outils du détail de campagne.
    expect(within(dialog).getByRole('button', { name: 'Lancer en secret' })).toBeInTheDocument();
    expect(within(dialog).getByText('Notes de séance')).toBeInTheDocument();
    // Le combat est toujours là derrière.
    expect(screen.getAllByText('Gobelin 1').length).toBeGreaterThan(0);
  });

  it("un joueur n'a aucun accès aux outils (le jet secret ne doit pas fuiter)", () => {
    authHolder.user = { uid: 'uid-player' };
    campaignHolder.campaign = mkCampaign();
    encounterHolder.encounter = mkEncounter({ status: 'active', round: 2 });
    renderScreen();

    expect(screen.queryByRole('button', { name: 'Outils' })).not.toBeInTheDocument();
  });
});
