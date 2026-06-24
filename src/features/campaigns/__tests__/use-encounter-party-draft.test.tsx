import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LinkedMember } from '../use-encounter-party-draft';

// ─────────────────────────────────────────────────────────────────────
// Mocks — auth + firebase (doc/getDoc one-shot par fiche liée)
// ─────────────────────────────────────────────────────────────────────

const authHolder: { user: { uid: string } | null } = { user: { uid: 'gm-1' } };
vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => authHolder,
}));

vi.mock('@/shared/lib/firebase', () => ({
  getDb: () => ({}),
}));

// Fixtures de fiches indexées par characterId. `getDoc` les résout via le `cid`
// capturé par `doc(...)`. `null` ⇒ document inexistant.
const docsByCharId: Record<string, { data: unknown } | null> = {};
let getDocShouldThrow = false;

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => ({ cid: args[4] as string }),
  getDoc: async (ref: { cid: string }) => {
    if (getDocShouldThrow) throw new Error('permission-denied');
    const entry = docsByCharId[ref.cid];
    return {
      exists: () => entry !== null && entry !== undefined,
      data: () => entry?.data,
    };
  },
}));

import { useEncounterPartyDraft } from '../use-encounter-party-draft';

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function mkLinked(userId: string, characterId: string): LinkedMember {
  return { userId, characterId };
}

beforeEach(() => {
  authHolder.user = { uid: 'gm-1' };
  getDocShouldThrow = false;
  for (const k of Object.keys(docsByCharId)) delete docsByCharId[k];
});

// ─────────────────────────────────────────────────────────────────────
// Suites
// ─────────────────────────────────────────────────────────────────────

describe('useEncounterPartyDraft', () => {
  it('extrait nom + PV courants/max des fiches liées valides', async () => {
    docsByCharId['char-a'] = { data: { name: 'Lyralei', hp: { current: 17, max: 24 } } };
    docsByCharId['char-b'] = { data: { name: 'Thorin', hp: { current: 30, max: 30 } } };

    const { result } = renderHook(() =>
      useEncounterPartyDraft([mkLinked('p-a', 'char-a'), mkLinked('p-b', 'char-b')], true),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hadReadError).toBe(false);
    expect(result.current.drafts).toEqual([
      { characterId: 'char-a', ownerUid: 'p-a', name: 'Lyralei', maxHp: 24, currentHp: 17 },
      { characterId: 'char-b', ownerUid: 'p-b', name: 'Thorin', maxHp: 30, currentHp: 30 },
    ]);
  });

  it('exclut une fiche inexistante et lève hadReadError', async () => {
    docsByCharId['char-a'] = { data: { name: 'Lyralei', hp: { current: 17, max: 24 } } };
    docsByCharId['char-missing'] = null; // n'existe pas

    const { result } = renderHook(() =>
      useEncounterPartyDraft(
        [mkLinked('p-a', 'char-a'), mkLinked('p-x', 'char-missing')],
        true,
      ),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.drafts).toHaveLength(1);
    expect(result.current.drafts[0]?.characterId).toBe('char-a');
    expect(result.current.hadReadError).toBe(true);
  });

  it('exclut une fiche aux PV malformés (extraction défensive)', async () => {
    docsByCharId['char-a'] = { data: { name: 'Lyralei', hp: { current: 17, max: 24 } } };
    docsByCharId['char-bad'] = { data: { name: 'Cassé', hp: { current: 'x' } } };

    const { result } = renderHook(() =>
      useEncounterPartyDraft([mkLinked('p-a', 'char-a'), mkLinked('p-y', 'char-bad')], true),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.drafts).toHaveLength(1);
    expect(result.current.hadReadError).toBe(true);
  });

  it('enabled=false ⇒ aucun fetch, drafts vides, isLoading false', () => {
    docsByCharId['char-a'] = { data: { name: 'Lyralei', hp: { current: 17, max: 24 } } };
    const { result } = renderHook(() =>
      useEncounterPartyDraft([mkLinked('p-a', 'char-a')], false),
    );
    expect(result.current.isLoading).toBe(false);
    expect(result.current.drafts).toEqual([]);
    expect(result.current.hadReadError).toBe(false);
  });

  it('aucun membre lié ⇒ drafts vides sans erreur', async () => {
    const { result } = renderHook(() => useEncounterPartyDraft([], true));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.drafts).toEqual([]);
    expect(result.current.hadReadError).toBe(false);
  });

  it('erreur globale de lecture (permission) ⇒ drafts vides + hadReadError', async () => {
    getDocShouldThrow = true;
    const { result } = renderHook(() =>
      useEncounterPartyDraft([mkLinked('p-a', 'char-a')], true),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.drafts).toEqual([]);
    expect(result.current.hadReadError).toBe(true);
  });
});
