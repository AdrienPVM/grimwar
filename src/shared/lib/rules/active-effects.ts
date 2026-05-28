import type { AbilityCode } from '@/shared/types/character';
import type { MagicItem, MagicItemEffect } from '@/shared/types/content';
import type { InventoryItem } from '@/shared/lib/inventory';

/**
 * Moteur d'effets actifs — JALON 1B v0.
 *
 * Agrège les effets structurés (`MagicItemEffect`) des magic items équipés
 * (et attunés si requis) en une liste d'effets ACTIFS, puis expose des
 * helpers purs `computeDisplayed*` consommés par l'UI (StatusStrip,
 * HpMegaCard, SavesRow, etc.).
 *
 * Pattern hérité de `computeDisplayedAc` (D19+D20+D13a) : « seul consommateur
 * de tous les modificateurs » par stat, pas de logique éparpillée dans l'UI.
 *
 * v0 — bonus statiques additifs (ac/save/speed) + ability-set-floor.
 * v0+ — résistances, attaque, conditionnels (V1.1).
 */

export interface ResolvedMagicInventoryRow {
  inventory: InventoryItem;
  magic: MagicItem;
}

/**
 * Filtre + extrait les effets actifs des magic items équipés. Un effet est
 * « actif » ssi son item est équipé ET (si l'item requiert attunement)
 * attuné.
 *
 * Items sans `effects[]` (legacy bundle) → ignorés silencieusement (pas une
 * erreur — le champ est optional, la plupart des 251 items SRD n'auront
 * jamais d'effets structurés v0).
 */
export function aggregateEffects(
  rows: readonly ResolvedMagicInventoryRow[],
): MagicItemEffect[] {
  const out: MagicItemEffect[] = [];
  for (const row of rows) {
    if (!row.inventory.equipped) continue;
    const requiresAttunement = row.magic.attunement !== false;
    if (requiresAttunement && !row.inventory.attuned) continue;
    if (!row.magic.effects) continue;
    out.push(...row.magic.effects);
  }
  return out;
}

/**
 * Calcule la valeur affichée d'une caractéristique en appliquant tout effet
 * `ability-set-floor` qui la cible. Sémantique 5e : `max(base, floor)` — un
 * objet qui promet « FOR 21 minimum » ne fait JAMAIS baisser un perso à
 * FOR 24. Plusieurs floors sur la même ability → on prend le plus haut.
 */
export function computeDisplayedAbility(
  ability: AbilityCode,
  base: number,
  effects: readonly MagicItemEffect[],
): number {
  let result = base;
  for (const eff of effects) {
    if (eff.kind !== 'ability-set-floor') continue;
    if (eff.ability !== ability) continue;
    if (eff.minimum > result) result = eff.minimum;
  }
  return result;
}

/**
 * Calcule la vitesse affichée en additionnant tous les `speed-bonus`. Plancher
 * à 0 sur somme négative (cas pathologique mais légitime — un futur effet
 * de ralentissement v0+).
 */
export function computeDisplayedSpeed(
  base: number,
  effects: readonly MagicItemEffect[],
): number {
  let bonus = 0;
  for (const eff of effects) {
    if (eff.kind === 'speed-bonus') bonus += eff.bonus;
  }
  return Math.max(0, base + bonus);
}

/**
 * Bonus total à appliquer à TOUTES les sauvegardes (Cloak of Protection,
 * Ring of Protection, etc.). Les sauves spécifiques (ex. avantage sur
 * Empoisonné des Periapt of Health) sont hors scope v0 — viendront avec
 * le kind `save-bonus-vs-condition` en V1.1.
 */
export function computeDisplayedSaveBonus(
  effects: readonly MagicItemEffect[],
): number {
  let bonus = 0;
  for (const eff of effects) {
    if (eff.kind === 'save-bonus-all') bonus += eff.bonus;
  }
  return bonus;
}

/**
 * Somme des `ac-bonus` actifs. À additionner à `computeDisplayedAc` pour
 * obtenir la CA finale affichée à la fiche. Pourquoi un helper séparé :
 * `computeDisplayedAc` reste pur côté armure + invocations + style ; les
 * bonus de magic items vivent dans le moteur d'effets — séparation des
 * sources, jointure au seul site de consommation (StatusStrip via le hook
 * `useInventoryDerived`).
 */
export function effectsContributingAcBonus(
  effects: readonly MagicItemEffect[],
): number {
  let bonus = 0;
  for (const eff of effects) {
    if (eff.kind === 'ac-bonus') bonus += eff.bonus;
  }
  return bonus;
}
