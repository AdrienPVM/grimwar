import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useCallback, useRef, useState } from 'react';

import { useAuth } from '@/features/auth/use-auth';
import { logCharacterDiff, logDmEdit } from '@/shared/lib/event-logger';
import { getDb } from '@/shared/lib/firebase';
import { trackPendingWrite } from '@/shared/lib/track-pending-write';
import type { Character } from '@/shared/types/character';

import { usePermissionContext } from './permissions-context';

export interface UpdateCharacterOptions {
  /**
   * Journalisation du diff (plan 22.2). `'auto'` (défaut) : `useUpdateCharacter`
   * compare l'état AVANT au patch et écrit les événements (PV, états, slots,
   * inventaire). `'manual'` : l'appelant assume lui-même le logging sémantique
   * (ex. un lancement de sort journalise `spell-cast`, pas `slot-consumed` ; le
   * wizard de montée de niveau journalisera `level-up` au plan 18).
   */
  log?: 'auto' | 'manual';
}

interface UseUpdateCharacterResult {
  updateCharacter: (
    patch: Partial<Character>,
    options?: UpdateCharacterOptions,
  ) => Promise<void>;
  isUpdating: boolean;
  error: Error | null;
}

/**
 * Patch partiel sur users/{uid}/characters/{characterId}.
 *
 * Pas d'optimistic update local côté slice Zustand : l'unique source de vérité
 * est l'écoute `onSnapshot` de useCharacter — le serveur émet en <100ms et
 * l'UI réactive sans gymnastique de rollback. Ajouter un optimistic store ne
 * vaudra le coût qu'en cas de latence visible (plan 22 / S3, événements).
 *
 * Le NB du plan 06 step 16 : pas d'event-logger en S1 (pas de campagne).
 * Plan 22.2 : après un patch réussi, le diff (avant → patch) est journalisé via
 * `logCharacterDiff` (no-op silencieux hors campagne active). Le hook reçoit le
 * `Character` complet — l'`id` en est dérivé, l'objet sert d'état AVANT pour le
 * diff. On le tient dans un ref pour ne PAS recréer le callback à chaque snapshot
 * tout en diffant toujours contre le dernier état connu.
 */
export function useUpdateCharacter(
  character: Character | undefined,
): UseUpdateCharacterResult {
  const { user } = useAuth();
  // Contexte de permission : en omni-edit MJ (plan 26) la fiche éditée vit sous
  // le sous-arbre du JOUEUR (`ownerUid`), pas du user courant. Hors provider
  // (écran propriétaire, level-up) le contexte retombe sur ses valeurs par
  // défaut → `ownerUid` undefined → comportement S1 inchangé (write owner).
  const { ownerUid, isDMEdit, lockedFields } = usePermissionContext();
  const characterId = character?.id;
  const characterRef = useRef<Character | undefined>(character);
  characterRef.current = character;
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const updateCharacter = useCallback(
    async (patch: Partial<Character>, options?: UpdateCharacterOptions): Promise<void> => {
      if (!user) throw new Error('[sheet] update sans utilisateur connecté');
      if (!characterId) throw new Error('[sheet] update sans characterId');
      const before = characterRef.current;
      const targetUid = ownerUid ?? user.uid;

      // Garde-fou client (la barrière réelle est `firestore.rules`) : en omni-edit
      // MJ, un patch qui toucherait un champ réservé au propriétaire échoue vite
      // avec un message clair plutôt que de partir se faire rejeter côté serveur.
      if (isDMEdit) {
        const touched = Object.keys(patch).filter((k) => lockedFields.includes(k));
        if (touched.length > 0) {
          throw new Error(
            `[sheet] champ(s) réservé(s) au propriétaire, édition MJ interdite : ${touched.join(', ')}`,
          );
        }
      }

      setIsUpdating(true);
      setError(null);
      try {
        const firestore = getDb();
        const ref = doc(firestore, 'users', targetUid, 'characters', characterId);
        // trackPendingWrite : compteur global incrémenté immédiatement,
        // décrémenté quand l'ack backend résout (cf. JALON 1D.2). Le wrapper
        // ne bloque pas l'appelant — `updateDoc` reste rapide en local.
        await trackPendingWrite(
          firestore,
          updateDoc(ref, {
            ...patch,
            updatedAt: serverTimestamp(),
            updatedBy: user.uid,
          }),
        );
        // Journalisation best-effort (fire-and-forget : ne bloque pas l'appelant,
        // ne casse jamais le gameplay — les loggers avalent leurs erreurs).
        //  - Omni-edit MJ → UN event d'audit `dm-edit` (plan 26 step 5), JAMAIS le
        //    diff sémantique (l'acteur est le MJ, pas le personnage).
        //  - Édition propriétaire → diff sémantique (plan 22.2) ; `'manual'`
        //    court-circuite l'auto-log (le call site journalise lui-même).
        if (isDMEdit && before) {
          void logDmEdit(before, patch, characterId);
        } else if ((options?.log ?? 'auto') === 'auto' && before) {
          void logCharacterDiff(before, patch, characterId);
        }
      } catch (err) {
        const wrapped = err instanceof Error ? err : new Error(String(err));
        setError(wrapped);
        throw wrapped;
      } finally {
        setIsUpdating(false);
      }
    },
    [user, characterId, ownerUid, isDMEdit, lockedFields],
  );

  return { updateCharacter, isUpdating, error };
}
