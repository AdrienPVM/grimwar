/**
 * Hand-off des dégâts physiques (JALON 24.4, step 7b).
 *
 * En mode physique, un joueur saisit ses dés réels ; l'app journalise un event
 * `roll` (`payload.mode === 'physical'`) avec `rollKind` ∈ {attack, damage}. Le
 * joueur ne cible JAMAIS — c'est le MJ qui choisit sur qui appliquer les dégâts.
 *
 * Ce module DÉRIVE (pur, testable) la liste des jets physiques récents à
 * proposer au MJ, à partir du feed d'événements déjà lu par `useCampaignEvents`
 * (visibilité `all`/`dm` côté MJ). Aucun nouvel index ni nouvelle rule : on
 * filtre côté client le feed existant.
 *
 * Limite de contenu assumée : le `damageTypeLabel` (« tranchants »…) n'est PAS
 * journalisé dans le payload de l'event (il ne vit que dans le toast, cf.
 * `event-logger.logRoll`). La ligne affiche donc acteur · arme · total — pas le
 * type de dégâts, qu'on n'inventera pas (politique « vérité du contenu »).
 */

import { eventCreatedAtToDate } from './event-line';
import type { GameEvent } from '@/shared/types/event';
import type { EncounterParticipant } from '@/shared/types/encounter';

/** Fenêtre de pertinence d'un jet physique dans le panneau (5 min, plan step 7b). */
export const HANDOFF_TTL_MS = 5 * 60 * 1000;

/** Un jet physique récent prêt à être appliqué (damage) ou adjugé (attack). */
export interface HandoffRow {
  /** `id` de l'event Firestore — clé de dismiss et de rendu. */
  eventId: string;
  /** Nom du personnage qui a lancé, ou `null` si non résolu (→ libellé générique). */
  actorName: string | null;
  /** Libellé de l'arme / du sort (payload.label), ou `null`. */
  weaponLabel: string | null;
  /** Distingue un jet de dégâts (applicable) d'un jet d'attaque (informatif). */
  rollKind: 'attack' | 'damage';
  /** Total du jet : PV à retrancher (damage) ou score d'attaque (attack). */
  total: number;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Résout le nom de l'acteur d'un event via sa fiche liée : `actorCharacterId` →
 * participant joueur de même `characterId` → `name`. `null` si non résolu
 * (monstre, fiche non présente dans la rencontre) — le rendu posera un libellé
 * générique (« Joueur »).
 */
function resolveActorName(
  event: GameEvent,
  participants: readonly EncounterParticipant[],
): string | null {
  if (event.actorCharacterId === null) return null;
  const match = participants.find((p) => p.characterId === event.actorCharacterId);
  return match ? match.name : null;
}

/**
 * Dérive les lignes de hand-off à partir du feed d'événements.
 *
 * Conserve uniquement les `roll` physiques de type attack/damage, non ignorés
 * localement, et dans la fenêtre de pertinence (`ttlMs`). Un `serverTimestamp()`
 * pas encore résolu (`createdAt` local `null`) est traité comme « tout frais »
 * (inclus) — sinon un jet à peine posé clignoterait hors liste avant l'aller-
 * retour serveur. L'ordre du feed (createdAt desc) est préservé.
 */
export function deriveHandoffRows(
  events: readonly GameEvent[],
  participants: readonly EncounterParticipant[],
  dismissedIds: ReadonlySet<string>,
  now: number,
  ttlMs: number = HANDOFF_TTL_MS,
): HandoffRow[] {
  const rows: HandoffRow[] = [];
  for (const event of events) {
    if (event.kind !== 'roll') continue;
    if (dismissedIds.has(event.id)) continue;

    const p = event.payload;
    if (p.mode !== 'physical') continue;
    const rollKind = p.rollKind;
    if (rollKind !== 'attack' && rollKind !== 'damage') continue;
    const total = asNumber(p.total);
    if (total === null) continue;

    const date = eventCreatedAtToDate(event.createdAt);
    if (date !== null && now - date.getTime() > ttlMs) continue;

    rows.push({
      eventId: event.id,
      actorName: resolveActorName(event, participants),
      weaponLabel: asString(p.label),
      rollKind,
      total,
    });
  }
  return rows;
}
