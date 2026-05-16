import {
  Timestamp,
  collection,
  onSnapshot,
  orderBy,
  query,
  type QuerySnapshot,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/use-auth';
import { getDb } from '@/shared/lib/firebase';
import { CharacterSchema, type Character } from '@/shared/types/character';

interface UseCharactersListResult {
  characters: Character[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * S'abonne en temps réel à `users/{uid}/characters/*` via onSnapshot.
 * Tri Firestore par `updatedAt desc` (champ écrit par `submit-character.ts`).
 * Un doc invalide vis-à-vis de CharacterSchema n'écroule pas la liste : on
 * logge un warning et on filtre l'entrée, pour rester robuste face à des
 * fiches anciennes ou partiellement migrées. Le pattern est volontairement
 * miroir de `useCharacter` (plan 06) — même contract `{ data, isLoading, error }`.
 *
 * `error` n'est levé que pour une erreur de transport Firestore (rules,
 * réseau) ; un doc Zod-invalide n'est pas une erreur de listing, juste un
 * warning console.
 */
export function useCharactersList(): UseCharactersListResult {
  const { user } = useAuth();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setCharacters([]);
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    const ref = collection(getDb(), 'users', user.uid, 'characters');
    // orderBy('updatedAt', 'desc') : si le champ manque sur une vieille fiche,
    // Firestore l'omet du résultat — c'est l'effet voulu (priorité aux fiches
    // récemment touchées). Le fallback name asc se fait côté client après filtre.
    const q = query(ref, orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snap: QuerySnapshot) => {
        const valid: Character[] = [];
        snap.forEach((docSnap) => {
          const raw = docSnap.data();
          const parsed = CharacterSchema.safeParse({ ...raw, id: docSnap.id });
          if (!parsed.success) {
            const first = parsed.error.errors[0];
            console.warn(
              `[library] Doc Firestore invalide ignoré ${docSnap.id}: ${
                first?.path.join('.') ?? '?'
              } — ${first?.message ?? 'unknown'}`,
            );
            return;
          }
          valid.push(parsed.data);
        });
        // Fallback de tri si updatedAt manque/égalité : name asc, locale-aware FR.
        valid.sort((a, b) => {
          const ua = (a.updatedAt as Timestamp | undefined)?.toMillis?.() ?? 0;
          const ub = (b.updatedAt as Timestamp | undefined)?.toMillis?.() ?? 0;
          if (ua !== ub) return ub - ua;
          return a.name.localeCompare(b.name, 'fr');
        });
        setCharacters(valid);
        setIsLoading(false);
      },
      (err) => {
        setError(err);
        setIsLoading(false);
      },
    );
    return unsubscribe;
  }, [user]);

  return { characters, isLoading, error };
}
