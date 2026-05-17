import { useMemo } from 'react';

import { useContent } from '@/shared/hooks/use-content';
import type { AncestrySubChoices } from '@/shared/types/character';
import type { Ancestry, AncestryOptions } from '@/shared/types/content';

/**
 * Sous-choix d'ascendance niveau 1 SRD 5.2.1 (plan 13.8).
 *
 * La source unique de vérité runtime pour :
 * - quels sous-choix sont REQUIS par ancestryId
 * - quelles valeurs sont ADMISES pour chacun
 *
 * Lue par les chooser components (commit 2) ET par `wizard-validation.ts`
 * (commit 4). Aucune duplication de cette table ailleurs dans le code.
 *
 * Note : certaines valeurs admises viennent de `ancestries.json > options`
 * (drago naAncestries, tieflingLegacies, etc.) ; d'autres sont des constantes
 * canoniques courtes (caractéristique d'incantation int/sag/cha, taille
 * small/medium, Sens Aiguisés elfe parmi 3 skills). Le commentaire de chaque
 * constante pointe sa source SRD.
 */

export type AncestrySubChoiceKey =
  | 'dragonAncestry'
  | 'tieflingLegacy'
  | 'elfLineage'
  | 'gnomeLineage'
  | 'goliathAncestry'
  | 'ancestryCastingAbility'
  | 'ancestryExtraSkill'
  | 'ancestrySize';

export interface AncestrySubChoiceRequirement {
  key: AncestrySubChoiceKey;
  admissibleValues: readonly string[];
}

/**
 * Caractéristique d'incantation utilisable par un trait d'ascendance (SRD
 * 5.2.1 : Tieffelin Héritage fiélon, Elfe lignage Drow/Haut-elfe/Sylvestre,
 * Gnome Lignage gnome). Choix posé à la création.
 */
export const ANCESTRY_CASTING_ABILITY_VALUES = ['int', 'sag', 'cha'] as const;

/** Tailles admises par Tieffelin et Humain (SRD 5.2.1 : Medium ou Small). */
export const ANCESTRY_SIZE_VALUES = ['small', 'medium'] as const;

/**
 * Sens Aiguisés (Elfe — SRD 5.2.1) : maîtrise d'1 compétence parmi 3. C'est
 * un sous-ensemble fixe et court, sourcé inline plutôt que dans le bundle.
 */
export const ELF_KEEN_SENSES_SKILLS = ['insight', 'perception', 'survival'] as const;

/**
 * Mapping ancestryId → sous-choix requis.
 *
 * Source : `docs/AUDIT-SRD-COMPLETUDE.md` section A.1.
 * - Dwarf / Halfling / Orc : aucun sous-choix imposé.
 * - Dragonborn : type de dragon.
 * - Tiefling : héritage + caract. d'incantation + taille.
 * - Elf : lignage + caract. d'incantation (pour cantrip lignage) + skill Sens Aiguisés.
 * - Gnome : lignage + caract. d'incantation.
 * - Goliath : ascendance gigante.
 * - Human : taille + 1 skill (Compétent).
 */
const REQUIREMENTS_BY_ANCESTRY: Record<string, readonly AncestrySubChoiceKey[]> = {
  dragonborn: ['dragonAncestry'],
  tiefling: ['tieflingLegacy', 'ancestryCastingAbility', 'ancestrySize'],
  elf: ['elfLineage', 'ancestryCastingAbility', 'ancestryExtraSkill'],
  gnome: ['gnomeLineage', 'ancestryCastingAbility'],
  goliath: ['goliathAncestry'],
  human: ['ancestrySize', 'ancestryExtraSkill'],
  dwarf: [],
  halfling: [],
  orc: [],
};

export function getAncestrySubChoiceKeys(
  ancestryId: string | null,
): readonly AncestrySubChoiceKey[] {
  if (!ancestryId) return [];
  return REQUIREMENTS_BY_ANCESTRY[ancestryId] ?? [];
}

/**
 * Construit la liste typée des sous-choix requis pour une ancestry donnée, avec
 * leurs valeurs admises. Fonction PURE (zéro React) — utilisée par le hook UI
 * et par la validation côté submit.
 */
export function getAncestrySubChoiceRequirements(
  ancestryId: string | null,
  ancestries: readonly Ancestry[],
): readonly AncestrySubChoiceRequirement[] {
  const keys = getAncestrySubChoiceKeys(ancestryId);
  if (keys.length === 0) return [];

  const ancestry = ancestryId
    ? (ancestries.find((a) => a.id === ancestryId) ?? null)
    : null;
  const opts: AncestryOptions = ancestry?.options ?? {};

  return keys.map((key) => ({
    key,
    admissibleValues: admissibleValuesFor(key, opts),
  }));
}

function admissibleValuesFor(
  key: AncestrySubChoiceKey,
  opts: AncestryOptions,
): readonly string[] {
  switch (key) {
    case 'dragonAncestry':
      return (opts.dragonAncestries ?? []).map((o) => o.id);
    case 'tieflingLegacy':
      return (opts.tieflingLegacies ?? []).map((o) => o.id);
    case 'elfLineage':
      return (opts.elfLineages ?? []).map((o) => o.id);
    case 'gnomeLineage':
      return (opts.gnomeLineages ?? []).map((o) => o.id);
    case 'goliathAncestry':
      return (opts.giantAncestries ?? []).map((o) => o.id);
    case 'ancestryCastingAbility':
      return ANCESTRY_CASTING_ABILITY_VALUES;
    case 'ancestrySize':
      return ANCESTRY_SIZE_VALUES;
    case 'ancestryExtraSkill': {
      // Humain Compétent : 18 skills via skillfulOptions ; Elfe Sens Aiguisés
      // : 3 skills hardcodés. Le routage se fait par présence dans le bundle.
      if (opts.skillfulOptions && opts.skillfulOptions.length > 0) {
        return opts.skillfulOptions;
      }
      return ELF_KEEN_SENSES_SKILLS;
    }
    default: {
      // Garde-fou TS : exhaustive check sur AncestrySubChoiceKey.
      const _never: never = key;
      void _never;
      return [];
    }
  }
}

/**
 * Test pur : tous les sous-choix requis sont-ils posés ?
 *
 * Ne dépend PAS de la liste des valeurs admises (la garde stricte sur les
 * valeurs est portée par les enums Zod du schéma `AncestrySubChoices`). Ici
 * on vérifie juste que le champ n'est pas en sentinelle `null`.
 */
export function isAncestrySubChoicesCompleted(
  ancestryId: string | null,
  subChoices: AncestrySubChoices,
): boolean {
  const keys = getAncestrySubChoiceKeys(ancestryId);
  return keys.every((key) => subChoices[key] !== null);
}

export interface UseAncestrySubChoicesResult {
  /** Sous-choix requis dans l'ordre d'affichage, avec valeurs admises lues du bundle. */
  requirements: readonly AncestrySubChoiceRequirement[];
  /** Sous-objet `options` typé de l'ascendance courante, ou `{}` si aucune ou non chargée. */
  options: AncestryOptions;
}

/**
 * Hook React qui lit `useContent('ancestries')` et retourne le plan typé des
 * sous-choix requis pour l'ascendance courante.
 */
export function useAncestrySubChoices(
  ancestryId: string | null,
): UseAncestrySubChoicesResult {
  const ancestries = useContent('ancestries');
  return useMemo(() => {
    const ancestry = ancestryId
      ? (ancestries.data.find((a) => a.id === ancestryId) ?? null)
      : null;
    return {
      requirements: getAncestrySubChoiceRequirements(ancestryId, ancestries.data),
      options: ancestry?.options ?? {},
    };
  }, [ancestryId, ancestries.data]);
}
