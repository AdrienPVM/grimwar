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
