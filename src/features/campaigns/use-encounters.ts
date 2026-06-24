import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/use-auth';
import { listEncounters } from '@/shared/lib/services/encounters';
import type { Encounter } from '@/shared/types/encounter';

interface UseEncountersResult {
  encounters: Encounter[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * Liste les rencontres d'une campagne (`campaigns/{cid}/encounters`), triées par
 * date de création décroissante côté service (`listEncounters`, 24.1). Wrap fin,
 * même stratégie que `useSessions` (23.2) / `useMyCampaigns` : **fetch one-shot +
 * refresh manuel**, pas de `onSnapshot`.
 *
 * Justification (identique aux hooks campagnes/séances) : volume bas (une
 * campagne accumule quelques dizaines de rencontres sur sa vie), mutations
 * user-initiated (le MJ crée/démarre/clôt depuis l'UI), refresh appelé après
 * chaque mutation réussie. Le temps-réel sur le DOC d'une rencontre active (PV,
 * tours partagés en live) sera câblé sur l'écran de combat (24.x), pas sur la
 * liste — c'est l'état d'une rencontre en cours qui est « live », pas le
 * catalogue.
 *
 * Rule de read consommée : `isMemberOf(cid) || isDMOf(cid)` (élargie en 24.1).
 * Un non-membre reçoit `permission-denied` propagé tel quel dans `error`.
 *
 * Contract : { encounters, isLoading, error, refresh } — mirror de `useSessions`.
 */
export function useEncounters(campaignId: string | undefined): UseEncountersResult {
  const { user } = useAuth();
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshCounter, setRefreshCounter] = useState<number>(0);

  useEffect(() => {
    if (!user || !campaignId) {
      setEncounters([]);
      setIsLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    listEncounters(campaignId)
      .then((list) => {
        if (cancelled) return;
        setEncounters(list);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setEncounters([]);
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, campaignId, refreshCounter]);

  const refresh = useCallback(() => {
    setRefreshCounter((n) => n + 1);
  }, []);

  return { encounters, isLoading, error, refresh };
}
