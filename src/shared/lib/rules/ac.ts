import type { Character } from '@/shared/types/character';

import { computeInvocationAcBonus } from './eldritch-invocations';

/**
 * Calcule l'AC affichée à l'écran en combinant :
 *  - la valeur dérivée d'inventaire (`acFromArmor` : armure + DEX capé + bouclier
 *    cumulables), ou en fallback la valeur désarmée portée par `character.ac`
 *    (posée au wizard = 10 + mod DEX) ;
 *  - le bonus +1 du Fighting Style Defense, applicable seulement si une armure
 *    est PORTÉE (cf. `hasEquippedBodyArmor` — bouclier seul ne compte pas) ET
 *    qu'au moins une entrée de `classes[]` a `fighterFightingStyle === 'defense'` ;
 *  - le bonus d'Armure d'ombres (D13a) : +3 quand pas d'armure portée pour un
 *    Occultiste qui a choisi l'invocation `armor-of-shadows`. Cumule avec
 *    bouclier (qui n'est pas une armure au sens SRD) ; veto par armure portée.
 *
 * Pur, sans dépendance React. Le wiring vers l'UI (StatusStrip) se fait dans
 * `sheet-screen.tsx` via `useInventoryDerived`. Pattern « seul consommateur de
 * tous les modificateurs CA » — pas de logique CA ailleurs (D19 + D20 + D13a).
 */
export interface DisplayedAcInput {
  character: Pick<Character, 'ac' | 'classes'>;
  acFromArmor: number | null;
  hasEquippedBodyArmor: boolean;
}

export function computeDisplayedAc(input: DisplayedAcInput): number {
  const base = input.acFromArmor ?? input.character.ac;
  const defenseBonus =
    input.hasEquippedBodyArmor &&
    input.character.classes.some((c) => c.fighterFightingStyle === 'defense')
      ? 1
      : 0;
  const invocationBonus = computeInvocationAcBonus({
    classes: input.character.classes,
    hasEquippedBodyArmor: input.hasEquippedBodyArmor,
  });
  return base + defenseBonus + invocationBonus;
}
