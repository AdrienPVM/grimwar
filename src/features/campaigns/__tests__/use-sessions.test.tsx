import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Session } from '@/shared/types/session';

// ─────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────

const authHolder: { user: { uid: string } | null } = { user: { uid: 'uid-1' } };
vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => authHolder,
}));

const listMock = vi.fn<(cid: string) => Promise<Session[]>>();
vi.mock('@/shared/lib/services/sessions', () => ({
  listSessions: (cid: string) => listMock(cid),
}));

import { useSessions } from '../use-sessions';

// ─────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────

function mkSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 's-1',
    number: 1,
    title: 'La première veillée',
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

beforeEach(() => {
  authHolder.user = { uid: 'uid-1' };
  listMock.mockReset();
});

// ─────────────────────────────────────────────────────────────────────
// Suites
// ─────────────────────────────────────────────────────────────────────

describe('useSessions', () => {
  it('isLoading=true puis charge la liste pour un user connecté', async () => {
    const sessions = [mkSession({ id: 's-2', number: 2 }), mkSession({ id: 's-1', number: 1 })];
    listMock.mockResolvedValueOnce(sessions);

    const { result } = renderHook(() => useSessions('c-1'));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.sessions).toEqual([]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sessions).toHaveLength(2);
    expect(result.current.error).toBeNull();
    expect(listMock).toHaveBeenCalledWith('c-1');
  });

  it("renvoie une liste vide quand l'utilisateur n'est pas connecté", () => {
    authHolder.user = null;
    const { result } = renderHook(() => useSessions('c-1'));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.sessions).toEqual([]);
    expect(listMock).not.toHaveBeenCalled();
  });

  it('ne fetch pas sans campaignId', () => {
    const { result } = renderHook(() => useSessions(undefined));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.sessions).toEqual([]);
    expect(listMock).not.toHaveBeenCalled();
  });

  it("capture l'erreur du service (permission-denied non-membre)", async () => {
    listMock.mockRejectedValueOnce(new Error('permission-denied'));
    const { result } = renderHook(() => useSessions('c-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error?.message).toBe('permission-denied');
    expect(result.current.sessions).toEqual([]);
  });

  it('refresh() relance le fetch et met à jour la liste', async () => {
    listMock
      .mockResolvedValueOnce([mkSession({ id: 's-1', number: 1 })])
      .mockResolvedValueOnce([
        mkSession({ id: 's-2', number: 2 }),
        mkSession({ id: 's-1', number: 1 }),
      ]);

    const { result } = renderHook(() => useSessions('c-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sessions).toHaveLength(1);

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(result.current.sessions).toHaveLength(2));
    expect(listMock).toHaveBeenCalledTimes(2);
  });
});
