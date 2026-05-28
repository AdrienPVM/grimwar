import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useCallback, useState } from 'react';

import { useAuth } from '@/features/auth/use-auth';
import { getDb } from '@/shared/lib/firebase';
import { trackPendingWrite } from '@/shared/lib/track-pending-write';
import type { Character } from '@/shared/types/character';

interface UseUpdateCharacterResult {
  updateCharacter: (patch: Partial<Character>) => Promise<void>;
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
 * Les events sont rattachés rétroactivement en plan 22.
 */
export function useUpdateCharacter(characterId: string | undefined): UseUpdateCharacterResult {
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const updateCharacter = useCallback(
    async (patch: Partial<Character>): Promise<void> => {
      if (!user) throw new Error('[sheet] update sans utilisateur connecté');
      if (!characterId) throw new Error('[sheet] update sans characterId');
      setIsUpdating(true);
      setError(null);
      try {
        const firestore = getDb();
        const ref = doc(firestore, 'users', user.uid, 'characters', characterId);
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
      } catch (err) {
        const wrapped = err instanceof Error ? err : new Error(String(err));
        setError(wrapped);
        throw wrapped;
      } finally {
        setIsUpdating(false);
      }
    },
    [user, characterId],
  );

  return { updateCharacter, isUpdating, error };
}
