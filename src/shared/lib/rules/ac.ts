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
 *    bouclier (qui n'est pas une armure au sens SRD) ; veto par armure portée ;
 *  - les bonus AC des magic items équipés (JALON 1B.2) : Ring of Protection,
 *    Cloak of Protection, etc. Cumulables avec tous les autres.
 *
 * Pur, sans dépendance React. Le wiring vers l'UI (StatusStrip) se fait dans
 * `sheet-screen.tsx` via `useInventoryDerived`. Pattern « seul consommateur de
 * tous les modificateurs CA » — pas de logique CA ailleurs (D19 + D20 + D13a + 1B).
 */
export interface DisplayedAcInput {
  character: Pick<Character, 'ac' | 'classes'>;
  acFromArmor: number | null;
  hasEquippedBodyArmor: boolean;
  /**
   * Bonus AC plat issus des magic items équipés (et attunés si requis),
   * agrégé par `effectsContributingAcBonus`. Optional → backwards-compat
   * pour les call sites qui ne consomment pas encore le moteur d'effets.
   */
  magicItemsAcBonus?: number;
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
  const magicBonus = input.magicItemsAcBonus ?? 0;
  return base + defenseBonus + invocationBonus + magicBonus;
}
