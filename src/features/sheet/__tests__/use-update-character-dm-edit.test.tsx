import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';

/**
 * Plan 26 — routage du write en OMNI-EDIT MJ. On vérifie que `useUpdateCharacter`
 * lit le contexte de permission et :
 *  - cible `users/{ownerUid}/characters/{id}` (sous-arbre du JOUEUR) en omni-edit ;
 *  - cible `users/{user.uid}/...` (soi) hors omni-edit ;
 *  - journalise `logDmEdit` (audit) en omni-edit, jamais le diff sémantique ;
 *  - refuse côté client un patch sur un champ verrouillé (garde-fou ; la barrière
 *    réelle reste la rule Firestore).
 */

const docMock = vi.fn((_db: unknown, ..._path: string[]) => ({ __path: _path }));
const updateDocMock = vi.fn((..._args: unknown[]) => Promise.resolve());
const serverTimestampMock = vi.fn(() => '__ts__');
vi.mock('firebase/firestore', () => ({
  doc: (db: unknown, ...path: string[]) => docMock(db, ...path),
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
  serverTimestamp: () => serverTimestampMock(),
}));

vi.mock('@/shared/lib/firebase', () => ({ getDb: () => ({ __db: true }) }));
vi.mock('@/shared/lib/track-pending-write', () => ({
  trackPendingWrite: (_db: unknown, p: Promise<unknown>) => p,
}));

const logDmEditMock = vi.fn((..._args: unknown[]) => Promise.resolve());
const logCharacterDiffMock = vi.fn((..._args: unknown[]) => Promise.resolve());
vi.mock('@/shared/lib/event-logger', () => ({
  logDmEdit: (...args: unknown[]) => logDmEditMock(...args),
  logCharacterDiff: (...args: unknown[]) => logCharacterDiffMock(...args),
}));

vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => ({ user: { uid: 'gm-1' } }),
}));

import { useUpdateCharacter } from '../use-update-character';
import {
  DM_LOCKED_FIELDS,
  PermissionProvider,
} from '../permissions-context';

const CHARACTER = {
  id: 'char-9',
  hp: { current: 18, max: 18, temp: 0 },
} as unknown as Character;

function dmEditWrapper({ children }: { children: ReactNode }): JSX.Element {
  return (
    <PermissionProvider
      value={{
        canEdit: true,
        isDM: true,
        isDMEdit: true,
        ownerUid: 'player-2',
        lockedFields: DM_LOCKED_FIELDS,
      }}
    >
      {children}
    </PermissionProvider>
  );
}

beforeEach(() => {
  docMock.mockClear();
  updateDocMock.mockClear();
  logDmEditMock.mockClear();
  logCharacterDiffMock.mockClear();
});

describe('useUpdateCharacter — omni-edit MJ (plan 26)', () => {
  it('cible le sous-arbre du joueur (ownerUid) et journalise dm-edit, pas le diff', async () => {
    const { result } = renderHook(() => useUpdateCharacter(CHARACTER), {
      wrapper: dmEditWrapper,
    });
    await result.current.updateCharacter({ hp: { current: 0, max: 18, temp: 0 } });

    expect(docMock).toHaveBeenCalledWith(
      { __db: true },
      'users',
      'player-2',
      'characters',
      'char-9',
    );
    expect(logDmEditMock).toHaveBeenCalledTimes(1);
    expect(logCharacterDiffMock).not.toHaveBeenCalled();
  });

  it('refuse un patch sur un champ verrouillé (name) — aucune écriture', async () => {
    const { result } = renderHook(() => useUpdateCharacter(CHARACTER), {
      wrapper: dmEditWrapper,
    });
    await expect(
      result.current.updateCharacter({ name: 'Renommé' } as Partial<Character>),
    ).rejects.toThrow(/réservé/i);
    expect(updateDocMock).not.toHaveBeenCalled();
    expect(logDmEditMock).not.toHaveBeenCalled();
  });

  it('hors omni-edit (pas de provider) → cible soi + journalise le diff', async () => {
    const { result } = renderHook(() => useUpdateCharacter(CHARACTER));
    await result.current.updateCharacter({ hp: { current: 5, max: 18, temp: 0 } });

    expect(docMock).toHaveBeenCalledWith(
      { __db: true },
      'users',
      'gm-1',
      'characters',
      'char-9',
    );
    expect(logCharacterDiffMock).toHaveBeenCalledTimes(1);
    expect(logDmEditMock).not.toHaveBeenCalled();
  });
});
