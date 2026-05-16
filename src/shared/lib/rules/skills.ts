import type { AbilityCode, SkillProf } from '../../types/character';
import type { I18nString } from '../i18n';

/**
 * Registre canonique des 18 compétences SRD 5e.
 *
 * Les ids kebab-case correspondent aux clés stockées dans `character.skills`
 * (cf. `SKILLS_FR_TO_KEY` dans le wizard manuel). Chaque skill est attachée à
 * son ability par défaut — un futur plan pourra permettre des overrides
 * (Athletics avec FOR/DEX selon les variantes maison) sans casser la base.
 *
 * Localisation : `name` est un I18nString consommé via `localize()`, pas via
 * `t()`, parce que ce sont des entités-données plutôt que des libellés UI.
 */

export interface SkillEntry {
  id: string;
  name: I18nString;
  ability: AbilityCode;
}

export const SKILLS: readonly SkillEntry[] = [
  // FOR
  { id: 'athletics', name: { fr: 'Athlétisme', en: 'Athletics' }, ability: 'for' },
  // DEX
  { id: 'acrobatics', name: { fr: 'Acrobaties', en: 'Acrobatics' }, ability: 'dex' },
  { id: 'sleight-of-hand', name: { fr: 'Escamotage', en: 'Sleight of Hand' }, ability: 'dex' },
  { id: 'stealth', name: { fr: 'Discrétion', en: 'Stealth' }, ability: 'dex' },
  // INT
  { id: 'arcana', name: { fr: 'Arcanes', en: 'Arcana' }, ability: 'int' },
  { id: 'history', name: { fr: 'Histoire', en: 'History' }, ability: 'int' },
  { id: 'investigation', name: { fr: 'Investigation', en: 'Investigation' }, ability: 'int' },
  { id: 'nature', name: { fr: 'Nature', en: 'Nature' }, ability: 'int' },
  { id: 'religion', name: { fr: 'Religion', en: 'Religion' }, ability: 'int' },
  // SAG
  { id: 'animal-handling', name: { fr: 'Dressage', en: 'Animal Handling' }, ability: 'sag' },
  { id: 'insight', name: { fr: 'Perspicacité', en: 'Insight' }, ability: 'sag' },
  { id: 'medicine', name: { fr: 'Médecine', en: 'Medicine' }, ability: 'sag' },
  { id: 'perception', name: { fr: 'Perception', en: 'Perception' }, ability: 'sag' },
  { id: 'survival', name: { fr: 'Survie', en: 'Survival' }, ability: 'sag' },
  // CHA
  { id: 'deception', name: { fr: 'Tromperie', en: 'Deception' }, ability: 'cha' },
  { id: 'intimidation', name: { fr: 'Intimidation', en: 'Intimidation' }, ability: 'cha' },
  { id: 'performance', name: { fr: 'Représentation', en: 'Performance' }, ability: 'cha' },
  { id: 'persuasion', name: { fr: 'Persuasion', en: 'Persuasion' }, ability: 'cha' },
];

const SKILL_BY_ID = new Map<string, SkillEntry>(SKILLS.map((s) => [s.id, s]));

export function getSkill(id: string): SkillEntry | undefined {
  return SKILL_BY_ID.get(id);
}

/**
 * Modificateur d'une compétence pour un PJ donné.
 *
 * Formule : `abilityMod + proficiencyBonus × proficiencyLevel`.
 *   - 0 = non maîtrisé → +mod ability seul
 *   - 1 = maîtrise → +mod + PB
 *   - 2 = expertise → +mod + 2 × PB
 *
 * On lit la maîtrise via `character.skills[id]` (manquant = 0). Pas d'effet de
 * bord, pas de Math.random — testable en isolation.
 */
export function skillModifier(input: {
  skillId: string;
  abilityMod: number;
  profBonus: number;
  proficiencyLevel: SkillProf;
}): number {
  return input.abilityMod + input.profBonus * input.proficiencyLevel;
}

/** Lookup pratique : { skillId, proficiencyLevel } depuis `character.skills`. */
export function getSkillProficiency(
  skills: Record<string, SkillProf>,
  skillId: string,
): SkillProf {
  return skills[skillId] ?? 0;
}
