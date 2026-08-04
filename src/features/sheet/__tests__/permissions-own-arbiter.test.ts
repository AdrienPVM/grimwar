import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

import type { Character } from '@/shared/types/character';

const authHolder: { user: { uid: string } | null } = { user: { uid: 'u-1' } };
vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => authHolder,
}));

import { usePermissions } from '../permissions-context';

/**
 * M19 — un personnage mort HORS campagne était figé pour l'éternité.
 *
 * La fiche `dead` passe en lecture seule totale, et le seul bouton
 * « Ressusciter » est gaté sur `isDM` — que la route propriétaire retournait
 * `false` EN DUR. Aucun meneur n'existant pour une fiche non liée, personne ne
 * pouvait plus jamais y toucher.
 *
 * Règle retenue : sans campagne d'attache, le propriétaire est son propre
 * arbitre. Avec campagne, c'est le meneur qui tranche — la mort reste un fait
 * de table.
 */
function mkCharacter(homeCampaignId: string | null): Character {
  return { id: 'c-1', name: 'Test', homeCampaignId } as Character;
}

describe('usePermissions — qui arbitre la mort (M19)', () => {
  it('fiche SANS campagne : le propriétaire est son propre arbitre', () => {
    authHolder.user = { uid: 'u-1' };
    const { result } = renderHook(() => usePermissions(mkCharacter(null)));
    expect(result.current.isDM).toBe(true);
    expect(result.current.canEdit).toBe(true);
    // Ce n'est PAS de l'omni-edit : on reste sur sa propre fiche.
    expect(result.current.isDMEdit).toBe(false);
    expect(result.current.lockedFields).toEqual([]);
  });

  it('fiche LIÉE à une campagne : c’est le meneur qui ressuscite, pas le joueur', () => {
    authHolder.user = { uid: 'u-1' };
    const { result } = renderHook(() => usePermissions(mkCharacter('camp-1')));
    expect(result.current.isDM).toBe(false);
    expect(result.current.canEdit).toBe(true);
  });

  it('sans utilisateur, aucun droit — y compris sur une fiche non liée', () => {
    authHolder.user = null;
    const { result } = renderHook(() => usePermissions(mkCharacter(null)));
    expect(result.current.isDM).toBe(false);
    expect(result.current.canEdit).toBe(false);
  });

  it('sans personnage, aucun droit', () => {
    authHolder.user = { uid: 'u-1' };
    const { result } = renderHook(() => usePermissions(null));
    expect(result.current.isDM).toBe(false);
    expect(result.current.canEdit).toBe(false);
  });
});
