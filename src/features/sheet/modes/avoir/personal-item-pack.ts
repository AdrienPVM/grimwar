import { invalidateUserContent } from '@/shared/lib/content-loader';
import { getPack, writePack } from '@/shared/lib/services/pack-storage';
import type { CustomContentPack } from '@/shared/types/custom-content-pack';
import type { Item } from '@/shared/types/content';

/**
 * Identifiant du pack personnel alimenté depuis la fiche. Un seul, stable :
 * un pack par objet forgé encombrerait la liste des packs sans rien apporter.
 */
export const PERSONAL_PACK_ID = 'mes-objets';

/**
 * Ajoute (ou remplace) un objet dans le pack personnel de l'utilisateur.
 *
 * POURQUOI passer par un PACK et non par un document par entrée : le contenu
 * personnel vit dans `users/{uid}/customContentPacks/{packId}.entities`, et
 * c'est cette source-là que `resolveContent(scope:'user')` interroge. L'ancien
 * formulaire écrivait sous `users/{uid}/customContent/items/{id}` — CINQ
 * segments, que `doc()` refuse : la création levait, et l'objet forgé
 * n'existait nulle part. Les deux bouts sont désormais branchés sur la même
 * source, donc l'objet est immédiatement résoluble à l'inventaire.
 *
 * `createdAt` est fourni par l'appelant : le pack le veut en ISO 8601, et
 * cette fonction reste ainsi déterministe et testable.
 */
export async function addItemToPersonalPack(
  uid: string,
  item: Item,
  nowIso: string,
): Promise<void> {
  const existing = await getPack(uid, PERSONAL_PACK_ID);
  const previousItems = existing?.entities.items ?? [];
  const items = [...previousItems.filter((i) => i.id !== item.id), item];

  const pack: CustomContentPack = {
    meta: existing?.meta ?? {
      id: PERSONAL_PACK_ID,
      name: { fr: 'Mes objets', en: 'My items' },
      version: '1.0.0',
      author: uid,
      createdAt: nowIso,
    },
    entities: { ...(existing?.entities ?? {}), items },
  };

  await writePack(uid, pack);
  // Sans invalidation, la fiche continuerait de lire le catalogue caché et
  // l'objet tout juste forgé serait « introuvable » à l'ajout.
  await invalidateUserContent('items', uid);
}
