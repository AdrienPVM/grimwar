import { useEffect, useState } from 'react';

import { loadPublicContent } from '../lib/content-loader';
import type { ContentEntityByKey, ContentTypeKey } from '../types/content';

interface UseContentResult<K extends ContentTypeKey> {
  data: ContentEntityByKey[K][];
  loading: boolean;
  error: Error | null;
}

/**
 * Hook React qui charge un bundle de contenu public (cache Dexie 7j).
 * Pendant le chargement initial, `loading=true` et `data=[]`. Les composants
 * doivent gérer cet état (skeleton, spinner ou message court).
 */
export function useContent<K extends ContentTypeKey>(type: K): UseContentResult<K> {
  const [data, setData] = useState<ContentEntityByKey[K][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadPublicContent(type)
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
  }, [type]);

  return { data, loading, error };
}
