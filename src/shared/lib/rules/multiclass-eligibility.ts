/**
 * computeMulticlassEligibility — JALON 2D.3.
 *
 * Résout l'éligibilité d'un personnage à AJOUTER une classe en multiclass,
 * en fonction du `multiclassPrerequisite` de cette classe (peuplé en 2D.2,
 * cf. `scripts/data/srd-classes-l1.ts > SRD_MULTICLASS_PREREQUISITE_PER_CLASS`).
 *
 * Sémantique :
 *   - `combinator: 'and'` → TOUS les minima doivent être atteints (Paladin :
 *     FOR 13 ET CHA 13). Cas standard SRD 2024 — 10 classes sur 12.
 *   - `combinator: 'or'` → AU MOINS UN suffit (Guerrier : FOR 13 OU DEX 13).
 *     Seul Guerrier en SRD 2024.
 *   - `null` / `undefined` → toujours éligible (custom-content sans prereq).
 *
 * Pure function : pas de side-effects, pas de dépendance sur le state global.
 * Le retour `unmetScores[]` inclut `actual` (score courant du perso) pour que
 * le rendu tooltip (2D.4) n'ait pas à re-lire `character.abilities`. Sur un
 * OR refusé, TOUS les scores sont listés pour expliquer l'option offerte
 * (« il faut FOR 13 OU DEX 13 »).
 *
 * Type dédié plutôt que réutilisation de `FeatPrerequisite` — cf. audit
 * `plans/2D-MULTICLASS-AUDIT.md > Décisions LOCKED` + commit 2D.2 message.
 */

import type { AbilityCode, Character } from '@/shared/types/character';
import type { MulticlassPrerequisite } from '@/shared/types/content';

export interface UnmetMulticlassScore {
  ability: AbilityCode;
  minimum: number;
  actual: number;
}

export interface MulticlassEligibility {
  eligible: boolean;
  /**
   * Scores du `prerequisite` qui ne sont PAS satisfaits par les `abilities`
   * du perso. Vide si `eligible === true`.
   *
   * Sur `combinator: 'or'` refusé, on liste TOUS les scores (pour que la
   * tooltip rende le choix offert), pas juste les scores individuellement
   * manquants.
   */
  unmetScores: UnmetMulticlassScore[];
}

export function computeMulticlassEligibility(
  character: Character,
  prerequisite: MulticlassPrerequisite | null | undefined,
): MulticlassEligibility {
  if (!prerequisite || prerequisite.scores.length === 0) {
    return { eligible: true, unmetScores: [] };
  }

  const unmetIndividual = prerequisite.scores
    .filter((s) => character.abilities[s.ability] < s.minimum)
    .map((s) => ({
      ability: s.ability,
      minimum: s.minimum,
      actual: character.abilities[s.ability],
    }));

  if (prerequisite.combinator === 'or') {
    // Au moins un score satisfait suffit. Si tous échouent → refus avec la
    // liste complète des scores du prerequisite (pas seulement les unmet) —
    // sémantique tooltip : « il faut FOR 13 OU DEX 13 ».
    const eligible = unmetIndividual.length < prerequisite.scores.length;
    if (eligible) return { eligible: true, unmetScores: [] };
    return {
      eligible: false,
      unmetScores: prerequisite.scores.map((s) => ({
        ability: s.ability,
        minimum: s.minimum,
        actual: character.abilities[s.ability],
      })),
    };
  }

  // combinator === 'and' — tous les scores doivent être atteints.
  return {
    eligible: unmetIndividual.length === 0,
    unmetScores: unmetIndividual,
  };
}
