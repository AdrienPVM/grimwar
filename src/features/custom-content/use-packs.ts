import {
  collection,
  onSnapshot,
  type QuerySnapshot,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/use-auth';
import { logicalPackId } from '@/shared/lib/services/pack-storage';
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
  /**
   * Nombre de documents Firestore derrière ce pack (M52). Un pack volumineux
   * est découpé en tranches ; il reste UNE ligne dans la liste.
   */
  chunkCount: number;
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
        // Regroupement par pack LOGIQUE (M52) : les tranches `--00`, `--01`…
        // d'un même pack se présentaient sinon comme autant de packs.
        const byLogicalId = new Map<string, PackListEntry>();
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
          const packId = data.meta.id || logicalPackId(docSnap.id);
          const importedAt =
            data.importedAt && typeof data.importedAt.toMillis === 'function'
              ? data.importedAt.toMillis()
              : null;
          const existing = byLogicalId.get(packId);
          if (existing) {
            existing.chunkCount += 1;
            if (importedAt !== null && (existing.importedAt ?? 0) < importedAt) {
              existing.importedAt = importedAt;
            }
            return;
          }
          byLogicalId.set(packId, {
            packId,
            meta: data.meta,
            importedAt,
            chunkCount: 1,
          });
        });
        const next: PackListEntry[] = Array.from(byLogicalId.values());
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
