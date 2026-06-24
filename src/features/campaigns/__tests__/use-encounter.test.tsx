import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Encounter } from '@/shared/types/encounter';

/**
 * Unit tests pour `useEncounter` (real-time, JALON 24.3). Mock complet
 * `firebase/firestore` (onSnapshot single-doc) + `useAuth`. Vérifie :
 *   - pas de listener tant que user/cid/eid manquent ;
 *   - doc valide → encounter parsé ;
 *   - doc absent → erreur `encounter-not-found` ;
 *   - erreur de transport → remontée dans `error` ;
 *   - doc invalide au parse Zod → erreur.
 */

type DocCallback = (snap: { exists: () => boolean; data: () => unknown }) => void;
type ErrCallback = (err: Error) => void;

let listener: { cb: DocCallback; err: ErrCallback } | null = null;
const unsubscribe = vi.fn();

vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ..._path: string[]) => ({ __type: 'doc' }),
  onSnapshot: (_ref: unknown, cb: DocCallback, err: ErrCallback) => {
    listener = { cb, err };
    return unsubscribe;
  },
}));

vi.mock('@/shared/lib/firebase', () => ({
  getDb: () => ({ __type: 'mock-db' }),
}));

const mockUseAuth = vi.fn(() => ({ user: { uid: 'uid-1' } as { uid: string } | null }));
vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

import { useEncounter } from '../use-encounter';

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
  listener = null;
  unsubscribe.mockClear();
  mockUseAuth.mockReturnValue({ user: { uid: 'uid-1' } });
});

describe('useEncounter', () => {
  it('n’établit pas de listener quand l’utilisateur est absent', () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useEncounter('c-1', 'e-1'));
    expect(listener).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.encounter).toBeNull();
  });

  it('n’établit pas de listener quand l’eid est absent', () => {
    renderHook(() => useEncounter('c-1', undefined));
    expect(listener).toBeNull();
  });

  it('doc valide → encounter parsé, isLoading false', async () => {
    const { result } = renderHook(() => useEncounter('c-1', 'e-1'));
    const enc = mkEncounter({ status: 'active', round: 2, turnIndex: 1 });
    act(() => {
      listener?.cb({ exists: () => true, data: () => enc });
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.encounter?.status).toBe('active');
    expect(result.current.encounter?.round).toBe(2);
    expect(result.current.error).toBeNull();
  });

  it('doc absent → erreur encounter-not-found', async () => {
    const { result } = renderHook(() => useEncounter('c-1', 'e-1'));
    act(() => {
      listener?.cb({ exists: () => false, data: () => ({}) });
    });
    await waitFor(() => expect(result.current.error?.message).toBe('encounter-not-found'));
    expect(result.current.encounter).toBeNull();
  });

  it('erreur de transport → remontée dans error', async () => {
    const { result } = renderHook(() => useEncounter('c-1', 'e-1'));
    act(() => {
      listener?.err(new Error('permission-denied'));
    });
    await waitFor(() => expect(result.current.error?.message).toBe('permission-denied'));
    expect(result.current.encounter).toBeNull();
  });

  it('doc invalide (parse Zod échoue) → erreur, pas d’encounter', async () => {
    const { result } = renderHook(() => useEncounter('c-1', 'e-1'));
    act(() => {
      // `status` invalide casse le parse.
      listener?.cb({ exists: () => true, data: () => ({ ...mkEncounter(), status: 'bogus' }) });
    });
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toMatch(/invalid/i);
    expect(result.current.encounter).toBeNull();
  });

  it('désabonne au démontage', () => {
    const { unmount } = renderHook(() => useEncounter('c-1', 'e-1'));
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
