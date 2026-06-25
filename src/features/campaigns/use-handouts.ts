import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/use-auth';
import { listAllHandouts, listHandoutsForRecipient } from '@/shared/lib/services/handouts';
import type { Handout } from '@/shared/types/handout';

interface UseHandoutsResult {
  handouts: Handout[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * Liste les handouts d'une campagne. MJ → tous les documents (`listAllHandouts`) ;
 * joueur → seulement ceux qui lui sont destinés (`listHandoutsForRecipient`,
 * fusion des queries destinataire ∪ 'all').
 *
 * Stratégie **fetch one-shot + refresh manuel** (pas de `onSnapshot`), identique
 * à `useSessions` : volume bas, mutations user-initiated (le MJ envoie/archive,
 * le joueur ouvre), `refresh()` appelé après chaque mutation réussie. Le temps
 * réel « nouveau document → toast » est porté séparément par
 * `useHandoutNotifications`, qui est le seul besoin réellement live.
 *
 * Rule de read consommée : MJ lit tout ; un joueur reçoit `permission-denied`
 * propagé dans `error` s'il interroge une campagne dont il n'est pas membre.
 */
export function useHandouts(
  campaignId: string | undefined,
  isDM: boolean,
): UseHandoutsResult {
  const { user } = useAuth();
  const [handouts, setHandouts] = useState<Handout[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshCounter, setRefreshCounter] = useState<number>(0);

  useEffect(() => {
    if (!user || !campaignId) {
      setHandouts([]);
      setIsLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    const promise = isDM
      ? listAllHandouts(campaignId)
      : listHandoutsForRecipient(campaignId, user.uid);
    promise
      .then((list) => {
        if (cancelled) return;
        setHandouts(list);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setHandouts([]);
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, campaignId, isDM, refreshCounter]);

  const refresh = useCallback(() => {
    setRefreshCounter((n) => n + 1);
  }, []);

  return { handouts, isLoading, error, refresh };
}
