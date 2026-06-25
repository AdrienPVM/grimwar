import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import type { Character } from '@/shared/types/character';

import { PermissionProvider, useSheetReadOnly } from '../permissions-context';

/**
 * JALON 4A.3 — garde-fou « la lecture seule MJ est RÉELLE, pas cosmétique ».
 *
 * Avant 4A.3, le rideau read-only des modes était `isSheetReadOnly(character)`,
 * piloté UNIQUEMENT par `status === 'dead'` — le flag `canEdit` du
 * PermissionProvider était dormant (toujours true en S1). Un MJ consultant une
 * fiche aurait donc vu des contrôles d'édition actifs (HP ±, montée de niveau…)
 * qui auraient tous échoué en `permission-denied`. Ce test fige la matrice
 * décès × canEdit pour empêcher la régression « facade read-only ».
 */

const ALIVE = { status: 'alive' } as Character;
const DEAD = { status: 'dead' } as Character;

function wrapperWith(canEdit: boolean, isDM: boolean) {
  return function Wrapper({ children }: { children: ReactNode }): JSX.Element {
    return (
      <PermissionProvider value={{ canEdit, isDM, isDMEdit: false, lockedFields: [] }}>
        {children}
      </PermissionProvider>
    );
  };
}

describe('useSheetReadOnly — matrice décès × canEdit', () => {
  it('vivant + propriétaire (canEdit) → éditable (false)', () => {
    const { result } = renderHook(() => useSheetReadOnly(ALIVE), {
      wrapper: wrapperWith(true, false),
    });
    expect(result.current).toBe(false);
  });

  it('vivant + lecture MJ (!canEdit) → lecture seule (true)', () => {
    const { result } = renderHook(() => useSheetReadOnly(ALIVE), {
      wrapper: wrapperWith(false, true),
    });
    expect(result.current).toBe(true);
  });

  it('mort + propriétaire (canEdit) → lecture seule (true) — règle décès', () => {
    const { result } = renderHook(() => useSheetReadOnly(DEAD), {
      wrapper: wrapperWith(true, false),
    });
    expect(result.current).toBe(true);
  });

  it('mort + lecture MJ (!canEdit) → lecture seule (true)', () => {
    const { result } = renderHook(() => useSheetReadOnly(DEAD), {
      wrapper: wrapperWith(false, true),
    });
    expect(result.current).toBe(true);
  });
});
