import {
  divineOrderSchema,
  fightingStyleSchema,
  primalOrderSchema,
  type DivineOrder,
  type FightingStyle,
  type PrimalOrder,
} from '@/shared/types/character';

/**
 * Helpers de narrowing pour les chooser components de classe (plan 13.9 step 1-8).
 *
 * Même contrat que `steps/ancestry/chooser-utils.ts` : `safeParse` rejette
 * silencieusement une string hors-SRD — utile pour le compileur, ne devrait
 * jamais se déclencher en runtime (les options viennent du bundle canonique
 * ou d'enums constants).
 */

export function asDivineOrder(raw: string): DivineOrder | null {
  const p = divineOrderSchema.safeParse(raw);
  return p.success ? p.data : null;
}

export function asPrimalOrder(raw: string): PrimalOrder | null {
  const p = primalOrderSchema.safeParse(raw);
  return p.success ? p.data : null;
}

export function asFightingStyle(raw: string): FightingStyle | null {
  const p = fightingStyleSchema.safeParse(raw);
  return p.success ? p.data : null;
}

/**
 * Bascule une valeur dans un tableau de sélection multiple borné à `max`.
 *
 * - Si `id` déjà présent → on l'enlève (toggle off).
 * - Si `id` absent et la liste est < `max` → on l'ajoute.
 * - Si `id` absent et la liste est === `max` → no-op (refus de dépasser).
 *
 * Utilisé par weapon-mastery, expertise, eldritch-invocations, extra-languages,
 * wizard-spellbook. La règle "exactement N" est portée par la validation
 * (commit 3) — ici on impose juste la borne haute pour empêcher de dépasser.
 */
export function toggleBoundedSelection(
  current: readonly string[],
  id: string,
  max: number,
): string[] {
  if (current.includes(id)) {
    return current.filter((x) => x !== id);
  }
  if (current.length >= max) return [...current];
  return [...current, id];
}
