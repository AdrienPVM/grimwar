/**
 * Service Firestore pour `campaigns/{cid}/sessions/{sid}` — couche d'écriture et
 * de lecture des sessions de jeu, côté MJ. JALON 23.1 (data layer only).
 *
 * Toutes les écritures de session passent par ce module ; les lectures
 * temps-réel seront câblées dans les hooks consommateurs (23.2+). Aucun écran
 * ne l'importe encore.
 *
 * Pattern (aligné sur `campaigns.ts`) :
 *   - Écriture single-doc = `setDoc` / `updateDoc` direct, wrappée par
 *     `trackPendingWrite` (bannière OfflineBanner, JALON 1D.3).
 *   - Pas de validation Zod côté service : responsabilité des appelants UI typés
 *     strict (23.2+). Les rules Firestore + `tests/firestore-rules.test.ts`
 *     forment le 2ᵉ niveau de défense.
 *
 * Rules consommées (cf. `firestore.rules` — bloc `campaigns/{cid}/sessions`) :
 *   - read   : `isMemberOf(cid) || isDMOf(cid)` (élargi en 23.1 — un MJ pur n'a
 *              pas de doc `members/`, cf. précédent events 22.3).
 *   - create/update/delete : `isDMOf(cid)`.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { getDb } from '@/shared/lib/firebase';
import { trackPendingWrite } from '@/shared/lib/track-pending-write';
import { EventSchema, type GameEvent } from '@/shared/types/event';
import type { Session } from '@/shared/types/session';

// ─────────────────────────────────────────────────────────────────────
// Erreurs typées
// ─────────────────────────────────────────────────────────────────────

/**
 * Erreurs métier remontées par le service. Le `kind` permet à l'UI (23.2+) de
 * brancher des messages i18n explicites.
 */
export class SessionServiceError extends Error {
  readonly kind: 'session-not-found' | 'another-session-active';
  constructor(kind: 'session-not-found' | 'another-session-active', message: string) {
    super(message);
    this.name = 'SessionServiceError';
    this.kind = kind;
  }
}

// ─────────────────────────────────────────────────────────────────────
// Helpers internes
// ─────────────────────────────────────────────────────────────────────

function sessionRef(campaignId: string, sessionId: string) {
  return doc(getDb(), 'campaigns', campaignId, 'sessions', sessionId);
}

function sessionsCol(campaignId: string) {
  return collection(getDb(), 'campaigns', campaignId, 'sessions');
}

function eventsCol(campaignId: string) {
  return collection(getDb(), 'campaigns', campaignId, 'events');
}

// ─────────────────────────────────────────────────────────────────────
// createSession
// ─────────────────────────────────────────────────────────────────────

export interface CreateSessionInput {
  title: string;
  /** Date prévue. Omis ou `null` ⇒ session non datée (planifiée sans date). */
  plannedDate?: Date | null;
}

export interface CreateSessionResult {
  sessionId: string;
  number: number;
}

/**
 * Crée une session `status: 'planned'`. Auto-numérotation : lit le numéro le
 * plus élevé existant et +1 (step 3 du plan 23).
 *
 * Caveat concurrence : la numérotation read-then-write n'est PAS atomique — deux
 * MJ créant simultanément pourraient produire deux sessions au même `number`.
 * L'`id` du doc reste unique (auto-id Firestore), donc la collision est
 * purement cosmétique (deux « Séance 3 »). Acceptable pour le single-DM V1 ;
 * un compteur transactionnel serait le durcissement si le co-MJ l'exige.
 *
 * Single-field `orderBy('number')` ⇒ index automatique Firestore, aucun index
 * composite requis.
 */
export async function createSession(
  campaignId: string,
  input: CreateSessionInput,
): Promise<CreateSessionResult> {
  const firestore = getDb();

  const maxSnap = await getDocs(
    query(sessionsCol(campaignId), orderBy('number', 'desc'), limit(1)),
  );
  const highest = maxSnap.empty
    ? 0
    : ((maxSnap.docs[0]!.data() as Session).number ?? 0);
  const nextNumber = highest + 1;

  const ref = doc(sessionsCol(campaignId));
  const sessionId = ref.id;

  const payload: Session = {
    id: sessionId,
    number: nextNumber,
    title: input.title,
    plannedDate: input.plannedDate ?? null,
    startedAt: null,
    endedAt: null,
    status: 'planned',
    attendance: [],
    notes: '',
    journalCompiled: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await trackPendingWrite(firestore, setDoc(ref, payload));
  return { sessionId, number: nextNumber };
}

// ─────────────────────────────────────────────────────────────────────
// Lectures — listSessions / getSession / getActiveSession
// ─────────────────────────────────────────────────────────────────────

/**
 * Liste toutes les sessions d'une campagne, triées par numéro décroissant (la
 * plus récente en tête). Rule de read : MJ ou membre — propage permission-denied
 * tel quel pour un non-membre.
 */
export async function listSessions(campaignId: string): Promise<Session[]> {
  const snap = await getDocs(query(sessionsCol(campaignId), orderBy('number', 'desc')));
  return snap.docs.map((d) => d.data() as Session);
}

/**
 * Lit une session précise. Lève `SessionServiceError('session-not-found')` si le
 * doc n'existe pas.
 */
export async function getSession(
  campaignId: string,
  sessionId: string,
): Promise<Session> {
  const snap = await getDoc(sessionRef(campaignId, sessionId));
  if (!snap.exists()) {
    throw new SessionServiceError(
      'session-not-found',
      `Session ${sessionId} not found in campaign ${campaignId}`,
    );
  }
  return snap.data() as Session;
}

/**
 * Renvoie la session actuellement active (`status == 'active'`) de la campagne,
 * ou `null`. Invariant « une seule session active à la fois » (step 10) — la
 * lecture suppose donc 0 ou 1 résultat ; `limit(1)` borne le coût. Single-field
 * `where('status','==')` ⇒ index automatique.
 */
export async function getActiveSession(campaignId: string): Promise<Session | null> {
  const snap = await getDocs(
    query(sessionsCol(campaignId), where('status', '==', 'active'), limit(1)),
  );
  return snap.empty ? null : (snap.docs[0]!.data() as Session);
}

// ─────────────────────────────────────────────────────────────────────
// Lecture des événements d'une séance (pour le compilateur de journal, plan 25)
// ─────────────────────────────────────────────────────────────────────

/**
 * Lit, ordonnés `createdAt ASC`, tous les événements d'une séance que le
 * compilateur de journal (plan 25) doit voir : visibilité `all` + `dm`.
 *
 * Query CONTRAINTE par visibilité (`where visibility in ['all','dm']`) — comme
 * le feed MJ (22.3) : la rule de read `events` filtre par doc, donc une query
 * non contrainte qui pourrait toucher un event `self` d'autrui serait rejetée
 * (failed-precondition). Le journal est la narration MJ : les events `self`
 * (privés à un joueur) en sont volontairement exclus.
 *
 * Index composite `(sessionId ASC, visibility ASC, createdAt ASC)` requis
 * (`firestore.indexes.json`). Réservé au MJ (la rule `visibility == 'dm'` exige
 * `isDMOf`) — un membre non-MJ recevrait permission-denied sur le `in ['all','dm']`.
 *
 * Les events Firestore invalides (parse Zod KO) sont ignorés avec un warn, comme
 * dans `useCampaignEvents` — un doc legacy ne casse pas la compilation.
 */
export async function listSessionEvents(
  campaignId: string,
  sessionId: string,
): Promise<GameEvent[]> {
  const snap = await getDocs(
    query(
      eventsCol(campaignId),
      where('sessionId', '==', sessionId),
      where('visibility', 'in', ['all', 'dm']),
      orderBy('createdAt', 'asc'),
    ),
  );
  const events: GameEvent[] = [];
  for (const d of snap.docs) {
    const result = EventSchema.safeParse({ ...d.data(), id: d.id });
    if (result.success) {
      events.push(result.data);
    } else {
      console.warn(
        `[journal] event Firestore invalide ignoré (${d.id}): ${result.error.errors[0]?.message ?? 'parse error'}`,
      );
    }
  }
  return events;
}

// ─────────────────────────────────────────────────────────────────────
// Transitions d'état — start / end
// ─────────────────────────────────────────────────────────────────────

/**
 * Démarre une session (`planned` → `active`). Garde-fou step 10 : refuse si une
 * AUTRE session est déjà active dans la campagne (`another-session-active`).
 * Re-démarrer la session déjà active est idempotent (no throw). Le garde-fou est
 * client-enforced — Firestore rules ne peuvent pas asserter à bas coût l'unicité
 * cross-doc ; acceptable pour le single-DM V1.
 *
 * NB : l'event `session-start` (visibilité table) et le câblage du pointeur
 * `activeSessionId` (Zustand) relèvent du wiring UI (23.4) — pas du data layer.
 */
export async function startSession(
  campaignId: string,
  sessionId: string,
): Promise<void> {
  const active = await getActiveSession(campaignId);
  if (active && active.id !== sessionId) {
    throw new SessionServiceError(
      'another-session-active',
      `Campaign ${campaignId} already has an active session (${active.id})`,
    );
  }
  const firestore = getDb();
  await trackPendingWrite(
    firestore,
    updateDoc(sessionRef(campaignId, sessionId), {
      status: 'active',
      startedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
}

/**
 * Clôt une session (`active` → `completed`). La compilation du journal (plan 25)
 * sera déclenchée ici quand le compilateur existera — `journalCompiled` reste
 * `null` jusque-là.
 */
export async function endSession(
  campaignId: string,
  sessionId: string,
): Promise<void> {
  const firestore = getDb();
  await trackPendingWrite(
    firestore,
    updateDoc(sessionRef(campaignId, sessionId), {
      status: 'completed',
      endedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
}

// ─────────────────────────────────────────────────────────────────────
// Patchs de contenu — notes / présence
// ─────────────────────────────────────────────────────────────────────

/**
 * Met à jour les notes Markdown du MJ. Appelé par l'auto-save de l'onglet Notes
 * (23.3) toutes les 5 s.
 */
export async function updateSessionNotes(
  campaignId: string,
  sessionId: string,
  notes: string,
): Promise<void> {
  const firestore = getDb();
  await trackPendingWrite(
    firestore,
    updateDoc(sessionRef(campaignId, sessionId), {
      notes,
      updatedAt: serverTimestamp(),
    }),
  );
}

/**
 * Persiste le journal compilé (plan 25.2) dans `sessions/{sid}.journalCompiled`.
 * Appelé après `compileJournal` (à la clôture de séance ou via « Re-compiler »).
 * Les événements restent la source de vérité — `journalCompiled` est un snapshot
 * narratif (éventuellement édité à la main en 25.3). Rule `update : isDMOf`.
 */
export async function updateSessionJournal(
  campaignId: string,
  sessionId: string,
  journalCompiled: string,
): Promise<void> {
  const firestore = getDb();
  await trackPendingWrite(
    firestore,
    updateDoc(sessionRef(campaignId, sessionId), {
      journalCompiled,
      updatedAt: serverTimestamp(),
    }),
  );
}

// ─────────────────────────────────────────────────────────────────────
// M13 — une séance se renomme, s'annule et se rouvre
// ─────────────────────────────────────────────────────────────────────

export interface UpdateSessionMetaPatch {
  title?: string;
  plannedDate?: Date | null;
  /**
   * Numéro de séance. Auto-attribué (max + 1) à la création, mais surchargeable :
   * une campagne reprise d'une autre table démarre « à la séance 42 », et la
   * numérotation read-then-write peut produire deux « Séance 3 » si deux meneurs
   * créent en même temps.
   */
  number?: number;
}

/**
 * Corrige les métadonnées d'une séance (M13). Le service ne patchait que notes,
 * présence et journal : un titre mal tapé était définitif.
 */
export async function updateSessionMeta(
  campaignId: string,
  sessionId: string,
  patch: UpdateSessionMetaPatch,
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.title !== undefined) payload.title = patch.title;
  if (patch.plannedDate !== undefined) payload.plannedDate = patch.plannedDate;
  if (patch.number !== undefined) payload.number = patch.number;
  if (Object.keys(payload).length === 0) return;
  payload.updatedAt = serverTimestamp();
  await trackPendingWrite(
    getDb(),
    updateDoc(sessionRef(campaignId, sessionId), payload),
  );
}

/**
 * Annule une séance (`cancelled`). Le statut est dans l'enum depuis l'origine et
 * la liste lui associe DÉJÀ une pastille rouge — aucun code ne l'écrivait. Une
 * séance qui ne s'est pas tenue n'est ni « planifiée » (elle n'arrivera pas) ni
 * « terminée » (elle n'a pas eu lieu) : la clôturer en `completed` mentirait au
 * journal de campagne, qui compile les séances terminées.
 *
 * `endedAt` reste `null` : rien ne s'est terminé.
 */
export async function cancelSession(
  campaignId: string,
  sessionId: string,
): Promise<void> {
  await trackPendingWrite(
    getDb(),
    updateDoc(sessionRef(campaignId, sessionId), {
      status: 'cancelled',
      updatedAt: serverTimestamp(),
    }),
  );
}

/**
 * Rouvre une séance close par erreur (M13). La cible dépend de l'état terminal
 * d'où l'on revient — on restaure ce qui précédait, pas un état arbitraire :
 *   - `completed` → `active` (la partie continue, `endedAt` effacé) ;
 *   - `cancelled` → `planned` (elle n'avait jamais commencé).
 *
 * Le garde-fou « une seule séance active » de `startSession` s'applique aussi
 * ici : rouvrir une séance terminée pendant qu'une autre tourne produirait DEUX
 * séances actives, et `getActiveSession` (qui suppose 0 ou 1 résultat) en
 * désignerait une au hasard. Refus explicite en `another-session-active`.
 */
export async function reopenSession(
  campaignId: string,
  sessionId: string,
): Promise<void> {
  const session = await getSession(campaignId, sessionId);
  if (session.status === 'planned' || session.status === 'active') return; // déjà ouverte

  if (session.status === 'cancelled') {
    await trackPendingWrite(
      getDb(),
      updateDoc(sessionRef(campaignId, sessionId), {
        status: 'planned',
        updatedAt: serverTimestamp(),
      }),
    );
    return;
  }

  const active = await getActiveSession(campaignId);
  if (active && active.id !== sessionId) {
    throw new SessionServiceError(
      'another-session-active',
      `Campaign ${campaignId} already has an active session (${active.id})`,
    );
  }
  await trackPendingWrite(
    getDb(),
    updateDoc(sessionRef(campaignId, sessionId), {
      status: 'active',
      endedAt: null,
      updatedAt: serverTimestamp(),
    }),
  );
}

/**
 * Remplace la liste de présence (UIDs des membres présents). L'onglet Présence
 * (23.3) coche/décoche puis pousse la liste complète.
 */
export async function setSessionAttendance(
  campaignId: string,
  sessionId: string,
  attendance: string[],
): Promise<void> {
  const firestore = getDb();
  await trackPendingWrite(
    firestore,
    updateDoc(sessionRef(campaignId, sessionId), {
      attendance,
      updatedAt: serverTimestamp(),
    }),
  );
}
