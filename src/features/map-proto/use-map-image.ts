import { useEffect, useState } from 'react';

import { loadMapImage } from './map-image-store';

/**
 * Charge (async) l'image de fond locale d'une carte depuis IndexedDB. Sert aux
 * vues live et TV à afficher un fond `.dd2vtt` importé même quand
 * `MapMeta.imageUrl` est `null` (Firebase Storage non actif — l'image vit en
 * local sur l'appareil, cf. `map-image-store.ts`).
 *
 * Effet de FETCH async (donnée externe), pas de « derived state » — conforme
 * aux conventions : un `useEffect` est légitime ici car on lit une source
 * asynchrone (IndexedDB), pas une valeur dérivable au rendu.
 */
export function useMapImage(
  campaignId: string | undefined,
  mapId: string | undefined,
): { localImageUrl: string | null } {
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId || !mapId) {
      setLocalImageUrl(null);
      return;
    }
    let cancelled = false;
    void loadMapImage(campaignId, mapId).then((url) => {
      if (!cancelled) setLocalImageUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [campaignId, mapId]);

  return { localImageUrl };
}
