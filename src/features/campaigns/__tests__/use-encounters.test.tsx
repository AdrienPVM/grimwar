import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Encounter } from '@/shared/types/encounter';

// ─────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────

const authHolder: { user: { uid: string } | null } = { user: { uid: 'uid-1' } };
vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => authHolder,
}));

const listMock = vi.fn<(cid: string) => Promise<Encounter[]>>();
vi.mock('@/shared/lib/services/encounters', () => ({
  listEncounters: (cid: string) => listMock(cid),
}));

import { useEncounters } from '../use-encounters';

// ─────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────

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

beforeEach(() => {
  authHolder.user = { uid: 'uid-1' };
  listMock.mockReset();
});

// ─────────────────────────────────────────────────────────────────────
// Suites
// ─────────────────────────────────────────────────────────────────────

describe('useEncounters', () => {
  it('isLoading=true puis charge la liste pour un user connecté', async () => {
    const encounters = [mkEncounter({ id: 'e-2' }), mkEncounter({ id: 'e-1' })];
    listMock.mockResolvedValueOnce(encounters);

    const { result } = renderHook(() => useEncounters('c-1'));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.encounters).toEqual([]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.encounters).toHaveLength(2);
    expect(result.current.error).toBeNull();
    expect(listMock).toHaveBeenCalledWith('c-1');
  });

  it("renvoie une liste vide quand l'utilisateur n'est pas connecté", () => {
    authHolder.user = null;
    const { result } = renderHook(() => useEncounters('c-1'));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.encounters).toEqual([]);
    expect(listMock).not.toHaveBeenCalled();
  });

  it('ne fetch pas sans campaignId', () => {
    const { result } = renderHook(() => useEncounters(undefined));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.encounters).toEqual([]);
    expect(listMock).not.toHaveBeenCalled();
  });

  it("capture l'erreur du service (permission-denied non-membre)", async () => {
    listMock.mockRejectedValueOnce(new Error('permission-denied'));
    const { result } = renderHook(() => useEncounters('c-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error?.message).toBe('permission-denied');
    expect(result.current.encounters).toEqual([]);
  });

  it('refresh() relance le fetch et met à jour la liste', async () => {
    listMock
      .mockResolvedValueOnce([mkEncounter({ id: 'e-1' })])
      .mockResolvedValueOnce([mkEncounter({ id: 'e-2' }), mkEncounter({ id: 'e-1' })]);

    const { result } = renderHook(() => useEncounters('c-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.encounters).toHaveLength(1);

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(result.current.encounters).toHaveLength(2));
    expect(listMock).toHaveBeenCalledTimes(2);
  });
});
