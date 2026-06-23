import type { GameEvent } from '@/shared/types/event';

/**
 * Helpers de permission CÔTÉ CLIENT (UX uniquement). La vraie barrière reste
 * `firestore.rules` — ces fonctions évitent juste d'afficher dans un rôle
 * donné un événement qu'on aurait techniquement le droit de lire. Cf.
 * docs/PERMISSIONS.md#event-visibility-model.
 */

export interface EventViewerContext {
  /** UID de l'utilisateur courant. */
  uid: string;
  /** Vrai si l'utilisateur est MJ de la campagne de l'événement. */
  isDM: boolean;
  /** IDs des personnages que l'utilisateur possède dans cette campagne. */
  myCharacterIds: readonly string[];
}

/**
 * Un événement est-il visible pour le spectateur courant ?
 *
 * Reproduit la logique de la rule `match /events/{eventId} { allow read }` :
 *   - `all`  → visible par tout membre,
 *   - `dm`   → MJ uniquement,
 *   - `self` → l'acteur, ou le propriétaire du personnage acteur/cible.
 */
export function canViewEvent(
  event: Pick<
    GameEvent,
    'visibility' | 'actorUserId' | 'actorCharacterId' | 'targetCharacterId'
  >,
  ctx: EventViewerContext,
): boolean {
  switch (event.visibility) {
    case 'all':
      return true;
    case 'dm':
      return ctx.isDM;
    case 'self':
      return (
        event.actorUserId === ctx.uid ||
        (event.actorCharacterId !== null &&
          ctx.myCharacterIds.includes(event.actorCharacterId)) ||
        (event.targetCharacterId !== null &&
          ctx.myCharacterIds.includes(event.targetCharacterId))
      );
    default: {
      // Exhaustivité : si un nouveau `visibility` apparaît, le compilateur casse.
      const _exhaustive: never = event.visibility;
      return _exhaustive;
    }
  }
}
