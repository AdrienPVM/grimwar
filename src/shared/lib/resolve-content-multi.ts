import { resolveContent } from './content-loader';
import type { ContentEntityByKey, ContentTypeKey } from '../types/content';

/**
 * Source de contenu — identifie de quel scope vient une entrée résolue. Utile
 * pour décorer l'UI (badge "Custom" en JALON 3) ou pour le test d'intégrité
 * référentielle qui doit savoir où chercher une référence cross-bundle.
 */
export type ResolvedContentSource = 'public' | 'user' | 'campaign';

export interface ResolvedContent<K extends ContentTypeKey> {
  entity: ContentEntityByKey[K];
  source: ResolvedContentSource;
}

/**
 * Résolution multi-scope avec politique "custom wins".
 *
 * Pourquoi : le moteur de création/level-up doit pouvoir résoudre un id de
 * contenu en interrogeant l'union SRD + custom de la campagne + custom de
 * l'utilisateur. Sans cette primitive, chaque call site devrait orchestrer
 * lui-même la priorité — duplication garantie, dérive garantie.
 *
 * Politique d'override (cf. plans/2A-AGNOSTIC-SOURCE-INVENTORY.md § 2.3) :
 *   campaign > user > public
 *
 * Justification : un MJ qui définit un item custom dans sa campagne doit
 * voir SA version, même si un item public partage le même id (cas typique :
 * MJ override le SRD). Le user scope est intermédiaire (homebrew personnel
 * qui survit entre campagnes) et le public est le fallback canonique.
 *
 * Module séparé volontairement : permet aux tests d'utiliser `vi.spyOn`
 * sur l'import `resolveContent` pour observer la priorité sans dépendre
 * de Firestore ni des bundles disque. Si la fonction vivait dans
 * `content-loader.ts` à côté de `resolveContent`, les appels seraient
 * intra-module et le spy ne pourrait pas les intercepter.
 *
 * État JALON 2A.3 : la primitive est livrée. Le merge n'est pas encore
 * câblé dans les call sites UI — c'est le hook pour 2A.4+. Les tests
 * unitaires garantissent la priorité ; les consommateurs réels viennent
 * progressivement.
 */
export async function resolveContentMulti<K extends ContentTypeKey>(
  type: K,
  contentId: string,
  options: {
    campaignId?: string | null;
    userId?: string | null;
  } = {},
): Promise<ResolvedContent<K> | null> {
  const { campaignId, userId } = options;
  if (campaignId) {
    const fromCampaign = await resolveContent(type, contentId, {
      scope: 'campaign',
      scopeId: campaignId,
    });
    if (fromCampaign) return { entity: fromCampaign, source: 'campaign' };
  }
  if (userId) {
    const fromUser = await resolveContent(type, contentId, {
      scope: 'user',
      scopeId: userId,
    });
    if (fromUser) return { entity: fromUser, source: 'user' };
  }
  const fromPublic = await resolveContent(type, contentId, { scope: 'public' });
  if (fromPublic) return { entity: fromPublic, source: 'public' };
  return null;
}
