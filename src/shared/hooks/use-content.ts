import { useEffect, useState } from 'react';

import { useCampaignContent } from '../lib/campaign-content-context';
import { loadContentMulti } from '../lib/load-content-multi';
import { useAuthStore } from '../lib/slices/auth-slice';
import type { ContentEntityByKey, ContentTypeKey } from '../types/content';

interface UseContentResult<K extends ContentTypeKey> {
  data: ContentEntityByKey[K][];
  loading: boolean;
  error: Error | null;
}

/**
 * Hook React qui charge un bundle de contenu agnostique-de-source.
 *
 * Depuis JALON 3B.5 : fusion automatique SRD ∪ custom user ∪ custom campagne
 * (politique campaign > user > public). Le `userId` est lu de `useAuthStore`,
 * le `campaignId` de `useCampaignContent`. Les call sites ne passent toujours
 * que le type — ils voient simplement plus d'entrées quand l'utilisateur a
 * importé un pack custom.
 *
 * Pendant le chargement initial, `loading=true` et `data=[]`. Les composants
 * doivent gérer cet état (skeleton, spinner ou message court).
 */
export function useContent<K extends ContentTypeKey>(type: K): UseContentResult<K> {
  const [data, setData] = useState<ContentEntityByKey[K][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const userId = useAuthStore((s) => s.user?.uid ?? null);
  const { campaignId } = useCampaignContent();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadContentMulti(type, { userId, campaignId })
      .then((entries) => {
        if (cancelled) return;
        setData(entries);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });
    return (): void => {
      cancelled = true;
    };
  }, [type, userId, campaignId]);

  return { data, loading, error };
}
