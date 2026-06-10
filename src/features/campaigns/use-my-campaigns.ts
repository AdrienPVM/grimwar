import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/use-auth';
import { listMyCampaigns } from '@/shared/lib/services/campaigns';
import type { Campaign } from '@/shared/types/campaign';

interface UseMyCampaignsResult {
  campaigns: Campaign[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * Hook React pour lister les campagnes auxquelles le user participe (MJ ou
 * joueur). Wrap fin sur `listMyCampaigns` (4.0.3, qui fait Q1 gmIds + Q2
 * collectionGroup members + dédupe + tri).
 *
 * Choix réalisé en 4.0.4 : **fetch one-shot avec refresh manuel**, pas de
 * `onSnapshot` temps réel. Justifications :
 *   - le volume est intrinsèquement bas (un user a typiquement 1-5 campagnes
 *     actives, jamais 100) ;
 *   - les opérations qui changent l'état de la liste sont user-initiated
 *     (createCampaign / joinByCode / leaveCampaign) — le refresh est appelé
 *     manuellement après chaque mutation réussie, donc l'écart entre l'écran
 *     et la prod est borné à la durée d'une mutation ;
 *   - une réorganisation côté MJ (un autre MJ promeut quelqu'un en co-MJ
 *     pendant que le user regarde sa liste) n'est pas critique V1 : un
 *     re-fetch au prochain montage suffit.
 *
 * Si on observait une UX dégradée à l'usage (plusieurs MJ travaillant à la
 * même fenêtre de temps), on basculerait à un onSnapshot sur la query Q1
 * gmIds — la query Q2 collectionGroup members n'est pas snapshottable
 * proprement à coût raisonnable, le compromis temps-réel partiel valait
 * d'être documenté avant d'y aller.
 *
 * Contract : { campaigns, isLoading, error, refresh } — mirror de
 * `useCharactersList` (plan 13.6) sauf `refresh` au lieu de `remountKey`.
 */
export function useMyCampaigns(): UseMyCampaignsResult {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  // Bumpé par `refresh()` pour relancer le useEffect ci-dessous sans toucher
  // au reste de l'état (et garder la garantie d'absence de race condition
  // sur l'unmount via le flag `cancelled`).
  const [refreshCounter, setRefreshCounter] = useState<number>(0);

  useEffect(() => {
    if (!user) {
      setCampaigns([]);
      setIsLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    listMyCampaigns(user.uid)
      .then((list) => {
        if (cancelled) return;
        setCampaigns(list);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, refreshCounter]);

  const refresh = useCallback(() => {
    setRefreshCounter((n) => n + 1);
  }, []);

  return { campaigns, isLoading, error, refresh };
}
