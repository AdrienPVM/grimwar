import { useCallback, useEffect, useState } from 'react';

import { loadTokenImagesForMap } from './token-image-store';

const EMPTY: ReadonlyMap<string, string> = new Map();

/**
 * Charge (async) tous les portraits locaux des jetons d'une carte depuis
 * IndexedDB, sous forme de Map `tokenId → dataUrl`. Sert aux vues live et TV à
 * dessiner un portrait à la place du disque coloré quand le MJ en a posé un (cf.
 * `token-image-store.ts` — image locale, Firebase Storage parqué).
 *
 * `reloadTokenImages()` force un rechargement après un upload / un retrait (la
 * source est IndexedDB, hors React — il faut re-lire pour refléter l'écriture).
 *
 * Effet de FETCH async (source externe IndexedDB), pas de « derived state » —
 * légitime comme dans `use-map-image.ts`.
 */
export function useTokenImages(
  campaignId: string | undefined,
  mapId: string | undefined,
): {
  tokenImages: ReadonlyMap<string, string>;
  reloadTokenImages: () => void;
} {
  const [tokenImages, setTokenImages] =
    useState<ReadonlyMap<string, string>>(EMPTY);
  const [reloadNonce, setReloadNonce] = useState(0);

  const reloadTokenImages = useCallback(() => {
    setReloadNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!campaignId || !mapId) {
      setTokenImages(EMPTY);
      return;
    }
    let cancelled = false;
    void loadTokenImagesForMap(campaignId, mapId).then((m) => {
      if (!cancelled) setTokenImages(m);
    });
    return () => {
      cancelled = true;
    };
  }, [campaignId, mapId, reloadNonce]);

  return { tokenImages, reloadTokenImages };
}
