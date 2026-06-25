import { addDoc, collection, doc, increment, serverTimestamp, updateDoc } from 'firebase/firestore';

import { diffCharacterEvents } from '@/shared/lib/character-diff';
import type { RollKind, RollResult } from '@/shared/lib/dice/types';
import { getDb } from '@/shared/lib/firebase';
import { useActiveCampaignStore } from '@/shared/lib/slices/active-campaign-slice';
import { useAuthStore } from '@/shared/lib/slices/auth-slice';
import type { Character } from '@/shared/types/character';
import type { NewGameEvent } from '@/shared/types/event';

/**
 * Point d'entrée UNIQUE du journal d'événements (docs/EVENT-LOG.md).
 *
 * Aucun composant n'écrit jamais directement dans `campaigns/{id}/events` :
 * tout passe par une fonction `log*` d'ici. Garanties :
 *   - shape de payload cohérente,
 *   - `visibility` par défaut correcte (cf. table EVENT-LOG.md),
 *   - un seul endroit où brancher throttling/batching plus tard.
 *
 * Contexte synchrone (hors React) :
 *   - la campagne cible vient de `useActiveCampaignStore` (renseigné par
 *     l'écran de fiche depuis `character.homeCampaignId`) ;
 *   - l'`actorUserId` vient de `useAuthStore` (la rule `events` impose
 *     `actorUserId == request.auth.uid`).
 *
 * No-op silencieux si pas de campagne active (S1, fiche non liée) ou pas
 * d'utilisateur connecté — exactement le comportement attendu du « stub »
 * historique du plan 12, désormais réel.
 *
 * Le logging ne doit JAMAIS casser le gameplay : toute erreur d'écriture est
 * avalée et tracée (best-effort télémétrie, pas un chemin critique). Les events
 * ne sont volontairement PAS comptés dans `trackPendingWrite` — on ne couple
 * pas l'indicateur de synchro à de la journalisation d'arrière-plan.
 */
async function writeEvent(input: NewGameEvent): Promise<boolean> {
  const { activeCampaignId, activeSessionId, activeEncounterId } =
    useActiveCampaignStore.getState();
  if (!activeCampaignId) return false; // pas de campagne active → no-op
  const uid = useAuthStore.getState().user?.uid;
  if (!uid) return false; // pas d'utilisateur → écriture impossible (rule actorUserId)

  try {
    const db = getDb();
    await addDoc(collection(db, 'campaigns', activeCampaignId, 'events'), {
      kind: input.kind,
      actorUserId: uid,
      actorCharacterId: input.actorCharacterId,
      targetCharacterId: input.targetCharacterId ?? null,
      sessionId: input.sessionId ?? activeSessionId,
      encounterId: input.encounterId ?? activeEncounterId,
      payload: input.payload,
      visibility: input.visibility,
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.warn("[event-logger] échec d'écriture d'événement", err);
    return false;
  }
}

/**
 * Journalise un jet de dés. Visibilité `all` par défaut (table EVENT-LOG.md).
 * Le payload porte le mode (digital/physique), les faces brutes et conservées,
 * le total et les flags crit/fumble/avantage — le compilateur de journal
 * (plan 25) distingue les tables physiques pour la couleur narrative.
 */
export async function logRoll(result: RollResult): Promise<void> {
  const written = await writeEvent({
    kind: 'roll',
    actorCharacterId: result.characterId || null,
    visibility: 'all',
    payload: {
      label: result.label,
      rollKind: result.kind,
      mode: result.mode,
      rawFaces: result.rawFaces,
      keptFaces: result.keptFaces,
      modifier: result.modifier,
      total: result.total,
      crit: result.crit,
      fumble: result.fumble,
      advantage: result.advantage,
    },
  });
  // Compteurs lifetime dénormalisés (plan 22 steps 7/9) : seulement si l'event
  // a effectivement été écrit (campagne active + utilisateur). Best-effort.
  if (written) await bumpRollStats(result);
}

/**
 * Jets basés sur un d20 (plan 22.2) — ceux qui alimentent `stats.totalD20Sum`.
 * Les dégâts (`damage`) roulent des dés variés sans d20 : exclus de la somme,
 * mais comptés dans `totalRolls`. `crit`/`fumble` ne sont vrais que sur un nat
 * 20/1 (porté par le pivot d20), donc leur comptage est implicitement d20-only.
 */
const D20_STAT_KINDS = new Set<RollKind>([
  'attack',
  'check',
  'save',
  'init',
  'death-save',
  'cantrip-attack',
]);

/**
 * Incrémente les compteurs de stats du personnage acteur via `increment(1)`
 * (atomique, plan 22 step 9). Cible `users/{uid}/characters/{characterId}` —
 * le joueur écrit sur SA propre fiche (rule owner-only satisfaite). No-op si
 * pas de personnage. Best-effort : un échec n'interrompt jamais le jeu.
 */
async function bumpRollStats(result: RollResult): Promise<void> {
  const uid = useAuthStore.getState().user?.uid;
  if (!uid) return;
  const characterId = result.characterId;
  if (!characterId) return;

  const updates: Record<string, unknown> = { 'stats.totalRolls': increment(1) };
  if (result.crit) updates['stats.crits'] = increment(1);
  if (result.fumble) updates['stats.fumbles'] = increment(1);
  if (D20_STAT_KINDS.has(result.kind) && result.keptFaces.length > 0) {
    // Le d20 conservé (après kh/kl d'avantage) est la 1ʳᵉ face retenue.
    updates['stats.totalD20Sum'] = increment(result.keptFaces[0]!);
  }
  if (result.skillId) {
    updates[`stats.skillUses.${result.skillId}`] = increment(1);
  }

  try {
    const db = getDb();
    await updateDoc(doc(db, 'users', uid, 'characters', characterId), updates);
  } catch (err) {
    console.warn('[event-logger] échec de mise à jour des stats du personnage', err);
  }
}

/**
 * Journalise un lancement de sort (plan 22.2, kind `spell-cast`, visibilité
 * `all`). La conso d'emplacement est portée par `slotConsumed` — le call site
 * de cast passe `{ log: 'manual' }` à `updateCharacter` pour NE PAS produire en
 * plus un `slot-consumed` redondant.
 */
export interface SpellCastInput {
  characterId: string | null;
  spellId: string;
  /** Niveau effectif de lancement (0 pour un sort mineur). */
  level: number;
  /** Niveau d'emplacement consommé, `null` pour un sort mineur (gratuit). */
  slotConsumed: number | null;
  components: { v: boolean; s: boolean; m: boolean };
}

export async function logSpellCast(input: SpellCastInput): Promise<void> {
  await writeEvent({
    kind: 'spell-cast',
    actorCharacterId: input.characterId,
    visibility: 'all',
    payload: {
      spellId: input.spellId,
      level: input.level,
      slotConsumed: input.slotConsumed,
      components: input.components,
    },
  });
}

/**
 * Point d'entrée du diff de fiche (plan 22.2). Compare l'état AVANT au patch
 * envoyé à Firestore et journalise les événements correspondants (PV, états,
 * emplacements, inventaire). Appelé par `useUpdateCharacter` après un patch
 * réussi, sauf override `{ log: 'manual' }`. Best-effort, no-op hors campagne.
 */
export async function logCharacterDiff(
  before: Character,
  patch: Partial<Character>,
  characterId: string,
): Promise<void> {
  for (const ev of diffCharacterEvents(before, patch, characterId)) {
    await writeEvent(ev);
  }
}

/** Un scalaire journalisable tel quel dans le payload `dm-edit` (before/after). */
function isScalar(v: unknown): v is string | number | boolean | null {
  return (
    v === null ||
    typeof v === 'string' ||
    typeof v === 'number' ||
    typeof v === 'boolean'
  );
}

/** Plafond de champs portant un snapshot before/after (anti-gonflement, plan 26 step 5). */
const DM_EDIT_SNAPSHOT_CAP = 5;

/**
 * Journalise une édition MJ de la fiche d'un joueur (plan 26, kind `dm-edit`).
 *
 * UN SEUL événement d'AUDIT par patch (pas un diff sémantique par champ comme
 * `logCharacterDiff`) : l'acteur est le MJ, pas le personnage, et l'objectif est
 * la traçabilité — qui a changé quoi sur la fiche de qui. Visibilité `all` :
 * l'édition MJ est auditable par toute la table (feed MJ, onglet Events de
 * séance, journal de campagne) — la transparence prime sur le secret ici.
 *
 * Payload :
 *  - `fieldsChanged`: chemins de premier niveau réellement modifiés ;
 *  - `changes`: snapshot `{before, after}` UNIQUEMENT pour les champs scalaires,
 *    plafonné à `DM_EDIT_SNAPSHOT_CAP` entrées. Les gros champs (inventory,
 *    classes, spellSlots…) ne sont listés que par nom dans `fieldsChanged`.
 *
 * No-op si aucun champ pertinent n'a changé. Best-effort (avale ses erreurs via
 * `writeEvent`) : une édition MJ ne doit jamais échouer parce que l'audit échoue.
 */
export async function logDmEdit(
  before: Character,
  patch: Partial<Character>,
  characterId: string,
): Promise<void> {
  const fieldsChanged: string[] = [];
  const changes: Record<string, { before: unknown; after: unknown }> = {};

  for (const key of Object.keys(patch) as (keyof Character)[]) {
    // Champs d'intendance posés par `useUpdateCharacter` — hors audit fonctionnel.
    if (key === 'updatedAt' || key === 'updatedBy') continue;
    const after = patch[key];
    const beforeVal = before[key];
    if (JSON.stringify(beforeVal) === JSON.stringify(after)) continue; // inchangé
    fieldsChanged.push(key);
    if (
      Object.keys(changes).length < DM_EDIT_SNAPSHOT_CAP &&
      isScalar(beforeVal) &&
      isScalar(after)
    ) {
      changes[key] = { before: beforeVal, after };
    }
  }

  if (fieldsChanged.length === 0) return; // rien de pertinent → pas d'event
  await writeEvent({
    kind: 'dm-edit',
    actorCharacterId: null,
    targetCharacterId: characterId,
    visibility: 'all',
    payload: { fieldsChanged, changes },
  });
}

/**
 * Journalise le démarrage d'une séance (plan 23.4, kind `session-start`,
 * visibilité `all`). Pré-requis d'appel : la campagne active DOIT être posée
 * (`setActiveCampaign(cid, sid)`) AVANT cet appel — sinon `writeEvent` no-op.
 * On passe `sessionId` explicitement pour que l'event porte la séance qu'il
 * démarre même si le pointeur Zustand n'a pas encore propagé.
 *
 * `actorCharacterId: null` — c'est une action MJ, pas un personnage. Le payload
 * porte `sessionNumber` + `title` pour que le feed (event-line) affiche un
 * libellé lisible sans relire le doc séance. `attendance`/`summary` (cf.
 * EVENT-LOG.md) sont laissés au compilateur de journal (plan 25).
 */
export async function logSessionStart(
  sessionId: string,
  meta: { sessionNumber: number; title: string },
): Promise<void> {
  await writeEvent({
    kind: 'session-start',
    actorCharacterId: null,
    sessionId,
    visibility: 'all',
    payload: { sessionNumber: meta.sessionNumber, title: meta.title },
  });
}

/**
 * Journalise la clôture d'une séance (plan 23.4, kind `session-end`, visibilité
 * `all`). À appeler AVANT de nettoyer le pointeur de session active, pour que
 * l'event soit bien tagué `sessionId`. La compilation du journal (plan 25) se
 * branchera ici.
 */
export async function logSessionEnd(
  sessionId: string,
  meta: { sessionNumber: number; title: string },
): Promise<void> {
  await writeEvent({
    kind: 'session-end',
    actorCharacterId: null,
    sessionId,
    visibility: 'all',
    payload: { sessionNumber: meta.sessionNumber, title: meta.title },
  });
}

// ─────────────────────────────────────────────────────────────────────
// Rencontres de combat (plan 24)
// ─────────────────────────────────────────────────────────────────────

/**
 * Journalise le démarrage d'une rencontre (kind `encounter-start`, visibilité
 * `all`). Action MJ ⇒ `actorCharacterId: null`. On passe `encounterId`
 * explicitement (le pointeur Zustand peut ne pas avoir propagé). Le payload
 * porte le nom + le nombre de participants pour le feed/journal (plan 25).
 */
export async function logEncounterStart(
  encounterId: string,
  meta: { name: string; participantCount: number },
): Promise<void> {
  await writeEvent({
    kind: 'encounter-start',
    actorCharacterId: null,
    encounterId,
    visibility: 'all',
    payload: { name: meta.name, participantCount: meta.participantCount },
  });
}

/**
 * Journalise la clôture d'une rencontre (kind `encounter-end`, visibilité
 * `all`, step 9). `outcome` ∈ victory/defeat/fled. À appeler AVANT de libérer le
 * pointeur de rencontre active, pour que l'event soit bien tagué `encounterId`.
 */
export async function logEncounterEnd(
  encounterId: string,
  meta: { name: string; outcome: 'victory' | 'defeat' | 'fled' },
): Promise<void> {
  await writeEvent({
    kind: 'encounter-end',
    actorCharacterId: null,
    encounterId,
    visibility: 'all',
    payload: { name: meta.name, outcome: meta.outcome },
  });
}

/**
 * Journalise le début du tour d'un participant (kind `turn-start`, visibilité
 * `all`, step 6). `participantId` = `instanceId` du participant actif. `round`
 * porté pour la lisibilité du feed.
 */
export async function logTurnStart(
  encounterId: string,
  meta: { participantId: string; participantName: string; round: number },
): Promise<void> {
  await writeEvent({
    kind: 'turn-start',
    actorCharacterId: null,
    encounterId,
    visibility: 'all',
    payload: {
      participantId: meta.participantId,
      participantName: meta.participantName,
      round: meta.round,
    },
  });
}

/**
 * Journalise un changement de PV de monstre par le MJ (kind `monster-hp-change`,
 * step 7). Visibilité `dm` par défaut (table EVENT-LOG.md) — le MJ ne révèle pas
 * forcément les PV exacts des monstres aux joueurs. `before`/`after`/`delta`
 * portés pour la reconstruction du journal.
 */
export async function logMonsterHpChange(
  encounterId: string,
  meta: {
    monsterInstanceId: string;
    monsterName: string;
    before: number;
    after: number;
  },
): Promise<void> {
  await writeEvent({
    kind: 'monster-hp-change',
    actorCharacterId: null,
    encounterId,
    visibility: 'dm',
    payload: {
      monsterInstanceId: meta.monsterInstanceId,
      monsterName: meta.monsterName,
      before: meta.before,
      after: meta.after,
      delta: meta.after - meta.before,
    },
  });
}

/**
 * Back-compat : le pivot de dés (plan 12 / 12.5) appelle ce nom depuis quatre
 * call sites. C'était un stub no-op ; il délègue maintenant au vrai `logRoll`.
 */
export async function logRollIfCampaign(result: RollResult): Promise<void> {
  await logRoll(result);
}
