import { z } from 'zod';

/**
 * Rencontre de combat — schéma Firestore pour `campaigns/{cid}/encounters/{eid}`.
 * Source de vérité : docs/DATA-MODEL.md (section encounters).
 *
 * JALON 24.1 — data layer only (type + service + élargissement de la rule de
 * lecture, mirror exact de 23.1). Aucun écran ne consomme encore ce schéma ;
 * les routes/UI arrivent en 24.2+. La forme reproduit À L'IDENTIQUE celle
 * documentée — aucun champ ajouté (pas de changement de schéma Firestore).
 *
 * Convention timestamps : `createdAt` / `updatedAt` / `startedAt` / `endedAt`
 * sont typés `z.unknown()` comme dans `SessionSchema` / `CampaignSchema`. Ils
 * acceptent `Timestamp` Firestore (lecture), `FieldValue` (`serverTimestamp()`,
 * écriture) et `null` (non encore posé). Zod ne modélise pas proprement les
 * types Firestore — perte de type-safety assumée sur ces champs.
 *
 * Caveat contenu (LOCKED) : `participants[].monsterContentId` référence un
 * monstre de `public/data/monsters.json` — bundle actuellement VIDE (0/332,
 * cf. docs/AUDIT-SRD-COMPLETUDE.md, bloquant S3). Le data layer modélise donc
 * la référence sans pouvoir encore la peupler depuis la DB monstres ; l'ajout
 * de participants monstres par saisie manuelle (nom + PV + CA libres) est le
 * stopgap jusqu'au plan SRD-source du bestiaire. Voir « Décision Adrien » du
 * plan 24.
 */

export const ENCOUNTER_STATUSES = ['planned', 'active', 'completed', 'aborted'] as const;
export const encounterStatusSchema = z.enum(ENCOUNTER_STATUSES);
export type EncounterStatus = z.infer<typeof encounterStatusSchema>;

export const PARTICIPANT_TYPES = ['player', 'monster', 'npc'] as const;
export const participantTypeSchema = z.enum(PARTICIPANT_TYPES);
export type ParticipantType = z.infer<typeof participantTypeSchema>;

/**
 * Issue d'une rencontre clôturée (step 9). Documenté dans EVENT-LOG.md comme
 * payload de l'event `encounter-end`. NB : le schéma documenté de l'encounter
 * (docs/DATA-MODEL.md) ne porte PAS de champ `outcome` sur le doc — l'issue vit
 * dans l'event, pas sur la rencontre. On expose néanmoins l'enum ici car le
 * service le pose dans le payload de `logEncounterEnd` (24.x). Ne PAS l'ajouter
 * à `EncounterSchema` sans accord Adrien (changement de schéma Firestore).
 */
export const ENCOUNTER_OUTCOMES = ['victory', 'defeat', 'fled'] as const;
export const encounterOutcomeSchema = z.enum(ENCOUNTER_OUTCOMES);
export type EncounterOutcome = z.infer<typeof encounterOutcomeSchema>;

export const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type Position = z.infer<typeof positionSchema>;

export const encounterParticipantSchema = z.object({
  type: participantTypeSchema,
  /** Pour un joueur : `users/{uid}/characters/{id}`. `null` pour monstre/PNJ. */
  characterId: z.string().nullable(),
  /** Pour un monstre : slug `monsters.json` ou contenu custom. `null` sinon. */
  monsterContentId: z.string().nullable(),
  /** Unique dans la rencontre (un même monstre instancié N fois). */
  instanceId: z.string().min(1).max(128),
  name: z.string().min(1).max(120),
  initiative: z.number().int(),
  currentHp: z.number().int(),
  maxHp: z.number().int(),
  tempHp: z.number().int(),
  conditions: z.array(z.string().max(64)),
  /** Coords carte (plan 27-30). `null` en S3. */
  position: positionSchema.nullable(),
  notes: z.string().max(2000),
});
export type EncounterParticipant = z.infer<typeof encounterParticipantSchema>;

export const EncounterSchema = z.object({
  id: z.string().min(1).max(128),
  name: z.string().min(1).max(120),
  /** Séance de rattachement (step 2), `null` si hors séance. */
  sessionId: z.string().nullable(),
  status: encounterStatusSchema,

  /** Round courant (1-indexé), `0` tant que la rencontre n'est pas démarrée. */
  round: z.number().int().min(0),
  /** Index du participant dont c'est le tour (0-indexé dans l'ordre d'init). */
  turnIndex: z.number().int().min(0),

  participants: z.array(encounterParticipantSchema),

  /** Carte liée (plan 27-30), `null` en S3. */
  mapId: z.string().nullable(),
  fogState: z.record(z.string(), z.boolean()).nullable(),

  createdAt: z.unknown(),
  updatedAt: z.unknown(),
  /** Posé au démarrage (`startEncounter`), `null` avant. */
  startedAt: z.unknown(),
  /** Posé à la clôture (`endEncounter`), `null` avant. */
  endedAt: z.unknown(),
});
export type Encounter = z.infer<typeof EncounterSchema>;
