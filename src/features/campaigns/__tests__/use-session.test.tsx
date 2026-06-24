import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Session } from '@/shared/types/session';

const authHolder: { user: { uid: string } | null } = { user: { uid: 'uid-1' } };
vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => authHolder,
}));

const getMock = vi.fn<(cid: string, sid: string) => Promise<Session>>();
vi.mock('@/shared/lib/services/sessions', () => {
  class FakeSessionError extends Error {
    readonly kind: string;
    constructor(kind: string, message: string) {
      super(message);
      this.name = 'SessionServiceError';
      this.kind = kind;
    }
  }
  return {
    getSession: (cid: string, sid: string) => getMock(cid, sid),
    SessionServiceError: FakeSessionError,
  };
});

import { useSession } from '../use-session';
import { SessionServiceError as FakeSessionError } from '@/shared/lib/services/sessions';

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
  getMock.mockReset();
});

describe('useSession', () => {
  it('charge la séance pour un user connecté', async () => {
    getMock.mockResolvedValueOnce(mkSession({ id: 's-1', title: 'Veillée' }));
    const { result } = renderHook(() => useSession('c-1', 's-1'));
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.session?.title).toBe('Veillée');
    expect(getMock).toHaveBeenCalledWith('c-1', 's-1');
  });

  it('ne fetch pas sans sid', () => {
    const { result } = renderHook(() => useSession('c-1', undefined));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.session).toBeNull();
    expect(getMock).not.toHaveBeenCalled();
  });

  it('expose SessionService(session-not-found) dans error', async () => {
    getMock.mockRejectedValueOnce(new FakeSessionError('session-not-found', 'nope'));
    const { result } = renderHook(() => useSession('c-1', 's-x'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error?.name).toBe('SessionServiceError');
    expect(result.current.session).toBeNull();
  });

  it('refresh() relance le fetch', async () => {
    getMock
      .mockResolvedValueOnce(mkSession({ title: 'V1' }))
      .mockResolvedValueOnce(mkSession({ title: 'V2' }));
    const { result } = renderHook(() => useSession('c-1', 's-1'));
    await waitFor(() => expect(result.current.session?.title).toBe('V1'));
    act(() => result.current.refresh());
    await waitFor(() => expect(result.current.session?.title).toBe('V2'));
    expect(getMock).toHaveBeenCalledTimes(2);
  });
});
