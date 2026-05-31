import {
  collection,
  onSnapshot,
  type QuerySnapshot,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/use-auth';
import { getDb } from '@/shared/lib/firebase';
import type {
  CustomContentPack,
  CustomContentPackMeta,
} from '@/shared/types/custom-content-pack';

/**
 * Résumé d'un pack importé tel qu'affiché dans la liste « Mes packs ».
 * On ne hydrate volontairement pas les `entities` ici — l'aperçu sur l'écran
 * n'utilise que `meta.name`, `meta.author`, `meta.version` et `importedAt`.
 */
export interface PackListEntry {
  packId: string;
  meta: CustomContentPackMeta;
  importedAt: number | null;
}

interface UsePacksResult {
  packs: PackListEntry[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * S'abonne en temps réel à `users/{uid}/customContentPacks/*`. Pattern
 * miroir de `useCharactersList` — même contract `{ data, isLoading, error }`.
 * La rule firestore.rules autorise read owner-only (JALON 3B.3).
 *
 * Un doc corrompu (meta manquant, entities manquant) est filtré silencieusement
 * de la liste avec un warning console — la liste reste lisible.
 */
export function usePacks(): UsePacksResult {
  const { user } = useAuth();
  const [packs, setPacks] = useState<PackListEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setPacks([]);
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    const ref = collection(getDb(), 'users', user.uid, 'customContentPacks');
    const unsubscribe = onSnapshot(
      ref,
      (snap: QuerySnapshot) => {
        const next: PackListEntry[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() as {
            meta?: CustomContentPackMeta;
            entities?: CustomContentPack['entities'];
            importedAt?: { toMillis?: () => number } | null;
          };
          if (!data.meta) {
            console.warn(
              `[custom-content] Pack ${docSnap.id} sans meta — ignoré`,
            );
            return;
          }
          next.push({
            packId: docSnap.id,
            meta: data.meta,
            importedAt:
              data.importedAt && typeof data.importedAt.toMillis === 'function'
                ? data.importedAt.toMillis()
                : null,
          });
        });
        // Tri : plus récent en premier ; fallback meta.name FR alpha.
        next.sort((a, b) => {
          const ia = a.importedAt ?? 0;
          const ib = b.importedAt ?? 0;
          if (ia !== ib) return ib - ia;
          return a.meta.name.fr.localeCompare(b.meta.name.fr, 'fr');
        });
        setPacks(next);
        setIsLoading(false);
      },
      (err) => {
        setError(err);
        setIsLoading(false);
      },
    );
    return unsubscribe;
  }, [user]);

  return { packs, isLoading, error };
}
