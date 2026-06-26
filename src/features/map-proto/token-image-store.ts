/**
 * Stockage local (IndexedDB via Dexie) du portrait d'un jeton de carte. Même
 * justification et mêmes garanties défensives que `map-image-store.ts` :
 * l'image dépasse la limite Firestore, Firebase Storage n'est pas activé, donc
 * elle vit sur l'appareil (survit au reload, pas de synchro cross-device tant
 * que Storage n'est pas tranché). Le doc Firestore du jeton reste INCHANGÉ —
 * l'image est indexée par l'`id` (slug) que le jeton porte déjà.
 *
 * Toute erreur IndexedDB (quota, mode privé) est avalée : un portrait est un
 * bonus visuel, jamais une donnée de combat — son absence retombe proprement
 * sur le disque coloré habituel.
 */
import { db } from '@/shared/lib/dexie-db';

/** Clé `${campaignId}/${mapId}` — regroupe les portraits d'une même carte. */
export function tokenImageMapKey(campaignId: string, mapId: string): string {
  return `${campaignId}/${mapId}`;
}

/** Clé primaire composite `${campaignId}/${mapId}/${tokenId}`. */
export function tokenImageKey(
  campaignId: string,
  mapId: string,
  tokenId: string,
): string {
  return `${tokenImageMapKey(campaignId, mapId)}/${tokenId}`;
}

export async function saveTokenImage(
  campaignId: string,
  mapId: string,
  tokenId: string,
  dataUrl: string,
): Promise<void> {
  await db.tokenImages.put({
    id: tokenImageKey(campaignId, mapId, tokenId),
    mapKey: tokenImageMapKey(campaignId, mapId),
    tokenId,
    dataUrl,
    updatedAt: Date.now(),
  });
}

/**
 * Charge tous les portraits d'une carte en une requête (index `mapKey`), sous
 * forme de Map `tokenId → dataUrl`. Renvoie une Map vide si rien / erreur.
 */
export async function loadTokenImagesForMap(
  campaignId: string,
  mapId: string,
): Promise<ReadonlyMap<string, string>> {
  try {
    const rows = await db.tokenImages
      .where('mapKey')
      .equals(tokenImageMapKey(campaignId, mapId))
      .toArray();
    return new Map(rows.map((r) => [r.tokenId, r.dataUrl]));
  } catch {
    return new Map();
  }
}

export async function deleteTokenImage(
  campaignId: string,
  mapId: string,
  tokenId: string,
): Promise<void> {
  try {
    await db.tokenImages.delete(tokenImageKey(campaignId, mapId, tokenId));
  } catch {
    // best-effort : une suppression locale ratée n'est pas bloquante.
  }
}

/**
 * Retire tous les portraits d'une carte (appelé quand le MJ vide tous les
 * jetons — sinon les portraits deviennent des orphelins en IndexedDB).
 */
export async function deleteTokenImagesForMap(
  campaignId: string,
  mapId: string,
): Promise<void> {
  try {
    await db.tokenImages
      .where('mapKey')
      .equals(tokenImageMapKey(campaignId, mapId))
      .delete();
  } catch {
    // best-effort (cf. deleteTokenImage).
  }
}
