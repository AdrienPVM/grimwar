import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Unit tests pour `useMapsList` (CHANTIER D nuit marathon — tracer D.2).
 *
 * Pattern : mock complet `firebase/firestore` + `useAuth` pour vérifier :
 *   - Le hook ne crée PAS de listener quand `user` ou `campaignId` est absent.
 *   - Le hook décode chaque doc via `mapMetaSchema` et filtre les invalides.
 *   - L'erreur de transport remonte dans `result.error`.
 *   - Le tri respecte `updatedAt desc` puis `name asc` fallback.
 */

type SnapshotCallback = (snap: { forEach: (cb: (docSnap: unknown) => void) => void }) => void;
type ErrorCallback = (err: Error) => void;

let lastOnSnapshot: { cb: SnapshotCallback; err: ErrorCallback } | null = null;

const mockOnSnapshot = vi.fn(
  (_q: unknown, cb: SnapshotCallback, err: ErrorCallback) => {
    lastOnSnapshot = { cb, err };
    return () => {
      lastOnSnapshot = null;
    };
  },
);

vi.mock('firebase/firestore', () => ({
  Timestamp: class Timestamp {
    constructor(public seconds: number) {}
    toMillis() {
      return this.seconds * 1000;
    }
  },
  collection: vi.fn((_db, ..._path: string[]) => ({ __type: 'collection' })),
  onSnapshot: (
    q: unknown,
    cb: SnapshotCallback,
    err: ErrorCallback,
  ) => mockOnSnapshot(q, cb, err),
  orderBy: vi.fn((field: string, dir: string) => ({ field, dir })),
  query: vi.fn((ref: unknown, ...constraints: unknown[]) => ({
    ref,
    constraints,
  })),
}));

vi.mock('@/shared/lib/firebase', () => ({
  getDb: () => ({ __type: 'mock-db' }),
}));

vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseAuth = vi.fn(() => ({ user: { uid: 'user-alice' } }));

import { useMapsList } from '../use-maps-list';

function validMapDoc(overrides: Record<string, unknown> = {}): {
  id: string;
  data: () => Record<string, unknown>;
} {
  const id = (overrides.id as string) ?? 'donjon-de-l-aube';
  const data = {
    name: 'Donjon de l’Aube',
    imageUrl: 'https://example.com/donjon.jpg',
    gridSize: 70,
    feetPerSquare: 5,
    showGrid: true,
    fogEnabled: false,
    lightingEnabled: false,
    fogPolygons: [],
    lightSources: [],
    aoeTemplates: [],
    schemaVersion: 1,
    createdAt: { seconds: 1700000000 },
    updatedAt: { seconds: 1700000100, toMillis: () => 1700000100000 },
    updatedBy: 'user-alice',
    ...overrides,
  };
  return {
    id,
    data: () => data,
  };
}

function makeSnapshot(docs: Array<ReturnType<typeof validMapDoc>>): {
  forEach: (cb: (d: unknown) => void) => void;
} {
  return {
    forEach: (cb) => docs.forEach(cb),
  };
}

beforeEach(() => {
  lastOnSnapshot = null;
  mockOnSnapshot.mockClear();
  mockUseAuth.mockReturnValue({ user: { uid: 'user-alice' } });
});

describe('useMapsList — gating', () => {
  it('aucun listener créé tant que campaignId est undefined', () => {
    renderHook(() => useMapsList(undefined));
    expect(mockOnSnapshot).not.toHaveBeenCalled();
  });

  it("aucun listener créé tant que l'utilisateur n'est pas connecté", () => {
    mockUseAuth.mockReturnValue({ user: null } as unknown as { user: { uid: string } });
    renderHook(() => useMapsList('camp-001'));
    expect(mockOnSnapshot).not.toHaveBeenCalled();
  });
});

describe('useMapsList — listener actif', () => {
  it('crée un listener Firestore quand user + campaignId présents', () => {
    renderHook(() => useMapsList('camp-001'));
    expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
  });

  it('parse les maps valides via mapMetaSchema et expose triées', async () => {
    const { result } = renderHook(() => useMapsList('camp-001'));
    expect(result.current.isLoading).toBe(true);

    const doc1 = validMapDoc({
      id: 'carte-recente',
      name: 'Carte récente',
      updatedAt: { seconds: 1700000200, toMillis: () => 1700000200000 },
    });
    const doc2 = validMapDoc({
      id: 'carte-ancienne',
      name: 'Carte ancienne',
      updatedAt: { seconds: 1700000100, toMillis: () => 1700000100000 },
    });

    expect(lastOnSnapshot).not.toBeNull();
    await act(async () => {
      lastOnSnapshot!.cb(makeSnapshot([doc2, doc1])); // ordre inverse
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.maps).toHaveLength(2);
    // Tri client : carte récente d'abord.
    expect(result.current.maps[0]?.id).toBe('carte-recente');
    expect(result.current.maps[1]?.id).toBe('carte-ancienne');
  });

  it('filtre silencieusement les docs invalides via Zod', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useMapsList('camp-001'));

    const validDoc = validMapDoc();
    const brokenDoc = {
      id: 'carte-cassee',
      data: () => ({
        // Manque presque tous les champs obligatoires.
        name: 'Carte cassée',
      }),
    };

    expect(lastOnSnapshot).not.toBeNull();
    await act(async () => {
      lastOnSnapshot!.cb(makeSnapshot([validDoc, brokenDoc]));
    });

    await waitFor(() => {
      expect(result.current.maps).toHaveLength(1);
    });
    expect(result.current.maps[0]?.id).toBe('donjon-de-l-aube');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('remonte une erreur Firestore via result.error', async () => {
    const { result } = renderHook(() => useMapsList('camp-001'));

    expect(lastOnSnapshot).not.toBeNull();
    await act(async () => {
      lastOnSnapshot!.err(new Error('permission denied'));
    });

    await waitFor(() => {
      expect(result.current.error?.message).toBe('permission denied');
    });
    expect(result.current.isLoading).toBe(false);
  });
});
