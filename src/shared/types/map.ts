import { z } from 'zod';

/**
 * Schémas de persistance Mode Carte phase 2 (CHANTIER D — marathon nuit 3).
 *
 * Périmètre : DATA-LAYER ONLY (Firestore schemas + types TS). L'UI consommatrice
 * reste pour l'instant le prototype `/map-proto` (en mémoire), une migration
 * vers `/campaigns/:cid/maps/:mid` viendra en chantier UI dédié — l'idée est
 * de poser les contrats Firestore propres avant de toucher au rendu.
 *
 * Décisions produit (tranchées avant CHANTIER D, cf. directive marathon nuit 3) :
 *   - Fog of war = oui, vectoriel, auto-révélé au mouvement.
 *   - Lumière dynamique = oui, sources statiques + attachées à token.
 *   - AoE templates = oui, déclenchés depuis modale de sort, formes SRD.
 *   - Firestore : `campaigns/{cid}/maps/{mid}` + sous-collection
 *     `campaigns/{cid}/maps/{mid}/tokens/{tid}` (writes individuels = coût
 *     bornable sur mouvement de token).
 *   - Storage : Firebase Storage `campaigns/{cid}/maps/{mid}/{filename}` —
 *     PAS DANS CE CHANTIER. L'image est référencée par URL (blob ou Storage)
 *     dans `MapMeta.imageUrl`. Storage rules seront posées en chantier dédié
 *     (dépendance config Firebase Storage qui n'est pas active aujourd'hui).
 *   - Conflit de mouvement : last-write-wins via `updatedAt` (serverTimestamp).
 *   - Token lié au PJ : `linkedCharacterId?` optionnel ; tracking ONE-WAY
 *     PJ→token côté UI (modifier PV depuis token = chantier ultérieur).
 *
 * Versioning : `schemaVersion` sur chaque doc racine pour les migrations
 * futures (parité avec `Character.schemaVersion`).
 */

const slug = z
  .string()
  .min(1)
  .regex(/^[a-z0-9-]+$/, 'kebab-case slug only');

/** Coordonnées en pixels image-source (pas en cases de grille). */
export const mapPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type MapPosition = z.infer<typeof mapPositionSchema>;

/** Token de joueur, PNJ, ou monstre placé sur la carte. */
export const mapTokenSchema = z.object({
  id: slug,
  /**
   * Type d'entité représentée. `pj` = personnage joueur (généralement lié via
   * `linkedCharacterId`). `pnj` = créature contrôlée MJ. `marker` = repère
   * neutre (point d'intérêt, AoE permanent).
   */
  kind: z.enum(['pj', 'pnj', 'marker']),
  label: z.string(),
  position: mapPositionSchema,
  /** Couleur du jeton (hex `#rrggbb`). Le rendu UI peut surimposer une bordure. */
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  /**
   * Référence optionnelle au personnage joueur dans la même campagne. Quand
   * présent, l'UI peut surimposer le portrait/initiales + barre PV + conditions
   * (tracking ONE-WAY PJ→token, cf. arbitrage 7 de la directive).
   */
  linkedCharacterId: slug.nullable().optional(),
  /**
   * Rayon de vision en pieds (SRD : « darkvision 60 ft » pour la plupart des
   * ascendances). Utilisé par le fog of war auto-révélé au mouvement du token
   * (phase E). Défaut conventionnel 30 ft (vision normale en lumière vive).
   */
  visionRadius: z.number().int().nonnegative().optional(),
  /** Last-write-wins via serverTimestamp côté client. */
  updatedAt: z.unknown(), // Firestore Timestamp — typage opaque pour éviter dépendance SDK ici
  updatedBy: z.string(),
});
export type MapToken = z.infer<typeof mapTokenSchema>;

/** Polygone vectoriel de révélation pour le fog of war (phase E). */
export const fogPolygonSchema = z.object({
  id: slug,
  /** Suite ordonnée de points en coords image. Au moins 3 points pour former une zone. */
  points: z.array(mapPositionSchema).min(3),
  /**
   * `reveal` = zone éclaircie (le brouillard est retiré ici).
   * `mask` = zone re-masquée par le MJ (priorité sur `reveal` dans le rendu).
   */
  kind: z.enum(['reveal', 'mask']),
  createdAt: z.unknown(),
});
export type FogPolygon = z.infer<typeof fogPolygonSchema>;

/** Source de lumière statique ou attachée à un token (phase F). */
export const lightSourceSchema = z
  .object({
    id: slug,
    /**
     * Coords absolues si la source est statique (brasero fixe). Mutuellement
     * exclusif avec `attachedTokenId`.
     */
    position: mapPositionSchema.nullable().optional(),
    /** Si attachée à un token, suit son déplacement. */
    attachedTokenId: slug.nullable().optional(),
    /** Rayon de lumière vive en pieds (conventions SRD : torche = 20 ft). */
    brightRadius: z.number().int().nonnegative(),
    /** Rayon de lumière faible additionnel (au-delà de brightRadius). */
    dimRadius: z.number().int().nonnegative(),
    /** Couleur teinte (hex `#rrggbb`). Défaut blanc/jaune chaud. */
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
    /** Preset SRD si applicable (torch / lantern / light-spell / candle / sunlight). */
    preset: z
      .enum(['torch', 'lantern', 'light-spell', 'candle', 'sunlight'])
      .nullable()
      .optional(),
  })
  .refine(
    (s) => (s.position != null) !== (s.attachedTokenId != null),
    'A light source must have either a `position` OR an `attachedTokenId`, not both.',
  );
export type LightSource = z.infer<typeof lightSourceSchema>;

/** Template AoE (phase G) — sphère / cône / ligne / cube. */
export const aoeTemplateSchema = z.object({
  id: slug,
  shape: z.enum(['sphere', 'cone', 'line', 'cube']),
  position: mapPositionSchema,
  /**
   * Dimensions en pieds, format libre selon `shape` :
   *   - sphere : { radius: number }
   *   - cone : { radius: number, angleDeg?: number (défaut 90) }
   *   - line : { length: number, width: number }
   *   - cube : { side: number }
   * Validation au consommateur (UI / moteur de combat D24).
   */
  dimensions: z.record(z.string(), z.number()),
  /** Slug de sort source si le template a été déclenché depuis la fiche. */
  spellSlug: slug.nullable().optional(),
  /** Personnage source si applicable (pour tracker l'origine côté journal). */
  sourceCharacterId: slug.nullable().optional(),
  /** `true` = persistant entre tours. `false` = éphémère (placement courant). */
  pinned: z.boolean(),
  /** Orientation en degrés (0-359) — pertinent pour cone / line. */
  rotationDeg: z.number().min(0).lt(360).optional(),
});
export type AoeTemplate = z.infer<typeof aoeTemplateSchema>;

/**
 * Document racine de la carte. Stocké à
 * `campaigns/{cid}/maps/{mid}`. Les tokens vivent en sous-collection pour
 * borner le coût des writes individuels (Firestore facture par doc).
 *
 * Les `fogPolygons[]`, `lightSources[]`, `aoeTemplates[]` restent inline sur
 * `MapMeta` parce qu'ils sont peu fréquents (révélation manuelle, pose d'AoE
 * éphémère) — pas besoin de la granularité tokens.
 */
export const mapMetaSchema = z.object({
  id: slug,
  name: z.string().min(1),
  /**
   * URL de l'image de fond. Pour cette phase 2 : URL externe ou blob URL en
   * mémoire (pas de Firebase Storage actif). Quand Storage sera câblé, valeur
   * du type `gs://bucket/campaigns/{cid}/maps/{mid}/{filename}`.
   */
  imageUrl: z.string().min(1).nullable(),
  /** Taille d'une case de grille en pixels image-source. Défaut conventionnel 70 px. */
  gridSize: z.number().int().positive(),
  /** Échelle de la grille en pieds (5 ft = 1 case par convention SRD). */
  feetPerSquare: z.number().int().positive(),
  /** Affichage de la grille togglable. */
  showGrid: z.boolean(),
  /** Toggle global du fog of war. Quand `false`, le rendu ignore `fogPolygons`. */
  fogEnabled: z.boolean(),
  /** Toggle global de la lumière dynamique. Quand `false`, le rendu ignore `lightSources`. */
  lightingEnabled: z.boolean(),
  /** Polygones de révélation/mask cumulés (peu fréquents → inline OK). */
  fogPolygons: z.array(fogPolygonSchema),
  /** Sources de lumière (statiques + attachées). */
  lightSources: z.array(lightSourceSchema),
  /** Templates AoE éphémères ou épinglés. */
  aoeTemplates: z.array(aoeTemplateSchema),
  /** Migration future via bump. */
  schemaVersion: z.literal(1),
  /** `serverTimestamp()` à la création — typage opaque ici. */
  createdAt: z.unknown(),
  /** `serverTimestamp()` à chaque write. Pour last-write-wins inter-clients. */
  updatedAt: z.unknown(),
  updatedBy: z.string(),
});
export type MapMeta = z.infer<typeof mapMetaSchema>;

/**
 * Limite recommandée du nombre de tokens par carte. Le SDK Firestore tolère
 * 10000+ par sous-collection ; on borne plus bas pour éviter une dérive de
 * coûts (chaque mouvement = 1 write). En pratique, une rencontre tactique
 * sérieuse dépasse rarement 30 entités (PJ + alliés + monstres).
 */
export const MAP_TOKENS_SOFT_LIMIT = 60 as const;
