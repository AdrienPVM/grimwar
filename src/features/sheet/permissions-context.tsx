import { createContext, useContext, type ReactNode } from 'react';

import type { Character } from '@/shared/types/character';

import { useAuth } from '@/features/auth/use-auth';

interface PermissionContextValue {
  canEdit: boolean;
  /**
   * True si le viewer est MJ d'une campagne où vit ce PJ. En S1 toujours
   * false — la DM authority arrive en plan 16 (memberships + Cloud Function).
   * Forward-compat : les composants qui dépendent de ce flag (bouton
   * "Ressusciter", actions DM) sont déjà câblés via `usePermissionContext()`.
   */
  isDM: boolean;
}

const PermissionContext = createContext<PermissionContextValue>({ canEdit: false, isDM: false });

/**
 * Hook S1 minimaliste : en S1 la fiche vit sous /users/{uid}/characters/ donc
 * si on a réussi à la lire on est propriétaire — `canEdit` se réduit à
 * "utilisateur connecté + personnage existant". Plan 16 étend pour la DM
 * authority (DM peut éditer les fiches de joueurs d'une campagne où il est MJ).
 */
export function usePermissions(character: Character | null): PermissionContextValue {
  const { user } = useAuth();
  if (!user || !character) return { canEdit: false, isDM: false };
  return { canEdit: true, isDM: false };
}

export function PermissionProvider({
  value,
  children,
}: {
  value: PermissionContextValue;
  children: ReactNode;
}): JSX.Element {
  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

/** Lecture du contexte côté composants enfants (modes, boutons d'édition). */
export function usePermissionContext(): PermissionContextValue {
  return useContext(PermissionContext);
}
