import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import type { RollResult } from '@/shared/lib/dice/types';
import { getDb } from '@/shared/lib/firebase';
import { useActiveCampaignStore } from '@/shared/lib/slices/active-campaign-slice';
import { useAuthStore } from '@/shared/lib/slices/auth-slice';
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
async function writeEvent(input: NewGameEvent): Promise<void> {
  const { activeCampaignId, activeSessionId } = useActiveCampaignStore.getState();
  if (!activeCampaignId) return; // pas de campagne active → no-op
  const uid = useAuthStore.getState().user?.uid;
  if (!uid) return; // pas d'utilisateur → écriture impossible (rule actorUserId)

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
  } catch (err) {
    console.warn("[event-logger] échec d'écriture d'événement", err);
  }
}

/**
 * Journalise un jet de dés. Visibilité `all` par défaut (table EVENT-LOG.md).
 * Le payload porte le mode (digital/physique), les faces brutes et conservées,
 * le total et les flags crit/fumble/avantage — le compilateur de journal
 * (plan 25) distingue les tables physiques pour la couleur narrative.
 */
export async function logRoll(result: RollResult): Promise<void> {
  await writeEvent({
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
}

/**
 * Back-compat : le pivot de dés (plan 12 / 12.5) appelle ce nom depuis quatre
 * call sites. C'était un stub no-op ; il délègue maintenant au vrai `logRoll`.
 */
export async function logRollIfCampaign(result: RollResult): Promise<void> {
  await logRoll(result);
}
