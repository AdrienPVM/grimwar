/**
 * Service Firestore pour `campaigns/{cid}/encounters/{eid}` — couche d'écriture
 * et de lecture des rencontres de combat, côté MJ. JALON 24.1 (data layer only).
 *
 * Toutes les écritures de rencontre passent par ce module ; les lectures
 * temps-réel seront câblées dans les hooks consommateurs (24.2+). Aucun écran
 * ne l'importe encore.
 *
 * Pattern (aligné sur `sessions.ts` / `campaigns.ts`) :
 *   - Écriture single-doc = `setDoc` / `updateDoc`, wrappée par
 *     `trackPendingWrite` (OfflineBanner, JALON 1D.3).
 *   - Pas de validation Zod côté service : responsabilité des appelants UI typés
 *     strict (24.2+). Les rules Firestore + `tests/firestore-rules.test.ts`
 *     forment le 2ᵉ niveau de défense.
 *
 * Rules consommées (cf. `firestore.rules` — bloc `campaigns/{cid}/encounters`) :
 *   - read   : `isMemberOf(cid) || isDMOf(cid)` (élargi en 24.1 — un MJ pur n'a
 *              pas de doc `members/`, même gap que sessions 23.1 / events 22.3).
 *   - create/update/delete : `isDMOf(cid)`.
 *
 * Invariant « une seule rencontre active à la fois » (mirror du garde-fou
 * session, step équivalent) : appliqué côté client dans `startEncounter`.
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

import { rollDieCrypto } from '@/shared/lib/dice/roller';
import { getDb } from '@/shared/lib/firebase';
import { trackPendingWrite } from '@/shared/lib/track-pending-write';
import type {
  Encounter,
  EncounterParticipant,
  EncounterStatus,
} from '@/shared/types/encounter';

// ─────────────────────────────────────────────────────────────────────
// Erreurs typées
// ─────────────────────────────────────────────────────────────────────

export type EncounterErrorKind =
  | 'encounter-not-found'
  | 'another-encounter-active'
  | 'no-participants';

/**
 * Erreurs métier remontées par le service. Le `kind` permet à l'UI (24.2+) de
 * brancher des messages i18n explicites.
 */
export class EncounterServiceError extends Error {
  readonly kind: EncounterErrorKind;
  constructor(kind: EncounterErrorKind, message: string) {
    super(message);
    this.name = 'EncounterServiceError';
    this.kind = kind;
  }
}

// ─────────────────────────────────────────────────────────────────────
// Helpers internes
// ─────────────────────────────────────────────────────────────────────

function encounterRef(campaignId: string, encounterId: string) {
  return doc(getDb(), 'campaigns', campaignId, 'encounters', encounterId);
}

function encountersCol(campaignId: string) {
  return collection(getDb(), 'campaigns', campaignId, 'encounters');
}

// ─────────────────────────────────────────────────────────────────────
// createEncounter
// ─────────────────────────────────────────────────────────────────────

/**
 * Forme d'entrée d'un participant à la création. L'`instanceId` est posé par le
 * service (auto-id Firestore) si l'appelant ne le fournit pas — il doit être
 * unique DANS la rencontre (un même monstre instancié N fois → N instanceId).
 * `initiative` démarre à 0 (non lancée) ; `tempHp`/`conditions`/`position`/
 * `notes` ont des défauts neutres.
 */
export interface CreateParticipantInput {
  type: EncounterParticipant['type'];
  characterId?: string | null;
  monsterContentId?: string | null;
  instanceId?: string;
  name: string;
  maxHp: number;
  /** PV courants initiaux — défaut = `maxHp` (créature à pleine vie). */
  currentHp?: number;
}

export interface CreateEncounterInput {
  name: string;
  sessionId?: string | null;
  participants: CreateParticipantInput[];
}

function buildParticipant(
  input: CreateParticipantInput,
  fallbackInstanceId: string,
): EncounterParticipant {
  return {
    type: input.type,
    characterId: input.characterId ?? null,
    monsterContentId: input.monsterContentId ?? null,
    instanceId: input.instanceId ?? fallbackInstanceId,
    name: input.name,
    initiative: 0,
    currentHp: input.currentHp ?? input.maxHp,
    maxHp: input.maxHp,
    tempHp: 0,
    conditions: [],
    position: null,
    notes: '',
  };
}

/**
 * Crée une rencontre `status: 'planned'`, `round: 0`, `turnIndex: 0`. Les
 * participants joueurs sont passés par l'appelant (l'auto-inclusion des PJ de la
 * campagne est faite côté UI 24.2, qui connaît le roster). `mapId`/`fogState`
 * restent `null` (S3, plan 27-30).
 */
export async function createEncounter(
  campaignId: string,
  input: CreateEncounterInput,
): Promise<{ encounterId: string }> {
  const firestore = getDb();
  const ref = doc(encountersCol(campaignId));
  const encounterId = ref.id;

  const participants = input.participants.map((p, i) =>
    buildParticipant(p, `${encounterId}-p${i}`),
  );

  const payload: Encounter = {
    id: encounterId,
    name: input.name,
    sessionId: input.sessionId ?? null,
    status: 'planned',
    round: 0,
    turnIndex: 0,
    participants,
    mapId: null,
    fogState: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    startedAt: null,
    endedAt: null,
  };

  await trackPendingWrite(firestore, setDoc(ref, payload));
  return { encounterId };
}

// ─────────────────────────────────────────────────────────────────────
// Lectures — listEncounters / getEncounter / getActiveEncounter
// ─────────────────────────────────────────────────────────────────────

/**
 * Liste les rencontres d'une campagne, triées par date de création décroissante
 * (la plus récente en tête). Single-field `orderBy('createdAt')` ⇒ index
 * automatique. Propage permission-denied tel quel pour un non-membre.
 */
export async function listEncounters(campaignId: string): Promise<Encounter[]> {
  const snap = await getDocs(query(encountersCol(campaignId), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => d.data() as Encounter);
}

/**
 * Lit une rencontre précise. Lève `EncounterServiceError('encounter-not-found')`
 * si le doc n'existe pas.
 */
export async function getEncounter(
  campaignId: string,
  encounterId: string,
): Promise<Encounter> {
  const snap = await getDoc(encounterRef(campaignId, encounterId));
  if (!snap.exists()) {
    throw new EncounterServiceError(
      'encounter-not-found',
      `Encounter ${encounterId} not found in campaign ${campaignId}`,
    );
  }
  return snap.data() as Encounter;
}

/**
 * Renvoie la rencontre actuellement active (`status == 'active'`), ou `null`.
 * Invariant « une seule active à la fois » → 0 ou 1 résultat ; `limit(1)` borne
 * le coût. Single-field `where('status','==')` ⇒ index automatique.
 */
export async function getActiveEncounter(campaignId: string): Promise<Encounter | null> {
  const snap = await getDocs(
    query(encountersCol(campaignId), where('status', '==', 'active'), limit(1)),
  );
  return snap.empty ? null : (snap.docs[0]!.data() as Encounter);
}

// ─────────────────────────────────────────────────────────────────────
// Initiative
// ─────────────────────────────────────────────────────────────────────

/**
 * Résultat d'un jet d'initiative pour un participant (step 4). Pur, sans I/O —
 * testable en isolation. Le d20 vient du même CSPRNG que le moteur de dés
 * (`rollDieCrypto`), pour cohérence avec les jets de jeu.
 */
export interface InitiativeRoll {
  instanceId: string;
  /** Face brute du d20 (1-20). */
  d20: number;
  /** Modificateur d'initiative (mod de DEX du participant). */
  modifier: number;
  /** Total = d20 + modifier (valeur posée dans `participant.initiative`). */
  total: number;
}

/**
 * Lance l'initiative d'un participant : 1d20 + modificateur. Helper pur (le
 * tirage est le seul effet « aléatoire »), pour que le tri et la pose Firestore
 * soient testables séparément.
 */
export function rollInitiativeFor(instanceId: string, modifier: number): InitiativeRoll {
  const d20 = rollDieCrypto(20);
  return { instanceId, d20, modifier, total: d20 + modifier };
}

/**
 * Applique une volée de jets d'initiative à la liste de participants et la
 * re-trie par initiative décroissante (départage : on conserve l'ordre stable
 * d'entrée pour les égalités — un départage par mod de DEX viendra avec l'UI si
 * besoin). Pur : ne touche pas Firestore. Les `instanceId` absents de `rolls`
 * conservent leur initiative courante.
 */
export function applyInitiative(
  participants: readonly EncounterParticipant[],
  rolls: readonly InitiativeRoll[],
): EncounterParticipant[] {
  const byId = new Map(rolls.map((r) => [r.instanceId, r.total]));
  return participants
    .map((p) => (byId.has(p.instanceId) ? { ...p, initiative: byId.get(p.instanceId)! } : p))
    .sort((a, b) => b.initiative - a.initiative);
}

/**
 * Pose une liste de participants ré-ordonnée/initiée sur le doc (après
 * `applyInitiative`). Séparé du calcul pour rester testable. N'altère pas le
 * statut — la rencontre reste `planned` tant que `startEncounter` n'a pas tourné.
 */
export async function setParticipants(
  campaignId: string,
  encounterId: string,
  participants: EncounterParticipant[],
): Promise<void> {
  const firestore = getDb();
  await trackPendingWrite(
    firestore,
    updateDoc(encounterRef(campaignId, encounterId), {
      participants,
      updatedAt: serverTimestamp(),
    }),
  );
}

// ─────────────────────────────────────────────────────────────────────
// Transitions d'état — start / advanceTurn / end
// ─────────────────────────────────────────────────────────────────────

/**
 * Démarre une rencontre (`planned` → `active`, `round: 1`, `turnIndex: 0`,
 * step 5). Garde-fou : refuse si une AUTRE rencontre est déjà active
 * (`another-encounter-active`). Re-démarrer la rencontre déjà active est
 * idempotent. Refuse une rencontre sans participant (`no-participants`).
 * Client-enforced — les rules ne peuvent pas asserter à bas coût l'unicité
 * cross-doc ; acceptable single-DM V1 (même choix que `startSession`).
 *
 * NB : l'event `encounter-start` (visibilité table) + le pointeur
 * `activeEncounterId` relèvent du wiring UI (24.x) — pas du data layer.
 */
export async function startEncounter(
  campaignId: string,
  encounterId: string,
): Promise<void> {
  const current = await getEncounter(campaignId, encounterId);
  if (current.participants.length === 0) {
    throw new EncounterServiceError(
      'no-participants',
      `Encounter ${encounterId} has no participants`,
    );
  }
  const active = await getActiveEncounter(campaignId);
  if (active && active.id !== encounterId) {
    throw new EncounterServiceError(
      'another-encounter-active',
      `Campaign ${campaignId} already has an active encounter (${active.id})`,
    );
  }

  const firestore = getDb();
  await trackPendingWrite(
    firestore,
    updateDoc(encounterRef(campaignId, encounterId), {
      status: 'active' satisfies EncounterStatus,
      round: 1,
      turnIndex: 0,
      startedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
}

/**
 * Calcule le tour suivant (pur, testable) : avance `turnIndex` ; au dépassement
 * du dernier participant, wrap à 0 et incrémente `round` (step 6). `count` = nb
 * de participants (doit être > 0).
 */
export function nextTurn(
  current: { round: number; turnIndex: number },
  count: number,
): { round: number; turnIndex: number } {
  const next = current.turnIndex + 1;
  if (next >= count) {
    return { round: current.round + 1, turnIndex: 0 };
  }
  return { round: current.round, turnIndex: next };
}

/**
 * Avance d'un tour (« Fin du tour », step 6). Lit l'état courant pour connaître
 * le nb de participants, calcule via `nextTurn`, pose le résultat. L'event
 * `turn-start` (du nouveau participant actif) est posé côté UI (24.x).
 */
export async function advanceTurn(
  campaignId: string,
  encounterId: string,
): Promise<{ round: number; turnIndex: number }> {
  const current = await getEncounter(campaignId, encounterId);
  const computed = nextTurn(
    { round: current.round, turnIndex: current.turnIndex },
    current.participants.length,
  );
  const firestore = getDb();
  await trackPendingWrite(
    firestore,
    updateDoc(encounterRef(campaignId, encounterId), {
      round: computed.round,
      turnIndex: computed.turnIndex,
      updatedAt: serverTimestamp(),
    }),
  );
  return computed;
}

/**
 * Clôt une rencontre (`active` → `completed`, step 9). L'`outcome`
 * (victory/defeat/fled) est journalisé dans l'event `encounter-end` côté UI —
 * il n'est PAS persisté sur le doc (le schéma documenté ne le porte pas, cf.
 * `encounter.ts`). La compilation du journal (plan 25) se branchera ici.
 */
export async function endEncounter(
  campaignId: string,
  encounterId: string,
): Promise<void> {
  const firestore = getDb();
  await trackPendingWrite(
    firestore,
    updateDoc(encounterRef(campaignId, encounterId), {
      status: 'completed' satisfies EncounterStatus,
      endedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
}

// ─────────────────────────────────────────────────────────────────────
// Contrôle des participants — PV / états (step 7)
// ─────────────────────────────────────────────────────────────────────

/**
 * Applique un delta de PV à UN participant (dégâts négatifs, soins positifs,
 * step 7). Clamp 0..maxHp. Pur : calcule la nouvelle liste sans I/O. Renvoie la
 * liste mise à jour ET la valeur avant/après du participant ciblé (pour le
 * payload `monster-hp-change`). `instanceId` introuvable ⇒ liste inchangée,
 * `before === after`.
 */
export function applyHpDelta(
  participants: readonly EncounterParticipant[],
  instanceId: string,
  delta: number,
): { participants: EncounterParticipant[]; before: number; after: number } {
  let before = 0;
  let after = 0;
  const updated = participants.map((p) => {
    if (p.instanceId !== instanceId) return p;
    before = p.currentHp;
    after = Math.max(0, Math.min(p.maxHp, p.currentHp + delta));
    return { ...p, currentHp: after };
  });
  return { participants: updated, before, after };
}

/**
 * Pose un état (condition) sur/retire d'un participant (step 7). Pur. `add`
 * idempotent (pas de doublon) ; `remove` no-op si absent.
 */
export function toggleCondition(
  participants: readonly EncounterParticipant[],
  instanceId: string,
  condition: string,
  action: 'add' | 'remove',
): EncounterParticipant[] {
  return participants.map((p) => {
    if (p.instanceId !== instanceId) return p;
    const has = p.conditions.includes(condition);
    if (action === 'add' && !has) return { ...p, conditions: [...p.conditions, condition] };
    if (action === 'remove' && has) {
      return { ...p, conditions: p.conditions.filter((c) => c !== condition) };
    }
    return p;
  });
}
