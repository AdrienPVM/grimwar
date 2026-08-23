import { createContext, useContext, type ReactNode } from 'react';

import type { Character } from '@/shared/types/character';

import { useAuth } from '@/features/auth/use-auth';
import { isSheetReadOnly } from './modes/combat/hp-combat';

/**
 * Champs RÉSERVÉS au propriétaire (plan 26). Un MJ en omni-edit voit ces champs
 * verrouillés (icône cadenas + contrôle désactivé). La barrière réelle reste
 * `firestore.rules > dmOmniEditLockedFieldsUnchanged` — ces chemins n'en sont que
 * le miroir UX. Chemins de premier niveau du document `Character`.
 */
export const DM_LOCKED_FIELDS = ['name', 'personality', 'homeCampaignId'] as const;

export interface PermissionContextValue {
  canEdit: boolean;
  /**
   * True si le viewer est MJ d'une campagne où vit ce PJ. En S1 toujours
   * false — la DM authority arrive en JALON 4A (vraies campagnes + members
   * + édition fiche côté MJ). Forward-compat : les composants qui dépendent
   * de ce flag (bouton "Ressusciter", actions DM) sont déjà câblés via
   * `usePermissionContext()`.
   */
  isDM: boolean;
  /**
   * True quand le viewer est un MJ en train d'ÉDITER la fiche d'un joueur
   * (écriture cross-owner, plan 26). Implique `canEdit: true` + `isDM: true` +
   * un `ownerUid` ≠ user courant. Distingue l'omni-edit MJ de l'édition
   * propriétaire pour : (a) la barre d'indication dorée, (b) le routage du write
   * vers le sous-arbre du joueur, (c) la journalisation `dm-edit`.
   */
  isDMEdit: boolean;
  /**
   * UID propriétaire de la fiche éditée. `undefined` ⇒ le user courant est le
   * propriétaire (cas par défaut). Renseigné par `CampaignMemberSheetScreen` en
   * omni-edit MJ pour que `useUpdateCharacter` cible `users/{ownerUid}/...`.
   */
  ownerUid?: string;
  /**
   * Chemins de champ verrouillés (réservés au propriétaire) en mode omni-edit.
   * Vide en édition propriétaire. Cf. `DM_LOCKED_FIELDS`.
   */
  lockedFields: readonly string[];
}

const PermissionContext = createContext<PermissionContextValue>({
  canEdit: false,
  isDM: false,
  isDMEdit: false,
  lockedFields: [],
});

/**
 * Hook minimaliste pour l'écran PROPRIÉTAIRE : la fiche vit sous
 * /users/{uid}/characters/ donc si on a réussi à la lire on est propriétaire —
 * `canEdit` se réduit à "utilisateur connecté + personnage existant", jamais en
 * omni-edit. L'omni-edit MJ (plan 26) ne passe PAS par ce hook : il est porté
 * explicitement par `CampaignMemberSheetScreen` via `PermissionProvider`.
 *
 * `isDM` n'est plus `false` en dur (M19 de l'audit de malléabilité). Une fiche
 * SANS campagne d'attache n'a aucun meneur pour l'arbitrer : son propriétaire
 * est son propre arbitre. Sans ça, un personnage mort hors campagne était figé
 * pour l'éternité — fiche en lecture seule totale, et le seul bouton
 * « Ressusciter » gaté sur un `isDM` que cette route retournait toujours faux.
 *
 * Une fiche LIÉE garde le comportement d'origine : c'est le meneur de sa
 * campagne qui ressuscite, via `CampaignMemberSheetScreen`. La mort reste un
 * fait de table, pas une case que le joueur décoche.
 */
export function usePermissions(character: Character | null): PermissionContextValue {
  const { user } = useAuth();
  if (!user || !character) {
    return { canEdit: false, isDM: false, isDMEdit: false, lockedFields: [] };
  }
  const isOwnArbiter = character.homeCampaignId === null;
  return { canEdit: true, isDM: isOwnArbiter, isDMEdit: false, lockedFields: [] };
}

/**
 * Un champ est-il verrouillé (réservé au propriétaire) pour le viewer courant ?
 * `false` en édition propriétaire (lockedFields vide). En omni-edit MJ, vrai si
 * le chemin figure dans `lockedFields`. Consommé par les contrôles de mode pour
 * afficher l'icône cadenas + désactiver l'édition (plan 26 step 3).
 */
export function useFieldLocked(field: string): boolean {
  const { lockedFields } = usePermissionContext();
  return lockedFields.includes(field);
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
