import { collection, getDocs, type QuerySnapshot } from 'firebase/firestore';

import { getDb } from './firebase';
import {
  CUSTOM_CONTENT_PACK_CATEGORIES,
  type CustomContentPack,
  type CustomContentPackCategory,
} from '../types/custom-content-pack';
import { ContentTypeSchemas, type ContentEntityByKey, type ContentTypeKey } from '../types/content';

/**
 * Pont entre le stockage de packs (3B.4) et la fusion multi-scope (3B.5).
 *
 * Pourquoi : un pack importé vit dans `users/{uid}/customContentPacks/{packId}`
 * comme un document unique contenant `{ meta, entities }`. Le content-loader
 * de fusion (`loadContentMulti`), lui, raisonne en LISTE par type
 * (`entities[type]`). Cette primitive lit tous les packs de l'utilisateur,
 * extrait les entrées du type demandé de chaque pack, valide via Zod et
 * retourne la liste plate.
 *
 * Catégories supportées par les packs (9) : spells, classes, subclasses,
 * ancestries, subancestries, backgrounds, feats, invocations, items.
 * Pour les autres `ContentTypeKey` (monsters, magic-items, conditions,
 * rules, summoned-creatures), la primitive retourne `[]` sans erreur —
 * un pack ne peut pas en contenir.
 *
 * Collisions inter-packs (même id dans 2 packs différents) : le dernier
 * dans l'itération Firestore gagne. L'ordre n'est pas garanti — le MJ qui
 * importe 2 packs avec des collisions reçoit un comportement non
 * déterministe. C'est documenté ; cas marginal (3B.4 garantit l'unicité
 * INTRA-pack via le schéma).
 *
 * Pourquoi pas dans `pack-storage.ts` : ce module-ci fait la projection
 * type-par-type et la validation Zod ; `pack-storage` reste l'API CRUD
 * agnostique de fusion.
 *
 * Dédup in-flight : le wizard monte ~30 `useContent` simultanés, chacun
 * appellerait sinon `getDocs` sur la MÊME collection
 * `users/{uid}/customContentPacks`. Sans dédup, 30 round-trips concurrents
 * Firestore — sur l'émulateur CI (Pixel 7 throttled) ça tombait en timeout
 * (cf. CI run 26717411652 cancelled à 1h06 sur PR #97). On mémoïse la
 * promesse `getDocs` par userId pendant qu'elle est en vol : tous les
 * appels en parallèle partagent le même round-trip. Quand la promesse
 * résout, on retire l'entrée — l'appel suivant refetche (cohérence post-
 * import : aucun cache résiduel).
 */

const PACK_CATEGORY_KEYS = new Set<string>(CUSTOM_CONTENT_PACK_CATEGORIES);

function isPackCategory(type: ContentTypeKey): type is CustomContentPackCategory {
  return PACK_CATEGORY_KEYS.has(type);
}

type PackSnapshot = QuerySnapshot;

const inflightSnapshots = new Map<string, Promise<PackSnapshot>>();

async function fetchUserPacksSnapshot(userId: string): Promise<PackSnapshot> {
  const existing = inflightSnapshots.get(userId);
  if (existing) return existing;
  const firestore = getDb();
  const col = collection(firestore, 'users', userId, 'customContentPacks');
  const promise = getDocs(col).finally(() => {
    inflightSnapshots.delete(userId);
  });
  inflightSnapshots.set(userId, promise);
  return promise;
}

export async function loadUserPacksEntries<K extends ContentTypeKey>(
  type: K,
  userId: string,
): Promise<ContentEntityByKey[K][]> {
  if (!isPackCategory(type)) return [];

  const snap = await fetchUserPacksSnapshot(userId);

  const entries: ContentEntityByKey[K][] = [];
  const schema = ContentTypeSchemas[type];

  snap.forEach((docSnap) => {
    const data = docSnap.data() as { entities?: CustomContentPack['entities'] };
    const list = data.entities?.[type as CustomContentPackCategory];
    if (!list) return;
    for (const raw of list) {
      // Defense-in-depth : un pack écrit avant une évolution de schéma peut
      // contenir des entrées légèrement invalides. On filtre plutôt que de
      // planter le wizard entier — symétrique à `loadFromFirestore`.
      const parsed = schema.safeParse(raw);
      if (parsed.success) {
        entries.push(parsed.data as ContentEntityByKey[K]);
      } else {
        console.warn(
          `[load-user-packs-entries] ${type}/${(raw as { id?: string }).id ?? '<no-id>'} dans pack ${docSnap.id}: schema invalide, ignoré`,
          parsed.error.errors,
        );
      }
    }
  });

  return entries;
}
