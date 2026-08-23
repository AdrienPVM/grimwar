import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Unit test pour `useEncounterNotifications` (E13/2). Même méthode que pour les
 * handouts : on mocke `onSnapshot` pour CAPTURER le handler et le piloter à la
 * main, ce qui prouve la logique de notification sans émulateur.
 *
 * Les cas qui comptent sont les gardes : ne pas re-notifier un tour déjà en
 * cours à l'arrivée sur l'écran, ne pas re-notifier le même tour quand le doc
 * est réécrit (chaque dégât appliqué réécrit la rencontre), et n'ouvrir aucun
 * listener pour un MJ pur.
 */

type SnapHandler = (snap: { docs: { id: string; data: () => Record<string, unknown> }[] }) => void;

const handlers: SnapHandler[] = [];
const showToast = vi.fn();
let memberData: Record<string, unknown> | null = { characterId: 'char-me' };

vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => ({ __type: 'col', args }),
  doc: (...args: unknown[]) => ({ __type: 'doc', args }),
  query: (...args: unknown[]) => ({ __type: 'query', args }),
  where: (...args: unknown[]) => ({ __type: 'where', args }),
  limit: (...args: unknown[]) => ({ __type: 'limit', args }),
  getDoc: () =>
    Promise.resolve({
      exists: () => memberData !== null,
      data: () => memberData,
    }),
  onSnapshot: (_q: unknown, handler: SnapHandler) => {
    handlers.push(handler);
    return () => undefined;
  },
}));
vi.mock('@/shared/lib/firebase', () => ({ getDb: () => ({ __type: 'db' }) }));
vi.mock('@/shared/lib/slices/toast-slice', () => ({
  showToast: (...args: unknown[]) => showToast(...args),
}));

import { useActiveTurnStore } from '@/shared/lib/slices/active-turn-slice';

import { useEncounterNotifications } from '../use-encounter-notifications';

function participant(characterId: string | null, name: string): Record<string, unknown> {
  return {
    type: characterId ? 'player' : 'monster',
    characterId,
    monsterContentId: null,
    instanceId: `i-${name}`,
    name,
    initiative: 10,
    currentHp: 10,
    maxHp: 10,
    tempHp: 0,
    conditions: [],
    position: null,
    notes: '',
  };
}

function encounterSnap(opts: {
  id?: string;
  round?: number;
  turnIndex?: number;
  participants?: Record<string, unknown>[];
}): { docs: { id: string; data: () => Record<string, unknown> }[] } {
  const id = opts.id ?? 'enc-1';
  return {
    docs: [
      {
        id,
        data: () => ({
          id,
          name: 'Embuscade gobeline',
          sessionId: null,
          status: 'active',
          round: opts.round ?? 1,
          turnIndex: opts.turnIndex ?? 0,
          participants: opts.participants ?? [
            participant('char-me', 'Moi'),
            participant(null, 'Gobelin'),
          ],
          mapId: null,
          fogState: null,
          createdAt: { seconds: 1 },
          updatedAt: { seconds: 1 },
          startedAt: { seconds: 1 },
          endedAt: null,
        }),
      },
    ],
  };
}

const emptySnap = { docs: [] as { id: string; data: () => Record<string, unknown> }[] };

/** Monte le hook et attend que le `getDoc` de membership ait ouvert le listener. */
async function mount(): Promise<void> {
  renderHook(() => useEncounterNotifications('c-1', 'p-1', true));
  await waitFor(() => expect(handlers.length).toBeGreaterThan(0));
}

beforeEach(() => {
  handlers.length = 0;
  showToast.mockReset();
  memberData = { characterId: 'char-me' };
  useActiveTurnStore.getState().clearTurn();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useEncounterNotifications', () => {
  it('notifie « à vous de jouer » quand le tour arrive sur mon personnage', async () => {
    await mount();
    handlers[0]!(emptySnap); // snapshot initial : aucun combat
    handlers[0]!(encounterSnap({ turnIndex: 1 })); // combat démarre, tour du gobelin
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast.mock.calls[0]![0]).toMatchObject({ sub: 'Embuscade gobeline' });
    showToast.mockReset();

    handlers[0]!(encounterSnap({ turnIndex: 0 })); // le tour passe sur moi
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast.mock.calls[0]![0]).toMatchObject({ sub: 'Round 1 · Embuscade gobeline' });
  });

  it('ne re-notifie pas le même tour quand la rencontre est réécrite', async () => {
    await mount();
    handlers[0]!(emptySnap);
    handlers[0]!(encounterSnap({ turnIndex: 0 }));
    expect(showToast).toHaveBeenCalledTimes(1);
    // Un dégât appliqué réécrit le doc sans changer le tour → nouveau snapshot.
    handlers[0]!(encounterSnap({ turnIndex: 0 }));
    expect(showToast).toHaveBeenCalledTimes(1);
  });

  it('ne notifie pas un tour DÉJÀ en cours à l’arrivée sur l’écran', async () => {
    await mount();
    handlers[0]!(encounterSnap({ turnIndex: 0 })); // premier snapshot : c'est mon tour
    expect(showToast).not.toHaveBeenCalled();
  });

  it('notifie le début de combat quand le premier tour n’est pas le mien', async () => {
    await mount();
    handlers[0]!(emptySnap);
    handlers[0]!(encounterSnap({ id: 'enc-9', turnIndex: 1 }));
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast.mock.calls[0]![0]).toMatchObject({ sub: 'Embuscade gobeline' });
  });

  it('ne notifie pas un combat où mon personnage ne figure pas', async () => {
    await mount();
    handlers[0]!(emptySnap);
    handlers[0]!(
      encounterSnap({
        turnIndex: 0,
        participants: [participant('char-autre', 'Un autre'), participant(null, 'Gobelin')],
      }),
    );
    expect(showToast).not.toHaveBeenCalled();
  });

  it('publie l’ÉTAT du tour dès le premier snapshot, même en se taisant', async () => {
    // Le toast parle des TRANSITIONS, le bandeau de fiche affiche l'ÉTAT. À
    // l'arrivée sur un écran en plein combat, le premier ne dit rien — mais le
    // second doit être juste immédiatement, sinon le joueur ne voit pas que
    // c'est son tour tant que le MJ n'a pas cliqué.
    await mount();
    handlers[0]!(encounterSnap({ turnIndex: 0, round: 2 }));
    expect(showToast).not.toHaveBeenCalled();
    expect(useActiveTurnStore.getState().turn).toMatchObject({
      encounterName: 'Embuscade gobeline',
      round: 2,
      isMyTurn: true,
    });
  });

  it('efface l’état quand plus aucun combat n’est actif', async () => {
    await mount();
    handlers[0]!(encounterSnap({ turnIndex: 0 }));
    expect(useActiveTurnStore.getState().turn).not.toBeNull();
    handlers[0]!(emptySnap); // le MJ clôture la rencontre
    expect(useActiveTurnStore.getState().turn).toBeNull();
  });

  it('n’ouvre aucun listener pour un MJ pur (pas de doc member)', async () => {
    memberData = null;
    renderHook(() => useEncounterNotifications('c-1', 'dm-1', true));
    await new Promise((r) => setTimeout(r, 0));
    expect(handlers).toHaveLength(0);
  });

  it('n’ouvre aucun listener pour un joueur sans fiche liée', async () => {
    memberData = { characterId: null };
    renderHook(() => useEncounterNotifications('c-1', 'p-1', true));
    await new Promise((r) => setTimeout(r, 0));
    expect(handlers).toHaveLength(0);
  });
});
