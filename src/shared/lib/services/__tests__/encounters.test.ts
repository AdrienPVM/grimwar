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
const mockDeleteDoc = vi.fn();
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
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
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
  addParticipant,
  advanceTurn,
  deleteEncounter,
  applyHpDelta,
  applyInitiative,
  applyInitiativeRolls,
  applyParticipantHpDelta,
  createEncounter,
  endEncounter,
  EncounterServiceError,
  getActiveEncounter,
  getEncounter,
  grantTempHp,
  listEncounters,
  nextTurn,
  PARTICIPANT_NOTE_MAX,
  patchParticipantIn,
  previousTurn,
  removeParticipant,
  removeParticipantIn,
  renameEncounter,
  reopenEncounter,
  rewindTurn,
  rollInitiativeFor,
  setParticipantCondition,
  setParticipantNoteIn,
  setParticipants,
  sortByInitiative,
  startEncounter,
  toggleCondition,
  updateParticipant,
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
  mockDeleteDoc.mockReset().mockResolvedValue(undefined);
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

  // M7 — `'aborted'` était déclaré à l'enum, traduit, doté de sa pastille, et
  // aucun code ne l'écrivait : `'completed'` était en dur.
  it('écrit status=aborted quand la table abandonne le combat', async () => {
    await endEncounter(CID, EID, 'aborted');
    const [, payload] = mockUpdateDoc.mock.calls[0]! as [unknown, Record<string, unknown>];
    expect(payload).toMatchObject({ status: 'aborted', endedAt: 'MOCK_SERVER_TS' });
  });
});

// ─────────────────────────────────────────────────────────────────────
// Cycle de vie réparable — M7 (audit de malléabilité)
// ─────────────────────────────────────────────────────────────────────

describe('previousTurn', () => {
  it('recule d’un cran dans le round', () => {
    expect(previousTurn({ round: 2, turnIndex: 3 }, 5)).toEqual({ round: 2, turnIndex: 2 });
  });

  it('remonte à la FIN du round précédent depuis le premier combattant', () => {
    expect(previousTurn({ round: 3, turnIndex: 0 }, 4)).toEqual({ round: 2, turnIndex: 3 });
  });

  it('ne fabrique pas de round 0 au tout début du combat', () => {
    expect(previousTurn({ round: 1, turnIndex: 0 }, 4)).toEqual({ round: 1, turnIndex: 0 });
  });

  it('est l’exact symétrique de nextTurn', () => {
    const start = { round: 2, turnIndex: 0 };
    expect(previousTurn(nextTurn(start, 3), 3)).toEqual(start);
  });
});

describe('rewindTurn', () => {
  it('relit l’état serveur puis écrit round + turnIndex reculés', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        id: EID,
        round: 3,
        turnIndex: 0,
        participants: [makeParticipant({ instanceId: 'a' }), makeParticipant({ instanceId: 'b' })],
      }),
    });
    const out = await rewindTurn(CID, EID);
    expect(out).toEqual({ round: 2, turnIndex: 1 });
    const [, payload] = mockUpdateDoc.mock.calls[0]! as [unknown, Record<string, unknown>];
    expect(payload).toMatchObject({ round: 2, turnIndex: 1 });
  });
});

describe('reopenEncounter', () => {
  it('remet en `active` et efface `endedAt`, en gardant round et tour', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ id: EID, status: 'completed', round: 4, turnIndex: 2, participants: [] }),
    });
    mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] });
    await reopenEncounter(CID, EID);
    const [, payload] = mockUpdateDoc.mock.calls[0]! as [unknown, Record<string, unknown>];
    expect(payload).toMatchObject({ status: 'active', round: 4, endedAt: null });
    // Le tour n'est pas réécrit : on reprend exactement où on s'était arrêté.
    expect(payload).not.toHaveProperty('turnIndex');
  });

  it('remonte un `round: 0` à 1 (une rencontre en cours a forcément un round)', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ id: EID, status: 'aborted', round: 0, turnIndex: 0, participants: [] }),
    });
    mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] });
    await reopenEncounter(CID, EID);
    const [, payload] = mockUpdateDoc.mock.calls[0]! as [unknown, Record<string, unknown>];
    expect(payload).toMatchObject({ round: 1 });
  });

  it('refuse si une AUTRE rencontre est déjà active', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ id: EID, status: 'completed', round: 2, turnIndex: 0, participants: [] }),
    });
    mockGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => ({ id: 'other-enc', status: 'active' }) }],
    });
    await expect(reopenEncounter(CID, EID)).rejects.toMatchObject({
      kind: 'another-encounter-active',
    });
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});

describe('renameEncounter', () => {
  it('écrit le nom élagué', async () => {
    await renameEncounter(CID, EID, '  Le guet-apens du col  ');
    const [, payload] = mockUpdateDoc.mock.calls[0]! as [unknown, Record<string, unknown>];
    expect(payload).toMatchObject({ name: 'Le guet-apens du col' });
  });

  it('ignore un nom vide plutôt que de violer `min(1)` du schéma', async () => {
    await renameEncounter(CID, EID, '   ');
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});

describe('deleteEncounter', () => {
  it('supprime le doc de rencontre', async () => {
    await deleteEncounter(CID, EID);
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    const [ref] = mockDeleteDoc.mock.calls[0]! as [{ path: string }];
    expect(ref.path).toBe(`campaigns/${CID}/encounters/${EID}`);
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

// DEBT D31 volet 1 — l'initiative ne doit JAMAIS écraser les PV/états live.
describe('applyInitiativeRolls', () => {
  it('relit le serveur avant d écrire : les PV frais survivent au jet', async () => {
    // Le serveur porte un monstre déjà blessé (3/10) — état arrivé APRÈS le
    // snapshot que détiendrait la closure UI.
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        id: EID,
        participants: [makeParticipant({ instanceId: 'm1', currentHp: 3, maxHp: 10 })],
      }),
    });

    await applyInitiativeRolls(CID, EID, [{ instanceId: 'm1', d20: 15, modifier: 2, total: 17 }]);

    const [, payload] = mockUpdateDoc.mock.calls[0]! as [unknown, Record<string, unknown>];
    const written = payload.participants as EncounterParticipant[];
    expect(written[0]!.currentHp).toBe(3); // PV frais préservés, pas réécrasés
    expect(written[0]!.initiative).toBe(17); // initiative bien appliquée
  });

  it('préserve les états live et les participants absents des jets', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        id: EID,
        participants: [
          makeParticipant({ instanceId: 'm1', conditions: ['empoisonne'], initiative: 0 }),
          // Ajouté côté serveur entre-temps : pas de jet pour lui.
          makeParticipant({ instanceId: 'm2', currentHp: 4, initiative: 12 }),
        ],
      }),
    });

    await applyInitiativeRolls(CID, EID, [{ instanceId: 'm1', d20: 20, modifier: 0, total: 20 }]);

    const [, payload] = mockUpdateDoc.mock.calls[0]! as [unknown, Record<string, unknown>];
    const written = payload.participants as EncounterParticipant[];
    const m1 = written.find((p) => p.instanceId === 'm1')!;
    const m2 = written.find((p) => p.instanceId === 'm2')!;
    expect(m1.conditions).toEqual(['empoisonne']);
    expect(m2).toBeDefined(); // non perdu
    expect(m2.currentHp).toBe(4);
    expect(m2.initiative).toBe(12); // initiative courante conservée
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

  // DEBT D31 volet 2 — les PV temporaires absorbent les dégâts en premier (SRD).
  it('les dégâts entament les PV temporaires avant les PV réels', () => {
    const ps = [makeParticipant({ instanceId: 'm1', currentHp: 10, maxHp: 10, tempHp: 5 })];
    const { participants, before, after, tempBefore, tempAfter } = applyHpDelta(ps, 'm1', -3);
    expect(tempBefore).toBe(5);
    expect(tempAfter).toBe(2); // 3 dégâts absorbés par le bouclier
    expect(before).toBe(10);
    expect(after).toBe(10); // PV réels intacts
    expect(participants[0]!.tempHp).toBe(2);
  });

  it('le reliquat de dégâts passe sur les PV réels quand le bouclier saute', () => {
    const ps = [makeParticipant({ instanceId: 'm1', currentHp: 10, maxHp: 10, tempHp: 4 })];
    const { after, tempAfter } = applyHpDelta(ps, 'm1', -9);
    expect(tempAfter).toBe(0); // bouclier consommé
    expect(after).toBe(5); // 9 - 4 = 5 dégâts réels
  });

  it('les soins ne restaurent jamais de PV temporaires', () => {
    const ps = [makeParticipant({ instanceId: 'm1', currentHp: 2, maxHp: 10, tempHp: 3 })];
    const { after, tempAfter } = applyHpDelta(ps, 'm1', +5);
    expect(after).toBe(7);
    expect(tempAfter).toBe(3); // inchangé
  });

  it('tempHp à 0 → comportement historique strictement inchangé', () => {
    const ps = [makeParticipant({ instanceId: 'm1', currentHp: 7, maxHp: 7, tempHp: 0 })];
    const { after, tempAfter } = applyHpDelta(ps, 'm1', -10);
    expect(after).toBe(0); // clamp à 0 préservé
    expect(tempAfter).toBe(0);
  });
});

// M6 — accorder des PV temporaires (le pendant manquant de leur consommation).
describe('grantTempHp', () => {
  it('accorde un bouclier à une créature qui n’en avait pas', () => {
    const ps = [makeParticipant({ instanceId: 'm1', tempHp: 0 })];
    const { participants, before, after } = grantTempHp(ps, 'm1', 8);
    expect(before).toBe(0);
    expect(after).toBe(8);
    expect(participants[0]!.tempHp).toBe(8);
  });

  it('SRD : les PV temporaires ne s’additionnent PAS, le meilleur l’emporte', () => {
    const ps = [makeParticipant({ instanceId: 'm1', tempHp: 10 })];
    // Un bouclier plus faible ne remplace pas le bouclier en place.
    expect(grantTempHp(ps, 'm1', 4).after).toBe(10);
    // Un bouclier plus fort le remplace — sans cumuler à 18.
    expect(grantTempHp(ps, 'm1', 18).after).toBe(18);
  });

  it('un montant ≤ 0 ne retire jamais le bouclier existant', () => {
    const ps = [makeParticipant({ instanceId: 'm1', tempHp: 6 })];
    expect(grantTempHp(ps, 'm1', 0).after).toBe(6);
    expect(grantTempHp(ps, 'm1', -5).after).toBe(6);
  });

  it('n’affecte pas les PV réels', () => {
    const ps = [makeParticipant({ instanceId: 'm1', currentHp: 4, maxHp: 10, tempHp: 0 })];
    const { participants } = grantTempHp(ps, 'm1', 7);
    expect(participants[0]!.currentHp).toBe(4);
    expect(participants[0]!.maxHp).toBe(10);
  });

  it('instanceId introuvable → liste inchangée', () => {
    const ps = [makeParticipant({ instanceId: 'm1', tempHp: 2 })];
    expect(grantTempHp(ps, 'absent', 9).participants).toEqual(ps);
  });
});

// M6 — note libre par combattant.
describe('setParticipantNoteIn', () => {
  it('écrit la note sur le bon participant seulement', () => {
    const ps = [
      makeParticipant({ instanceId: 'm1', notes: '' }),
      makeParticipant({ instanceId: 'm2', notes: 'intact' }),
    ];
    const next = setParticipantNoteIn(ps, 'm1', 'Porte la clé');
    expect(next[0]!.notes).toBe('Porte la clé');
    expect(next[1]!.notes).toBe('intact');
  });

  it('tronque à la limite du schéma plutôt que de faire échouer l’écriture', () => {
    const ps = [makeParticipant({ instanceId: 'm1', notes: '' })];
    const next = setParticipantNoteIn(ps, 'm1', 'x'.repeat(PARTICIPANT_NOTE_MAX + 500));
    expect(next[0]!.notes).toHaveLength(PARTICIPANT_NOTE_MAX);
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
// applyParticipantHpDelta / setParticipantCondition (wrappers I/O, JALON 24.4)
// ─────────────────────────────────────────────────────────────────────

describe('applyParticipantHpDelta', () => {
  it('lit l’état, applique le delta (clamp), patch et renvoie before/after', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        id: EID,
        participants: [
          makeParticipant({ instanceId: 'm1', currentHp: 7, maxHp: 7 }),
          makeParticipant({ instanceId: 'm2', currentHp: 12, maxHp: 12 }),
        ],
      }),
    });
    const result = await applyParticipantHpDelta(CID, EID, 'm1', -5);
    expect(result).toEqual({ before: 7, after: 2 });
    const [, payload] = mockUpdateDoc.mock.calls[0]! as [unknown, Record<string, unknown>];
    const ps = payload.participants as EncounterParticipant[];
    expect(ps[0]!.currentHp).toBe(2);
    // L'autre participant n'est pas touché.
    expect(ps[1]!.currentHp).toBe(12);
  });

  it('clampe les dégâts à 0 (before/after reflètent le plancher)', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ id: EID, participants: [makeParticipant({ instanceId: 'm1', currentHp: 3, maxHp: 7 })] }),
    });
    const result = await applyParticipantHpDelta(CID, EID, 'm1', -10);
    expect(result).toEqual({ before: 3, after: 0 });
  });
});

describe('setParticipantCondition', () => {
  it('lit l’état, ajoute la condition et patch la liste', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ id: EID, participants: [makeParticipant({ instanceId: 'm1', conditions: [] })] }),
    });
    await setParticipantCondition(CID, EID, 'm1', 'prone', 'add');
    const [, payload] = mockUpdateDoc.mock.calls[0]! as [unknown, Record<string, unknown>];
    const ps = payload.participants as EncounterParticipant[];
    expect(ps[0]!.conditions).toEqual(['prone']);
  });

  it('retire une condition présente', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        id: EID,
        participants: [makeParticipant({ instanceId: 'm1', conditions: ['prone', 'poisoned'] })],
      }),
    });
    await setParticipantCondition(CID, EID, 'm1', 'prone', 'remove');
    const [, payload] = mockUpdateDoc.mock.calls[0]! as [unknown, Record<string, unknown>];
    const ps = payload.participants as EncounterParticipant[];
    expect(ps[0]!.conditions).toEqual(['poisoned']);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Édition d'un participant — M2 / M3 (audit de malléabilité)
// ─────────────────────────────────────────────────────────────────────

describe('patchParticipantIn', () => {
  it('renomme sans toucher au reste (« Gobelin 2 » devient « Chef »)', () => {
    const list = [makeParticipant({ instanceId: 'm1', name: 'Gobelin 2', currentHp: 4 })];
    const out = patchParticipantIn(list, 'm1', { name: '  Chef  ' });
    expect(out[0]!.name).toBe('Chef');
    expect(out[0]!.currentHp).toBe(4);
    expect(out[0]!.maxHp).toBe(7);
  });

  it('corrige des PV mal tapés (7 au lieu de 17) sans écraser les PV courants', () => {
    const list = [makeParticipant({ instanceId: 'm1', currentHp: 7, maxHp: 7 })];
    const out = patchParticipantIn(list, 'm1', { maxHp: 17 });
    expect(out[0]!.maxHp).toBe(17);
    expect(out[0]!.currentHp).toBe(7);
  });

  it('reclampe les PV courants quand le maximum descend en dessous', () => {
    const list = [makeParticipant({ instanceId: 'm1', currentHp: 20, maxHp: 25 })];
    const out = patchParticipantIn(list, 'm1', { maxHp: 12 });
    expect(out[0]!.maxHp).toBe(12);
    expect(out[0]!.currentHp).toBe(12);
  });

  it('borne le maximum à 1 et les PV courants à 0', () => {
    const list = [makeParticipant({ instanceId: 'm1' })];
    const out = patchParticipantIn(list, 'm1', { maxHp: 0, currentHp: -5 });
    expect(out[0]!.maxHp).toBe(1);
    expect(out[0]!.currentHp).toBe(0);
  });

  it('ignore un nom vidé plutôt que de laisser un combattant sans nom', () => {
    const list = [makeParticipant({ instanceId: 'm1', name: 'Gobelin' })];
    expect(patchParticipantIn(list, 'm1', { name: '   ' })[0]!.name).toBe('Gobelin');
  });

  it('accepte une initiative négative (saisie annoncée à voix haute)', () => {
    const list = [makeParticipant({ instanceId: 'm1', initiative: 12 })];
    expect(patchParticipantIn(list, 'm1', { initiative: -1 })[0]!.initiative).toBe(-1);
  });

  it('laisse la liste intacte sur un instanceId inconnu', () => {
    const list = [makeParticipant({ instanceId: 'm1', name: 'Gobelin' })];
    expect(patchParticipantIn(list, 'nope', { name: 'Chef' })).toEqual(list);
  });
});

describe('sortByInitiative', () => {
  it('trie par initiative décroissante', () => {
    const list = [
      makeParticipant({ instanceId: 'a', initiative: 5 }),
      makeParticipant({ instanceId: 'b', initiative: 18 }),
      makeParticipant({ instanceId: 'c', initiative: 11 }),
    ];
    const out = sortByInitiative(list, 0);
    expect(out.participants.map((p) => p.instanceId)).toEqual(['b', 'c', 'a']);
  });

  it('garde le tour sur le MÊME combattant, pas sur le même index', () => {
    // `c` joue (index 2). Après tri il passe en tête : le pointeur doit suivre.
    const list = [
      makeParticipant({ instanceId: 'a', initiative: 15 }),
      makeParticipant({ instanceId: 'b', initiative: 10 }),
      makeParticipant({ instanceId: 'c', initiative: 22 }),
    ];
    const out = sortByInitiative(list, 2);
    expect(out.participants[out.turnIndex]!.instanceId).toBe('c');
    expect(out.turnIndex).toBe(0);
  });

  it('conserve l’ordre d’entrée à initiative égale (départage stable)', () => {
    const list = [
      makeParticipant({ instanceId: 'a', initiative: 14 }),
      makeParticipant({ instanceId: 'b', initiative: 14 }),
    ];
    expect(sortByInitiative(list, 0).participants.map((p) => p.instanceId)).toEqual(['a', 'b']);
  });
});

describe('removeParticipantIn', () => {
  const trio = (): ReturnType<typeof makeParticipant>[] => [
    makeParticipant({ instanceId: 'a' }),
    makeParticipant({ instanceId: 'b' }),
    makeParticipant({ instanceId: 'c' }),
  ];

  it('recule le pointeur quand le retrait est AVANT le tour actif', () => {
    // `c` joue (index 2) ; on retire `a` → `c` est maintenant à l'index 1.
    const out = removeParticipantIn(trio(), 'a', 2);
    expect(out.participants.map((p) => p.instanceId)).toEqual(['b', 'c']);
    expect(out.participants[out.turnIndex]!.instanceId).toBe('c');
  });

  it('laisse le tour au suivant quand on retire le combattant actif', () => {
    const out = removeParticipantIn(trio(), 'b', 1);
    expect(out.turnIndex).toBe(1);
    expect(out.participants[out.turnIndex]!.instanceId).toBe('c');
  });

  it('ne bouge pas le pointeur quand le retrait est APRÈS le tour actif', () => {
    const out = removeParticipantIn(trio(), 'c', 0);
    expect(out.participants[out.turnIndex]!.instanceId).toBe('a');
  });

  it('clampe quand le dernier de la liste jouait', () => {
    const out = removeParticipantIn(trio(), 'c', 2);
    expect(out.turnIndex).toBe(1);
    expect(out.participants[out.turnIndex]!.instanceId).toBe('b');
  });

  it('retombe sur 0 quand la liste se vide', () => {
    const out = removeParticipantIn([makeParticipant({ instanceId: 'a' })], 'a', 0);
    expect(out.participants).toEqual([]);
    expect(out.turnIndex).toBe(0);
  });

  it('laisse tout en place sur un instanceId inconnu', () => {
    const out = removeParticipantIn(trio(), 'nope', 1);
    expect(out.participants).toHaveLength(3);
    expect(out.turnIndex).toBe(1);
  });
});

describe('updateParticipant', () => {
  it('relit l’état serveur avant d’écrire (les PV appliqués entre-temps survivent)', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        id: EID,
        turnIndex: 0,
        // Le serveur a déjà encaissé des dégâts que la closure React ignorait.
        participants: [makeParticipant({ instanceId: 'm1', name: 'Gobelin', currentHp: 2 })],
      }),
    });
    await updateParticipant(CID, EID, 'm1', { name: 'Chef' });
    const [, payload] = mockUpdateDoc.mock.calls[0]! as [unknown, Record<string, unknown>];
    const ps = payload.participants as EncounterParticipant[];
    expect(ps[0]!.name).toBe('Chef');
    expect(ps[0]!.currentHp).toBe(2);
    // Sans initiative dans le patch, aucun re-tri : le pointeur n'est pas réécrit.
    expect(payload.turnIndex).toBeUndefined();
  });

  it('re-trie et réaligne le tour quand l’initiative change', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        id: EID,
        turnIndex: 1,
        participants: [
          makeParticipant({ instanceId: 'a', initiative: 20 }),
          makeParticipant({ instanceId: 'b', initiative: 10 }),
        ],
      }),
    });
    await updateParticipant(CID, EID, 'b', { initiative: 25 });
    const [, payload] = mockUpdateDoc.mock.calls[0]! as [unknown, Record<string, unknown>];
    const ps = payload.participants as EncounterParticipant[];
    expect(ps.map((p) => p.instanceId)).toEqual(['b', 'a']);
    // `b` jouait et joue toujours, malgré son changement de place.
    expect(payload.turnIndex).toBe(0);
  });
});

describe('addParticipant', () => {
  it('ajoute le renfort en FIN de liste, initiative à 0', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        id: EID,
        turnIndex: 0,
        participants: [makeParticipant({ instanceId: 'a', initiative: 18 })],
      }),
    });
    const { instanceId } = await addParticipant(CID, EID, {
      type: 'monster',
      name: 'Chef gobelin',
      maxHp: 21,
    });
    const [, payload] = mockUpdateDoc.mock.calls[0]! as [unknown, Record<string, unknown>];
    const ps = payload.participants as EncounterParticipant[];
    expect(ps).toHaveLength(2);
    expect(ps[1]!.name).toBe('Chef gobelin');
    expect(ps[1]!.initiative).toBe(0);
    expect(ps[1]!.currentHp).toBe(21);
    // Un auto-id, pas `p{index}` : après un retrait, une numérotation
    // positionnelle rejouerait l'identifiant d'un autre combattant.
    expect(instanceId).not.toBe(`${EID}-p1`);
    expect(ps[1]!.instanceId).toBe(instanceId);
  });
});

describe('removeParticipant', () => {
  it('écrit la liste amputée ET le pointeur de tour réaligné', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        id: EID,
        turnIndex: 2,
        participants: [
          makeParticipant({ instanceId: 'a' }),
          makeParticipant({ instanceId: 'b' }),
          makeParticipant({ instanceId: 'c' }),
        ],
      }),
    });
    await removeParticipant(CID, EID, 'a');
    const [, payload] = mockUpdateDoc.mock.calls[0]! as [unknown, Record<string, unknown>];
    const ps = payload.participants as EncounterParticipant[];
    expect(ps.map((p) => p.instanceId)).toEqual(['b', 'c']);
    expect(payload.turnIndex).toBe(1);
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
