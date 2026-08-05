import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import { diffCharacterEvents } from '@/shared/lib/character-diff';
import type { RollKind, RollResult } from '@/shared/lib/dice/types';
import { getDb } from '@/shared/lib/firebase';
import { useActiveCampaignStore } from '@/shared/lib/slices/active-campaign-slice';
import { useAuthStore } from '@/shared/lib/slices/auth-slice';
import type { Character } from '@/shared/types/character';
import type { EventVisibility, NewGameEvent } from '@/shared/types/event';

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
async function writeEvent(input: NewGameEvent, campaignIdOverride?: string): Promise<boolean> {
  const { activeCampaignId, activeSessionId, activeEncounterId } =
    useActiveCampaignStore.getState();
  // Le store est renseigné par l'écran de FICHE. Un MJ agissant depuis l'écran
  // de campagne (jet secret) n'a pas de fiche active : il passe sa campagne
  // explicitement plutôt que d'aller polluer le pointeur de jeu.
  const campaignId = campaignIdOverride ?? activeCampaignId;
  if (!campaignId) return false; // pas de campagne cible → no-op
  const uid = useAuthStore.getState().user?.uid;
  if (!uid) return false; // pas d'utilisateur → écriture impossible (rule actorUserId)

  try {
    const db = getDb();
    await addDoc(collection(db, 'campaigns', campaignId, 'events'), {
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
export async function logRoll(
  result: RollResult,
  visibility: EventVisibility = 'all',
): Promise<void> {
  const written = await writeEvent({
    kind: 'roll',
    actorCharacterId: result.characterId || null,
    visibility,
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
 * Journalise un jet secret du MJ (kind `dm-secret-roll`, visibilité `dm`).
 *
 * Le kind était déclaré au schéma, documenté dans EVENT-LOG.md, et TOUT le côté
 * lecteur était déjà écrit (`event-line.ts` : résumé + détail). Seul l'écrivain
 * manquait — le jet vivait dans un `useState` plafonné à cinq entrées, perdu au
 * démontage de l'écran. Un MJ ne pouvait donc pas retrouver, dix minutes plus
 * tard, ce qu'il avait lancé derrière son paravent.
 *
 * `visibility` est un paramètre plutôt qu'une constante : « Révéler » re-log le
 * même jet en `'all'` (les events sont immuables — `firestore.rules` : `allow
 * update: if false`), ce qui est le chemin honnête pour dévoiler après coup.
 *
 * `label` est le champ libre « à propos de quoi ? » du MJ (« Perception du
 * garde »). Vide ⇒ `null`, le lecteur affichera juste le total.
 */
export async function logSecretRoll(
  campaignId: string,
  meta: {
    label: string | null;
    face: number;
    modifier: number;
    total: number;
    advantage: 'normal' | 'advantage' | 'disadvantage';
    visibility?: 'dm' | 'all';
  },
): Promise<boolean> {
  return writeEvent(
    {
      kind: 'dm-secret-roll',
      actorCharacterId: null,
      visibility: meta.visibility ?? 'dm',
      payload: {
        label: meta.label,
        keptFaces: [meta.face],
        rawFaces: [meta.face],
        modifier: meta.modifier,
        total: meta.total,
        crit: meta.face === 20,
        fumble: meta.face === 1,
        advantage: meta.advantage,
      },
    },
    campaignId,
  );
}

/**
 * Retire un événement du journal (M9 de l'audit de malléabilité).
 *
 * La rule était déployée depuis l'origine (`allow delete: if isDMOf`) sans
 * aucun appelant : un jet lancé par erreur en pleine scène restait dans le
 * récit pour toujours. Contrairement aux `log*`, cette fonction N'AVALE PAS ses
 * erreurs — l'appelant est un geste utilisateur explicite, qui doit savoir si
 * le retrait a échoué (permission perdue, event déjà supprimé).
 *
 * `campaignId` est explicite plutôt que lu dans le store : le MJ retire un
 * event depuis le feed d'une campagne qu'il consulte, sans forcément y avoir
 * une fiche active.
 */
export async function deleteEvent(campaignId: string, eventId: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, 'campaigns', campaignId, 'events', eventId));
}

/**
 * Back-compat : le pivot de dés (plan 12 / 12.5) appelle ce nom depuis quatre
 * call sites. C'était un stub no-op ; il délègue maintenant au vrai `logRoll`.
 */
export async function logRollIfCampaign(
  result: RollResult,
  visibility: EventVisibility = 'all',
): Promise<void> {
  await logRoll(result, visibility);
}

/**
 * Journalise l'envoi d'un document par le MJ (kind `handout-sent`, plan 27).
 * Visibilité `all` : la table sait qu'un document a circulé (et son titre) —
 * pas son contenu, qui reste accessible aux seuls destinataires via la rule de
 * lecture des handouts. Le payload porte l'id, le titre et les destinataires
 * (UIDs ou `'all'`) pour la narration du journal.
 */
export async function logHandoutSent(
  handoutId: string,
  recipients: string[] | 'all',
  title: string,
): Promise<void> {
  await writeEvent({
    kind: 'handout-sent',
    actorCharacterId: null,
    visibility: 'all',
    payload: { handoutId, recipients, title },
  });
}

/**
 * Journalise l'ouverture d'un document par un joueur (kind `handout-revealed`,
 * plan 27). Visibilité `all` — le MJ et la table voient qui a pris connaissance
 * du document.
 */
export async function logHandoutRevealed(
  handoutId: string,
  revealedByUserId: string,
): Promise<void> {
  await writeEvent({
    kind: 'handout-revealed',
    actorCharacterId: null,
    visibility: 'all',
    payload: { handoutId, revealedByUserId },
  });
}

/**
 * Journalise l'introduction d'un PNJ (kind `npc-introduced`, plan 28 step 14),
 * tirée à la création. La visibilité de l'event MIRROR celle du PNJ : un PNJ
 * `'all'` est visible des joueurs → event `all` (la table sait qu'un PNJ entre
 * en scène) ; un PNJ `'dm'` (antagoniste secret) → event `dm`, invisible des
 * joueurs. Le payload porte l'id + le nom (pour la narration du journal sans
 * relire le doc PNJ — qui peut être `'dm'`, donc illisible côté joueur).
 */
export async function logNpcIntroduced(
  npcId: string,
  name: string,
  npcVisibility: 'all' | 'dm',
): Promise<void> {
  await writeEvent({
    kind: 'npc-introduced',
    actorCharacterId: null,
    visibility: npcVisibility,
    payload: { npcId, name },
  });
}

/**
 * Journalise un changement d'attitude d'un PNJ envers un PJ (kind
 * `npc-attitude-changed`, plan 28 step 14). Visibilité MIRROR de celle du PNJ
 * (même raisonnement que `npc-introduced` : ne jamais révéler un PNJ secret).
 * Payload : npcId, characterId, before, after (énumérations `NpcAttitude`).
 */
export async function logNpcAttitudeChanged(
  npcId: string,
  characterId: string,
  before: string,
  after: string,
  npcVisibility: 'all' | 'dm',
): Promise<void> {
  await writeEvent({
    kind: 'npc-attitude-changed',
    actorCharacterId: null,
    visibility: npcVisibility,
    payload: { npcId, characterId, before, after },
  });
}
