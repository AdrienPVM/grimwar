import { describe, expect, it } from 'vitest';

import {
  casterLevel,
  maxHp,
  proficiencyBonus,
  spellSlotsForCasterLevel,
  totalLevel,
} from '../multiclass';

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

describe('casterLevel', () => {
  it('mono full caster compte 1:1', () => {
    expect(casterLevel([{ level: 5, progression: 'full' }])).toBe(5);
  });
  it('mono half caster (paladin/ranger) = floor(level/2)', () => {
    expect(casterLevel([{ level: 1, progression: 'half' }])).toBe(0);
    expect(casterLevel([{ level: 2, progression: 'half' }])).toBe(1);
    expect(casterLevel([{ level: 5, progression: 'half' }])).toBe(2);
  });
  it('mono third caster (arcane trickster/eldritch knight) = floor(level/3)', () => {
    expect(casterLevel([{ level: 2, progression: 'third' }])).toBe(0);
    expect(casterLevel([{ level: 3, progression: 'third' }])).toBe(1);
    expect(casterLevel([{ level: 7, progression: 'third' }])).toBe(2);
  });
  it('multi-class : somme des contributions par progression', () => {
    // 5 wizard (full=5) + 2 paladin (half=1) = 6
    expect(
      casterLevel([
        { level: 5, progression: 'full' },
        { level: 2, progression: 'half' },
      ]),
    ).toBe(6);
  });
  it('pact (warlock) est exclu de la table unifiée', () => {
    expect(casterLevel([{ level: 10, progression: 'pact' }])).toBe(0);
    // 3 wizard + 5 warlock → table unifiée = 3
    expect(
      casterLevel([
        { level: 3, progression: 'full' },
        { level: 5, progression: 'pact' },
      ]),
    ).toBe(3);
  });
  it('non-caster sans progression compte 0', () => {
    expect(casterLevel([{ level: 5, progression: null }])).toBe(0);
  });
});

describe('spellSlotsForCasterLevel', () => {
  it('niveau 0 ou négatif = aucun emplacement', () => {
    expect(spellSlotsForCasterLevel(0)).toEqual({
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0,
    });
    expect(spellSlotsForCasterLevel(-3)).toEqual({
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0,
    });
  });
  it('niveau 1 = 2 slots de niveau 1', () => {
    expect(spellSlotsForCasterLevel(1)[1]).toBe(2);
    expect(spellSlotsForCasterLevel(1)[2]).toBe(0);
  });
  it('niveau 5 full caster = 4/3/2', () => {
    const slots = spellSlotsForCasterLevel(5);
    expect(slots[1]).toBe(4);
    expect(slots[2]).toBe(3);
    expect(slots[3]).toBe(2);
    expect(slots[4]).toBe(0);
  });
  it('niveau 20 max table', () => {
    expect(spellSlotsForCasterLevel(20)).toEqual({
      1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1,
    });
  });
  it('niveau > 20 clamp sur 20', () => {
    expect(spellSlotsForCasterLevel(30)).toEqual(spellSlotsForCasterLevel(20));
  });
});
