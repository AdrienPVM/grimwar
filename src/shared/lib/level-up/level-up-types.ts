import { z } from 'zod';

import {
  abilityCodeSchema,
  divineOrderSchema,
  fightingStyleSchema,
  primalOrderSchema,
} from '@/shared/types/character';

/**
 * JALON 2B.3a — Schéma du brouillon de level-up agrégé par la modale.
 *
 * `applyLevelUp` consomme un `LevelUpDraft` validé : tous les sous-choix de
 * l'utilisateur passent par ici (ASI/feat, sous-classe, HP roll, sorts appris).
 * Le schéma est figé tôt pour que les étapes de la modale agrègent sans
 * surprise — chaque étape valide son fragment, et le confirm final fait un
 * `parse()` strict avant l'appel à la transformation pure.
 *
 * Format délibérément verbeux : pas de défauts implicites, tous les sous-choix
 * sont explicites (l'utilisateur choisit ASI ou feat à chaque level d'ASI, il
 * n'y a pas de sentinelle silencieuse).
 */

const slug = z
  .string()
  .min(1)
  .regex(/^[a-z0-9-]+$/, 'kebab-case slug only');

export const hpRollSchema = z.union([
  z.object({ kind: z.literal('average') }),
  z.object({ kind: z.literal('rolled'), rolled: z.number().int().positive() }),
]);
export type HpRoll = z.infer<typeof hpRollSchema>;

/**
 * Choix ASI : 2 points à répartir (+2 sur une stat OU +1/+1 sur 2 stats
 * distinctes). Le SRD 5.2.1 plafonne chaque stat à 20 avant la magie — borne
 * portée par `applyLevelUp` parce qu'elle dépend des stats actuelles.
 *
 * Durcissement JALON 2C.1 : superRefine garantit que la somme des bonus est
 * EXACTEMENT 2 et que le split (2 entrées) cible 2 caractéristiques
 * distinctes. Évite les shapes intermédiaires que le wizard pourrait laisser
 * passer (un seul +1, deux +2, +2 sur la même stat dupliquée, etc.).
 */
export const asiChoiceSchema = z
  .object({
    kind: z.literal('asi'),
    abilityIncreases: z
      .array(
        z.object({
          ability: abilityCodeSchema,
          bonus: z.union([z.literal(1), z.literal(2)]),
        }),
      )
      .min(1)
      .max(2),
  })
  .superRefine((value, ctx) => {
    const sum = value.abilityIncreases.reduce((acc, inc) => acc + inc.bonus, 0);
    if (sum !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['abilityIncreases'],
        message: `ASI invalide : la somme des bonus doit valoir 2 (reçu ${sum}).`,
      });
    }
    if (value.abilityIncreases.length === 2) {
      const [a, b] = value.abilityIncreases;
      if (a && b && a.ability === b.ability) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['abilityIncreases'],
          message:
            'ASI invalide : un split +1/+1 doit cibler deux caractéristiques distinctes.',
        });
      }
    }
  });
export type AsiChoice = z.infer<typeof asiChoiceSchema>;

export const featChoiceSchema = z.object({
  kind: z.literal('feat'),
  featId: slug,
});
export type FeatChoice = z.infer<typeof featChoiceSchema>;

/**
 * Choix au level d'ASI : exclusif (l'utilisateur prend ASI OU feat).
 * Absent quand le niveau atteint n'est pas un level d'ASI.
 */
export const asiOrFeatSchema = z.union([asiChoiceSchema, featChoiceSchema]);
export type AsiOrFeat = z.infer<typeof asiOrFeatSchema>;

/**
 * JALON 2D.4a — Sous-choix L1 transmis quand on AJOUTE une nouvelle classe
 * (newClassLevel === 1). Tous les champs sont optionnels — la modale fournit
 * uniquement ceux qui s'appliquent à la classe ajoutée. `applyLevelUp` mappe
 * ces champs sur la nouvelle entrée `CharacterClassEntry` en remplacement
 * des sentinelles `createEmptyClassSubChoices()`.
 *
 * Le schéma rejette dur la présence de ce champ quand `newClassLevel !== 1`
 * (superRefine sur `levelUpDraftSchema`) — un level-up classique ne doit
 * JAMAIS écraser les sous-choix L1 d'une classe existante.
 */
export const addClassSubChoicesSchema = z.object({
  clericDivineOrder: divineOrderSchema.optional(),
  druidPrimalOrder: primalOrderSchema.optional(),
  fighterFightingStyle: fightingStyleSchema.optional(),
  weaponMasteries: z.array(slug).optional(),
  expertiseSkills: z.array(slug).optional(),
  eldritchInvocations: z.array(slug).optional(),
  wizardSpellbookL1: z.array(slug).optional(),
  pactTomeCantrips: z.array(slug).optional(),
  pactTomeRituals: z.array(slug).optional(),
  pactBladeWeapon: slug.optional(),
});
export type AddClassSubChoices = z.infer<typeof addClassSubChoicesSchema>;

/**
 * Brouillon complet d'un level-up. `classId` désigne la classe qui monte de
 * niveau ; `newClassLevel` est le niveau atteint par cette classe.
 *   - `newClassLevel ≥ 2` → level-up classique (la classe existe déjà dans
 *     `character.classes[]`, on monte son niveau de +1).
 *   - `newClassLevel === 1` → AJOUT d'une nouvelle classe en multiclass
 *     (JALON 2D.3). `applyLevelUp` valide alors les prérequis SRD 2024 via
 *     `computeMulticlassEligibility` + la borne `classes.length < 4`.
 *
 * Le niveau total du perso devient `totalLevel + 1` dans les deux cas (la
 * transformation s'occupe du calcul, le brouillon porte juste l'intention).
 *
 * JALON 2D.4a — `addClassSubChoices` porte les sous-choix L1 de la classe
 * ajoutée (style de combat, ordre divin, grimoire, etc.). Présent UNIQUEMENT
 * quand `newClassLevel === 1` — superRefine ci-dessous.
 */
export const levelUpDraftSchema = z
  .object({
    classId: slug,
    newClassLevel: z.number().int().min(1).max(20),
    hpRoll: hpRollSchema,
    asiOrFeat: asiOrFeatSchema.optional(),
    subclassId: slug.optional(),
    newSpellsKnown: z.array(slug).optional(),
    newCantrips: z.array(slug).optional(),
    newInvocations: z.array(slug).optional(),
    addClassSubChoices: addClassSubChoicesSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.addClassSubChoices !== undefined && value.newClassLevel !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['addClassSubChoices'],
        message:
          "addClassSubChoices n'est valide que sur l'ajout d'une nouvelle classe (newClassLevel === 1) — refus sur level-up classique.",
      });
    }
  });
export type LevelUpDraft = z.infer<typeof levelUpDraftSchema>;
