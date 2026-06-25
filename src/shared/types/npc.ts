import { z } from 'zod';

/**
 * PNJ récurrent — `campaigns/{campaignId}/npcs/{npcId}` (plan 28).
 * Source de vérité du schéma : docs/DATA-MODEL.md (section npcs).
 *
 * Un PNJ est une entité de première classe DISTINCTE :
 *   - du monstre (combattant jetable d'une rencontre, `monsters.json`),
 *   - du PJ (fiche complète possédée par un joueur, portable entre campagnes).
 * Il porte une fiche light, peut être invoqué comme participant d'une rencontre
 * (via ses `combatStats` ou un monstre lié) et vit dans l'annuaire de campagne.
 *
 * `visibility` : `'all'` = visible des joueurs (annuaire + détail public) ;
 * `'dm'` = invisible des joueurs (le MJ prépare un antagoniste en secret). Le
 * filtrage est porté par `firestore.rules` (un joueur ne lit que `visibility ==
 * 'all'`). Les champs `dmNotes` et `combatStats` ne transitent JAMAIS vers un
 * joueur : Firestore ne sait pas filtrer par champ, donc le client masque ces
 * sections quand le lecteur n'est pas MJ — mais un PNJ `'all'` reste lisible
 * intégralement par les rules, d'où le masquage CLIENT (cf. DATA-MODEL note).
 *
 * En V1 (plan 28) le portrait est `'letter'` (une lettre/glyphe), aligné sur le
 * système de portrait des PJ qui n'utilise lui aussi que la lettre. Les types
 * `'svg'`/`'image'` restent valides au schéma — l'upload image (Firebase
 * Storage) est différé en sous-plan 28b, comme pour les handouts (27b).
 */

export const NPC_ROLES = [
  'merchant',
  'ally',
  'enemy',
  'contact',
  'noble',
  'other',
] as const;
export type NpcRole = (typeof NPC_ROLES)[number];

/** Attitude d'un PNJ envers un PJ donné. */
export const NPC_ATTITUDES = ['friendly', 'neutral', 'hostile', 'unknown'] as const;
export type NpcAttitude = (typeof NPC_ATTITUDES)[number];

/** Visibilité du PNJ vis-à-vis des joueurs. */
export const NPC_VISIBILITIES = ['all', 'dm'] as const;
export type NpcVisibility = (typeof NPC_VISIBILITIES)[number];

/** Type de portrait — mirror de `portraitSchema` des PJ (character.ts). */
export const npcPortraitSchema = z.object({
  type: z.enum(['letter', 'svg', 'image']),
  value: z.string(),
});
export type NpcPortrait = z.infer<typeof npcPortraitSchema>;

/**
 * Bloc de combat OPTIONNEL (`null` pour un PNJ non-combattant : marchand,
 * contact). `monsterContentId` référence un monstre de `monsters.json` (ou du
 * contenu custom) pour réutiliser son bloc de stats complet ; sinon les valeurs
 * inline (`cr`/`ac`/`hp`) suffisent au tracker. Les sous-champs sont optionnels
 * — Firestore refuse `undefined`, donc le service n'écrit que les clés
 * réellement renseignées (cf. `buildCombatStats`).
 */
export const npcCombatStatsSchema = z.object({
  monsterContentId: z.string().optional(),
  cr: z.number().optional(),
  ac: z.number().int().optional(),
  hp: z.number().int().optional(),
  notes: z.string().optional(),
});
export type NpcCombatStats = z.infer<typeof npcCombatStatsSchema>;

/** Relation PNJ↔PJ : un personnage de la table + l'attitude du PNJ envers lui. */
export const npcRelationshipSchema = z.object({
  characterId: z.string().min(1),
  attitude: z.enum(NPC_ATTITUDES),
});
export type NpcRelationship = z.infer<typeof npcRelationshipSchema>;

export const NpcSchema = z.object({
  id: z.string().min(1).max(128),
  name: z.string().min(1).max(120),
  role: z.enum(NPC_ROLES),
  location: z.string().max(200),
  /** 1-2 phrases — résumé affiché sur la carte d'annuaire. */
  shortDescription: z.string().max(400),
  /** Markdown FR — description publique, visible des joueurs. */
  publicDescription: z.string().max(8000),
  /** Markdown FR — notes secrètes du MJ, JAMAIS exposées à un joueur (masquage client). */
  dmNotes: z.string().max(8000),
  portrait: npcPortraitSchema,
  combatStats: npcCombatStatsSchema.nullable(),
  relationships: z.array(npcRelationshipSchema),
  tags: z.array(z.string().min(1).max(60)),
  visibility: z.enum(NPC_VISIBILITIES),
  createdBy: z.string().min(1),
  /** Firestore `Timestamp` — typé `unknown`, narrowé au point d'usage. */
  createdAt: z.unknown(),
  updatedAt: z.unknown(),
});

export type Npc = z.infer<typeof NpcSchema>;

/**
 * `true` si le PNJ est visible des joueurs. Pur helper de présentation —
 * l'autorité de lecture reste les rules Firestore.
 */
export function npcIsVisibleToPlayers(npc: Pick<Npc, 'visibility'>): boolean {
  return npc.visibility === 'all';
}

/**
 * Millisecondes du `createdAt`/`updatedAt` Firestore pour le tri client-side
 * (le service trie en mémoire — volume bas, même justification que `useHandouts`
 * / `useSessions`). Tolère le `Timestamp` (`.toMillis()` / `.seconds`) et le
 * pending `serverTimestamp()` (null avant résolution serveur → 0).
 */
export function npcTimestampMillis(value: unknown): number {
  const ts = value as { toMillis?: () => number; seconds?: number } | null;
  if (ts && typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts && typeof ts.seconds === 'number') return ts.seconds * 1000;
  return 0;
}
