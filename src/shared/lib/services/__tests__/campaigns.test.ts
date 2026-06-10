import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Unit tests pour `src/shared/lib/services/campaigns.ts`.
 *
 * JALON 4.0.3 — couverture du refactor service complet :
 *   - `ensureCampaignExists` (legacy proto map, conservé)
 *   - `createCampaign` + `generateInviteCode`
 *   - `listMyCampaigns`
 *   - `joinByCode`
 *   - `leaveCampaign`
 *   - `promoteToGm`
 *   - `updateCampaign`
 *   - `linkCharacterToMembership`
 *   - `kickMember`
 *
 * Pattern : mock `firebase/firestore` + `getDb` (cf. `maps.test.ts`). On vérifie
 * le contrat d'écriture/lecture (chemin, payload, sémantique d'idempotence,
 * cas d'erreur), pas l'interaction réelle avec Firestore — celle-ci est testée
 * dans `tests/firestore-rules.test.ts` contre l'émulateur.
 */

// ─────────────────────────────────────────────────────────────────────
// Mocks firebase/firestore
// ─────────────────────────────────────────────────────────────────────

const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockServerTimestamp = vi.fn(() => 'MOCK_SERVER_TS');

// Generates incremental auto-IDs for `doc(collection(db, 'campaigns'))`.
let autoIdCounter = 0;
const mockDoc = vi.fn(
  (
    first: unknown,
    ...rest: unknown[]
  ): { __type: 'doc'; id: string; path: string; parent: unknown } => {
    // Variant 1 — `doc(collectionRef)` : un seul argument, marker
    // `__type === 'collection-ref'`. On génère un ID auto Firestore-style.
    if (
      rest.length === 0 &&
      typeof first === 'object' &&
      first !== null &&
      (first as { __type?: string }).__type === 'collection-ref'
    ) {
      const collectionPath = (first as { path: string }).path;
      const id = `auto-id-${++autoIdCounter}`;
      return {
        __type: 'doc',
        id,
        path: `${collectionPath}/${id}`,
        parent: first,
      };
    }
    // Variant 2 — `doc(db, 'campaigns', cid, 'members', uid)` : segments path.
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

const mockCollectionGroup = vi.fn(
  (_db: unknown, name: string): { __type: 'collection-group-ref'; name: string } => ({
    __type: 'collection-group-ref',
    name,
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

interface BatchOp {
  type: 'set' | 'update' | 'delete';
  ref: { path: string; id: string };
  payload?: Record<string, unknown>;
}
let lastBatch: { ops: BatchOp[]; commit: ReturnType<typeof vi.fn> } | null = null;
const mockWriteBatch = vi.fn(() => {
  const ops: BatchOp[] = [];
  const commit = vi.fn().mockResolvedValue(undefined);
  const batch = {
    ops,
    commit,
    set: vi.fn((ref: { path: string; id: string }, payload: Record<string, unknown>) => {
      ops.push({ type: 'set', ref, payload });
      return batch;
    }),
    update: vi.fn((ref: { path: string; id: string }, payload: Record<string, unknown>) => {
      ops.push({ type: 'update', ref, payload });
      return batch;
    }),
    delete: vi.fn((ref: { path: string; id: string }) => {
      ops.push({ type: 'delete', ref });
      return batch;
    }),
  };
  lastBatch = batch;
  return batch;
});

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as Parameters<typeof mockDoc>)),
  collection: (...args: unknown[]) => mockCollection(...(args as Parameters<typeof mockCollection>)),
  collectionGroup: (...args: unknown[]) =>
    mockCollectionGroup(...(args as Parameters<typeof mockCollectionGroup>)),
  query: (...args: unknown[]) => mockQuery(...(args as Parameters<typeof mockQuery>)),
  where: (...args: unknown[]) => mockWhere(...(args as Parameters<typeof mockWhere>)),
  orderBy: (...args: unknown[]) => mockOrderBy(...(args as Parameters<typeof mockOrderBy>)),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  writeBatch: () => mockWriteBatch(),
  serverTimestamp: () => mockServerTimestamp(),
  // `waitForPendingWrites` est appelé par `trackPendingWrite` (JALON 1D.3) pour
  // décrémenter le compteur quand l'écriture est ack backend. Le mock résout
  // immédiatement — la sémantique offline réelle est testée dans
  // `track-pending-write.test.ts`.
  waitForPendingWrites: () => Promise.resolve(),
}));

vi.mock('@/shared/lib/firebase', () => ({
  getDb: () => ({ __type: 'mock-db' }),
}));

import {
  CampaignServiceError,
  createCampaign,
  ensureCampaignExists,
  generateInviteCode,
  joinByCode,
  kickMember,
  leaveCampaign,
  linkCharacterToMembership,
  listMyCampaigns,
  promoteToGm,
  updateCampaign,
} from '../campaigns';
import { INVITE_CODE_REGEX } from '@/shared/types/campaign';

const CID = 'demo-cid';
const UID = 'user-alice';

beforeEach(() => {
  mockGetDoc.mockReset();
  mockGetDocs.mockReset();
  mockSetDoc.mockReset().mockResolvedValue(undefined);
  mockUpdateDoc.mockReset().mockResolvedValue(undefined);
  mockDeleteDoc.mockReset().mockResolvedValue(undefined);
  mockDoc.mockClear();
  mockCollection.mockClear();
  mockCollectionGroup.mockClear();
  mockQuery.mockClear();
  mockWhere.mockClear();
  mockOrderBy.mockClear();
  mockWriteBatch.mockClear();
  lastBatch = null;
  autoIdCounter = 0;
});

// ─────────────────────────────────────────────────────────────────────
// generateInviteCode
// ─────────────────────────────────────────────────────────────────────

describe('generateInviteCode', () => {
  it('renvoie un code 6 caractères conforme à INVITE_CODE_REGEX', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateInviteCode();
      expect(code).toHaveLength(6);
      expect(INVITE_CODE_REGEX.test(code)).toBe(true);
    }
  });

  it("n'utilise jamais les caractères ambigus 0/1/I/O", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      for (const ch of generateInviteCode()) seen.add(ch);
    }
    expect(seen.has('0')).toBe(false);
    expect(seen.has('1')).toBe(false);
    expect(seen.has('I')).toBe(false);
    expect(seen.has('O')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// createCampaign
// ─────────────────────────────────────────────────────────────────────

describe('createCampaign', () => {
  it('pose un doc campaigns/{autoId} et un doc inviteCodes/{code} en batch atomique', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    const result = await createCampaign({ name: 'Campagne de test' }, UID);

    expect(result.campaignId).toMatch(/^auto-id-/);
    expect(INVITE_CODE_REGEX.test(result.inviteCode)).toBe(true);

    expect(lastBatch).not.toBeNull();
    expect(lastBatch!.ops).toHaveLength(2);
    expect(lastBatch!.commit).toHaveBeenCalledTimes(1);

    const campaignOp = lastBatch!.ops[0]!;
    expect(campaignOp.type).toBe('set');
    expect(campaignOp.ref.path).toBe(`campaigns/${result.campaignId}`);
    expect(campaignOp.payload).toMatchObject({
      id: result.campaignId,
      name: 'Campagne de test',
      description: '',
      gmIds: [UID],
      createdBy: UID,
      inviteCode: result.inviteCode,
      status: 'active',
      schemaVersion: 1,
      createdAt: 'MOCK_SERVER_TS',
      updatedAt: 'MOCK_SERVER_TS',
    });
    expect(campaignOp.payload!.settings).toMatchObject({
      language: 'fr',
      diceMode: 'digital',
      variants: {
        featAtLevel1: false,
        flanking: false,
        slowHealing: false,
        grittyRealism: false,
      },
    });

    const codeOp = lastBatch!.ops[1]!;
    expect(codeOp.type).toBe('set');
    expect(codeOp.ref.path).toBe(`inviteCodes/${result.inviteCode}`);
    expect(codeOp.payload).toMatchObject({
      code: result.inviteCode,
      campaignId: result.campaignId,
      createdBy: UID,
      createdAt: 'MOCK_SERVER_TS',
    });
  });

  it('merge les settings utilisateur dans les défauts (partial override)', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    await createCampaign(
      {
        name: 'Test',
        description: 'long-desc',
        settings: {
          diceMode: 'physical',
          variants: { flanking: true },
        },
      },
      UID,
    );
    const campaignOp = lastBatch!.ops[0]!;
    expect(campaignOp.payload).toMatchObject({
      description: 'long-desc',
      settings: {
        language: 'fr',
        diceMode: 'physical',
        variants: {
          featAtLevel1: false,
          flanking: true,
          slowHealing: false,
          grittyRealism: false,
        },
      },
    });
  });

  it('retry sur collision invite code (1 essai → collision, 2e → free)', async () => {
    let calls = 0;
    mockGetDoc.mockImplementation(() => {
      calls += 1;
      return Promise.resolve({ exists: () => calls === 1 });
    });
    const result = await createCampaign({ name: 'Test' }, UID);
    expect(result.inviteCode).toBeTruthy();
    expect(calls).toBeGreaterThanOrEqual(2);
  });

  it('throw CampaignServiceError(invite-code-collision-exhausted) après 5 collisions', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true });
    await expect(createCampaign({ name: 'Test' }, UID)).rejects.toMatchObject({
      name: 'CampaignServiceError',
      kind: 'invite-code-collision-exhausted',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────
// listMyCampaigns
// ─────────────────────────────────────────────────────────────────────

describe('listMyCampaigns', () => {
  function mkCampaignDoc(
    id: string,
    data: Record<string, unknown>,
  ): { id: string; data: () => unknown } {
    return { id, data: () => ({ id, ...data }) };
  }

  it('renvoie les campagnes MJ + membres en dédupliquant par campaignId', async () => {
    mockGetDocs
      // Q1 — gmIds array-contains uid
      .mockResolvedValueOnce({
        docs: [
          mkCampaignDoc('camp-A', {
            name: 'A',
            gmIds: [UID],
            updatedAt: { seconds: 300 },
          }),
        ],
      })
      // Q2 — collectionGroup('members') where userId == uid
      .mockResolvedValueOnce({
        docs: [
          {
            ref: {
              parent: {
                parent: { id: 'camp-B', path: 'campaigns/camp-B' },
              },
            },
          },
        ],
      });

    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        id: 'camp-B',
        name: 'B',
        gmIds: ['other-uid'],
        updatedAt: { seconds: 100 },
      }),
    });

    const result = await listMyCampaigns(UID);

    expect(result.map((c) => c.id)).toEqual(['camp-A', 'camp-B']);
  });

  it('dédupe quand le user est à la fois MJ et membre (Q1 gagne)', async () => {
    mockGetDocs
      .mockResolvedValueOnce({
        docs: [
          mkCampaignDoc('camp-A', {
            name: 'A-gm-view',
            gmIds: [UID],
            updatedAt: { seconds: 500 },
          }),
        ],
      })
      .mockResolvedValueOnce({
        docs: [
          {
            ref: {
              parent: {
                parent: { id: 'camp-A', path: 'campaigns/camp-A' },
              },
            },
          },
        ],
      });

    // Le getDoc parent du member ne doit PAS être appelé puisque déjà connu.
    const result = await listMyCampaigns(UID);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ name: 'A-gm-view' });
    expect(mockGetDoc).not.toHaveBeenCalled();
  });

  it('trie par updatedAt desc', async () => {
    mockGetDocs
      .mockResolvedValueOnce({
        docs: [
          mkCampaignDoc('older', {
            gmIds: [UID],
            updatedAt: { seconds: 100 },
          }),
          mkCampaignDoc('newer', {
            gmIds: [UID],
            updatedAt: { seconds: 500 },
          }),
        ],
      })
      .mockResolvedValueOnce({ docs: [] });

    const result = await listMyCampaigns(UID);
    expect(result.map((c) => c.id)).toEqual(['newer', 'older']);
  });
});

// ─────────────────────────────────────────────────────────────────────
// joinByCode
// ─────────────────────────────────────────────────────────────────────

describe('joinByCode', () => {
  it('lookup inviteCodes/{code} puis pose members/{uid}', async () => {
    mockGetDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ campaignId: 'camp-X' }),
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          id: 'camp-X',
          gmIds: ['other'],
          name: 'X',
        }),
      });

    const result = await joinByCode('ABC234', UID);

    expect(result.campaignId).toBe('camp-X');
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [ref, payload] = mockSetDoc.mock.calls[0]! as [
      { path: string },
      Record<string, unknown>,
    ];
    expect(ref.path).toBe(`campaigns/camp-X/members/${UID}`);
    expect(payload).toMatchObject({
      userId: UID,
      role: 'member',
      characterId: null,
      joinedAt: 'MOCK_SERVER_TS',
      schemaVersion: 1,
    });
  });

  it('no-op write si le user est déjà MJ', async () => {
    mockGetDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ campaignId: 'camp-X' }),
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ id: 'camp-X', gmIds: [UID] }),
      });

    const result = await joinByCode('ABC234', UID);
    expect(result.campaignId).toBe('camp-X');
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('throw invite-code-not-found si lookup absent', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });
    await expect(joinByCode('ZZZZZZ', UID)).rejects.toMatchObject({
      kind: 'invite-code-not-found',
    });
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('throw campaign-not-found si le doc campagne est absent malgré le code', async () => {
    mockGetDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ campaignId: 'orphan' }),
      })
      .mockResolvedValueOnce({ exists: () => false });

    await expect(joinByCode('ABC234', UID)).rejects.toMatchObject({
      kind: 'campaign-not-found',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────
// leaveCampaign
// ─────────────────────────────────────────────────────────────────────

describe('leaveCampaign', () => {
  it('delete members/{uid} pour un joueur', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ id: CID, gmIds: ['other-gm'] }),
    });

    await leaveCampaign(CID, UID);

    expect(lastBatch!.ops).toHaveLength(1);
    expect(lastBatch!.ops[0]).toMatchObject({
      type: 'delete',
      ref: { path: `campaigns/${CID}/members/${UID}` },
    });
    expect(lastBatch!.commit).toHaveBeenCalledTimes(1);
  });

  it('retire le MJ de gmIds + delete son doc member s\'il en a un', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ id: CID, gmIds: [UID, 'co-gm'] }),
    });

    await leaveCampaign(CID, UID);

    expect(lastBatch!.ops).toHaveLength(2);
    expect(lastBatch!.ops[0]).toMatchObject({
      type: 'update',
      ref: { path: `campaigns/${CID}` },
      payload: { gmIds: ['co-gm'], updatedAt: 'MOCK_SERVER_TS' },
    });
    expect(lastBatch!.ops[1]).toMatchObject({
      type: 'delete',
      ref: { path: `campaigns/${CID}/members/${UID}` },
    });
  });

  it('throw last-gm-cannot-leave si le user est le dernier MJ', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ id: CID, gmIds: [UID] }),
    });

    await expect(leaveCampaign(CID, UID)).rejects.toMatchObject({
      kind: 'last-gm-cannot-leave',
    });
    expect(lastBatch).toBeNull();
  });

  it('throw campaign-not-found si la campagne est absente', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });
    await expect(leaveCampaign(CID, UID)).rejects.toMatchObject({
      kind: 'campaign-not-found',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────
// promoteToGm
// ─────────────────────────────────────────────────────────────────────

describe('promoteToGm', () => {
  const TARGET = 'user-bob';

  it('update gmIds + member role s\'il existe', async () => {
    mockGetDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ id: CID, gmIds: [UID] }),
      })
      .mockResolvedValueOnce({ exists: () => true });

    await promoteToGm(CID, TARGET);

    expect(lastBatch!.ops).toHaveLength(2);
    expect(lastBatch!.ops[0]).toMatchObject({
      type: 'update',
      ref: { path: `campaigns/${CID}` },
      payload: { gmIds: [UID, TARGET], updatedAt: 'MOCK_SERVER_TS' },
    });
    expect(lastBatch!.ops[1]).toMatchObject({
      type: 'update',
      ref: { path: `campaigns/${CID}/members/${TARGET}` },
      payload: { role: 'gm' },
    });
  });

  it("crée un doc member si la cible n'en a pas (promotion directe)", async () => {
    mockGetDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ id: CID, gmIds: [UID] }),
      })
      .mockResolvedValueOnce({ exists: () => false });

    await promoteToGm(CID, TARGET);

    expect(lastBatch!.ops[1]).toMatchObject({
      type: 'set',
      ref: { path: `campaigns/${CID}/members/${TARGET}` },
      payload: {
        userId: TARGET,
        role: 'gm',
        characterId: null,
        joinedAt: 'MOCK_SERVER_TS',
        schemaVersion: 1,
      },
    });
  });

  it('no-op idempotent si la cible est déjà MJ', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ id: CID, gmIds: [UID, TARGET] }),
    });
    await promoteToGm(CID, TARGET);
    expect(lastBatch).toBeNull();
  });

  it('throw campaign-not-found si la campagne est absente', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });
    await expect(promoteToGm(CID, TARGET)).rejects.toMatchObject({
      kind: 'campaign-not-found',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────
// updateCampaign
// ─────────────────────────────────────────────────────────────────────

describe('updateCampaign', () => {
  it('patch les champs simples sans settings (pas de read préalable)', async () => {
    await updateCampaign(CID, { name: 'new', description: 'desc', status: 'paused' });
    expect(mockGetDoc).not.toHaveBeenCalled();
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const [ref, payload] = mockUpdateDoc.mock.calls[0]! as [
      { path: string },
      Record<string, unknown>,
    ];
    expect(ref.path).toBe(`campaigns/${CID}`);
    expect(payload).toMatchObject({
      name: 'new',
      description: 'desc',
      status: 'paused',
      updatedAt: 'MOCK_SERVER_TS',
    });
  });

  it('lit + deep-merge settings.variants', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        settings: {
          language: 'fr',
          diceMode: 'digital',
          variants: {
            featAtLevel1: true,
            flanking: false,
            slowHealing: false,
            grittyRealism: false,
          },
        },
      }),
    });

    await updateCampaign(CID, {
      settings: { variants: { flanking: true } },
    });

    const [, payload] = mockUpdateDoc.mock.calls[0]! as [
      unknown,
      Record<string, unknown>,
    ];
    expect(payload.settings).toMatchObject({
      language: 'fr',
      diceMode: 'digital',
      variants: {
        featAtLevel1: true,
        flanking: true,
        slowHealing: false,
        grittyRealism: false,
      },
    });
  });

  it('throw campaign-not-found si on patch les settings d\'une campagne absente', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });
    await expect(
      updateCampaign(CID, { settings: { diceMode: 'physical' } }),
    ).rejects.toMatchObject({ kind: 'campaign-not-found' });
  });
});

// ─────────────────────────────────────────────────────────────────────
// linkCharacterToMembership + kickMember
// ─────────────────────────────────────────────────────────────────────

describe('linkCharacterToMembership', () => {
  it('updates members/{uid}.characterId', async () => {
    await linkCharacterToMembership(CID, UID, 'char-42');
    const [ref, payload] = mockUpdateDoc.mock.calls[0]! as [
      { path: string },
      Record<string, unknown>,
    ];
    expect(ref.path).toBe(`campaigns/${CID}/members/${UID}`);
    expect(payload).toEqual({ characterId: 'char-42' });
  });

  it('accepts null pour délier la fiche', async () => {
    await linkCharacterToMembership(CID, UID, null);
    const [, payload] = mockUpdateDoc.mock.calls[0]! as [
      unknown,
      Record<string, unknown>,
    ];
    expect(payload).toEqual({ characterId: null });
  });
});

describe('kickMember', () => {
  it('delete members/{memberUid}', async () => {
    await kickMember(CID, 'user-victim');
    const [ref] = mockDeleteDoc.mock.calls[0]! as [{ path: string }];
    expect(ref.path).toBe(`campaigns/${CID}/members/user-victim`);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Legacy — ensureCampaignExists (conservé)
// ─────────────────────────────────────────────────────────────────────

describe('ensureCampaignExists', () => {
  it('no-op when campaign already exists (returns false)', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true });
    const created = await ensureCampaignExists(CID, UID);
    expect(created).toBe(false);
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('creates campaign stub when missing (returns true) with JALON 4.0.2 schema', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    const created = await ensureCampaignExists(CID, UID);
    expect(created).toBe(true);
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [, payload] = mockSetDoc.mock.calls[0]!;
    expect(payload).toMatchObject({
      name: CID,
      gmIds: [UID],
      createdBy: UID,
      status: 'active',
      schemaVersion: 1,
      createdAt: 'MOCK_SERVER_TS',
      updatedAt: 'MOCK_SERVER_TS',
    });
  });

  it('does NOT carry the legacy dmUserId field (anti-regression)', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    await ensureCampaignExists(CID, UID);
    const [, payload] = mockSetDoc.mock.calls[0]! as [unknown, Record<string, unknown>];
    expect(payload).not.toHaveProperty('dmUserId');
  });

  it('propagates non-permission getDoc errors', async () => {
    mockGetDoc.mockRejectedValue(new Error('quota-exceeded'));
    await expect(ensureCampaignExists(CID, UID)).rejects.toThrow('quota-exceeded');
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('falls through to setDoc on permission-denied getDoc', async () => {
    const { FirebaseError } = await import('firebase/app');
    mockGetDoc.mockRejectedValue(new FirebaseError('permission-denied', 'denied'));
    const created = await ensureCampaignExists(CID, UID);
    expect(created).toBe(true);
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────
// CampaignServiceError export contract
// ─────────────────────────────────────────────────────────────────────

describe('CampaignServiceError', () => {
  it("expose le `kind` et le nom 'CampaignServiceError'", () => {
    const err = new CampaignServiceError('invite-code-not-found', 'msg');
    expect(err.name).toBe('CampaignServiceError');
    expect(err.kind).toBe('invite-code-not-found');
    expect(err.message).toBe('msg');
    expect(err).toBeInstanceOf(Error);
  });
});
