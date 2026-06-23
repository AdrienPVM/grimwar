import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────

const authHolder: { user: { uid: string } | null } = { user: { uid: 'gm-1' } };
vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => authHolder,
}));

vi.mock('@/shared/lib/firebase', () => ({ getDb: () => ({}) }));

const collectionMock = vi.fn((..._a: unknown[]) => ({ __c: true }));
const whereMock = vi.fn((...a: unknown[]) => ({ __where: a }));
const orderByMock = vi.fn((...a: unknown[]) => ({ __orderBy: a }));
const limitMock = vi.fn((...a: unknown[]) => ({ __limit: a }));
const queryMock = vi.fn((...a: unknown[]) => ({ __query: a }));

type SnapNext = (snap: { docs: { id: string; data: () => unknown }[] }) => void;
type SnapErr = (err: Error) => void;
let capturedNext: SnapNext | null = null;
let capturedError: SnapErr | null = null;
const unsubscribeMock = vi.fn();
const onSnapshotMock = vi.fn(
  (_q: unknown, next: SnapNext, error: SnapErr) => {
    capturedNext = next;
    capturedError = error;
    return unsubscribeMock;
  },
);

vi.mock('firebase/firestore', () => ({
  collection: (...a: unknown[]) => collectionMock(...a),
  query: (...a: unknown[]) => queryMock(...a),
  where: (...a: unknown[]) => whereMock(...a),
  orderBy: (...a: unknown[]) => orderByMock(...a),
  limit: (...a: unknown[]) => limitMock(...a),
  onSnapshot: (...a: [unknown, SnapNext, SnapErr]) => onSnapshotMock(...a),
}));

import { CAMPAIGN_EVENTS_LIMIT, useCampaignEvents } from '../use-campaign-events';

// ─────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────

function validDoc(id: string, over: Record<string, unknown> = {}) {
  return {
    id,
    data: () => ({
      kind: 'roll',
      actorUserId: 'p-1',
      actorCharacterId: 'char-1',
      targetCharacterId: null,
      sessionId: null,
      encounterId: null,
      payload: { label: 'Épée', total: 17 },
      visibility: 'all',
      createdAt: null,
      ...over,
    }),
  };
}

function snap(docs: { id: string; data: () => unknown }[]) {
  return { docs };
}

beforeEach(() => {
  authHolder.user = { uid: 'gm-1' };
  capturedNext = null;
  capturedError = null;
  collectionMock.mockClear();
  whereMock.mockClear();
  orderByMock.mockClear();
  limitMock.mockClear();
  queryMock.mockClear();
  onSnapshotMock.mockClear();
  unsubscribeMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────

describe('useCampaignEvents', () => {
  it('contraint la query MJ à visibility in [all,dm] + orderBy createdAt desc + limit 20', () => {
    renderHook(() => useCampaignEvents('c-1', { isDM: true }));
    expect(whereMock).toHaveBeenCalledWith('visibility', 'in', ['all', 'dm']);
    expect(orderByMock).toHaveBeenCalledWith('createdAt', 'desc');
    expect(limitMock).toHaveBeenCalledWith(CAMPAIGN_EVENTS_LIMIT);
    expect(collectionMock).toHaveBeenCalledWith({}, 'campaigns', 'c-1', 'events');
  });

  it('contraint la query MEMBRE à visibility == all (sous-ensemble public)', () => {
    renderHook(() => useCampaignEvents('c-1', { isDM: false }));
    expect(whereMock).toHaveBeenCalledWith('visibility', '==', 'all');
  });

  it('parse et expose les événements du snapshot', async () => {
    const { result } = renderHook(() => useCampaignEvents('c-1', { isDM: true }));
    expect(result.current.isLoading).toBe(true);
    act(() => capturedNext?.(snap([validDoc('e1'), validDoc('e2')])));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.events.map((e) => e.id)).toEqual(['e1', 'e2']);
    expect(result.current.events[0]?.payload.total).toBe(17);
    expect(result.current.error).toBeNull();
  });

  it('ignore un doc malformé sans vider le feed (warn greppable)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useCampaignEvents('c-1', { isDM: true }));
    // e-bad : `kind` invalide → safeParse échoue → ignoré.
    const bad = { id: 'e-bad', data: () => ({ kind: 'not-a-kind', visibility: 'all' }) };
    act(() => capturedNext?.(snap([validDoc('e-ok'), bad])));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.events.map((e) => e.id)).toEqual(['e-ok']);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('e-bad'));
  });

  it('remonte une erreur de snapshot', async () => {
    const { result } = renderHook(() => useCampaignEvents('c-1', { isDM: true }));
    act(() => capturedError?.(new Error('permission-denied')));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error?.message).toBe('permission-denied');
  });

  it('no-op sans utilisateur (pas d’abonnement)', () => {
    authHolder.user = null;
    const { result } = renderHook(() => useCampaignEvents('c-1', { isDM: true }));
    expect(onSnapshotMock).not.toHaveBeenCalled();
    expect(result.current.events).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('se désabonne au démontage', () => {
    const { unmount } = renderHook(() => useCampaignEvents('c-1', { isDM: true }));
    unmount();
    expect(unsubscribeMock).toHaveBeenCalled();
  });
});
