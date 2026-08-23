import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Unit tests pour `src/shared/lib/services/sessions.ts` (JALON 23.1).
 *
 * Pattern : mock `firebase/firestore` + `getDb` (cf. `campaigns.test.ts`). On
 * vérifie le contrat d'écriture/lecture (chemin, payload, auto-numérotation,
 * garde-fou « une seule session active »), pas l'interaction réelle avec
 * Firestore — celle-ci est testée dans `tests/firestore-rules.test.ts` contre
 * l'émulateur.
 */

// ─────────────────────────────────────────────────────────────────────
// Mocks firebase/firestore
// ─────────────────────────────────────────────────────────────────────

const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockServerTimestamp = vi.fn(() => 'MOCK_SERVER_TS');

let autoIdCounter = 0;
const mockDoc = vi.fn(
  (
    first: unknown,
    ...rest: unknown[]
  ): { __type: 'doc'; id: string; path: string; parent: unknown } => {
    // Variant 1 — `doc(collectionRef)` : un seul argument marker collection-ref.
    if (
      rest.length === 0 &&
      typeof first === 'object' &&
      first !== null &&
      (first as { __type?: string }).__type === 'collection-ref'
    ) {
      const collectionPath = (first as { path: string }).path;
      const id = `auto-id-${++autoIdCounter}`;
      return { __type: 'doc', id, path: `${collectionPath}/${id}`, parent: first };
    }
    // Variant 2 — `doc(db, 'campaigns', cid, 'sessions', sid)` : segments path.
    const segments = rest as string[];
    const path = segments.join('/');
    const id = segments[segments.length - 1] ?? '';
    return {
      __type: 'doc',
      id,
      path,
      parent: { __type: 'collection-ref', path: segments.slice(0, -1).join('/') },
    };
  },
);

const mockCollection = vi.fn(
  (_db: unknown, ...rest: string[]): { __type: 'collection-ref'; path: string } => ({
    __type: 'collection-ref',
    path: rest.join('/'),
  }),
);

const mockQuery = vi.fn((ref: unknown, ...constraints: unknown[]) => ({
  __type: 'query',
  ref,
  constraints,
}));

const mockWhere = vi.fn((field: string, op: string, value: unknown) => ({
  __type: 'where',
  field,
  op,
  value,
}));

const mockOrderBy = vi.fn((field: string, dir?: string) => ({
  __type: 'orderBy',
  field,
  dir: dir ?? 'asc',
}));

const mockLimit = vi.fn((n: number) => ({ __type: 'limit', n }));

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as Parameters<typeof mockDoc>)),
  collection: (...args: unknown[]) => mockCollection(...(args as Parameters<typeof mockCollection>)),
  query: (...args: unknown[]) => mockQuery(...(args as Parameters<typeof mockQuery>)),
  where: (...args: unknown[]) => mockWhere(...(args as Parameters<typeof mockWhere>)),
  orderBy: (...args: unknown[]) => mockOrderBy(...(args as Parameters<typeof mockOrderBy>)),
  limit: (...args: unknown[]) => mockLimit(...(args as Parameters<typeof mockLimit>)),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  serverTimestamp: () => mockServerTimestamp(),
  // Résout immédiatement (cf. campaigns.test.ts — sémantique offline testée
  // ailleurs).
  waitForPendingWrites: () => Promise.resolve(),
}));

vi.mock('@/shared/lib/firebase', () => ({
  getDb: () => ({ __type: 'mock-db' }),
}));

import {
  cancelSession,
  createSession,
  endSession,
  getActiveSession,
  getSession,
  listSessions,
  reopenSession,
  SessionServiceError,
  setSessionAttendance,
  startSession,
  updateSessionMeta,
  updateSessionNotes,
} from '../sessions';

const CID = 'demo-cid';
const SID = 'sess-1';

beforeEach(() => {
  mockGetDoc.mockReset();
  mockGetDocs.mockReset();
  mockSetDoc.mockReset().mockResolvedValue(undefined);
  mockUpdateDoc.mockReset().mockResolvedValue(undefined);
  mockDoc.mockClear();
  mockCollection.mockClear();
  mockQuery.mockClear();
  mockWhere.mockClear();
  mockOrderBy.mockClear();
  mockLimit.mockClear();
  autoIdCounter = 0;
});

// ─────────────────────────────────────────────────────────────────────
// createSession
// ─────────────────────────────────────────────────────────────────────

describe('createSession', () => {
  it('auto-numérote à 1 sur une campagne sans session', async () => {
    mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] });

    const result = await createSession(CID, { title: 'Première séance' });

    expect(result.number).toBe(1);
    expect(result.sessionId).toMatch(/^auto-id-/);

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [ref, payload] = mockSetDoc.mock.calls[0]! as [
      { path: string },
      Record<string, unknown>,
    ];
    expect(ref.path).toBe(`campaigns/${CID}/sessions/${result.sessionId}`);
    expect(payload).toMatchObject({
      id: result.sessionId,
      number: 1,
      title: 'Première séance',
      plannedDate: null,
      startedAt: null,
      endedAt: null,
      status: 'planned',
      attendance: [],
      notes: '',
      journalCompiled: null,
      createdAt: 'MOCK_SERVER_TS',
      updatedAt: 'MOCK_SERVER_TS',
    });
  });

  it('auto-numérote à max+1 sur une campagne existante', async () => {
    mockGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => ({ number: 7 }) }],
    });

    const result = await createSession(CID, { title: 'Séance 8' });
    expect(result.number).toBe(8);
    const [, payload] = mockSetDoc.mock.calls[0]! as [unknown, Record<string, unknown>];
    expect(payload.number).toBe(8);
  });

  it('passe plannedDate quand fournie', async () => {
    mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] });
    const when = new Date('2026-07-01T20:00:00Z');
    await createSession(CID, { title: 'Datée', plannedDate: when });
    const [, payload] = mockSetDoc.mock.calls[0]! as [unknown, Record<string, unknown>];
    expect(payload.plannedDate).toBe(when);
  });

  it('numérote via orderBy(number desc) limit(1)', async () => {
    mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] });
    await createSession(CID, { title: 'X' });
    expect(mockOrderBy).toHaveBeenCalledWith('number', 'desc');
    expect(mockLimit).toHaveBeenCalledWith(1);
  });
});

// ─────────────────────────────────────────────────────────────────────
// listSessions / getSession / getActiveSession
// ─────────────────────────────────────────────────────────────────────

describe('listSessions', () => {
  it('mappe les docs en Session[] triés par numéro desc (query)', async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        { data: () => ({ id: 's2', number: 2, title: 'B' }) },
        { data: () => ({ id: 's1', number: 1, title: 'A' }) },
      ],
    });
    const result = await listSessions(CID);
    expect(result.map((s) => s.id)).toEqual(['s2', 's1']);
    expect(mockOrderBy).toHaveBeenCalledWith('number', 'desc');
    const collectionCall = mockCollection.mock.calls.at(-1);
    expect(collectionCall?.[1]).toBe('campaigns');
    expect(collectionCall?.[2]).toBe(CID);
    expect(collectionCall?.[3]).toBe('sessions');
  });

  it('renvoie [] si aucune session', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });
    expect(await listSessions(CID)).toEqual([]);
  });
});

describe('getSession', () => {
  it('renvoie le payload typé si le doc existe', async () => {
    const sess = { id: SID, number: 1, title: 'S', status: 'planned' };
    mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => sess });
    expect(await getSession(CID, SID)).toEqual(sess);
  });

  it('throw session-not-found si absent', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });
    await expect(getSession(CID, SID)).rejects.toMatchObject({
      name: 'SessionServiceError',
      kind: 'session-not-found',
    });
  });
});

describe('getActiveSession', () => {
  it('renvoie la session active (where status == active, limit 1)', async () => {
    mockGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => ({ id: 'live', status: 'active' }) }],
    });
    const result = await getActiveSession(CID);
    expect(result?.id).toBe('live');
    expect(mockWhere).toHaveBeenCalledWith('status', '==', 'active');
    expect(mockLimit).toHaveBeenCalledWith(1);
  });

  it('renvoie null si aucune session active', async () => {
    mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] });
    expect(await getActiveSession(CID)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────
// startSession (garde-fou « une seule active »)
// ─────────────────────────────────────────────────────────────────────

describe('startSession', () => {
  it('démarre quand aucune session active', async () => {
    mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] });
    await startSession(CID, SID);
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const [ref, payload] = mockUpdateDoc.mock.calls[0]! as [
      { path: string },
      Record<string, unknown>,
    ];
    expect(ref.path).toBe(`campaigns/${CID}/sessions/${SID}`);
    expect(payload).toMatchObject({
      status: 'active',
      startedAt: 'MOCK_SERVER_TS',
      updatedAt: 'MOCK_SERVER_TS',
    });
  });

  it('idempotent : re-démarrer LA session déjà active ne throw pas', async () => {
    mockGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => ({ id: SID, status: 'active' }) }],
    });
    await startSession(CID, SID);
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
  });

  it('throw another-session-active si une AUTRE session est active', async () => {
    mockGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => ({ id: 'other-live', status: 'active' }) }],
    });
    await expect(startSession(CID, SID)).rejects.toMatchObject({
      name: 'SessionServiceError',
      kind: 'another-session-active',
    });
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────
// endSession / updateSessionNotes / setSessionAttendance
// ─────────────────────────────────────────────────────────────────────

describe('endSession', () => {
  it('passe status=completed + endedAt', async () => {
    await endSession(CID, SID);
    const [ref, payload] = mockUpdateDoc.mock.calls[0]! as [
      { path: string },
      Record<string, unknown>,
    ];
    expect(ref.path).toBe(`campaigns/${CID}/sessions/${SID}`);
    expect(payload).toMatchObject({
      status: 'completed',
      endedAt: 'MOCK_SERVER_TS',
      updatedAt: 'MOCK_SERVER_TS',
    });
  });
});

describe('updateSessionNotes', () => {
  it('patch notes + updatedAt', async () => {
    await updateSessionNotes(CID, SID, '# Compte-rendu');
    const [, payload] = mockUpdateDoc.mock.calls[0]! as [unknown, Record<string, unknown>];
    expect(payload).toEqual({ notes: '# Compte-rendu', updatedAt: 'MOCK_SERVER_TS' });
  });
});

describe('setSessionAttendance', () => {
  it('remplace la liste de présence', async () => {
    await setSessionAttendance(CID, SID, ['u1', 'u2']);
    const [, payload] = mockUpdateDoc.mock.calls[0]! as [unknown, Record<string, unknown>];
    expect(payload).toEqual({ attendance: ['u1', 'u2'], updatedAt: 'MOCK_SERVER_TS' });
  });
});

// ─────────────────────────────────────────────────────────────────────
// M13 — renommer, annuler, rouvrir
// ─────────────────────────────────────────────────────────────────────

describe('updateSessionMeta (M13)', () => {
  it('patche titre, numéro et date', async () => {
    const date = new Date('2026-09-12T00:00:00');
    await updateSessionMeta(CID, SID, {
      title: 'Le Siège de Corvus',
      number: 42,
      plannedDate: date,
    });
    const [ref, payload] = mockUpdateDoc.mock.calls[0]! as [
      { path: string },
      Record<string, unknown>,
    ];
    expect(ref.path).toBe(`campaigns/${CID}/sessions/${SID}`);
    expect(payload).toEqual({
      title: 'Le Siège de Corvus',
      number: 42,
      plannedDate: date,
      updatedAt: 'MOCK_SERVER_TS',
    });
  });

  it('accepte un effacement explicite de la date (null ≠ absent)', async () => {
    await updateSessionMeta(CID, SID, { plannedDate: null });
    const [, payload] = mockUpdateDoc.mock.calls[0]! as [unknown, Record<string, unknown>];
    expect(payload).toEqual({ plannedDate: null, updatedAt: 'MOCK_SERVER_TS' });
  });

  it("patch vide → aucune écriture", async () => {
    await updateSessionMeta(CID, SID, {});
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});

describe('cancelSession (M13)', () => {
  it("écrit le statut 'cancelled' sans poser endedAt", async () => {
    await cancelSession(CID, SID);
    const [, payload] = mockUpdateDoc.mock.calls[0]! as [unknown, Record<string, unknown>];
    expect(payload).toEqual({ status: 'cancelled', updatedAt: 'MOCK_SERVER_TS' });
    // Rien ne s'est terminé : `endedAt` doit rester tel quel.
    expect(payload).not.toHaveProperty('endedAt');
  });
});

describe('reopenSession (M13)', () => {
  it("séance terminée → redevient active et efface endedAt", async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ id: SID, status: 'completed' }),
    });
    mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] });

    await reopenSession(CID, SID);

    const [, payload] = mockUpdateDoc.mock.calls[0]! as [unknown, Record<string, unknown>];
    expect(payload).toEqual({
      status: 'active',
      endedAt: null,
      updatedAt: 'MOCK_SERVER_TS',
    });
  });

  it("séance annulée → revient à 'planned' (elle n'avait jamais commencé)", async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ id: SID, status: 'cancelled' }),
    });

    await reopenSession(CID, SID);

    const [, payload] = mockUpdateDoc.mock.calls[0]! as [unknown, Record<string, unknown>];
    expect(payload).toEqual({ status: 'planned', updatedAt: 'MOCK_SERVER_TS' });
    // Pas de lecture de la séance active : on ne va pas vers `active`.
    expect(mockGetDocs).not.toHaveBeenCalled();
  });

  it('refuse de rouvrir en active si une AUTRE séance tourne', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ id: SID, status: 'completed' }),
    });
    mockGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => ({ id: 'other-live', status: 'active' }) }],
    });

    await expect(reopenSession(CID, SID)).rejects.toMatchObject({
      kind: 'another-session-active',
    });
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('no-op sur une séance déjà ouverte', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ id: SID, status: 'active' }),
    });
    await reopenSession(CID, SID);
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────
// SessionServiceError contract
// ─────────────────────────────────────────────────────────────────────

describe('SessionServiceError', () => {
  it("expose le `kind` et le nom 'SessionServiceError'", () => {
    const err = new SessionServiceError('session-not-found', 'msg');
    expect(err.name).toBe('SessionServiceError');
    expect(err.kind).toBe('session-not-found');
    expect(err.message).toBe('msg');
    expect(err).toBeInstanceOf(Error);
  });
});
