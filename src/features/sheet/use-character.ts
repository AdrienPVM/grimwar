import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/use-auth';
import { getDb } from '@/shared/lib/firebase';
import { CharacterSchema, type Character } from '@/shared/types/character';

interface UseCharacterResult {
  character: Character | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * S'abonne en temps réel à `users/{uid}/characters/{id}` via onSnapshot.
 * - `character: null` + `isLoading: false` ⇒ document inexistant.
 * - Toute erreur de parsing Zod est remontée en `error` (et pas avalée), pour
 *   surfacer un schéma corrompu plutôt que d'afficher une fiche vide silencieuse.
 *
 * En S1 l'ownership = chemin Firestore (sous /users/{uid}/) : on lit toujours
 * dans le sous-arbre du user courant. La lecture cross-owner (DM) arrive en S2
 * (plan 16) via Cloud Function.
 */
export function useCharacter(characterId: string | undefined): UseCharacterResult {
  const { user } = useAuth();
  const [character, setCharacter] = useState<Character | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user || !characterId) {
      setCharacter(null);
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    const ref = doc(getDb(), 'users', user.uid, 'characters', characterId);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setCharacter(null);
          setIsLoading(false);
          return;
        }
        const raw = snap.data();
        const parsed = CharacterSchema.safeParse({ ...raw, id: snap.id });
        if (!parsed.success) {
          const first = parsed.error.errors[0];
          setError(
            new Error(
              `[sheet] Document Firestore invalide pour ${snap.id}: ${first?.path.join('.')} — ${first?.message}`,
            ),
          );
          setCharacter(null);
        } else {
          setCharacter(parsed.data);
          setError(null);
        }
        setIsLoading(false);
      },
      (err) => {
        setError(err);
        setIsLoading(false);
      },
    );
    return unsubscribe;
  }, [user, characterId]);

  return { character, isLoading, error };
}
