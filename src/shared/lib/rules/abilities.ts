import { rollDieCrypto } from '../dice/roller';
import type { AbilityCode } from '../../types/character';

/** D&D 5e modifier from raw score. */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** Standard array (player distributes these 6 values across 6 abilities). */
export const STANDARD_ARRAY: readonly number[] = [15, 14, 13, 12, 10, 8];

/**
 * Point Buy : 27 points budget, score range 8-15, cost table SRD 2024.
 */
const POINT_BUY_COSTS: Record<number, number> = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9,
};
export const POINT_BUY_MIN = 8;
export const POINT_BUY_MAX = 15;
export const POINT_BUY_BUDGET = 27;

export function pointBuyCost(score: number): number {
  return POINT_BUY_COSTS[score] ?? Infinity;
}

export function pointBuyTotal(scores: Record<AbilityCode, number>): number {
  return (
    pointBuyCost(scores.for) +
    pointBuyCost(scores.dex) +
    pointBuyCost(scores.con) +
    pointBuyCost(scores.int) +
    pointBuyCost(scores.sag) +
    pointBuyCost(scores.cha)
  );
}

export function pointBuyRemaining(scores: Record<AbilityCode, number>): number {
  return POINT_BUY_BUDGET - pointBuyTotal(scores);
}

export function isValidPointBuy(scores: Record<AbilityCode, number>): boolean {
  for (const value of Object.values(scores)) {
    if (value < POINT_BUY_MIN || value > POINT_BUY_MAX) return false;
  }
  return pointBuyTotal(scores) === POINT_BUY_BUDGET;
}

export const ABILITY_ORDER: readonly AbilityCode[] = ['for', 'dex', 'con', 'int', 'sag', 'cha'];

/**
 * Méthode 4d6 keep highest 3 (« drop lowest ») — méthode de tirage classique
 * SRD 2014/2024 (PHB p. 13 « Random Generation »). Plage théorique : 3-18.
 *
 * RNG injectable pour les tests : par défaut, `rollDieCrypto` (CSPRNG, cf.
 * `dice/roller.ts`). Les specs mockent `rng` pour figer les faces.
 */
export const ROLLED_MIN = 3;
export const ROLLED_MAX = 18;

export interface Rolled4d6Result {
  rawFaces: [number, number, number, number];
  keptFaces: [number, number, number];
  /** Somme des 3 dés gardés (3-18). */
  total: number;
}

/** Roule 4d6, drop le plus bas, retourne le détail + la somme des 3 gardés. */
export function roll4d6DropLowest(rng: (sides: number) => number = rollDieCrypto): Rolled4d6Result {
  const rawFaces: [number, number, number, number] = [rng(6), rng(6), rng(6), rng(6)];
  // Drop le plus petit (premier élément après tri ascendant).
  const sorted = [...rawFaces].sort((a, b) => a - b);
  const keptFaces: [number, number, number] = [sorted[1]!, sorted[2]!, sorted[3]!];
  const total = keptFaces[0] + keptFaces[1] + keptFaces[2];
  return { rawFaces, keptFaces, total };
}

/**
 * Roule 6 scores (un par caractéristique, dans `ABILITY_ORDER`). Pas de
 * réaffectation : le 1er roll va dans FOR, le 2e dans DEX, etc. — l'utilisateur
 * doit pouvoir relancer si l'ordre ne lui convient pas.
 */
export function rollAbilities4d6(
  rng: (sides: number) => number = rollDieCrypto,
): Record<AbilityCode, Rolled4d6Result> {
  const out: Partial<Record<AbilityCode, Rolled4d6Result>> = {};
  for (const code of ABILITY_ORDER) {
    out[code] = roll4d6DropLowest(rng);
  }
  return out as Record<AbilityCode, Rolled4d6Result>;
}

/**
 * Vérifie qu'une distribution issue d'un tirage 4d6 keep-3 a chaque score dans
 * la plage théorique [3, 18]. Utilisée pour `'rolled'` en validation wizard.
 */
export function isRolled4d6Valid(scores: Record<AbilityCode, number>): boolean {
  for (const value of Object.values(scores)) {
    if (!Number.isInteger(value)) return false;
    if (value < ROLLED_MIN || value > ROLLED_MAX) return false;
  }
  return true;
}
