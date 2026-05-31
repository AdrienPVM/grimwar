import { describe, expect, it } from 'vitest';

import {
  abilityModifier,
  ABILITY_ORDER,
  isRolled4d6Valid,
  isValidPointBuy,
  pointBuyCost,
  pointBuyRemaining,
  pointBuyTotal,
  roll4d6DropLowest,
  rollAbilities4d6,
  ROLLED_MAX,
  ROLLED_MIN,
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

describe('roll4d6DropLowest', () => {
  it('drops the lowest face and sums the 3 highest', () => {
    // RNG figé : retourne en séquence 4 faces 6,5,4,2 → kept 6+5+4=15, drop 2.
    const faces = [6, 5, 4, 2];
    let i = 0;
    const rng = (): number => faces[i++]!;
    const result = roll4d6DropLowest(rng);
    expect(result.rawFaces).toEqual([6, 5, 4, 2]);
    expect(result.keptFaces).toEqual([4, 5, 6]); // tri croissant, drop le 1er
    expect(result.total).toBe(15);
  });

  it('returns 18 when all 4 faces are 6', () => {
    const rng = (): number => 6;
    const result = roll4d6DropLowest(rng);
    expect(result.total).toBe(18);
    expect(result.keptFaces).toEqual([6, 6, 6]);
  });

  it('returns 3 when all 4 faces are 1', () => {
    const rng = (): number => 1;
    const result = roll4d6DropLowest(rng);
    expect(result.total).toBe(3);
    expect(result.keptFaces).toEqual([1, 1, 1]);
  });

  it('drops only ONE of multiple low faces', () => {
    // 1,1,2,3 → drop UN seul 1, kept = 1+2+3 = 6 (pas 5).
    const faces = [1, 1, 2, 3];
    let i = 0;
    const rng = (): number => faces[i++]!;
    const result = roll4d6DropLowest(rng);
    expect(result.keptFaces).toEqual([1, 2, 3]);
    expect(result.total).toBe(6);
  });

  it('total stays in [ROLLED_MIN, ROLLED_MAX] for any sequence', () => {
    // Échantillon avec CSPRNG réel — 100 rolls, tous doivent être dans la plage.
    for (let i = 0; i < 100; i += 1) {
      const r = roll4d6DropLowest();
      expect(r.total).toBeGreaterThanOrEqual(ROLLED_MIN);
      expect(r.total).toBeLessThanOrEqual(ROLLED_MAX);
    }
  });
});

describe('rollAbilities4d6', () => {
  it('produces one Rolled4d6Result per ability in ABILITY_ORDER', () => {
    const rng = (): number => 4; // chaque face = 4 → kept 4+4+4 = 12 partout
    const result = rollAbilities4d6(rng);
    for (const code of ABILITY_ORDER) {
      expect(result[code]).toBeDefined();
      expect(result[code].total).toBe(12);
    }
  });

  it('uses RNG sequentially — 24 calls total (6 abilities × 4 dice)', () => {
    let calls = 0;
    const rng = (): number => {
      calls += 1;
      return 3;
    };
    rollAbilities4d6(rng);
    expect(calls).toBe(24);
  });
});

describe('isRolled4d6Valid', () => {
  it('passes when all scores in [3, 18]', () => {
    const valid = { for: 18, dex: 15, con: 12, int: 10, sag: 8, cha: 3 };
    expect(isRolled4d6Valid(valid)).toBe(true);
  });

  it('fails if any score < 3', () => {
    const invalid = { for: 18, dex: 15, con: 12, int: 10, sag: 8, cha: 2 };
    expect(isRolled4d6Valid(invalid)).toBe(false);
  });

  it('fails if any score > 18', () => {
    const invalid = { for: 19, dex: 15, con: 12, int: 10, sag: 8, cha: 3 };
    expect(isRolled4d6Valid(invalid)).toBe(false);
  });

  it('fails on non-integer scores', () => {
    const invalid = { for: 12.5, dex: 15, con: 12, int: 10, sag: 8, cha: 3 };
    expect(isRolled4d6Valid(invalid)).toBe(false);
  });
});
