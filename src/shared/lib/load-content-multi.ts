import { loadPublicContent } from './content-loader';
import { loadUserPacksEntries } from './load-user-packs-entries';
import type { ContentEntityByKey, ContentTypeKey } from '../types/content';

/**
 * Chargement multi-scope en LISTE avec politique "custom wins".
 *
 * Pourquoi : pendant que `resolveContentMulti` résout UNE entité par id, le
 * wizard et la fiche ont besoin de la LISTE complète SRD + custom pour
 * afficher les choix disponibles (ex. liste des sorts, des items, des
 * sous-classes). Sans cette primitive, chaque call site UI orchestrerait
 * lui-même le merge — duplication et dérive garanties.
 *
 * Politique d'override (cf. plans/2A-AGNOSTIC-SOURCE-INVENTORY.md § 2.3) :
 *   campaign > user > public
 *
 * Sur conflit d'id : l'entrée du scope prioritaire remplace la moins
 * prioritaire dans le résultat final, et un `console.warn` est émis pour
 * tracer la collision (utile au MJ qui override un id SRD par accident).
 *
 * État JALON 3B.5 : la primitive est livrée, câblée dans `useContent` pour
 * que tous les consommateurs du wizard/fiche bénéficient automatiquement de
 * la fusion. Les call sites ne changent pas — ils voient juste plus
 * d'entrées.
 */
export async function loadContentMulti<K extends ContentTypeKey>(
  type: K,
  options: {
    campaignId?: string | null;
    userId?: string | null;
  } = {},
): Promise<ContentEntityByKey[K][]> {
  const { campaignId, userId } = options;

  const publicEntries = await loadPublicContent(type);
  // Scope user : seule source aujourd'hui = packs importés (3B.4) lus via
  // `loadUserPacksEntries`. Le futur store per-entity (`loadUserContent`,
  // collection `users/{uid}/customContent/{type}`) est posé mais branché
  // sur un path Firestore à 4 segments invalide — pas opérationnel tant
  // que le JALON 3C (UI in-app de création par catégorie) ne le câble
  // pas correctement. Le brancher ici prématurément ferait crasher tous
  // les call sites `useContent` dès qu'un utilisateur est authentifié.
  const userEntries = userId ? await loadUserPacksEntries(type, userId) : [];
  // Scope campagne : aucune source aujourd'hui. `loadCampaignContent`
  // souffre du même problème de path 4-segment ; le JALON 3D décidera de
  // la stratégie d'injection campagne (pack copié dans la campagne vs
  // référence partagée).
  const campaignEntries: ContentEntityByKey[K][] = campaignId ? [] : [];

  // Index par id, en empilant dans l'ordre de priorité croissante. La
  // dernière écriture l'emporte → public d'abord, user au-dessus, campaign
  // tout en haut. C'est strictement équivalent à `campaign > user > public`.
  const byId = new Map<string, { entity: ContentEntityByKey[K]; scope: string }>();

  const push = (entry: ContentEntityByKey[K], scope: string): void => {
    const id = (entry as { id: string }).id;
    const existing = byId.get(id);
    if (existing) {
      console.warn(
        `[load-content-multi] ${type}: collision id "${id}" — ${scope} remplace ${existing.scope}.`,
      );
    }
    byId.set(id, { entity: entry, scope });
  };

  for (const entry of publicEntries) push(entry, 'public');
  for (const entry of userEntries) push(entry, 'user');
  for (const entry of campaignEntries) push(entry, 'campaign');

  return Array.from(byId.values()).map((v) => v.entity);
}
