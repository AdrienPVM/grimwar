import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Unit tests pour `src/shared/lib/services/encounters.ts` (JALON 24.1).
 *
 * Pattern : mock `firebase/firestore` + `getDb` (cf. `sessions.test.ts`) pour les
 * fonctions à I/O ; les helpers PURS (initiative, tour, PV, états) sont testés
 * sans mock. L'interaction réelle avec Firestore + les rules sont couvertes par
 * `tests/firestore-rules.test.ts` contre l'émulateur.
 */

// ─────────────────────────────────────────────────────────────────────
// Mocks firebase/firestore (copie du harnais sessions.test.ts)
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
  waitForPendingWrites: () => Promise.resolve(),
}));

vi.mock('@/shared/lib/firebase', () => ({
  getDb: () => ({ __type: 'mock-db' }),
}));

// d20 déterministe pour les tests d'initiative.
const mockRollDie = vi.fn((_sides: number) => 12);
vi.mock('@/shared/lib/dice/roller', () => ({
  rollDieCrypto: (sides: number) => mockRollDie(sides),
}));

import type { EncounterParticipant } from '@/shared/types/encounter';

import {
  advanceTurn,
  applyHpDelta,
  applyInitiative,
  createEncounter,
  endEncounter,
  EncounterServiceError,
  getActiveEncounter,
  getEncounter,
  listEncounters,
  nextTurn,
  rollInitiativeFor,
  setParticipants,
  startEncounter,
  toggleCondition,
} from '../encounters';

const CID = 'demo-cid';
const EID = 'enc-1';

function makeParticipant(over: Partial<EncounterParticipant> = {}): EncounterParticipant {
  return {
    type: 'monster',
    characterId: null,
    monsterContentId: null,
    instanceId: 'm1',
    name: 'Gobelin',
    initiative: 0,
    currentHp: 7,
    maxHp: 7,
    tempHp: 0,
    conditions: [],
    position: null,
    notes: '',
    ...over,
  };
}

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
  mockRollDie.mockClear().mockReturnValue(12);
  autoIdCounter = 0;
});

// ─────────────────────────────────────────────────────────────────────
// createEncounter
// ─────────────────────────────────────────────────────────────────────

describe('createEncounter', () => {
  it('écrit un doc planned/round 0/turnIndex 0 avec participants normalisés', async () => {
    const result = await createEncounter(CID, {
      name: 'Embuscade gobeline',
      sessionId: 'sess-1',
      participants: [
        { type: 'player', characterId: 'pc-1', name: 'Lyralei', maxHp: 22 },
        { type: 'monster', monsterContentId: 'gobelin', name: 'Gobelin', maxHp: 7 },
      ],
    });

    expect(result.encounterId).toMatch(/^auto-id-/);
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [ref, payload] = mockSetDoc.mock.calls[0]! as [
      { path: string },
      Record<string, unknown>,
    ];
    expect(ref.path).toBe(`campaigns/${CID}/encounters/${result.encounterId}`);
    expect(payload).toMatchObject({
      id: result.encounterId,
      name: 'Embuscade gobeline',
      sessionId: 'sess-1',
      status: 'planned',
      round: 0,
      turnIndex: 0,
      mapId: null,
      fogState: null,
      createdAt: 'MOCK_SERVER_TS',
      updatedAt: 'MOCK_SERVER_TS',
      startedAt: null,
      endedAt: null,
    });
    const participants = payload.participants as EncounterParticipant[];
    expect(participants).toHaveLength(2);
    expect(participants[0]).toMatchObject({
      type: 'player',
      characterId: 'pc-1',
      monsterContentId: null,
      name: 'Lyralei',
      initiative: 0,
      currentHp: 22,
      maxHp: 22,
      tempHp: 0,
      conditions: [],
      position: null,
      notes: '',
    });
    // instanceId auto-dérivé, currentHp défaut = maxHp pour le monstre.
    expect(participants[1]!.instanceId).toMatch(/p1$/);
    expect(participants[1]!.currentHp).toBe(7);
  });

  it('respecte un instanceId et un currentHp explicites', async () => {
    await createEncounter(CID, {
      name: 'X',
      participants: [
        { type: 'monster', name: 'Blessé', maxHp: 10, currentHp: 3, instanceId: 'fixed' },
      ],
    });
    const [, payload] = mockSetDoc.mock.calls[0]! as [unknown, Record<string, unknown>];
    const p = (payload.participants as EncounterParticipant[])[0]!;
    expect(p.instanceId).toBe('fixed');
    expect(p.currentHp).toBe(3);
    expect(p.maxHp).toBe(10);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Lectures
// ─────────────────────────────────────────────────────────────────────

describe('listEncounters', () => {
  it('mappe les docs triés par createdAt desc', async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [{ data: () => ({ id: 'e2' }) }, { data: () => ({ id: 'e1' }) }],
    });
    const result = await listEncounters(CID);
    expect(result.map((e) => e.id)).toEqual(['e2', 'e1']);
    expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc');
    const collectionCall = mockCollection.mock.calls.at(-1);
    expect(collectionCall?.[3]).toBe('encounters');
  });
});

describe('getEncounter', () => {
  it('renvoie le payload si le doc existe', async () => {
    const enc = { id: EID, name: 'E', status: 'planned' };
    mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => enc });
    expect(await getEncounter(CID, EID)).toEqual(enc);
  });

  it('throw encounter-not-found si absent', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });
    await expect(getEncounter(CID, EID)).rejects.toMatchObject({
      name: 'EncounterServiceError',
      kind: 'encounter-not-found',
    });
  });
});

describe('getActiveEncounter', () => {
  it('renvoie la rencontre active (where status == active, limit 1)', async () => {
    mockGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => ({ id: 'live', status: 'active' }) }],
    });
    const result = await getActiveEncounter(CID);
    expect(result?.id).toBe('live');
    expect(mockWhere).toHaveBeenCalledWith('status', '==', 'active');
    expect(mockLimit).toHaveBeenCalledWith(1);
  });

  it('renvoie null si aucune active', async () => {
    mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] });
    expect(await getActiveEncounter(CID)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────
// Initiative (helpers purs)
// ─────────────────────────────────────────────────────────────────────

describe('rollInitiativeFor', () => {
  it('total = d20 + modificateur', () => {
    mockRollDie.mockReturnValueOnce(15);
    const r = rollInitiativeFor('m1', 2);
    expect(r).toEqual({ instanceId: 'm1', d20: 15, modifier: 2, total: 17 });
    expect(mockRollDie).toHaveBeenCalledWith(20);
  });
});

describe('applyInitiative', () => {
  it('pose les totaux et trie par initiative décroissante', () => {
    const participants = [
      makeParticipant({ instanceId: 'a', name: 'A' }),
      makeParticipant({ instanceId: 'b', name: 'B' }),
      makeParticipant({ instanceId: 'c', name: 'C' }),
    ];
    const sorted = applyInitiative(participants, [
      { instanceId: 'a', d20: 5, modifier: 0, total: 5 },
      { instanceId: 'b', d20: 18, modifier: 2, total: 20 },
      { instanceId: 'c', d20: 12, modifier: 0, total: 12 },
    ]);
    expect(sorted.map((p) => p.instanceId)).toEqual(['b', 'c', 'a']);
    expect(sorted.map((p) => p.initiative)).toEqual([20, 12, 5]);
  });

  it('conserve l’initiative courante d’un participant non re-lancé', () => {
    const participants = [
      makeParticipant({ instanceId: 'a', initiative: 99 }),
      makeParticipant({ instanceId: 'b', initiative: 0 }),
    ];
    const sorted = applyInitiative(participants, [
      { instanceId: 'b', d20: 10, modifier: 0, total: 10 },
    ]);
    // a garde 99 et reste en tête.
    expect(sorted.map((p) => p.instanceId)).toEqual(['a', 'b']);
    expect(sorted[0]!.initiative).toBe(99);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Tour (nextTurn pur + advanceTurn I/O)
// ─────────────────────────────────────────────────────────────────────

describe('nextTurn', () => {
  it('avance turnIndex sans changer de round', () => {
    expect(nextTurn({ round: 1, turnIndex: 0 }, 3)).toEqual({ round: 1, turnIndex: 1 });
  });

  it('wrap au dernier participant : round +1, turnIndex 0', () => {
    expect(nextTurn({ round: 1, turnIndex: 2 }, 3)).toEqual({ round: 2, turnIndex: 0 });
  });
});

describe('advanceTurn', () => {
  it('lit l’état, calcule et patch round/turnIndex', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        id: EID,
        round: 1,
        turnIndex: 2,
        participants: [makeParticipant(), makeParticipant(), makeParticipant()],
      }),
    });
    const result = await advanceTurn(CID, EID);
    expect(result).toEqual({ round: 2, turnIndex: 0 });
    const [, payload] = mockUpdateDoc.mock.calls[0]! as [unknown, Record<string, unknown>];
    expect(payload).toMatchObject({ round: 2, turnIndex: 0, updatedAt: 'MOCK_SERVER_TS' });
  });
});

// ─────────────────────────────────────────────────────────────────────
// startEncounter (garde-fous)
// ─────────────────────────────────────────────────────────────────────

describe('startEncounter', () => {
  it('démarre quand aucune autre rencontre active', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ id: EID, participants: [makeParticipant()] }),
    });
    mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] }); // getActiveEncounter
    await startEncounter(CID, EID);
    const [ref, payload] = mockUpdateDoc.mock.calls[0]! as [
      { path: string },
      Record<string, unknown>,
    ];
    expect(ref.path).toBe(`campaigns/${CID}/encounters/${EID}`);
    expect(payload).toMatchObject({
      status: 'active',
      round: 1,
      turnIndex: 0,
      startedAt: 'MOCK_SERVER_TS',
    });
  });

  it('throw no-participants si la rencontre est vide', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ id: EID, participants: [] }),
    });
    await expect(startEncounter(CID, EID)).rejects.toMatchObject({
      kind: 'no-participants',
    });
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('throw another-encounter-active si une AUTRE est active', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ id: EID, participants: [makeParticipant()] }),
    });
    mockGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => ({ id: 'other-live', status: 'active' }) }],
    });
    await expect(startEncounter(CID, EID)).rejects.toMatchObject({
      kind: 'another-encounter-active',
    });
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('idempotent : re-démarrer LA rencontre déjà active ne throw pas', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ id: EID, participants: [makeParticipant()] }),
    });
    mockGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => ({ id: EID, status: 'active' }) }],
    });
    await startEncounter(CID, EID);
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────
// endEncounter / setParticipants
// ─────────────────────────────────────────────────────────────────────

describe('endEncounter', () => {
  it('passe status=completed + endedAt (n’écrit PAS d’outcome sur le doc)', async () => {
    await endEncounter(CID, EID);
    const [, payload] = mockUpdateDoc.mock.calls[0]! as [unknown, Record<string, unknown>];
    expect(payload).toMatchObject({
      status: 'completed',
      endedAt: 'MOCK_SERVER_TS',
      updatedAt: 'MOCK_SERVER_TS',
    });
    expect(payload).not.toHaveProperty('outcome');
  });
});

describe('setParticipants', () => {
  it('patch la liste de participants', async () => {
    const ps = [makeParticipant({ initiative: 14 })];
    await setParticipants(CID, EID, ps);
    const [, payload] = mockUpdateDoc.mock.calls[0]! as [unknown, Record<string, unknown>];
    expect(payload).toEqual({ participants: ps, updatedAt: 'MOCK_SERVER_TS' });
  });
});

// ─────────────────────────────────────────────────────────────────────
// applyHpDelta / toggleCondition (helpers purs)
// ─────────────────────────────────────────────────────────────────────

describe('applyHpDelta', () => {
  it('applique des dégâts en clampant à 0', () => {
    const ps = [makeParticipant({ instanceId: 'm1', currentHp: 7, maxHp: 7 })];
    const { participants, before, after } = applyHpDelta(ps, 'm1', -10);
    expect(before).toBe(7);
    expect(after).toBe(0);
    expect(participants[0]!.currentHp).toBe(0);
  });

  it('applique des soins en clampant à maxHp', () => {
    const ps = [makeParticipant({ instanceId: 'm1', currentHp: 5, maxHp: 7 })];
    const { after } = applyHpDelta(ps, 'm1', +10);
    expect(after).toBe(7);
  });

  it('instanceId introuvable → liste inchangée, before === after === 0', () => {
    const ps = [makeParticipant({ instanceId: 'm1' })];
    const { participants, before, after } = applyHpDelta(ps, 'absent', -3);
    expect(participants).toEqual(ps);
    expect(before).toBe(0);
    expect(after).toBe(0);
  });
});

describe('toggleCondition', () => {
  it('ajoute un état sans doublon', () => {
    const ps = [makeParticipant({ instanceId: 'm1', conditions: ['empoisonne'] })];
    const once = toggleCondition(ps, 'm1', 'a-terre', 'add');
    expect(once[0]!.conditions).toEqual(['empoisonne', 'a-terre']);
    const twice = toggleCondition(once, 'm1', 'a-terre', 'add');
    expect(twice[0]!.conditions).toEqual(['empoisonne', 'a-terre']);
  });

  it('retire un état présent, no-op sinon', () => {
    const ps = [makeParticipant({ instanceId: 'm1', conditions: ['a-terre'] })];
    expect(toggleCondition(ps, 'm1', 'a-terre', 'remove')[0]!.conditions).toEqual([]);
    expect(toggleCondition(ps, 'm1', 'absent', 'remove')[0]!.conditions).toEqual(['a-terre']);
  });
});

// ─────────────────────────────────────────────────────────────────────
// EncounterServiceError contract
// ─────────────────────────────────────────────────────────────────────

describe('EncounterServiceError', () => {
  it("expose le `kind` et le nom 'EncounterServiceError'", () => {
    const err = new EncounterServiceError('encounter-not-found', 'msg');
    expect(err.name).toBe('EncounterServiceError');
    expect(err.kind).toBe('encounter-not-found');
    expect(err).toBeInstanceOf(Error);
  });
});
