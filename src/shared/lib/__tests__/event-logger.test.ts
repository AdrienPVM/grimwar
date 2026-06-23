import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RollResult } from '../dice/types';

/**
 * Tests du point d'entrée unique du journal (plan 22). On mock `firebase/
 * firestore` + `getDb` (cf. campaigns.test.ts) et on pilote les vrais stores
 * Zustand via `setState`. On vérifie :
 *   - no-op silencieux sans campagne active,
 *   - no-op silencieux sans utilisateur,
 *   - écriture au bon chemin avec le bon payload quand les deux sont présents,
 *   - une erreur d'écriture ne remonte jamais (best-effort).
 */

const addDocMock = vi.fn();
const collectionMock = vi.fn((_db: unknown, ...path: string[]) => ({ __path: path }));
const serverTimestampMock = vi.fn(() => '__server-ts__');

vi.mock('firebase/firestore', () => ({
  addDoc: (...args: unknown[]) => addDocMock(...args),
  collection: (...args: unknown[]) =>
    collectionMock(...(args as [unknown, ...string[]])),
  serverTimestamp: () => serverTimestampMock(),
}));

vi.mock('@/shared/lib/firebase', () => ({
  getDb: () => ({ __type: 'mock-db' }),
}));

import { logRoll, logRollIfCampaign } from '../event-logger';
import { useActiveCampaignStore } from '../slices/active-campaign-slice';
import { useAuthStore } from '../slices/auth-slice';

const ROLL: RollResult = {
  kind: 'attack',
  label: 'Épée longue',
  mode: 'digital',
  dice: [{ count: 1, sides: 20 }],
  rawFaces: [18],
  keptFaces: [18],
  modifier: 5,
  total: 23,
  crit: false,
  fumble: false,
  advantage: 'normal',
  characterId: 'char-1',
  timestamp: 0,
};

const AUTH_USER = {
  uid: 'user-alice',
  displayName: null,
  email: null,
  emailVerified: false,
  photoURL: null,
  isAnonymous: false,
};

beforeEach(() => {
  addDocMock.mockReset().mockResolvedValue({ id: 'evt-1' });
  collectionMock.mockClear();
  serverTimestampMock.mockClear();
  useActiveCampaignStore.getState().clearActiveCampaign();
  useAuthStore.getState().setUser(null);
});

describe('event-logger — gardes no-op', () => {
  it('no-op sans campagne active (fiche non liée / S1)', async () => {
    useAuthStore.getState().setUser(AUTH_USER);
    await logRoll(ROLL);
    expect(addDocMock).not.toHaveBeenCalled();
  });

  it('no-op sans utilisateur connecté', async () => {
    useActiveCampaignStore.getState().setActiveCampaign('camp-1');
    await logRoll(ROLL);
    expect(addDocMock).not.toHaveBeenCalled();
  });
});

describe('event-logger — écriture jet', () => {
  beforeEach(() => {
    useActiveCampaignStore.getState().setActiveCampaign('camp-1');
    useAuthStore.getState().setUser(AUTH_USER);
  });

  it('écrit dans campaigns/{id}/events', async () => {
    await logRoll(ROLL);
    expect(collectionMock).toHaveBeenCalledWith(
      { __type: 'mock-db' },
      'campaigns',
      'camp-1',
      'events',
    );
    expect(addDocMock).toHaveBeenCalledTimes(1);
  });

  it('pose actorUserId = uid courant et createdAt = serverTimestamp()', async () => {
    await logRoll(ROLL);
    const written = addDocMock.mock.calls[0]![1] as Record<string, unknown>;
    expect(written.actorUserId).toBe('user-alice');
    expect(written.createdAt).toBe('__server-ts__');
    expect(written.kind).toBe('roll');
    expect(written.visibility).toBe('all');
    expect(written.actorCharacterId).toBe('char-1');
  });

  it('le payload porte mode + faces + total + flags', async () => {
    await logRoll(ROLL);
    const written = addDocMock.mock.calls[0]![1] as { payload: Record<string, unknown> };
    expect(written.payload).toMatchObject({
      label: 'Épée longue',
      rollKind: 'attack',
      mode: 'digital',
      rawFaces: [18],
      keptFaces: [18],
      total: 23,
      crit: false,
      fumble: false,
      advantage: 'normal',
    });
  });

  it('characterId vide → actorCharacterId null', async () => {
    await logRoll({ ...ROLL, characterId: '' });
    const written = addDocMock.mock.calls[0]![1] as Record<string, unknown>;
    expect(written.actorCharacterId).toBeNull();
  });

  it('sessionId = activeSessionId du store', async () => {
    useActiveCampaignStore.getState().setActiveCampaign('camp-1', 'sess-9');
    await logRoll(ROLL);
    const written = addDocMock.mock.calls[0]![1] as Record<string, unknown>;
    expect(written.sessionId).toBe('sess-9');
  });

  it('une erreur d’écriture ne remonte jamais (best-effort)', async () => {
    addDocMock.mockRejectedValueOnce(new Error('permission-denied'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(logRoll(ROLL)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('logRollIfCampaign délègue à logRoll', async () => {
    await logRollIfCampaign(ROLL);
    expect(addDocMock).toHaveBeenCalledTimes(1);
  });
});
