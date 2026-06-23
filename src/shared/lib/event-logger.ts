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
  const { activeCampaignId, activeSessionId } = useActiveCampaignStore.getState();
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
      encounterId: input.encounterId ?? null,
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

/**
 * Back-compat : le pivot de dés (plan 12 / 12.5) appelle ce nom depuis quatre
 * call sites. C'était un stub no-op ; il délègue maintenant au vrai `logRoll`.
 */
export async function logRollIfCampaign(result: RollResult): Promise<void> {
  await logRoll(result);
}
