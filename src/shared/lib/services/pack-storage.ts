/**
 * Service Firestore pour les packs de contenu custom — JALON 3B.2.
 *
 * Stockage user-scoped (option γ du plan 13.11) : un pack importé vit dans
 * `users/{uid}/customContentPacks/{packId}` comme document unique. Le doc
 * contient `meta` + `entities` du pack (le tout < 1 MiB pour un pack
 * homebrew typique de quelques centaines d'entités).
 *
 * **Important — rules** : ce service présuppose une rule
 * `match /users/{uid}/customContentPacks/{packId}` `allow read, write: if isOwner(uid)`.
 * Cette rule n'existe pas encore (V1 firestore.rules ligne 86-88 couvre
 * `customContent/{type}/{contentId}` qui est un autre chemin et un autre
 * shape). Le déploiement de la nouvelle rule est tâche de 3B.3 (UI), AVANT
 * la livraison du commit qui câble cet appel à l'écran d'import. Voir
 * `CLAUDE.md > Required at every commit > Firebase deploy discipline`.
 *
 * Périmètre 3B.2 : pure couche service + tests unitaires mockés. Aucun
 * appel réel à Firestore tant que 3B.3 n'a pas wired l'UI.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { getDb } from '@/shared/lib/firebase';
import { trackPendingWrite } from '@/shared/lib/track-pending-write';
import type {
  CustomContentPack,
  CustomContentPackMeta,
} from '@/shared/types/custom-content-pack';

/** Limite Firestore par document : 1 MiB. Au-delà → rejet côté service. */
const FIRESTORE_DOC_BYTE_LIMIT = 1_048_576;

/**
 * Résumé d'un pack tel qu'il est exposé à la liste des packs importés
 * (UI 3B.3) : on évite de hydrater l'intégralité des `entities` pour le
 * listing — l'écran d'aperçu charge le pack complet à la demande.
 */
export type PackSummary = {
  packId: string;
  meta: CustomContentPackMeta;
  importedAt: number | null;
};

const COLLECTION_NAME = 'customContentPacks';

/**
 * Sérialise + mesure approximative du payload Firestore. Une mesure exacte
 * exigerait de répliquer l'algo de coût Firestore (champ-par-champ) ; pour
 * V1 on prend la taille UTF-8 de la sérialisation JSON, c'est une borne sûre
 * (le coût réel est généralement ≤ JSON size + overhead par champ).
 */
function estimatePayloadBytes(payload: unknown): number {
  return new TextEncoder().encode(JSON.stringify(payload)).length;
}

/**
 * Écrit un pack importé sous `users/{uid}/customContentPacks/{packId}`.
 *
 * Rejette si le payload sérialisé excède la limite Firestore de 1 MiB —
 * dans ce cas le MJ devra splitter son pack manuellement (ou attendre la
 * V1.x qui ajoutera un splitting client).
 */
export async function writePack(
  uid: string,
  pack: CustomContentPack,
): Promise<void> {
  const firestore = getDb();
  const ref = doc(firestore, 'users', uid, COLLECTION_NAME, pack.meta.id);
  const payload = {
    meta: pack.meta,
    entities: pack.entities,
    importedAt: serverTimestamp(),
  };
  const size = estimatePayloadBytes({ meta: pack.meta, entities: pack.entities });
  if (size > FIRESTORE_DOC_BYTE_LIMIT) {
    throw new Error(
      `Pack "${pack.meta.id}" trop volumineux (${size} octets > limite Firestore ${FIRESTORE_DOC_BYTE_LIMIT}).`,
    );
  }
  await trackPendingWrite(firestore, setDoc(ref, payload));
}

/**
 * Liste les packs importés par l'utilisateur — résumés uniquement. L'UI
 * d'écran d'import (3B.3) consomme cette liste pour afficher « Packs déjà
 * importés ». Détails complets via `getPack`.
 */
export async function listPacks(uid: string): Promise<PackSummary[]> {
  const firestore = getDb();
  const col = collection(firestore, 'users', uid, COLLECTION_NAME);
  const snap = await getDocs(col);
  const out: PackSummary[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as {
      meta?: CustomContentPackMeta;
      importedAt?: { toMillis?: () => number } | null;
    };
    if (!data.meta) return;
    out.push({
      packId: docSnap.id,
      meta: data.meta,
      importedAt:
        data.importedAt && typeof data.importedAt.toMillis === 'function'
          ? data.importedAt.toMillis()
          : null,
    });
  });
  return out;
}

/**
 * Récupère un pack complet (meta + entities). Utilisé par le content-loader
 * (futur 3D) au moment de fusionner SRD ∪ custom.
 */
export async function getPack(
  uid: string,
  packId: string,
): Promise<CustomContentPack | null> {
  const firestore = getDb();
  const ref = doc(firestore, 'users', uid, COLLECTION_NAME, packId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as {
    meta?: CustomContentPackMeta;
    entities?: CustomContentPack['entities'];
  };
  if (!data.meta || !data.entities) return null;
  return { meta: data.meta, entities: data.entities };
}

/**
 * Supprime un pack importé. L'UI 3B.3 propose cette action depuis la liste
 * des packs importés.
 */
export async function deletePack(uid: string, packId: string): Promise<void> {
  const firestore = getDb();
  const ref = doc(firestore, 'users', uid, COLLECTION_NAME, packId);
  await trackPendingWrite(firestore, deleteDoc(ref));
}
