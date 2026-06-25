import { z } from 'zod';

/**
 * Journal d'événements — source de vérité : docs/EVENT-LOG.md.
 *
 * Chaque action de gameplay écrit un événement dans
 * `campaigns/{id}/events/{eventId}`. Le compilateur de journal (plan 25)
 * transforme ces événements en prose FR.
 *
 * NB : les `kind` et `visibility` sont des identifiants MACHINE (kebab-case EN),
 * jamais affichés tels quels. La couche i18n / le compilateur produit le texte
 * français — ces chaînes ne transitent pas par `public/data/*.json` et ne sont
 * donc pas concernées par le garde-fou anti-anglais du contenu.
 */
export const EVENT_KINDS = [
  'roll',
  'hp-change',
  'temp-hp',
  'condition-add',
  'condition-remove',
  'spell-cast',
  'slot-consumed',
  'slot-restored',
  'resource-consumed',
  'resource-restored',
  'item-acquired',
  'item-removed',
  'item-transferred',
  'item-equipped',
  'item-unequipped',
  'attunement-changed',
  'coins-change',
  'level-up',
  'xp-gain',
  'rest',
  'death-save',
  'death',
  'revival',
  'stabilize',
  'inspiration-grant',
  'inspiration-consume',
  'encounter-start',
  'encounter-end',
  'initiative-roll',
  'turn-start',
  'turn-end',
  'monster-hp-change',
  'dm-secret-roll',
  'treasure-drop',
  'session-start',
  'session-end',
  'note',
  'dm-edit',
  'campaign-join',
  'campaign-leave',
  'handout-sent',
  'handout-revealed',
] as const;

export type EventKind = (typeof EVENT_KINDS)[number];

export const EVENT_VISIBILITIES = ['all', 'dm', 'self'] as const;
export type EventVisibility = (typeof EVENT_VISIBILITIES)[number];

/**
 * Forme canonique d'un événement persisté (lecture). `createdAt` est un
 * `Timestamp` Firestore — typé `unknown` ici comme pour `Character`, narrowé
 * au point d'usage. À l'écriture, l'event-logger pose `serverTimestamp()` (la
 * rule `events` exige `createdAt == request.time`).
 */
export const EventSchema = z.object({
  id: z.string(),
  kind: z.enum(EVENT_KINDS),
  actorUserId: z.string(),
  actorCharacterId: z.string().nullable(),
  targetCharacterId: z.string().nullable(),
  sessionId: z.string().nullable(),
  encounterId: z.string().nullable(),
  payload: z.record(z.string(), z.unknown()),
  visibility: z.enum(EVENT_VISIBILITIES),
  createdAt: z.unknown(),
});

export type GameEvent = z.infer<typeof EventSchema>;

/**
 * Entrée d'écriture : ce qu'un appelant fournit à l'event-logger. L'`id`,
 * l'`actorUserId` et le `createdAt` sont posés par le logger (resp. Firestore
 * auto-id, uid courant, `serverTimestamp()`). Les pointeurs de contexte
 * (`targetCharacterId`, `sessionId`, `encounterId`) sont optionnels et
 * défaultent à `null` / à la session active.
 */
export interface NewGameEvent {
  kind: EventKind;
  actorCharacterId: string | null;
  targetCharacterId?: string | null;
  sessionId?: string | null;
  encounterId?: string | null;
  payload: Record<string, unknown>;
  visibility: EventVisibility;
}
