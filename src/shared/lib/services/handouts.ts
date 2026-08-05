/**
 * Service Firestore pour `campaigns/{cid}/handouts/{hid}` — couche d'écriture et
 * de lecture des documents MJ→joueur (plan 27, data layer only).
 *
 * Pattern aligné sur `sessions.ts` :
 *   - écritures single-doc wrappées par `trackPendingWrite` (bannière offline) ;
 *   - lectures one-shot triées CLIENT-SIDE (volume bas — une campagne a quelques
 *     dizaines de handouts sur sa vie, même justification que `listSessions`), ce
 *     qui évite tout index composite supplémentaire ;
 *   - pas de validation Zod à l'écriture (caller UI typé strict + rules) ; parse
 *     Zod défensif à la lecture (un doc legacy invalide est ignoré, pas fatal).
 *
 * Rules consommées (cf. `firestore.rules` — bloc `campaigns/{cid}/handouts`) :
 *   - read   : MJ lit tout ; un joueur lit s'il est destinataire ou `recipients
 *              === 'all'`.
 *   - create/delete : `isDMOf`.
 *   - update : `isDMOf` (tout) OU un destinataire qui s'ajoute SEUL à
 *              `revealedTo` (self-reveal).
 */
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { getDb } from '@/shared/lib/firebase';
import { trackPendingWrite } from '@/shared/lib/track-pending-write';
import {
  HANDOUT_RECIPIENTS_ALL,
  HandoutSchema,
  handoutCreatedAtMillis,
  type Handout,
  type HandoutType,
} from '@/shared/types/handout';

function handoutsCol(campaignId: string) {
  return collection(getDb(), 'campaigns', campaignId, 'handouts');
}

function handoutRef(campaignId: string, handoutId: string) {
  return doc(getDb(), 'campaigns', campaignId, 'handouts', handoutId);
}

// ─────────────────────────────────────────────────────────────────────
// createHandout
// ─────────────────────────────────────────────────────────────────────

export interface CreateHandoutInput {
  title: string;
  type: HandoutType;
  /** Markdown FR + URL image (image différée 27b — `imageUrl` absent en V1). */
  content: { text?: string; imageUrl?: string };
  /** UIDs destinataires, ou `'all'` (tous les joueurs sauf le MJ). */
  recipients: string[] | typeof HANDOUT_RECIPIENTS_ALL;
}

/**
 * Crée un handout `visibility: 'sent'`, `revealedTo: []`. `createdByUid` est
 * fourni par l'appelant (l'écran MJ a déjà `user.uid`) — pose `createdBy`, que
 * la rule de lecture/journal exploite. Renvoie l'id du doc créé.
 *
 * Firestore refuse les champs `undefined` : on ne pose dans `content` que les
 * clés réellement présentes (un handout `text` n'a pas de clé `imageUrl`).
 */
export async function createHandout(
  campaignId: string,
  createdByUid: string,
  input: CreateHandoutInput,
): Promise<string> {
  const ref = doc(handoutsCol(campaignId));
  const id = ref.id;

  const content: { text?: string; imageUrl?: string } = {};
  if (input.content.text !== undefined) content.text = input.content.text;
  if (input.content.imageUrl !== undefined) content.imageUrl = input.content.imageUrl;

  await trackPendingWrite(
    getDb(),
    setDoc(ref, {
      id,
      title: input.title,
      type: input.type,
      content,
      recipients: input.recipients,
      revealedTo: [],
      visibility: 'sent',
      createdBy: createdByUid,
      createdAt: serverTimestamp(),
    }),
  );

  return id;
}

// ─────────────────────────────────────────────────────────────────────
// Lectures
// ─────────────────────────────────────────────────────────────────────

function parseHandouts(
  docs: { id: string; data: () => Record<string, unknown> }[],
): Handout[] {
  const byId = new Map<string, Handout>();
  for (const d of docs) {
    const result = HandoutSchema.safeParse({ ...d.data(), id: d.id });
    if (result.success) {
      byId.set(result.data.id, result.data);
    } else {
      console.warn(
        `[handouts] doc Firestore invalide ignoré (${d.id}): ${
          result.error.errors[0]?.message ?? 'parse error'
        }`,
      );
    }
  }
  return [...byId.values()].sort(
    (a, b) => handoutCreatedAtMillis(b) - handoutCreatedAtMillis(a),
  );
}

/**
 * MJ : lit TOUS les handouts de la campagne (la rule `isDMOf` l'y autorise),
 * triés du plus récent au plus ancien. Inclut les handouts archivés (l'UI MJ
 * gère leur affichage à part).
 */
export async function listAllHandouts(campaignId: string): Promise<Handout[]> {
  const snap = await getDocs(handoutsCol(campaignId));
  return parseHandouts(snap.docs);
}

/**
 * Joueur : lit les handouts qui lui sont destinés. Deux queries DISJOINTES
 * fusionnées — chacune ne touche que des docs lisibles par le joueur (la rule
 * rejette toute query qui pourrait toucher un doc non lisible) :
 *   1. `recipients array-contains uid` (destinataire explicite),
 *   2. `recipients == 'all'` (diffusion à toute la table).
 * Pas d'`orderBy` dans la query (sinon index composite requis) — tri en mémoire.
 */
export async function listHandoutsForRecipient(
  campaignId: string,
  uid: string,
): Promise<Handout[]> {
  const [mine, all] = await Promise.all([
    getDocs(query(handoutsCol(campaignId), where('recipients', 'array-contains', uid))),
    getDocs(query(handoutsCol(campaignId), where('recipients', '==', HANDOUT_RECIPIENTS_ALL))),
  ]);
  return parseHandouts([...mine.docs, ...all.docs]);
}

// ─────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────

/**
 * Marque un handout comme ouvert par `uid` (self-reveal, plan 27 step 9).
 * Idempotent : no-op si l'UID est déjà dans `revealedTo` (la rule exige une
 * nouvelle valeur EXACTEMENT égale à l'ancienne + l'UID, donc ré-écrire un UID
 * déjà présent échouerait). `currentRevealedTo` vient du doc déjà chargé par
 * le viewer.
 */
export async function revealHandout(
  campaignId: string,
  handoutId: string,
  uid: string,
  currentRevealedTo: string[],
): Promise<void> {
  if (currentRevealedTo.includes(uid)) return;
  await trackPendingWrite(
    getDb(),
    updateDoc(handoutRef(campaignId, handoutId), {
      revealedTo: [...currentRevealedTo, uid],
    }),
  );
}

/**
 * Archive un handout (MJ only) : reste dans l'historique, sort du flux actif.
 * Plan 27 step 11.
 */
export async function archiveHandout(campaignId: string, handoutId: string): Promise<void> {
  await trackPendingWrite(
    getDb(),
    updateDoc(handoutRef(campaignId, handoutId), { visibility: 'archived' }),
  );
}

/**
 * Désarchive un handout — le remet dans le flux actif (M12). L'archivage était
 * irréversible côté UI alors que la rule `isDMOf` autorise n'importe quel
 * update : une fausse manœuvre condamnait le document à la section grisée.
 */
export async function unarchiveHandout(
  campaignId: string,
  handoutId: string,
): Promise<void> {
  await trackPendingWrite(
    getDb(),
    updateDoc(handoutRef(campaignId, handoutId), { visibility: 'sent' }),
  );
}

// ─────────────────────────────────────────────────────────────────────
// updateHandout / deleteHandout (M12) — un document envoyé se corrige
// ─────────────────────────────────────────────────────────────────────

export interface UpdateHandoutPatch {
  title?: string;
  /** Texte Markdown. Remplace `content` en entier (V1 = texte seul). */
  text?: string;
  recipients?: string[] | typeof HANDOUT_RECIPIENTS_ALL;
}

/**
 * Corrige un document déjà envoyé : coquille du titre, contenu, ou liste de
 * destinataires (« montre-le aussi au Barde »). MJ only — la rule d'update
 * `isDMOf` couvre déjà tout.
 *
 * EFFET DE BORD VOULU sur l'ajout d'un destinataire : `useHandoutNotifications`
 * écoute une query `recipients array-contains uid`. Ajouter un joueur fait
 * ENTRER le doc dans SA query → son listener voit un `added` → il reçoit le
 * toast « Le meneur t'a envoyé un document ». Aucun code de notification à
 * écrire : le nouveau destinataire est prévenu comme s'il l'avait reçu d'emblée.
 *
 * On ne touche PAS à `revealedTo` : un joueur qui avait déjà ouvert le document
 * reste marqué comme l'ayant lu, même si le texte a changé. Le contraire ferait
 * réapparaître en « nouveau » un document qu'il connaît.
 */
export async function updateHandout(
  campaignId: string,
  handoutId: string,
  patch: UpdateHandoutPatch,
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.title !== undefined) payload.title = patch.title;
  if (patch.text !== undefined) payload.content = { text: patch.text };
  if (patch.recipients !== undefined) payload.recipients = patch.recipients;
  // Rien à écrire → on n'émet pas un update vide (Firestore le rejetterait).
  if (Object.keys(payload).length === 0) return;
  await trackPendingWrite(
    getDb(),
    updateDoc(handoutRef(campaignId, handoutId), payload),
  );
}

/**
 * Supprime définitivement un document (MJ only). Distinct de l'archivage :
 * l'archive garde une trace consultable, la suppression efface. Sert au document
 * créé par erreur — un brouillon parti trop tôt n'a pas à polluer l'historique.
 * `allow delete: if isDMOf` est déployé depuis le plan 27.
 */
export async function deleteHandout(
  campaignId: string,
  handoutId: string,
): Promise<void> {
  await trackPendingWrite(getDb(), deleteDoc(handoutRef(campaignId, handoutId)));
}
