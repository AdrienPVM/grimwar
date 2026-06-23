import { createContext, useContext, type ReactNode } from 'react';

import type { Character } from '@/shared/types/character';

import { useAuth } from '@/features/auth/use-auth';
import { isSheetReadOnly } from './modes/combat/hp-combat';

interface PermissionContextValue {
  canEdit: boolean;
  /**
   * True si le viewer est MJ d'une campagne où vit ce PJ. En S1 toujours
   * false — la DM authority arrive en JALON 4A (vraies campagnes + members
   * + édition fiche côté MJ). Forward-compat : les composants qui dépendent
   * de ce flag (bouton "Ressusciter", actions DM) sont déjà câblés via
   * `usePermissionContext()`.
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

/**
 * Lecture seule effective d'un mode de fiche. Une fiche est en lecture seule si :
 *  - le personnage est mort (`isSheetReadOnly` — règle 5e : 3 échecs de sauvegarde
 *    contre la mort → fiche figée), OU
 *  - le viewer n'a pas le droit d'éditer (`!canEdit`), cas de la **lecture MJ**
 *    (JALON 4A.3) : le meneur consulte la fiche d'un joueur sans pouvoir l'écrire
 *    (la rule Firestore réserve le write au propriétaire ; la DM-authority en
 *    écriture passera par une Cloud Function ultérieure).
 *
 * Chaque mode (`combat`/`essence`/`magie`/`avoir`) consomme ce hook et propage le
 * booléen `readOnly` à ses cartes interactives (HP ±, attaques, conditions, slots…).
 * Pour le propriétaire `canEdit` vaut `true` → comportement S1 inchangé.
 */
export function useSheetReadOnly(character: Character): boolean {
  const { canEdit } = usePermissionContext();
  return isSheetReadOnly(character) || !canEdit;
}
