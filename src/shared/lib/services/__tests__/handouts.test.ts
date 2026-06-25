import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Unit tests pour `src/shared/lib/services/handouts.ts` (plan 27).
 *
 * Pattern : mock `firebase/firestore` + `getDb` (cf. `sessions.test.ts`). On
 * vérifie le CONTRAT d'écriture/lecture (chemin, payload, fusion des deux
 * queries destinataire ∪ 'all', tri desc, idempotence du self-reveal) — pas
 * l'interaction réelle avec Firestore (testée contre l'émulateur dans
 * `tests/firestore-rules.test.ts`).
 */

const mockGetDocs = vi.fn();
const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockServerTimestamp = vi.fn(() => 'MOCK_SERVER_TS');

let autoIdCounter = 0;
const mockDoc = vi.fn(
  (first: unknown, ...rest: unknown[]): { __type: 'doc'; id: string; path: string } => {
    if (
      rest.length === 0 &&
      typeof first === 'object' &&
      first !== null &&
      (first as { __type?: string }).__type === 'collection-ref'
    ) {
      const collectionPath = (first as { path: string }).path;
      const id = `auto-id-${++autoIdCounter}`;
      return { __type: 'doc', id, path: `${collectionPath}/${id}` };
    }
    const segments = rest as string[];
    return {
      __type: 'doc',
      id: segments[segments.length - 1] ?? '',
      path: segments.join('/'),
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

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as Parameters<typeof mockDoc>)),
  collection: (...args: unknown[]) =>
    mockCollection(...(args as Parameters<typeof mockCollection>)),
  query: (...args: unknown[]) => mockQuery(...(args as Parameters<typeof mockQuery>)),
  where: (...args: unknown[]) => mockWhere(...(args as Parameters<typeof mockWhere>)),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  serverTimestamp: () => mockServerTimestamp(),
  waitForPendingWrites: () => Promise.resolve(),
}));

vi.mock('@/shared/lib/firebase', () => ({
  getDb: () => ({ __type: 'mock-db' }),
}));

import {
  archiveHandout,
  createHandout,
  listAllHandouts,
  listHandoutsForRecipient,
  revealHandout,
} from '../handouts';

const CID = 'demo-cid';

/** Doc Firestore valide pour le schéma Handout — `createdAt` contrôlable. */
function makeDoc(
  id: string,
  overrides: Record<string, unknown> = {},
  seconds = 0,
): { id: string; data: () => Record<string, unknown> } {
  return {
    id,
    data: () => ({
      id,
      title: `Doc ${id}`,
      type: 'text',
      content: { text: 'Contenu' },
      recipients: 'all',
      revealedTo: [],
      visibility: 'sent',
      createdBy: 'dm-1',
      createdAt: { seconds },
      ...overrides,
    }),
  };
}

beforeEach(() => {
  mockGetDocs.mockReset();
  mockSetDoc.mockReset().mockResolvedValue(undefined);
  mockUpdateDoc.mockReset().mockResolvedValue(undefined);
  mockDoc.mockClear();
  mockCollection.mockClear();
  mockQuery.mockClear();
  mockWhere.mockClear();
  autoIdCounter = 0;
});

describe('createHandout', () => {
  it("écrit un handout 'sent' au bon chemin avec revealedTo vide", async () => {
    const id = await createHandout(CID, 'dm-1', {
      title: 'La carte du donjon',
      type: 'text',
      content: { text: '## Salle 1' },
      recipients: 'all',
    });
    expect(id).toMatch(/^auto-id-/);
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [ref, payload] = mockSetDoc.mock.calls[0]! as [
      { path: string },
      Record<string, unknown>,
    ];
    expect(ref.path).toBe(`campaigns/${CID}/handouts/${id}`);
    expect(payload).toMatchObject({
      id,
      title: 'La carte du donjon',
      type: 'text',
      content: { text: '## Salle 1' },
      recipients: 'all',
      revealedTo: [],
      visibility: 'sent',
      createdBy: 'dm-1',
      createdAt: 'MOCK_SERVER_TS',
    });
  });

  it("n'inclut PAS imageUrl dans content quand l'image est absente (Firestore refuse undefined)", async () => {
    await createHandout(CID, 'dm-1', {
      title: 'Texte seul',
      type: 'text',
      content: { text: 'abc' },
      recipients: ['p-1'],
    });
    const [, payload] = mockSetDoc.mock.calls[0]! as [unknown, Record<string, unknown>];
    expect(payload.content).toEqual({ text: 'abc' });
    expect('imageUrl' in (payload.content as object)).toBe(false);
  });
});

describe('listAllHandouts (MJ)', () => {
  it('lit toute la collection et trie du plus récent au plus ancien', async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [makeDoc('a', {}, 100), makeDoc('b', {}, 300), makeDoc('c', {}, 200)],
    });
    const list = await listAllHandouts(CID);
    expect(list.map((h) => h.id)).toEqual(['b', 'c', 'a']);
  });
});

describe('listHandoutsForRecipient (joueur)', () => {
  it('fusionne destinataire ∪ all, dédoublonne par id, trie desc', async () => {
    // query 1 (array-contains uid) puis query 2 (== 'all')
    mockGetDocs
      .mockResolvedValueOnce({ docs: [makeDoc('mine', { recipients: ['p-1'] }, 50)] })
      .mockResolvedValueOnce({ docs: [makeDoc('all', { recipients: 'all' }, 90)] });
    const list = await listHandoutsForRecipient(CID, 'p-1');
    expect(list.map((h) => h.id)).toEqual(['all', 'mine']);
    // Deux queries lancées sur la collection handouts.
    expect(mockWhere).toHaveBeenCalledWith('recipients', 'array-contains', 'p-1');
    expect(mockWhere).toHaveBeenCalledWith('recipients', '==', 'all');
  });

  it('ignore un doc Firestore invalide sans planter', async () => {
    mockGetDocs
      .mockResolvedValueOnce({
        docs: [{ id: 'bad', data: () => ({ title: 42 }) }, makeDoc('ok', { recipients: ['p-1'] }, 10)],
      })
      .mockResolvedValueOnce({ docs: [] });
    const list = await listHandoutsForRecipient(CID, 'p-1');
    expect(list.map((h) => h.id)).toEqual(['ok']);
  });
});

describe('revealHandout (self-reveal)', () => {
  it("appende l'UID à revealedTo quand il est absent", async () => {
    await revealHandout(CID, 'h-1', 'p-1', ['p-0']);
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const [ref, patch] = mockUpdateDoc.mock.calls[0]! as [
      { path: string },
      Record<string, unknown>,
    ];
    expect(ref.path).toBe(`campaigns/${CID}/handouts/h-1`);
    expect(patch).toEqual({ revealedTo: ['p-0', 'p-1'] });
  });

  it('est idempotent : no-op si l’UID est déjà présent (la rule exige concat exact)', async () => {
    await revealHandout(CID, 'h-1', 'p-1', ['p-0', 'p-1']);
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});

describe('archiveHandout (MJ)', () => {
  it("passe visibility à 'archived'", async () => {
    await archiveHandout(CID, 'h-1');
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const [, patch] = mockUpdateDoc.mock.calls[0]! as [unknown, Record<string, unknown>];
    expect(patch).toEqual({ visibility: 'archived' });
  });
});
