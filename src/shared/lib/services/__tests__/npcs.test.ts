import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NpcWriteInput } from '../npcs';

/**
 * Unit tests pour `src/shared/lib/services/npcs.ts` (plan 28).
 *
 * Pattern : mock `firebase/firestore` + `getDb` (cf. `handouts.test.ts`). On
 * vérifie le CONTRAT d'écriture/lecture (chemin, payload, tri, query bornée
 * `visibility == 'all'`, upsert d'attitude, strip des `undefined` de
 * combatStats) — pas l'interaction réelle avec Firestore (testée contre
 * l'émulateur dans `tests/firestore-rules.test.ts`).
 */

const mockGetDocs = vi.fn();
const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();
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
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  serverTimestamp: () => mockServerTimestamp(),
  waitForPendingWrites: () => Promise.resolve(),
}));

vi.mock('@/shared/lib/firebase', () => ({
  getDb: () => ({ __type: 'mock-db' }),
}));

import {
  createNpc,
  deleteNpc,
  getNpc,
  listAllNpcs,
  listVisibleNpcs,
  setNpcAttitude,
  updateNpc,
} from '../npcs';

const CID = 'demo-cid';

function makeInput(overrides: Partial<NpcWriteInput> = {}): NpcWriteInput {
  return {
    name: 'Aldric',
    role: 'merchant',
    location: 'Valombre',
    shortDescription: 'Marchand bourru.',
    publicDescription: 'Tient une échoppe.',
    dmNotes: 'Informateur.',
    portrait: { type: 'letter', value: 'A' },
    combatStats: null,
    relationships: [],
    tags: ['recurring'],
    visibility: 'all',
    ...overrides,
  };
}

/** Doc Firestore valide pour le schéma Npc — `createdAt` contrôlable. */
function makeDoc(
  id: string,
  overrides: Record<string, unknown> = {},
  seconds = 0,
): { id: string; data: () => Record<string, unknown> } {
  return {
    id,
    data: () => ({
      id,
      name: `PNJ ${id}`,
      role: 'ally',
      location: '',
      shortDescription: '',
      publicDescription: '',
      dmNotes: '',
      portrait: { type: 'letter', value: 'P' },
      combatStats: null,
      relationships: [],
      tags: [],
      visibility: 'all',
      createdBy: 'dm-1',
      createdAt: { seconds },
      updatedAt: { seconds },
      ...overrides,
    }),
  };
}

beforeEach(() => {
  mockGetDocs.mockReset();
  mockGetDoc.mockReset();
  mockSetDoc.mockReset().mockResolvedValue(undefined);
  mockUpdateDoc.mockReset().mockResolvedValue(undefined);
  mockDeleteDoc.mockReset().mockResolvedValue(undefined);
  mockDoc.mockClear();
  mockCollection.mockClear();
  mockQuery.mockClear();
  mockWhere.mockClear();
  autoIdCounter = 0;
});

describe('createNpc', () => {
  it('écrit un PNJ au bon chemin avec createdAt/updatedAt serveur', async () => {
    const id = await createNpc(CID, 'dm-1', makeInput());
    expect(id).toMatch(/^auto-id-/);
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [ref, payload] = mockSetDoc.mock.calls[0]! as [
      { path: string },
      Record<string, unknown>,
    ];
    expect(ref.path).toBe(`campaigns/${CID}/npcs/${id}`);
    expect(payload).toMatchObject({
      id,
      name: 'Aldric',
      role: 'merchant',
      visibility: 'all',
      combatStats: null,
      createdBy: 'dm-1',
      createdAt: 'MOCK_SERVER_TS',
      updatedAt: 'MOCK_SERVER_TS',
    });
  });

  it('strip les clés undefined de combatStats (Firestore refuse undefined)', async () => {
    await createNpc(
      CID,
      'dm-1',
      makeInput({
        combatStats: {
          monsterContentId: 'goblin',
          hp: 7,
          ac: undefined,
          cr: undefined,
          notes: undefined,
        },
      }),
    );
    const [, payload] = mockSetDoc.mock.calls[0]! as [unknown, Record<string, unknown>];
    expect(payload.combatStats).toEqual({ monsterContentId: 'goblin', hp: 7 });
    expect('ac' in (payload.combatStats as object)).toBe(false);
  });
});

describe('updateNpc', () => {
  it('met à jour le contenu + updatedAt, sans toucher createdBy/createdAt', async () => {
    await updateNpc(CID, 'npc-1', makeInput({ name: 'Aldric II', visibility: 'dm' }));
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const [ref, patch] = mockUpdateDoc.mock.calls[0]! as [
      { path: string },
      Record<string, unknown>,
    ];
    expect(ref.path).toBe(`campaigns/${CID}/npcs/npc-1`);
    expect(patch).toMatchObject({ name: 'Aldric II', visibility: 'dm', updatedAt: 'MOCK_SERVER_TS' });
    expect('createdBy' in patch).toBe(false);
    expect('createdAt' in patch).toBe(false);
  });
});

describe('deleteNpc', () => {
  it('supprime le doc au bon chemin', async () => {
    await deleteNpc(CID, 'npc-1');
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    const [ref] = mockDeleteDoc.mock.calls[0]! as [{ path: string }];
    expect(ref.path).toBe(`campaigns/${CID}/npcs/npc-1`);
  });
});

describe('setNpcAttitude (upsert)', () => {
  it('ajoute une relation absente', async () => {
    const next = await setNpcAttitude(CID, 'npc-1', 'pj-1', 'friendly', []);
    expect(next).toEqual([{ characterId: 'pj-1', attitude: 'friendly' }]);
    const [, patch] = mockUpdateDoc.mock.calls[0]! as [unknown, Record<string, unknown>];
    expect(patch).toMatchObject({
      relationships: [{ characterId: 'pj-1', attitude: 'friendly' }],
      updatedAt: 'MOCK_SERVER_TS',
    });
  });

  it('remplace l’attitude d’une relation existante (pas de doublon)', async () => {
    const next = await setNpcAttitude(CID, 'npc-1', 'pj-1', 'hostile', [
      { characterId: 'pj-1', attitude: 'friendly' },
      { characterId: 'pj-2', attitude: 'neutral' },
    ]);
    expect(next).toEqual([
      { characterId: 'pj-1', attitude: 'hostile' },
      { characterId: 'pj-2', attitude: 'neutral' },
    ]);
  });
});

describe('listAllNpcs (MJ)', () => {
  it('lit toute la collection et trie du plus ancien au plus récent', async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [makeDoc('a', {}, 300), makeDoc('b', {}, 100), makeDoc('c', {}, 200)],
    });
    const list = await listAllNpcs(CID);
    expect(list.map((n) => n.id)).toEqual(['b', 'c', 'a']);
  });
});

describe('listVisibleNpcs (joueur)', () => {
  it("borne la query à visibility == 'all' et trie", async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [makeDoc('x', {}, 20), makeDoc('y', {}, 10)],
    });
    const list = await listVisibleNpcs(CID);
    expect(list.map((n) => n.id)).toEqual(['y', 'x']);
    expect(mockWhere).toHaveBeenCalledWith('visibility', '==', 'all');
  });

  it('ignore un doc Firestore invalide sans planter', async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [{ id: 'bad', data: () => ({ name: 42 }) }, makeDoc('ok', {}, 10)],
    });
    const list = await listVisibleNpcs(CID);
    expect(list.map((n) => n.id)).toEqual(['ok']);
  });
});

describe('getNpc', () => {
  it('renvoie le PNJ quand il existe', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      id: 'npc-1',
      data: () => makeDoc('npc-1').data(),
    });
    const npc = await getNpc(CID, 'npc-1');
    expect(npc?.id).toBe('npc-1');
  });

  it('renvoie null quand le doc est absent', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });
    expect(await getNpc(CID, 'nope')).toBeNull();
  });
});
