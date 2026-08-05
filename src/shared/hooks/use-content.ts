import { useCallback, useEffect, useState } from 'react';

import { useCampaignContent } from '../lib/campaign-content-context';
import type { ContentScope } from '../lib/content-loader';
import { loadContentMultiScoped } from '../lib/load-content-multi';
import { useAuthStore } from '../lib/slices/auth-slice';
import type { ContentEntityByKey, ContentTypeKey } from '../types/content';

/** Provenance d'une entrée, pour les écrans qui PERSISTENT une référence. */
export interface ContentEntryScope {
  readonly scope: ContentScope;
  readonly scopeId?: string;
}

interface UseContentResult<K extends ContentTypeKey> {
  data: ContentEntityByKey[K][];
  loading: boolean;
  error: Error | null;
  /**
   * Provenance de l'entrée `id`, ou `'public'` par défaut. Un écran qui écrit
   * une référence durable (inventaire) DOIT s'en servir : marquer `'public'`
   * un objet venu d'un pack maison le rend « introuvable » à la relecture.
   */
  scopeOf: (id: string) => ContentEntryScope;
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
  const [scopes, setScopes] = useState<Map<string, ContentEntryScope>>(
    () => new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const userId = useAuthStore((s) => s.user?.uid ?? null);
  const { campaignId } = useCampaignContent();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadContentMultiScoped(type, { userId, campaignId })
      .then((entries) => {
        if (cancelled) return;
        setData(entries.map((e) => e.entity));
        setScopes(
          new Map(
            entries.map((e) => [
              (e.entity as { id: string }).id,
              e.scopeId === undefined
                ? { scope: e.scope }
                : { scope: e.scope, scopeId: e.scopeId },
            ]),
          ),
        );
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

  const scopeOf = useCallback(
    (id: string): ContentEntryScope => scopes.get(id) ?? { scope: 'public' },
    [scopes],
  );

  return { data, loading, error, scopeOf };
}
