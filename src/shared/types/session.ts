import { z } from 'zod';

/**
 * Session de jeu — schéma Firestore pour `campaigns/{cid}/sessions/{sid}`.
 * Source de vérité : docs/DATA-MODEL.md (section sessions).
 *
 * JALON 23.1 — data layer only (type + service + élargissement de la rule de
 * lecture). Aucun écran ne consomme encore ce schéma ; les routes/UI arrivent
 * en 23.2+. La forme reproduit À L'IDENTIQUE celle documentée — aucun champ
 * ajouté (pas de changement de schéma Firestore).
 *
 * Convention timestamps : `plannedDate` / `startedAt` / `endedAt` / `createdAt`
 * / `updatedAt` sont typés `z.unknown()` comme dans `CampaignSchema` et
 * `CharacterSchema`. Ils acceptent à la fois `Timestamp` Firestore (lecture),
 * `FieldValue` (`serverTimestamp()`, écriture) et `null` (date non encore
 * posée). Zod ne modélise pas proprement les types Firestore — on accepte la
 * perte de type-safety sur ces champs en échange de la simplicité de schéma.
 */

export const SESSION_STATUSES = ['planned', 'active', 'completed', 'cancelled'] as const;
export const sessionStatusSchema = z.enum(SESSION_STATUSES);
export type SessionStatus = z.infer<typeof sessionStatusSchema>;

export const SessionSchema = z.object({
  id: z.string().min(1).max(128),

  /** Numéro auto-incrémenté par campagne (1, 2, 3…). Dénormalisé, posé au create. */
  number: z.number().int().min(1),
  title: z.string().min(1).max(120),

  /** Date prévue (planification). `null` tant qu'aucune date n'est fixée. */
  plannedDate: z.unknown(),
  /** Posé au démarrage de la session (`startSession`), `null` avant. */
  startedAt: z.unknown(),
  /** Posé à la clôture (`endSession`), `null` avant. */
  endedAt: z.unknown(),

  status: sessionStatusSchema,

  /** UIDs des membres présents (cochés dans l'onglet Présence — UI 23.3). */
  attendance: z.array(z.string().min(1).max(128)),
  /** Notes Markdown du MJ (FR). Auto-save côté UI (23.3). */
  notes: z.string().max(50000),
  /** Journal compilé à la clôture — rempli par le compilateur (plan 25), `null` avant. */
  journalCompiled: z.string().nullable(),

  createdAt: z.unknown(),
  updatedAt: z.unknown(),
});
export type Session = z.infer<typeof SessionSchema>;
