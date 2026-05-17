import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/use-auth';
import { getDb } from '@/shared/lib/firebase';
import { CharacterSchema, type Character } from '@/shared/types/character';
import {
  needsV1ToV2Upgrade,
  upgradeCharacterV1ToV2,
} from './upgrade-character-v1-to-v2';

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
        // Migration lazy v1 → v2 (plan 13.7 §0.2). Si on détecte un doc v1, on
        // l'upgrade en mémoire pour l'affichage, puis on écrit immédiatement la
        // version v2 dans Firestore (idempotent, one-shot). Pas de step de
        // rattrapage UI : la fiche tolère les sentinelles, et le wizard 13.8/13.9
        // refusera de submit si un sous-choix requis manque.
        const needsUpgrade = needsV1ToV2Upgrade(raw);
        const upgraded = needsUpgrade ? upgradeCharacterV1ToV2(raw) : raw;
        const parsed = CharacterSchema.safeParse({
          ...(upgraded as object),
          id: snap.id,
        });
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
          if (needsUpgrade) {
            // Persiste la v2 en Firestore — fire-and-forget, on log l'échec
            // sans bloquer l'affichage de la fiche (utilisateur a déjà la v2
            // en mémoire).
            console.info(
              `[sheet] schema.upgraded character=${snap.id} v1 → v2 (plan 13.7)`,
            );
            void setDoc(ref, parsed.data).catch((err) => {
              console.warn(
                `[sheet] schema upgrade write failed for ${snap.id}:`,
                err,
              );
            });
          }
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
