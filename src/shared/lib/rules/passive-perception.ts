import type { Character } from '@/shared/types/character';

import { abilityModifier } from './abilities';
import { proficiencyBonus, totalLevel } from './multiclass';
import { getSkillProficiency, skillModifier } from './skills';

/**
 * Perception passive (SRD 5.2.1) = 10 + modificateur de Perception.
 *
 * Le modificateur de Perception suit la règle standard d'une compétence de
 * Sagesse : `mod(SAG) + bonus de maîtrise × niveau de maîtrise` (0 = non
 * maîtrisé, 1 = maîtrise, 2 = expertise). On réutilise `skillModifier` pour
 * que la formule reste l'unique source de vérité, et `getSkillProficiency`
 * pour lire le niveau de maîtrise depuis `character.skills.perception`.
 *
 * Pas d'effet de bord, pas de Math.random — testable en isolation. Les bonus
 * situationnels (avantage à la Perception → +5 passif, désavantage → −5) ne
 * sont PAS appliqués ici : le passif de base est une valeur de fiche, pas un
 * jet contextuel.
 */
export function passivePerception(character: Character): number {
  const pb = proficiencyBonus(totalLevel(character.classes));
  const mod = skillModifier({
    skillId: 'perception',
    abilityMod: abilityModifier(character.abilities.sag),
    profBonus: pb,
    proficiencyLevel: getSkillProficiency(character.skills, 'perception'),
  });
  return 10 + mod;
}
