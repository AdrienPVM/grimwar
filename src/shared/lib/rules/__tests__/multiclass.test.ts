import { describe, expect, it } from 'vitest';

import { maxHp, proficiencyBonus, totalLevel } from '../multiclass';

describe('proficiencyBonus', () => {
  it('matches SRD table', () => {
    expect(proficiencyBonus(1)).toBe(2);
    expect(proficiencyBonus(4)).toBe(2);
    expect(proficiencyBonus(5)).toBe(3);
    expect(proficiencyBonus(8)).toBe(3);
    expect(proficiencyBonus(9)).toBe(4);
    expect(proficiencyBonus(13)).toBe(5);
    expect(proficiencyBonus(17)).toBe(6);
    expect(proficiencyBonus(20)).toBe(6);
  });
});

describe('totalLevel', () => {
  it('sums multiclass levels', () => {
    expect(totalLevel([{ classId: 'a', subclassId: null, level: 3 }])).toBe(3);
    expect(
      totalLevel([
        { classId: 'a', subclassId: null, level: 5 },
        { classId: 'b', subclassId: null, level: 2 },
      ]),
    ).toBe(7);
  });
});

describe('maxHp', () => {
  it('level 1 fighter (d10) with +2 CON = 12', () => {
    const hp = maxHp({
      classes: [{ classId: 'fighter', level: 1, die: 'd10' }],
      primaryClassId: 'fighter',
      conMod: 2,
    });
    expect(hp).toBe(12);
  });
  it('level 5 wizard (d6) with +0 CON = 6 + 4*4 = 22', () => {
    const hp = maxHp({
      classes: [{ classId: 'wizard', level: 5, die: 'd6' }],
      primaryClassId: 'wizard',
      conMod: 0,
    });
    expect(hp).toBe(6 + 4 * 4);
  });
  it('always at least 1', () => {
    const hp = maxHp({
      classes: [{ classId: 'wizard', level: 1, die: 'd6' }],
      primaryClassId: 'wizard',
      conMod: -10,
    });
    expect(hp).toBeGreaterThanOrEqual(1);
  });
});
