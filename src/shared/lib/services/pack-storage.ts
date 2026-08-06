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
  /**
   * Documents Firestore qui composent ce pack (M52). Un pack volumineux est
   * découpé en tranches `{packId}--00`, `--01`… : la liste doit montrer UN
   * pack, et la suppression doit emporter toutes ses tranches.
   */
  docIds: string[];
};

const COLLECTION_NAME = 'customContentPacks';

/**
 * Séparateur d'index de tranche. Deux tirets : `PACK_ID_REGEX` autorise le
 * tiret simple dans un id de pack, donc `mon-pack-01` est un id légitime — il
 * fallait un motif qu'un slug utilisateur ne produit pas par accident.
 */
const CHUNK_SEPARATOR = '--';
const CHUNK_DOC_ID = /^(.+)--(\d{2,})$/;

/**
 * Marge de sécurité sur la limite Firestore. `estimatePayloadBytes` mesure la
 * sérialisation JSON, pas le coût réel champ-par-champ (noms de champs,
 * overhead par document, index). Viser 1 MiB pile ferait passer des tranches
 * refusées côté serveur alors que le client les croyait valides.
 */
const CHUNK_TARGET_BYTES = Math.floor(FIRESTORE_DOC_BYTE_LIMIT * 0.8);

/** Id du document d'une tranche. La tranche 0 d'un pack non découpé garde l'id nu. */
function chunkDocId(packId: string, index: number, total: number): string {
  if (total === 1) return packId;
  return `${packId}${CHUNK_SEPARATOR}${String(index).padStart(2, '0')}`;
}

/** Id LOGIQUE d'un document : `mon-pack--03` → `mon-pack`. */
export function logicalPackId(docId: string): string {
  const m = CHUNK_DOC_ID.exec(docId);
  return m?.[1] ?? docId;
}

/**
 * Découpe les entités d'un pack en tranches qui tiennent chacune sous la
 * limite Firestore (M52).
 *
 * Un pack = un document ; au-delà de 1 MiB le service refusait net, avec pour
 * seul conseil « splitte à la main » — et N fichiers donnaient N packs
 * distincts dans la liste. Le chargeur (`loadUserPacksEntries`) concatène déjà
 * tous les documents de la collection : découper est donc transparent en
 * lecture, il ne restait qu'à regrouper à l'affichage et à la suppression.
 *
 * Greedy par entité : on remplit une tranche jusqu'au seuil, puis on en ouvre
 * une nouvelle. Une entité seule plus lourde que le seuil est indécoupable —
 * l'appelant reçoit une erreur explicite plutôt qu'un document rejeté par
 * Firestore.
 */
export function splitPackEntities(
  entities: CustomContentPack['entities'],
  metaBytes: number,
): CustomContentPack['entities'][] {
  const budget = CHUNK_TARGET_BYTES - metaBytes;
  const chunks: CustomContentPack['entities'][] = [];
  let current: Record<string, unknown[]> = {};
  let currentBytes = 0;

  const flush = (): void => {
    if (currentBytes > 0) chunks.push(current as CustomContentPack['entities']);
    current = {};
    currentBytes = 0;
  };

  for (const [category, list] of Object.entries(entities)) {
    if (!Array.isArray(list)) continue;
    for (const entity of list) {
      const size = estimatePayloadBytes(entity);
      if (size > budget) {
        throw new Error(
          `Entité "${(entity as { id?: string }).id ?? '<sans id>'}" trop volumineuse à elle seule (${size} octets) — impossible de la découper.`,
        );
      }
      if (currentBytes + size > budget) flush();
      const bucket = (current[category] ??= []);
      bucket.push(entity);
      currentBytes += size;
    }
  }
  flush();
  // Un pack vide reste un document (le schéma le refuse en amont, mais le
  // service ne doit pas rendre zéro tranche et effacer le pack en silence).
  return chunks.length > 0 ? chunks : [{}];
}

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
 * Au-delà de la limite Firestore, le pack est découpé en tranches
 * `{packId}--00`, `--01`… (M52) — même collection, mêmes rules, `meta.id`
 * commun. Un bestiaire de plusieurs centaines de créatures passe donc en un
 * import, et reste UN pack dans la liste.
 *
 * Les tranches devenues inutiles (le pack a maigri depuis le dernier
 * enregistrement) sont supprimées : sans ça, un `--02` orphelin continuerait
 * d'injecter ses entités dans le catalogue.
 */
export async function writePack(
  uid: string,
  pack: CustomContentPack,
): Promise<void> {
  const firestore = getDb();
  const size = estimatePayloadBytes({ meta: pack.meta, entities: pack.entities });
  const metaBytes = estimatePayloadBytes(pack.meta);
  const chunks =
    size > CHUNK_TARGET_BYTES
      ? splitPackEntities(pack.entities, metaBytes)
      : [pack.entities];

  const writtenIds = new Set<string>();
  for (const [index, entities] of chunks.entries()) {
    const docId = chunkDocId(pack.meta.id, index, chunks.length);
    writtenIds.add(docId);
    const ref = doc(firestore, 'users', uid, COLLECTION_NAME, docId);
    await trackPendingWrite(
      firestore,
      setDoc(ref, { meta: pack.meta, entities, importedAt: serverTimestamp() }),
    );
  }

  await deleteStaleChunks(uid, pack.meta.id, writtenIds);
}

/**
 * Supprime les documents du pack logique qui ne font plus partie du jeu de
 * tranches courant. Lecture d'abord : sans elle on ne saurait pas combien de
 * tranches existaient avant.
 */
async function deleteStaleChunks(
  uid: string,
  packId: string,
  keep: ReadonlySet<string>,
): Promise<void> {
  const firestore = getDb();
  const col = collection(firestore, 'users', uid, COLLECTION_NAME);
  const snap = await getDocs(col);
  const stale: string[] = [];
  snap.forEach((docSnap) => {
    if (logicalPackId(docSnap.id) !== packId) return;
    if (keep.has(docSnap.id)) return;
    stale.push(docSnap.id);
  });
  for (const docId of stale) {
    await trackPendingWrite(
      firestore,
      deleteDoc(doc(firestore, 'users', uid, COLLECTION_NAME, docId)),
    );
  }
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
  // Regroupement par pack LOGIQUE (M52) : les tranches d'un même pack se
  // présentaient sinon comme autant de packs distincts dans la liste.
  const byLogicalId = new Map<string, PackSummary>();
  snap.forEach((docSnap) => {
    const data = docSnap.data() as {
      meta?: CustomContentPackMeta;
      importedAt?: { toMillis?: () => number } | null;
    };
    if (!data.meta) return;
    const packId = data.meta.id || logicalPackId(docSnap.id);
    const importedAt =
      data.importedAt && typeof data.importedAt.toMillis === 'function'
        ? data.importedAt.toMillis()
        : null;
    const existing = byLogicalId.get(packId);
    if (existing) {
      existing.docIds.push(docSnap.id);
      // Une tranche peut avoir été réécrite plus tard que les autres ; on
      // affiche la date la plus récente, qui est celle de l'import perçu.
      if (importedAt !== null && (existing.importedAt ?? 0) < importedAt) {
        existing.importedAt = importedAt;
      }
      return;
    }
    byLogicalId.set(packId, {
      packId,
      meta: data.meta,
      importedAt,
      docIds: [docSnap.id],
    });
  });
  return Array.from(byLogicalId.values());
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
  if (snap.exists()) {
    const data = snap.data() as {
      meta?: CustomContentPackMeta;
      entities?: CustomContentPack['entities'];
    };
    if (data.meta && data.entities) return { meta: data.meta, entities: data.entities };
    return null;
  }
  // Pas de document nu : le pack est peut-être découpé en tranches (M52). On
  // les recolle — l'éditeur doit voir UN pack, pas trois morceaux.
  return getChunkedPack(uid, packId);
}

async function getChunkedPack(
  uid: string,
  packId: string,
): Promise<CustomContentPack | null> {
  const firestore = getDb();
  const col = collection(firestore, 'users', uid, COLLECTION_NAME);
  const snap = await getDocs(col);
  const parts: { docId: string; data: { meta: CustomContentPackMeta; entities: CustomContentPack['entities'] } }[] = [];
  snap.forEach((docSnap) => {
    if (logicalPackId(docSnap.id) !== packId || docSnap.id === packId) return;
    const data = docSnap.data() as {
      meta?: CustomContentPackMeta;
      entities?: CustomContentPack['entities'];
    };
    if (!data.meta || !data.entities) return;
    parts.push({ docId: docSnap.id, data: { meta: data.meta, entities: data.entities } });
  });
  if (parts.length === 0) return null;
  // Ordre déterministe : l'itération Firestore ne le garantit pas, et un pack
  // recollé dans le désordre changerait l'ordre des entités à chaque lecture.
  parts.sort((a, b) => a.docId.localeCompare(b.docId));
  const entities: Record<string, unknown[]> = {};
  for (const part of parts) {
    for (const [category, list] of Object.entries(part.data.entities)) {
      if (!Array.isArray(list)) continue;
      (entities[category] ??= []).push(...list);
    }
  }
  return {
    meta: parts[0]!.data.meta,
    entities: entities as CustomContentPack['entities'],
  };
}

/**
 * Supprime un pack importé, toutes tranches comprises (M52). L'UI 3B.3 propose
 * cette action depuis la liste des packs importés.
 */
export async function deletePack(uid: string, packId: string): Promise<void> {
  await deleteStaleChunks(uid, packId, new Set());
  // Le document nu peut ne pas figurer dans la collection lue (pack déjà
  // supprimé, ou lecture refusée) : la suppression directe reste idempotente.
  const firestore = getDb();
  await trackPendingWrite(
    firestore,
    deleteDoc(doc(firestore, 'users', uid, COLLECTION_NAME, packId)),
  );
}
