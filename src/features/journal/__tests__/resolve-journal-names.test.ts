import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GameEvent } from '@/shared/types/event';

// Mock Firestore : `doc(db,'users',uid,'characters',cid)` → on capture le cid
// (5ᵉ arg, index 4) ; `getDoc` résout la fixture par cid. Même pattern que
// use-encounter-party-draft.test.
const docsByCharId: Record<string, { name?: unknown } | null> = {};
let throwForCharId: string | null = null;

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => ({ cid: args[4] as string }),
  getDoc: async (ref: { cid: string }) => {
    if (throwForCharId === ref.cid) throw new Error('permission-denied');
    const entry = docsByCharId[ref.cid];
    return {
      exists: () => entry !== null && entry !== undefined,
      data: () => entry,
    };
  },
}));

vi.mock('@/shared/lib/firebase', () => ({ getDb: () => ({}) }));

import { resolveJournalCharacterNames } from '../resolve-journal-names';

function ev(actorCharacterId: string | null, targetCharacterId: string | null = null): GameEvent {
  return {
    id: 'e',
    kind: 'roll',
    actorUserId: 'u',
    actorCharacterId,
    targetCharacterId,
    sessionId: 's',
    encounterId: null,
    payload: {},
    visibility: 'all',
    createdAt: null,
  };
}

beforeEach(() => {
  for (const k of Object.keys(docsByCharId)) delete docsByCharId[k];
  throwForCharId = null;
});

describe('resolveJournalCharacterNames', () => {
  it('résout le nom des personnages liés cités (acteur + cible)', async () => {
    docsByCharId['char-a'] = { name: 'Lyralei' };
    docsByCharId['char-b'] = { name: 'Thorin' };
    const map = await resolveJournalCharacterNames(
      [ev('char-a'), ev(null, 'char-b')],
      [
        { userId: 'u-a', characterId: 'char-a' },
        { userId: 'u-b', characterId: 'char-b' },
      ],
    );
    expect(map.get('char-a')).toBe('Lyralei');
    expect(map.get('char-b')).toBe('Thorin');
  });

  it('personnage non lié au roster → absent de la map (repli template)', async () => {
    docsByCharId['char-a'] = { name: 'Lyralei' };
    const map = await resolveJournalCharacterNames([ev('char-a')], []);
    expect(map.has('char-a')).toBe(false);
  });

  it('fiche inexistante → absent de la map', async () => {
    docsByCharId['char-a'] = null;
    const map = await resolveJournalCharacterNames(
      [ev('char-a')],
      [{ userId: 'u-a', characterId: 'char-a' }],
    );
    expect(map.has('char-a')).toBe(false);
  });

  it('name non-chaîne / vide → absent de la map', async () => {
    docsByCharId['char-a'] = { name: 42 };
    docsByCharId['char-b'] = { name: '   ' };
    const map = await resolveJournalCharacterNames(
      [ev('char-a'), ev('char-b')],
      [
        { userId: 'u-a', characterId: 'char-a' },
        { userId: 'u-b', characterId: 'char-b' },
      ],
    );
    expect(map.size).toBe(0);
  });

  it('une lecture qui throw est isolée — les autres résolvent', async () => {
    docsByCharId['char-a'] = { name: 'Lyralei' };
    docsByCharId['char-b'] = { name: 'Thorin' };
    throwForCharId = 'char-a';
    const map = await resolveJournalCharacterNames(
      [ev('char-a'), ev('char-b')],
      [
        { userId: 'u-a', characterId: 'char-a' },
        { userId: 'u-b', characterId: 'char-b' },
      ],
    );
    expect(map.has('char-a')).toBe(false);
    expect(map.get('char-b')).toBe('Thorin');
  });

  it('lit chaque id distinct une seule fois (acteur répété)', async () => {
    docsByCharId['char-a'] = { name: 'Lyralei' };
    const map = await resolveJournalCharacterNames(
      [ev('char-a'), ev('char-a'), ev('char-a')],
      [{ userId: 'u-a', characterId: 'char-a' }],
    );
    expect(map.get('char-a')).toBe('Lyralei');
    expect(map.size).toBe(1);
  });
});
