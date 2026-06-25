/**
 * Stockage local (IndexedDB via Dexie) de l'image de fond d'une carte importée
 * `.dd2vtt`. Voir `MapImageRow` dans `dexie-db.ts` pour la justification :
 * l'image dépasse la limite Firestore et Firebase Storage n'est pas activé, donc
 * elle vit sur l'appareil — survit au reload, pas de synchro cross-device (qui
 * viendra avec Storage).
 *
 * Toutes les fonctions sont défensives : une erreur IndexedDB (quota, mode
 * privé) ne doit jamais casser le rendu de la carte — l'image est un bonus, les
 * murs/lumières/tokens (eux persistés Firestore) restent la donnée de combat.
 */
import { db } from '@/shared/lib/dexie-db';

/** Clé composite stable `${campaignId}/${mapId}`. */
export function mapImageKey(campaignId: string, mapId: string): string {
  return `${campaignId}/${mapId}`;
}

export async function saveMapImage(
  campaignId: string,
  mapId: string,
  dataUrl: string,
): Promise<void> {
  await db.mapImages.put({
    id: mapImageKey(campaignId, mapId),
    dataUrl,
    importedAt: Date.now(),
  });
}

/** Renvoie le data URL local, ou `null` si absent / erreur IndexedDB. */
export async function loadMapImage(
  campaignId: string,
  mapId: string,
): Promise<string | null> {
  try {
    const row = await db.mapImages.get(mapImageKey(campaignId, mapId));
    return row?.dataUrl ?? null;
  } catch {
    return null;
  }
}

export async function deleteMapImage(
  campaignId: string,
  mapId: string,
): Promise<void> {
  try {
    await db.mapImages.delete(mapImageKey(campaignId, mapId));
  } catch {
    // best-effort : une suppression locale ratée n'est pas bloquante.
  }
}
