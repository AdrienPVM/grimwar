import { abilityModifier } from '@/shared/lib/rules/abilities';
import type { Item, MagicItem } from '@/shared/types/content';
import type { InventoryItem } from '@/shared/lib/inventory';

/**
 * Règles pures de l'inventaire : encombrement et calcul d'AC depuis l'armure
 * équipée. Extrait du hook `useInventoryDerived` pour être testable sans React.
 */

export type EncumbranceLevel = 'normal' | 'encumbered' | 'heavily-encumbered';

/** Conversion lbs→kg appliquée à la capacité SRD `FOR × 15 lb`. */
export const CARRY_PER_STR_KG = 7.5;

/**
 * Seuils Variant Encumbrance SRD (PHB 2024) :
 *   - < FOR × 5 lb (FOR × 2.25 kg)  : normal
 *   - < FOR × 10 lb (FOR × 4.5 kg)  : encombré (vitesse −10 ft)
 *   - >= FOR × 10 lb                : encombré lourd (vitesse −20 ft, désavantage saves)
 *
 * Plan 10 step 3 mentionne le variant `grittyRealism` — non câblé en S1 car
 * les settings vivent sur la campagne (S2). Quand `useCampaignSettings` est
 * disponible, le helper acceptera une option `mode: 'standard' | 'gritty'`.
 */
export function computeEncumbrance(weightKg: number, strScore: number): EncumbranceLevel {
  const lightMax = strScore * 2.25;
  const mediumMax = strScore * 4.5;
  if (weightKg < lightMax) return 'normal';
  if (weightKg < mediumMax) return 'encumbered';
  return 'heavily-encumbered';
}

/** Capacité de charge totale (kg) selon FOR. */
export function carryingCapacity(strScore: number): number {
  return Math.round(strScore * CARRY_PER_STR_KG * 10) / 10;
}

/**
 * Calcule l'AC issue de l'armure équipée. Magic items sont ignorés (leur
 * effet AC viendra dans plan 19 via un mapping dédié magic → AC bonus).
 *
 *   - armor + acBase : `acBase + min(dexMod, acDexMax ?? Infinity)`
 *   - shield (catégorie 'shield') : +2 cumulable
 *   - Aucune armure & aucun bouclier → null (la fiche garde son `ac` par
 *     défaut, calculé au wizard via 10 + DEX).
 *
 * Si plusieurs armures sont équipées par erreur, on retient la meilleure.
 */
export interface EquippedRow {
  item: Item | MagicItem;
  inventory: InventoryItem;
  isMagic: boolean;
}

export function computeAcFromArmor(
  rows: readonly EquippedRow[],
  dexScore: number,
): number | null {
  let bestArmor: number | null = null;
  let shieldBonus = 0;
  const dexMod = abilityModifier(dexScore);
  for (const row of rows) {
    if (!row.inventory.equipped || row.isMagic) continue;
    const item = row.item as Item;
    if (item.category === 'armor' && typeof item.acBase === 'number') {
      const cappedDex =
        item.acDexMax === null || item.acDexMax === undefined
          ? dexMod
          : Math.min(dexMod, item.acDexMax);
      const ac = item.acBase + cappedDex;
      if (bestArmor === null || ac > bestArmor) bestArmor = ac;
    } else if (item.category === 'shield') {
      shieldBonus += 2;
    }
  }
  if (bestArmor === null && shieldBonus === 0) return null;
  return (bestArmor ?? 10 + dexMod) + shieldBonus;
}

/**
 * Détecte si une armure légère/intermédiaire/lourde est PORTÉE — gate du
 * Fighting Style Defense (+1 CA, SRD 2024). Un bouclier seul ne déclenche pas
 * le bonus : la règle exige « while wearing armor », ce qui exclut le shield-only.
 * Séparé de `computeAcFromArmor` pour que le caller exprime explicitement la
 * discrimination armure-portée vs valeur d'AC effective.
 */
export function hasEquippedBodyArmor(rows: readonly EquippedRow[]): boolean {
  for (const row of rows) {
    if (!row.inventory.equipped || row.isMagic) continue;
    const item = row.item as Item;
    if (item.category === 'armor' && typeof item.acBase === 'number') {
      return true;
    }
  }
  return false;
}
