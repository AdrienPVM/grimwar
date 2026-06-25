import { proficiencyBonus } from '@/shared/lib/rules/multiclass';
import type { Character } from '@/shared/types/character';
import type { Ancestry, SpellUsage } from '@/shared/types/content';

/**
 * D12b — mécanique de lancement des sorts d'ascendance à recharge limitée.
 *
 * Les sorts d'héritage / lignage de niveau ≥ 1 (Tieffelin L3/L5, Elfe L3/L5,
 * Gnome des forêts `communication-avec-les-animaux`) ne consomment PAS
 * d'emplacement de classe : ils se lancent un nombre limité de fois par repos
 * long (SRD 5.2.1). On matérialise ce quota dans `character.featureUsage`, dont
 * la sémantique est identique à `classResources` : `current` = usages restants,
 * réinitialisé à `max` à la recharge.
 *
 * La cadence par sort est portée par le bundle (`ancestry.spellUsages[id]`,
 * peuplé par D12a). Les cantrips (`at-will` ou absents du record) n'ont aucun
 * compteur — ils restent lançables à volonté.
 */

/** Préfixe de clé `featureUsage` pour un sort d'ascendance à recharge. */
export function ancestrySpellUsageKey(spellId: string): string {
  return `ancestry-spell:${spellId}`;
}

export interface AncestrySpellUsageSpec {
  /** Clé de stockage dans `character.featureUsage`. */
  key: string;
  /** Cadence SRD du sort (jamais `at-will` ici — voir `resolveAncestrySpellUsage`). */
  cadence: Exclude<SpellUsage, 'at-will'>;
  /** Nombre d'usages par recharge. */
  max: number;
  /** Période de recharge — tous les sorts d'ascendance rechargent au repos long. */
  restoresOn: 'long';
}

/**
 * Résout la spec d'usage d'un sort d'ascendance à recharge limitée.
 *
 *  - `long-rest`   → 1 usage / repos long (Tieffelin & Elfe L3/L5).
 *  - `pb-per-rest` → bonus de maîtrise usages / repos long (Gnome des forêts
 *    `communication-avec-les-animaux`).
 *  - `at-will` ou absent du record → `null` (cantrip à volonté, aucun compteur).
 */
export function resolveAncestrySpellUsage(
  ancestry: Ancestry,
  spellId: string,
  totalLevel: number,
): AncestrySpellUsageSpec | null {
  const cadence: SpellUsage = ancestry.spellUsages?.[spellId] ?? 'at-will';
  if (cadence === 'at-will') return null;
  const max = cadence === 'pb-per-rest' ? proficiencyBonus(totalLevel) : 1;
  return { key: ancestrySpellUsageKey(spellId), cadence, max, restoresOn: 'long' };
}

/**
 * Usages restants pour une spec donnée. Plein par défaut tant que le compteur
 * n'a jamais été consommé (init paresseuse — pas d'écriture rétroactive à la
 * création de la fiche, contrairement aux emplacements de sort D28).
 */
export function remainingAncestrySpellUses(
  character: Character,
  spec: AncestrySpellUsageSpec,
): number {
  return character.featureUsage[spec.key]?.current ?? spec.max;
}
