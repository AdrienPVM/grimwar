import { z } from 'zod';

import {
  AncestrySchema,
  BackgroundSchema,
  ClassSchema,
  FeatSchema,
  I18nSchema,
  InvocationSchema,
  ItemSchema,
  SpellSchema,
  SubancestrySchema,
  SubclassSchema,
} from './content';

// ─────────────────────────────────────────────────────────────────────
// JALON 3A — Schéma module custom (9 catégories utilisateur-facing).
//
// Réutilise les Zod schemas SRD existants pour valider chaque entité.
// Aucun stockage Firestore ici (réservé à 3B) ; aucune UI (réservée à 3C) ;
// aucune injection campagne (réservée à 3D). Pure définition de schéma + types.
// ─────────────────────────────────────────────────────────────────────

const PACK_VERSION_REGEX = /^\d+\.\d+\.\d+$/;
const PACK_ID_REGEX = /^[a-z0-9-]+$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

/**
 * Métadonnées du pack — identifient son origine et sa version pour la
 * traçabilité en campagne. `id` est l'identifiant unique du pack (slug
 * kebab-case), `version` un semver simple (ex. `1.0.0`), `createdAt` une
 * date ISO 8601 UTC produite par l'éditeur du pack.
 */
export const CustomContentPackMetaSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(PACK_ID_REGEX, 'pack id must be kebab-case slug'),
  name: I18nSchema,
  version: z
    .string()
    .regex(PACK_VERSION_REGEX, 'pack version must be semver (MAJOR.MINOR.PATCH)'),
  author: z.string().min(1),
  createdAt: z
    .string()
    .regex(ISO_DATE_REGEX, 'createdAt must be ISO 8601 UTC (YYYY-MM-DDTHH:MM:SSZ)'),
  description: I18nSchema.optional(),
});
export type CustomContentPackMeta = z.infer<typeof CustomContentPackMetaSchema>;

/**
 * 9 catégories utilisateur-facing supportées par les packs custom V1.
 *
 * Hors V1 (3A) : `magic-items`, `monsters`, `summoned-creatures`,
 * `conditions`, `rules` — ces catégories sont MJ-only ou runtime-only et
 * seront ajoutées par un sous-jalon ultérieur si le besoin se confirme.
 *
 * Chaque tableau est `optional()` : un pack peut ne fournir qu'une seule
 * catégorie. La règle « au moins une catégorie non vide » est appliquée par
 * `superRefine` sur le schéma racine — un pack 100% vide est rejeté.
 */
export const CustomContentPackEntitiesSchema = z.object({
  spells: z.array(SpellSchema).optional(),
  classes: z.array(ClassSchema).optional(),
  subclasses: z.array(SubclassSchema).optional(),
  ancestries: z.array(AncestrySchema).optional(),
  subancestries: z.array(SubancestrySchema).optional(),
  backgrounds: z.array(BackgroundSchema).optional(),
  feats: z.array(FeatSchema).optional(),
  invocations: z.array(InvocationSchema).optional(),
  items: z.array(ItemSchema).optional(),
});
export type CustomContentPackEntities = z.infer<
  typeof CustomContentPackEntitiesSchema
>;

/** Liste figée des 9 catégories supportées — source de vérité pour le UI / loader / tests. */
export const CUSTOM_CONTENT_PACK_CATEGORIES = [
  'spells',
  'classes',
  'subclasses',
  'ancestries',
  'subancestries',
  'backgrounds',
  'feats',
  'invocations',
  'items',
] as const satisfies ReadonlyArray<keyof CustomContentPackEntities>;
export type CustomContentPackCategory =
  (typeof CUSTOM_CONTENT_PACK_CATEGORIES)[number];

/**
 * Pack custom complet — `meta` + `entities`. `superRefine` enforce :
 *  - au moins une catégorie non vide (refus d'un pack 100% vide),
 *  - unicité des `id` dans chaque catégorie (deux sorts avec le même slug
 *    dans le même pack = rejet avec chemin précis).
 */
export const CustomContentPackSchema = z
  .object({
    meta: CustomContentPackMetaSchema,
    entities: CustomContentPackEntitiesSchema,
  })
  .superRefine((pack, ctx) => {
    const hasAnyEntity = CUSTOM_CONTENT_PACK_CATEGORIES.some(
      (category) => (pack.entities[category]?.length ?? 0) > 0,
    );
    if (!hasAnyEntity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['entities'],
        message: 'pack must contain at least one non-empty category',
      });
    }
    for (const category of CUSTOM_CONTENT_PACK_CATEGORIES) {
      const list = pack.entities[category];
      if (!list || list.length === 0) continue;
      const seen = new Set<string>();
      for (let index = 0; index < list.length; index += 1) {
        const entry = list[index] as { id: string };
        if (seen.has(entry.id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['entities', category, index, 'id'],
            message: `duplicate id "${entry.id}" within category "${category}"`,
          });
        }
        seen.add(entry.id);
      }
    }
  });
export type CustomContentPack = z.infer<typeof CustomContentPackSchema>;
