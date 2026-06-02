import { useEffect, useState } from 'react';

import { getPack } from '@/shared/lib/services/pack-storage';
import type { CustomContentPack } from '@/shared/types/custom-content-pack';

/**
 * Charge un pack existant depuis Firestore — utilisé par `PackEditorScreen`
 * en mode édition (JALON 3C.10). Hook simple `getDoc` one-shot (le mode
 * édition ne réagit pas aux modifications externes : on charge une snapshot,
 * on édite, on overwrite au save).
 *
 * Contrat :
 *   - `packId === undefined` ⇒ mode création, hook idle.
 *   - `uid === null` ⇒ pas d'utilisateur prêt encore, hook idle.
 *   - `loading: true` tant que la lecture est en cours.
 *   - `pack: null` + `loading: false` quand le pack n'existe pas (404).
 *   - `error` non-null si une exception est levée par `getPack`.
 */
export interface UseExistingPackResult {
  pack: CustomContentPack | null;
  loading: boolean;
  error: Error | null;
}

export function useExistingPack(
  uid: string | null | undefined,
  packId: string | undefined,
): UseExistingPackResult {
  const [pack, setPack] = useState<CustomContentPack | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!packId || !uid) {
      setPack(null);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPack(uid, packId)
      .then((result) => {
        if (cancelled) return;
        setPack(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [uid, packId]);

  return { pack, loading, error };
}
