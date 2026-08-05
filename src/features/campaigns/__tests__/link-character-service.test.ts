import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `linkCharacterToMembership` doit savoir POSER le doc `members/{uid}` quand il
 * n'existe pas — le cas du meneur fondateur, dont l'appartenance est portée par
 * `gmIds[]` (M67a). Un `updateDoc` sur un document absent échoue côté Firestore ;
 * la distinction set/update n'est donc pas cosmétique, c'est la différence entre
 * « le meneur joue un PJ » et « permission-denied ».
 */

const existingDocs = new Set<string>();
const batchOps: { kind: 'set' | 'update'; path: string; data: unknown }[] = [];
const updateCalls: { path: string; data: unknown }[] = [];

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => ({ path: args.slice(1).join('/') }),
  getDoc: async (ref: { path: string }) => ({
    exists: () => existingDocs.has(ref.path),
    data: () => ({}),
  }),
  updateDoc: async (ref: { path: string }, data: unknown) => {
    updateCalls.push({ path: ref.path, data });
  },
  writeBatch: () => ({
    set: (ref: { path: string }, data: unknown) => {
      batchOps.push({ kind: 'set', path: ref.path, data });
    },
    update: (ref: { path: string }, data: unknown) => {
      batchOps.push({ kind: 'update', path: ref.path, data });
    },
    commit: async () => undefined,
  }),
  serverTimestamp: () => 'TS',
}));

vi.mock('@/shared/lib/firebase', () => ({ getDb: () => ({}) }));
vi.mock('@/shared/lib/track-pending-write', () => ({
  trackPendingWrite: async (_db: unknown, p: Promise<unknown>) => p,
}));

const { linkCharacterToMembership } = await import(
  '@/shared/lib/services/campaigns'
);

const MEMBER_PATH = 'campaigns/c-1/members/uid-gm';
const CHARACTER_PATH = 'users/uid-gm/characters/char-1';

beforeEach(() => {
  existingDocs.clear();
  batchOps.length = 0;
  updateCalls.length = 0;
});

describe('linkCharacterToMembership — meneur sans doc member (M67a)', () => {
  it('CRÉE le doc member quand il est absent, avec le rôle demandé', async () => {
    await linkCharacterToMembership('c-1', 'uid-gm', 'char-1', {
      createRole: 'gm',
      displayName: 'Adrien',
      photoURL: null,
    });
    const memberOp = batchOps.find((o) => o.path === MEMBER_PATH);
    expect(memberOp?.kind).toBe('set');
    expect(memberOp?.data).toMatchObject({
      userId: 'uid-gm',
      role: 'gm',
      characterId: 'char-1',
      displayName: 'Adrien',
      photoURL: null,
      schemaVersion: 1,
    });
    // La fiche reçoit son pointeur de campagne dans le MÊME batch : sans lui,
    // la rule de lecture MJ (A2) ne suivrait pas la fiche.
    expect(batchOps.find((o) => o.path === CHARACTER_PATH)).toMatchObject({
      kind: 'update',
      data: { homeCampaignId: 'c-1' },
    });
  });

  it('MET À JOUR le doc existant plutôt que de l’écraser', async () => {
    existingDocs.add(MEMBER_PATH);
    await linkCharacterToMembership('c-1', 'uid-gm', 'char-1', {
      createRole: 'gm',
    });
    const memberOp = batchOps.find((o) => o.path === MEMBER_PATH);
    expect(memberOp?.kind).toBe('update');
    expect(memberOp?.data).toEqual({ characterId: 'char-1' });
  });

  it('sans `createRole`, garde le comportement d’origine — aucune lecture, update strict', async () => {
    await linkCharacterToMembership('c-1', 'uid-gm', 'char-1');
    const memberOp = batchOps.find((o) => o.path === MEMBER_PATH);
    expect(memberOp?.kind).toBe('update');
  });

  it('délier sans doc member ne tente aucune écriture', async () => {
    await linkCharacterToMembership('c-1', 'uid-gm', null, { createRole: 'gm' });
    expect(updateCalls).toHaveLength(0);
    expect(batchOps).toHaveLength(0);
  });

  it('délier un doc existant remet `characterId` à null', async () => {
    existingDocs.add(MEMBER_PATH);
    await linkCharacterToMembership('c-1', 'uid-gm', null, { createRole: 'gm' });
    expect(updateCalls).toEqual([
      { path: MEMBER_PATH, data: { characterId: null } },
    ]);
  });
});
