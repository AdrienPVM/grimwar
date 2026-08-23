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
  deleteDoc,
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

/**
 * Applique une volée de jets d'initiative en RELISANT l'état serveur d'abord
 * (DEBT D31 volet 1). `setParticipants` réécrit le tableau ENTIER : composé
 * depuis la closure React (dernier snapshot `onSnapshot`), il ré-écrasait les PV
 * et les états appliqués entre-temps — le MJ blesse un monstre puis relance
 * l'initiative avant le retour du snapshot, et les dégâts sont annulés.
 *
 * On lit donc frais juste avant d'écrire, comme `applyParticipantHpDelta` et
 * `setParticipantCondition`. `applyInitiative` mappe par `instanceId` et
 * conserve les participants absents de `rolls` : un participant ajouté côté
 * serveur entre-temps survit avec son initiative courante au lieu d'être perdu.
 * Read-then-write non transactionnel, cohérent avec le reste du service
 * (séquencé par `actionPending` côté UI, suffisant en V1 single-MJ).
 */
export async function applyInitiativeRolls(
  campaignId: string,
  encounterId: string,
  rolls: readonly InitiativeRoll[],
): Promise<EncounterParticipant[]> {
  const current = await getEncounter(campaignId, encounterId);
  const participants = applyInitiative(current.participants, rolls);
  await setParticipants(campaignId, encounterId, participants);
  return participants;
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
 * Recule d'un tour (pur, testable) — symétrique exact de `nextTurn` (M7).
 *
 * Au premier combattant de l'ordre, on remonte à la FIN du round précédent
 * (`round - 1`, dernier index). Au tout début du combat (round 1, index 0), il
 * n'y a rien avant : l'état est renvoyé tel quel plutôt que de fabriquer un
 * round 0, que le schéma réserve à une rencontre pas encore démarrée.
 */
export function previousTurn(
  current: { round: number; turnIndex: number },
  count: number,
): { round: number; turnIndex: number } {
  if (current.turnIndex > 0) {
    return { round: current.round, turnIndex: current.turnIndex - 1 };
  }
  if (current.round <= 1 || count <= 0) return { ...current };
  return { round: current.round - 1, turnIndex: count - 1 };
}

/**
 * Revient d'un tour (M7) — « on a oublié la réaction du gobelin ». Aucun event
 * `turn-start` n'est réémis côté UI : revenir en arrière corrige la feuille de
 * suivi, ça ne fait pas rejouer le tour dans le récit.
 */
export async function rewindTurn(
  campaignId: string,
  encounterId: string,
): Promise<{ round: number; turnIndex: number }> {
  const current = await getEncounter(campaignId, encounterId);
  const computed = previousTurn(
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
 * Clôt une rencontre (`active` → `completed` ou `aborted`, step 9). L'`outcome`
 * (victory/defeat/fled) est journalisé dans l'event `encounter-end` côté UI —
 * il n'est PAS persisté sur le doc (le schéma documenté ne le porte pas, cf.
 * `encounter.ts`). La compilation du journal (plan 25) se branchera ici.
 *
 * M7 : `'aborted'` était déclaré à l'enum, traduit et doté de sa pastille
 * rouge, mais AUCUN code ne l'écrivait — `'completed'` était en dur. Un combat
 * que la table abandonne en cours de route n'est pourtant pas un combat
 * terminé, et le distinguer coûtait un paramètre.
 */
export async function endEncounter(
  campaignId: string,
  encounterId: string,
  status: Extract<EncounterStatus, 'completed' | 'aborted'> = 'completed',
): Promise<void> {
  const firestore = getDb();
  await trackPendingWrite(
    firestore,
    updateDoc(encounterRef(campaignId, encounterId), {
      status,
      endedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
}

/**
 * Rouvre une rencontre close par erreur (M7) — retour en `active`, `endedAt`
 * effacé. Même garde-fou que `startEncounter` : refuse si une AUTRE rencontre
 * est déjà active, sinon deux combats se disputeraient le pointeur de campagne.
 *
 * `round`/`turnIndex` sont conservés (on reprend là où on s'était arrêté) ;
 * `round: 0` — état d'une rencontre jamais démarrée — est remonté à 1.
 *
 * L'event `encounter-end` déjà journalisé n'est PAS retiré ici : les événements
 * sont immuables côté rules. Le MJ dispose du geste « Retirer du journal » (M9)
 * pour effacer une fin qui n'a pas eu lieu.
 */
export async function reopenEncounter(
  campaignId: string,
  encounterId: string,
): Promise<void> {
  const current = await getEncounter(campaignId, encounterId);
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
      round: current.round > 0 ? current.round : 1,
      endedAt: null,
      updatedAt: serverTimestamp(),
    }),
  );
}

/**
 * Renomme une rencontre (M7) — « Embuscade » saisi à la hâte devient « Le
 * guet-apens du col ». Nom vide ignoré (le schéma exige `min(1)`).
 */
export async function renameEncounter(
  campaignId: string,
  encounterId: string,
  name: string,
): Promise<void> {
  const trimmed = name.trim().slice(0, ENCOUNTER_NAME_MAX);
  if (trimmed.length === 0) return;
  const firestore = getDb();
  await trackPendingWrite(
    firestore,
    updateDoc(encounterRef(campaignId, encounterId), {
      name: trimmed,
      updatedAt: serverTimestamp(),
    }),
  );
}

/** Limite du champ `name` au schéma (`EncounterSchema`). */
export const ENCOUNTER_NAME_MAX = 120;

/**
 * Supprime une rencontre (M7). `allow delete: if isDMOf` est déployée depuis
 * l'origine (`firestore.rules:338`) et n'avait aucun appelant : une rencontre
 * créée par erreur encombrait la liste pour toujours.
 *
 * Les événements déjà journalisés survivent (ils appartiennent au récit de la
 * campagne, pas au doc de rencontre) — le MJ les retire un à un via M9 s'il le
 * souhaite.
 */
export async function deleteEncounter(
  campaignId: string,
  encounterId: string,
): Promise<void> {
  const firestore = getDb();
  await trackPendingWrite(firestore, deleteDoc(encounterRef(campaignId, encounterId)));
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
 *
 * PV temporaires (SRD, DEBT D31 volet 2) : les dégâts entament d'ABORD `tempHp`,
 * et seul le reliquat descend sur `currentHp` ; les soins ne restaurent JAMAIS
 * de PV temporaires. `before`/`after` restent les PV RÉELS (contrat inchangé du
 * payload `monster-hp-change`) — l'évolution des PV temporaires est exposée à
 * part via `tempBefore`/`tempAfter`, additifs. `tempHp` absent (docs legacy
 * antérieurs au champ) ⇒ traité comme 0.
 */
export function applyHpDelta(
  participants: readonly EncounterParticipant[],
  instanceId: string,
  delta: number,
): {
  participants: EncounterParticipant[];
  before: number;
  after: number;
  tempBefore: number;
  tempAfter: number;
} {
  let before = 0;
  let after = 0;
  let tempBefore = 0;
  let tempAfter = 0;
  const updated = participants.map((p) => {
    if (p.instanceId !== instanceId) return p;
    before = p.currentHp;
    tempBefore = p.tempHp ?? 0;

    if (delta < 0) {
      // Dégâts : le bouclier de PV temporaires absorbe en premier.
      const damage = -delta;
      const absorbed = Math.min(tempBefore, damage);
      tempAfter = tempBefore - absorbed;
      after = Math.max(0, p.currentHp - (damage - absorbed));
    } else {
      // Soins : PV réels uniquement, plafonnés à maxHp.
      tempAfter = tempBefore;
      after = Math.min(p.maxHp, p.currentHp + delta);
    }

    return { ...p, currentHp: after, tempHp: tempAfter };
  });
  return { participants: updated, before, after, tempBefore, tempAfter };
}

/**
 * Accorde des PV temporaires à un participant. Pur.
 *
 * Règle SRD : les PV temporaires NE S'ADDITIONNENT PAS — on garde le plus
 * avantageux des deux (`max(actuel, accordé)`). Un montant ≤ 0 est ignoré :
 * retirer des PV temporaires se fait en encaissant des dégâts, pas en accordant
 * un négatif.
 *
 * `tempHp` était jusqu'ici CONSOMMÉ correctement par `applyHpDelta` mais aucun
 * geste ne pouvait l'augmenter (M6 de l'audit de malléabilité).
 */
export function grantTempHp(
  participants: readonly EncounterParticipant[],
  instanceId: string,
  amount: number,
): { participants: EncounterParticipant[]; before: number; after: number } {
  let before = 0;
  let after = 0;
  const updated = participants.map((p) => {
    if (p.instanceId !== instanceId) return p;
    before = p.tempHp ?? 0;
    after = amount > 0 ? Math.max(before, Math.floor(amount)) : before;
    return { ...p, tempHp: after };
  });
  return { participants: updated, before, after };
}

/**
 * Écrit la note libre d'un participant (« celui-ci porte la clé »). Pur.
 * Tronquée à la limite du schéma pour qu'une saisie trop longue ne fasse pas
 * échouer l'écriture Firestore côté Zod.
 */
export function setParticipantNoteIn(
  participants: readonly EncounterParticipant[],
  instanceId: string,
  note: string,
): EncounterParticipant[] {
  return participants.map((p) =>
    p.instanceId === instanceId ? { ...p, notes: note.slice(0, PARTICIPANT_NOTE_MAX) } : p,
  );
}

/** Limite du champ `notes` au schéma (`encounterParticipantSchema`). */
export const PARTICIPANT_NOTE_MAX = 2000;

// ─────────────────────────────────────────────────────────────────────
// Édition d'un participant — nom / PV / initiative (M2, M3)
// ─────────────────────────────────────────────────────────────────────

/** Bornes du schéma `encounterParticipantSchema` reprises côté service. */
export const PARTICIPANT_NAME_MAX = 120;

/**
 * Correctif applicable à un participant déjà en lice. Tout champ absent est
 * laissé tel quel — c'est un patch, pas un remplacement.
 *
 * Le mur d'origine (M2 de l'audit de malléabilité) : une fois la rencontre
 * créée, plus AUCUNE UI ne touchait la liste. Sept PV tapés au lieu de
 * dix-sept, « Gobelin 2 » qui devient le chef de bande, une initiative annoncée
 * à voix haute (M3) : tout cela obligeait à refaire la rencontre.
 */
export interface ParticipantPatch {
  name?: string;
  initiative?: number;
  currentHp?: number;
  maxHp?: number;
}

/** Entier sûr : `NaN`/`Infinity` ⇒ repli, sinon troncature vers zéro. */
function toInt(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.trunc(value) : fallback;
}

/**
 * Applique un patch à UN participant. Pur.
 *
 * Les bornes sont celles du schéma, appliquées ici pour qu'une saisie
 * aberrante soit corrigée plutôt que rejetée par Zod à l'écriture : nom non
 * vide tronqué à 120, `maxHp` ≥ 1, `currentHp` reclampé sur le NOUVEAU maximum
 * (baisser le max d'un monstre déjà blessé ne doit pas le laisser au-dessus de
 * son plafond). `instanceId` introuvable ⇒ liste inchangée.
 */
export function patchParticipantIn(
  participants: readonly EncounterParticipant[],
  instanceId: string,
  patch: ParticipantPatch,
): EncounterParticipant[] {
  return participants.map((p) => {
    if (p.instanceId !== instanceId) return p;

    const trimmed = patch.name?.trim();
    const name =
      trimmed !== undefined && trimmed.length > 0 ? trimmed.slice(0, PARTICIPANT_NAME_MAX) : p.name;

    const maxHp =
      patch.maxHp !== undefined ? Math.max(1, toInt(patch.maxHp, p.maxHp)) : p.maxHp;
    const rawCurrent =
      patch.currentHp !== undefined ? toInt(patch.currentHp, p.currentHp) : p.currentHp;
    const currentHp = Math.max(0, Math.min(maxHp, rawCurrent));

    const initiative =
      patch.initiative !== undefined ? toInt(patch.initiative, p.initiative) : p.initiative;

    return { ...p, name, maxHp, currentHp, initiative };
  });
}

/**
 * Re-trie par initiative décroissante SANS perdre le combattant dont c'est le
 * tour. Pur.
 *
 * `applyInitiative` trie déjà, mais il tourne en préparation (`turnIndex` à 0,
 * sans conséquence). Ici le tri peut survenir en plein combat — corriger une
 * initiative mal notée au round 3 — et un `turnIndex` positionnel deviendrait
 * silencieusement faux : le pointeur désignerait un autre combattant. On suit
 * donc l'`instanceId` actif à travers le tri.
 *
 * Départage des ex æquo : `Array.prototype.sort` est stable (ES2019), l'ordre
 * d'entrée est donc conservé à initiative égale. C'est ce qui fait de l'édition
 * d'initiative un outil d'arbitrage : le MJ départage en saisissant une valeur.
 */
export function sortByInitiative(
  participants: readonly EncounterParticipant[],
  turnIndex: number,
): { participants: EncounterParticipant[]; turnIndex: number } {
  const activeId = participants[turnIndex]?.instanceId ?? null;
  const sorted = [...participants].sort((a, b) => b.initiative - a.initiative);
  const nextIndex = activeId === null ? turnIndex : sorted.findIndex((p) => p.instanceId === activeId);
  return { participants: sorted, turnIndex: nextIndex >= 0 ? nextIndex : 0 };
}

/**
 * Retire un participant et réaligne le pointeur de tour. Pur.
 *
 * Trois cas, et ils comptent en plein combat :
 *   - retrait AVANT le tour actif → l'index recule d'un cran (sinon le tour
 *     saute au combattant suivant sans qu'on ait rien fait) ;
 *   - retrait DU combattant actif → l'index ne bouge pas : celui qui le suivait
 *     prend le tour, ce qui est le comportement attendu quand un monstre meurt
 *     et qu'on le sort de la liste ;
 *   - retrait APRÈS → rien à faire.
 * L'index final est clampé dans la nouvelle liste (retirer le dernier alors
 * qu'il jouait ramène au premier).
 */
export function removeParticipantIn(
  participants: readonly EncounterParticipant[],
  instanceId: string,
  turnIndex: number,
): { participants: EncounterParticipant[]; turnIndex: number } {
  const removedIndex = participants.findIndex((p) => p.instanceId === instanceId);
  if (removedIndex === -1) return { participants: [...participants], turnIndex };

  const next = participants.filter((p) => p.instanceId !== instanceId);
  if (next.length === 0) return { participants: next, turnIndex: 0 };

  const shifted = removedIndex < turnIndex ? turnIndex - 1 : turnIndex;
  return { participants: next, turnIndex: Math.max(0, Math.min(next.length - 1, shifted)) };
}

/**
 * Édite un participant en place et persiste (M2/M3). Read-then-write, comme
 * tout le reste du service : réécrire le tableau depuis la closure React
 * écraserait les PV appliqués entre-temps (DEBT D31 volet 1).
 *
 * Une initiative modifiée déclenche un re-tri (le MJ saisit une valeur POUR
 * qu'elle prenne sa place dans l'ordre), en préservant le tour actif.
 */
export async function updateParticipant(
  campaignId: string,
  encounterId: string,
  instanceId: string,
  patch: ParticipantPatch,
): Promise<void> {
  const current = await getEncounter(campaignId, encounterId);
  const patched = patchParticipantIn(current.participants, instanceId, patch);

  if (patch.initiative === undefined) {
    await setParticipants(campaignId, encounterId, patched);
    return;
  }

  const sorted = sortByInitiative(patched, current.turnIndex);
  const firestore = getDb();
  await trackPendingWrite(
    firestore,
    updateDoc(encounterRef(campaignId, encounterId), {
      participants: sorted.participants,
      turnIndex: sorted.turnIndex,
      updatedAt: serverTimestamp(),
    }),
  );
}

/**
 * Ajoute un combattant à une rencontre existante (M2) — le renfort qui arrive
 * au round 3. Ajouté EN FIN de liste avec une initiative à 0 : il ne s'insère
 * pas de lui-même dans l'ordre (ce serait déplacer le tour actif sous les pieds
 * du MJ), le MJ lui saisit ou relance son initiative ensuite.
 *
 * L'`instanceId` est un auto-id Firestore et non `p{index}` : après un retrait,
 * une numérotation positionnelle rejouerait un identifiant déjà porté par un
 * autre combattant, et les PV atterriraient sur la mauvaise créature.
 */
export async function addParticipant(
  campaignId: string,
  encounterId: string,
  input: CreateParticipantInput,
): Promise<{ instanceId: string }> {
  const current = await getEncounter(campaignId, encounterId);
  const participant = buildParticipant(input, doc(encountersCol(campaignId)).id);
  await setParticipants(campaignId, encounterId, [...current.participants, participant]);
  return { instanceId: participant.instanceId };
}

/**
 * Retire un combattant et persiste (M2) — le gobelin qui prend la fuite.
 * Réaligne `turnIndex` dans la même écriture : le laisser à sa valeur ferait
 * pointer le tour actif sur un autre combattant.
 */
export async function removeParticipant(
  campaignId: string,
  encounterId: string,
  instanceId: string,
): Promise<void> {
  const current = await getEncounter(campaignId, encounterId);
  const next = removeParticipantIn(current.participants, instanceId, current.turnIndex);
  const firestore = getDb();
  await trackPendingWrite(
    firestore,
    updateDoc(encounterRef(campaignId, encounterId), {
      participants: next.participants,
      turnIndex: next.turnIndex,
      updatedAt: serverTimestamp(),
    }),
  );
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

// ─────────────────────────────────────────────────────────────────────
// Contrôle MJ des PV / états — wrappers I/O (step 7, JALON 24.4)
// ─────────────────────────────────────────────────────────────────────

/**
 * Applique un delta de PV à un participant et persiste (dégâts négatifs, soins
 * positifs — step 7). Lit l'état courant (source de vérité serveur), compose le
 * calcul pur `applyHpDelta` (clamp 0..maxHp), pose le résultat, renvoie
 * before/after pour le payload `monster-hp-change` côté UI. Read-then-write
 * non transactionnel, aligné sur `advanceTurn` : les appels sont séquentialisés
 * par l'UI (`actionPending`), suffisant en V1 single-MJ. L'event
 * `monster-hp-change` (visibilité `dm`) reste posé par l'UI (24.x).
 */
export async function applyParticipantHpDelta(
  campaignId: string,
  encounterId: string,
  instanceId: string,
  delta: number,
): Promise<{ before: number; after: number }> {
  const current = await getEncounter(campaignId, encounterId);
  const { participants, before, after } = applyHpDelta(current.participants, instanceId, delta);
  await setParticipants(campaignId, encounterId, participants);
  return { before, after };
}

/**
 * Pose/retire un état sur un participant et persiste (step 7). Lit l'état
 * courant, compose le calcul pur `toggleCondition` (idempotent), pose le
 * résultat. Pas d'event journalisé : aucun kind `monster-condition-change`
 * n'existe (EVENT-LOG.md) — l'état vit sur le doc partagé en temps réel. Un
 * event dédié relèverait d'un changement de schéma d'événement (décision Adrien).
 */
export async function setParticipantCondition(
  campaignId: string,
  encounterId: string,
  instanceId: string,
  condition: string,
  action: 'add' | 'remove',
): Promise<void> {
  const current = await getEncounter(campaignId, encounterId);
  const participants = toggleCondition(current.participants, instanceId, condition, action);
  await setParticipants(campaignId, encounterId, participants);
}

/**
 * Accorde des PV temporaires et persiste (M6). Même motif read-then-write que
 * `setParticipantCondition`. Renvoie before/after pour le retour utilisateur.
 */
export async function grantParticipantTempHp(
  campaignId: string,
  encounterId: string,
  instanceId: string,
  amount: number,
): Promise<{ before: number; after: number }> {
  const current = await getEncounter(campaignId, encounterId);
  const { participants, before, after } = grantTempHp(current.participants, instanceId, amount);
  await setParticipants(campaignId, encounterId, participants);
  return { before, after };
}

/**
 * Écrit la note libre d'un participant et persiste (M6). Aucun event : la note
 * est un aide-mémoire de MJ sur le doc partagé, pas un fait de jeu.
 */
export async function setParticipantNote(
  campaignId: string,
  encounterId: string,
  instanceId: string,
  note: string,
): Promise<void> {
  const current = await getEncounter(campaignId, encounterId);
  const participants = setParticipantNoteIn(current.participants, instanceId, note);
  await setParticipants(campaignId, encounterId, participants);
}
