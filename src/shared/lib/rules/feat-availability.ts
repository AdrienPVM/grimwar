/**
 * computeFeatAvailability — JALON 2C-feat-3.
 *
 * Résout l'éligibilité d'un feat pour un personnage donné en se basant sur
 * son champ `prerequisites[]` structuré (peuplé en 2C-feat-2, audit
 * `plans/2C-FEAT-PREREQS-AUDIT.md`).
 *
 * Sémantique : AND strict sur les prérequis. Retourne la liste des prérequis
 * non satisfaits — consommée par `FeatPicker` (2C-feat-4) pour griser le feat
 * + rendre un tooltip listant les verrous.
 *
 * Pure function : pas de side-effects, pas de dépendance sur le state global.
 * Strictement testable sans monter le store Zustand ou le content-loader.
 */

import type { Character } from '@/shared/types/character';
import type { FeatPrerequisite } from '@/shared/types/content';

export interface FeatAvailability {
  available: boolean;
  /** Sous-ensemble strict des `prerequisites[]` non satisfaits (vide si available). */
  unmetPrerequisites: FeatPrerequisite[];
}

export function computeFeatAvailability(
  character: Character,
  prerequisites: readonly FeatPrerequisite[] | undefined,
): FeatAvailability {
  if (!prerequisites || prerequisites.length === 0) {
    return { available: true, unmetPrerequisites: [] };
  }
  const unmet = prerequisites.filter((p) => !isPrerequisiteMet(character, p));
  return { available: unmet.length === 0, unmetPrerequisites: unmet };
}

function isPrerequisiteMet(character: Character, prereq: FeatPrerequisite): boolean {
  switch (prereq.kind) {
    case 'character-level':
      return character.totalLevel >= prereq.minimum;
    case 'ability-score':
      return character.abilities[prereq.ability] >= prereq.minimum;
    case 'spellcasting':
      // Un perso « sait lancer un sort » si au moins une de ses classes a
      // une `spellcastingAbility` non-nulle (Wizard, Cleric, Sorcerer…).
      // Les classes non-lanceuses (Fighter, Barbarian) sont `null`.
      return Object.values(character.spellcastingAbility).some((v) => v !== null);
    case 'class-feature':
      // SRD 5.2.1 : aucun feat shipped n'utilise `class-feature`. Le kind
      // existe pour le custom content (JALON 3) et la rétro-doc. Tant que le
      // registry des features n'est pas exposé sur Character, on retourne
      // false (conservateur : on grise — l'utilisateur ne peut pas prendre
      // un feat dont on ne sait pas vérifier le prérequis).
      return false;
  }
}
