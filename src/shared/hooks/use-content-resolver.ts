import { useCallback } from 'react';

import { useCampaignContent } from '../lib/campaign-content-context';
import {
  resolveContentMulti,
  type ResolvedContent,
} from '../lib/resolve-content-multi';
import { useAuthStore } from '../lib/slices/auth-slice';
import type { ContentTypeKey } from '../types/content';

/**
 * Hook qui retourne une fonction de résolution multi-scope préconfigurée
 * avec le campaignId courant (lu via `useCampaignContent`) et l'uid
 * utilisateur connecté.
 *
 * Pourquoi : les call sites UI qui résolvent un contenu (inventory,
 * resolveInventoryItem, futurs choosers consommant un id custom) n'ont pas
 * à connaître le campaignId/userId — ils appellent simplement
 * `const resolver = useContentResolver(); resolver('items', itemId)`.
 *
 * État JALON 2A.3 : hook livré, prêt à être consommé. Les call sites
 * réels (inventory.ts) sont migrés en 2A.4. En l'absence de Provider
 * `CampaignContentProvider` et d'utilisateur connecté, le résolveur tombe
 * sur le scope public seul — comportement strictement équivalent au
 * `resolveContent(..., { scope: 'public' })` actuel.
 */
export function useContentResolver(): <K extends ContentTypeKey>(
  type: K,
  contentId: string,
) => Promise<ResolvedContent<K> | null> {
  const { campaignId } = useCampaignContent();
  const userId = useAuthStore((s) => s.user?.uid ?? null);

  return useCallback(
    <K extends ContentTypeKey>(type: K, contentId: string) =>
      resolveContentMulti(type, contentId, { campaignId, userId }),
    [campaignId, userId],
  );
}
