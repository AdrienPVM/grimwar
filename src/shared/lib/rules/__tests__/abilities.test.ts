import { describe, expect, it } from 'vitest';

import {
  abilityModifier,
  isValidPointBuy,
  pointBuyCost,
  pointBuyRemaining,
  pointBuyTotal,
} from '../abilities';

describe('abilityModifier', () => {
  it('returns 0 for score 10-11', () => {
    expect(abilityModifier(10)).toBe(0);
    expect(abilityModifier(11)).toBe(0);
  });
  it('returns +N for score 12,14,16…', () => {
    expect(abilityModifier(12)).toBe(1);
    expect(abilityModifier(14)).toBe(2);
    expect(abilityModifier(20)).toBe(5);
  });
  it('returns -N for score 8,6…', () => {
    expect(abilityModifier(8)).toBe(-1);
    expect(abilityModifier(6)).toBe(-2);
    expect(abilityModifier(1)).toBe(-5);
  });
});

describe('point-buy', () => {
  it('cost table matches SRD 2024', () => {
    expect(pointBuyCost(8)).toBe(0);
    expect(pointBuyCost(13)).toBe(5);
    expect(pointBuyCost(15)).toBe(9);
    expect(pointBuyCost(16)).toBe(Infinity);
  });
  it('total = sum of costs across 6 abilities', () => {
    const allEights = { for: 8, dex: 8, con: 8, int: 8, sag: 8, cha: 8 };
    expect(pointBuyTotal(allEights)).toBe(0);
    const allFifteens = { for: 15, dex: 15, con: 15, int: 15, sag: 15, cha: 15 };
    expect(pointBuyTotal(allFifteens)).toBe(54);
  });
  it('remaining decreases as scores rise', () => {
    const balanced = { for: 13, dex: 13, con: 13, int: 12, sag: 12, cha: 8 };
    expect(pointBuyRemaining(balanced)).toBe(27 - (5 + 5 + 5 + 4 + 4 + 0));
  });
  it('isValidPointBuy passes only when budget hit exactly + range respected', () => {
    const valid = { for: 15, dex: 15, con: 15, int: 8, sag: 8, cha: 8 };
    // cost 9+9+9+0+0+0 = 27 ✓
    expect(pointBuyTotal(valid)).toBe(27);
    expect(isValidPointBuy(valid)).toBe(true);
    const offBudget = { for: 14, dex: 14, con: 14, int: 8, sag: 8, cha: 8 };
    expect(isValidPointBuy(offBudget)).toBe(false); // 7+7+7 = 21
    const outOfRange = { for: 16, dex: 8, con: 8, int: 8, sag: 8, cha: 8 };
    expect(isValidPointBuy(outOfRange)).toBe(false);
  });
});
