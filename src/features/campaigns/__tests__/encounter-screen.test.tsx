import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Campaign, Membership } from '@/shared/types/campaign';
import type { Encounter, EncounterParticipant } from '@/shared/types/encounter';

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
const applyParticipantHpDeltaMock = vi.fn();
const setParticipantConditionMock = vi.fn();
vi.mock('@/shared/lib/services/encounters', async (importActual) => {
  const actual = await importActual<typeof import('@/shared/lib/services/encounters')>();
  return {
    ...actual,
    startEncounter: (...a: unknown[]) => startEncounterMock(...a),
    advanceTurn: (...a: unknown[]) => advanceTurnMock(...a),
    endEncounter: (...a: unknown[]) => endEncounterMock(...a),
    setParticipants: (...a: unknown[]) => setParticipantsMock(...a),
    applyParticipantHpDelta: (...a: unknown[]) => applyParticipantHpDeltaMock(...a),
    setParticipantCondition: (...a: unknown[]) => setParticipantConditionMock(...a),
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

// Catalogue d'états minimal pour le contrôle MJ (libellés localisés).
vi.mock('@/shared/hooks/use-content', () => ({
  useContent: () => ({
    data: [
      { id: 'prone', name: { fr: 'À terre', en: 'Prone' }, description: { fr: '', en: '' }, source: 'srd-5.2.1' },
      { id: 'poisoned', name: { fr: 'Empoisonné', en: 'Poisoned' }, description: { fr: '', en: '' }, source: 'srd-5.2.1' },
    ],
    loading: false,
    error: null,
  }),
}));

vi.mock('@/shared/lib/firebase', () => ({ getDb: () => ({}) }));

import { EncounterScreen } from '../encounter-screen';
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

afterEach(() => {
  authHolder.user = { uid: 'uid-gm' };
  campaignHolder.campaign = null;
  campaignHolder.members = [];
  campaignHolder.isLoading = false;
  campaignHolder.error = null;
  encounterHolder.encounter = null;
  encounterHolder.isLoading = false;
  encounterHolder.error = null;
  resolveModsMock.mockClear();
  startEncounterMock.mockReset();
  advanceTurnMock.mockReset();
  endEncounterMock.mockReset();
  setParticipantsMock.mockReset();
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

  it('« Lancer l’initiative » → setParticipants reçoit les participants initiés (init 10)', async () => {
    campaignHolder.campaign = mkCampaign();
    encounterHolder.encounter = mkEncounter();
    setParticipantsMock.mockResolvedValueOnce(undefined);
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Lancer l’initiative' }));
    await waitFor(() => expect(setParticipantsMock).toHaveBeenCalledTimes(1));
    const [cid, eid, participants] = setParticipantsMock.mock.calls[0]!;
    expect(cid).toBe('c-1');
    expect(eid).toBe('e-1');
    expect((participants as EncounterParticipant[]).every((p) => p.initiative === 10)).toBe(true);
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
    // Le participant actif (index 1 = Gobelin 1) porte aria-current.
    const active = screen.getByText('Gobelin 1').closest('li');
    expect(active).toHaveAttribute('aria-current', 'true');
    // Init affichée (ordre établi).
    expect(screen.getByText(/Init\.\s*18/)).toBeInTheDocument();
  });
});

describe('<EncounterScreen> — contrôle MJ des monstres (step 7)', () => {
  it('le MJ voit « PV / États » sur la carte monstre, PAS sur la carte joueur', () => {
    campaignHolder.campaign = mkCampaign();
    encounterHolder.encounter = mkEncounter({ status: 'active', round: 1, turnIndex: 0 });
    renderScreen();
    // Un seul bouton de contrôle (le monstre), pas deux.
    expect(
      screen.getByRole('button', { name: /PV \/ États — Gobelin 1/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /PV \/ États — Lyralei/ }),
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
    // Le libellé localisé de l'état apparaît (chip sur la carte).
    expect(screen.getByText('Empoisonné')).toBeInTheDocument();
  });
});

describe('<EncounterScreen> — joueur (non MJ)', () => {
  it('voit l’ordre des tours mais AUCUN contrôle', () => {
    campaignHolder.campaign = mkCampaign({ gmIds: ['uid-other'] });
    encounterHolder.encounter = mkEncounter({ status: 'active', round: 1, turnIndex: 0 });
    renderScreen();
    expect(screen.getByText('Lyralei')).toBeInTheDocument();
    expect(screen.getByText('Gobelin 1')).toBeInTheDocument();
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
