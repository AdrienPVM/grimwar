import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/use-auth';
import {
  CampaignServiceError,
  getCampaign,
  listCampaignMembers,
} from '@/shared/lib/services/campaigns';
import type { Campaign, Membership } from '@/shared/types/campaign';

interface UseCampaignResult {
  campaign: Campaign | null;
  members: Membership[];
  isLoading: boolean;
  /**
   * `error` peut prendre 3 formes :
   *   - `null` — chargement en cours ou réussi.
   *   - `Error` avec `name === 'CampaignServiceError'` et `kind === 'campaign-not-found'`
   *     — campagne supprimée ou ID invalide.
   *   - `Error` générique avec `message` contenant `permission-denied`
   *     — l'utilisateur n'est ni MJ ni membre de la campagne.
   * L'écran branche un message dédié à chacun de ces cas.
   */
  error: Error | null;
  refresh: () => void;
}

/**
 * Charge le doc `campaigns/{cid}` + sa sous-collection `members/`. Stratégie
 * identique à `useMyCampaigns` (4.0.4) : **fetch one-shot avec refresh manuel**,
 * pas de `onSnapshot` temps réel. La justification est la même — volume bas,
 * mutations user-initiated, simplicité — et elle est renforcée pour le détail :
 * l'écran a presque toujours un user actif qui fait quelque chose (copier le
 * code, promouvoir, quitter), donc le refresh manuel suffit.
 *
 * Le hook fait 2 requêtes en parallèle (`getCampaign` + `listCampaignMembers`)
 * pour minimiser le temps perçu — Promise.all évite la sérialisation.
 *
 * Contract : { campaign, members, isLoading, error, refresh } — mirror de
 * `useMyCampaigns` avec 2 champs au lieu d'un.
 */
export function useCampaign(campaignId: string | undefined): UseCampaignResult {
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [members, setMembers] = useState<Membership[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshCounter, setRefreshCounter] = useState<number>(0);

  useEffect(() => {
    if (!user || !campaignId) {
      setCampaign(null);
      setMembers([]);
      setIsLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    Promise.all([getCampaign(campaignId), listCampaignMembers(campaignId)])
      .then(([camp, mems]) => {
        if (cancelled) return;
        setCampaign(camp);
        setMembers(mems);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // `CampaignServiceError` passe tel quel — l'écran le détecte via
        // `err.name === 'CampaignServiceError'` (les instanceof checks survivent
        // mal à travers les boundaries de Vite HMR, on s'appuie sur `name`).
        if (err instanceof CampaignServiceError) {
          setError(err);
        } else if (err instanceof Error) {
          setError(err);
        } else {
          setError(new Error(String(err)));
        }
        setCampaign(null);
        setMembers([]);
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, campaignId, refreshCounter]);

  const refresh = useCallback(() => {
    setRefreshCounter((n) => n + 1);
  }, []);

  return { campaign, members, isLoading, error, refresh };
}
