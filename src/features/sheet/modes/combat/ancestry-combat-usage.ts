import { proficiencyBonus } from '@/shared/lib/rules/multiclass';
import type { Character } from '@/shared/types/character';

/**
 * Quota d'utilisation des aptitudes de combat d'ascendance à recharge limitée.
 *
 * Deux aptitudes partagent EXACTEMENT la même cadence SRD 5.2.1 — « autant de
 * fois que ton bonus de maîtrise par repos long » — et n'avaient jusqu'ici
 * qu'un affichage en lecture seule :
 *   - Souffle draconique (Drakéide).
 *   - Ascendance gigante (Goliath).
 *
 * On matérialise le compteur dans `character.featureUsage` (même sémantique que
 * `classResources` et que les sorts d'ascendance D12b : `current` = usages
 * restants, réinitialisé à `max` au repos long via `applyLongRest`). Aucun
 * changement de schéma : le champ `featureUsage` existe déjà ; la recharge au
 * repos long est déjà câblée. Espace de clé distinct (`ancestry-combat:`) des
 * sorts d'ascendance (`ancestry-spell:`) pour éviter toute collision.
 *
 * Init paresseuse (pas d'écriture rétroactive à la création) : tant que le
 * compteur n'a jamais été dépensé, on considère le quota plein.
 */

/** Préfixe de clé `featureUsage` pour une aptitude de combat d'ascendance. */
export function ancestryCombatUsageKey(featureId: string): string {
  return `ancestry-combat:${featureId}`;
}

/** Nombre d'usages par repos long = bonus de maîtrise au niveau total. */
export function ancestryCombatUsageMax(totalLevel: number): number {
  return proficiencyBonus(totalLevel);
}

/**
 * Usages restants pour une aptitude donnée. Plein par défaut tant que le
 * compteur n'a jamais été consommé.
 */
export function remainingAncestryCombatUses(
  character: Character,
  featureId: string,
  totalLevel: number,
): number {
  const stored = character.featureUsage[ancestryCombatUsageKey(featureId)]?.current;
  return stored ?? ancestryCombatUsageMax(totalLevel);
}

/**
 * Construit le patch `featureUsage` qui pose `current` à `next` (clampé dans
 * `[0, max]`). Retourne `null` si la valeur ne change pas (no-op → pas d'écriture
 * Firestore). `restoresOn` est toujours `'long'` pour ces aptitudes.
 */
export function setAncestryCombatUses(
  character: Character,
  featureId: string,
  totalLevel: number,
  next: number,
): Character['featureUsage'] | null {
  const max = ancestryCombatUsageMax(totalLevel);
  const clamped = Math.max(0, Math.min(max, next));
  const current = remainingAncestryCombatUses(character, featureId, totalLevel);
  if (clamped === current) return null;
  return {
    ...character.featureUsage,
    [ancestryCombatUsageKey(featureId)]: { current: clamped, max, restoresOn: 'long' },
  };
}
