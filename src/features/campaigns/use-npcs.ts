import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/use-auth';
import { getNpc, listAllNpcs, listVisibleNpcs } from '@/shared/lib/services/npcs';
import type { Npc } from '@/shared/types/npc';

interface UseNpcsResult {
  npcs: Npc[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * Liste les PNJ d'une campagne. MJ → TOUS les PNJ (`listAllNpcs`) ; joueur →
 * seulement les `visibility == 'all'` (`listVisibleNpcs`, query bornée par la
 * rule).
 *
 * Stratégie **fetch one-shot + refresh manuel** (pas de `onSnapshot`), identique
 * à `useHandouts` / `useSessions` : volume bas, mutations user-initiated (le MJ
 * crée/édite/supprime), `refresh()` appelé après chaque mutation réussie.
 */
export function useNpcs(
  campaignId: string | undefined,
  isDM: boolean,
): UseNpcsResult {
  const { user } = useAuth();
  const [npcs, setNpcs] = useState<Npc[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshCounter, setRefreshCounter] = useState<number>(0);

  useEffect(() => {
    if (!user || !campaignId) {
      setNpcs([]);
      setIsLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    const promise = isDM ? listAllNpcs(campaignId) : listVisibleNpcs(campaignId);
    promise
      .then((list) => {
        if (cancelled) return;
        setNpcs(list);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setNpcs([]);
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, campaignId, isDM, refreshCounter]);

  const refresh = useCallback(() => {
    setRefreshCounter((n) => n + 1);
  }, []);

  return { npcs, isLoading, error, refresh };
}

interface UseNpcResult {
  npc: Npc | null;
  isLoading: boolean;
  /** `true` quand le chargement est fini et qu'aucun PNJ n'a été trouvé. */
  notFound: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * Charge UN PNJ (`getNpc`). Une lecture refusée par la rule (joueur sur un PNJ
 * `'dm'`) ou un doc absent remonte en `notFound` (on ne distingue pas les deux
 * côté client — dans les deux cas, « ce PNJ n'existe pas pour vous »).
 */
export function useNpc(
  campaignId: string | undefined,
  npcId: string | undefined,
): UseNpcResult {
  const { user } = useAuth();
  const [npc, setNpc] = useState<Npc | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshCounter, setRefreshCounter] = useState<number>(0);

  useEffect(() => {
    if (!user || !campaignId || !npcId) {
      setNpc(null);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setNotFound(false);
    setError(null);
    getNpc(campaignId, npcId)
      .then((found) => {
        if (cancelled) return;
        setNpc(found);
        setNotFound(found === null);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Une rule deny (joueur ↦ PNJ 'dm') arrive ici : on l'assimile à notFound.
        setNpc(null);
        setNotFound(true);
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, campaignId, npcId, refreshCounter]);

  const refresh = useCallback(() => {
    setRefreshCounter((n) => n + 1);
  }, []);

  return { npc, isLoading, notFound, error, refresh };
}
