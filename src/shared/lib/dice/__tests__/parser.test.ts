import { describe, expect, it } from 'vitest';

import { parseDiceExpression, stringifyDiceAst } from '../parser';

describe('parseDiceExpression', () => {
  it('parse `1d20`', () => {
    expect(parseDiceExpression('1d20')).toEqual({
      terms: [{ count: 1, sides: 20 }],
      modifier: 0,
    });
  });

  it('parse `2d6+3`', () => {
    expect(parseDiceExpression('2d6+3')).toEqual({
      terms: [{ count: 2, sides: 6 }],
      modifier: 3,
    });
  });

  it('parse `1d20+1d4-2`', () => {
    expect(parseDiceExpression('1d20+1d4-2')).toEqual({
      terms: [
        { count: 1, sides: 20 },
        { count: 1, sides: 4 },
      ],
      modifier: -2,
    });
  });

  it('parse `8d6` (boule de feu)', () => {
    expect(parseDiceExpression('8d6')).toEqual({
      terms: [{ count: 8, sides: 6 }],
      modifier: 0,
    });
  });

  it('parse `2d20kh1` (advantage)', () => {
    expect(parseDiceExpression('2d20kh1')).toEqual({
      terms: [{ count: 2, sides: 20, kh: 1 }],
      modifier: 0,
    });
  });

  it('parse `2d20kl1` (disadvantage)', () => {
    expect(parseDiceExpression('2d20kl1')).toEqual({
      terms: [{ count: 2, sides: 20, kl: 1 }],
      modifier: 0,
    });
  });

  it('parse `1d20kh1` (kh sur single d20 — autorisé, no-op)', () => {
    expect(parseDiceExpression('1d20kh1')).toEqual({
      terms: [{ count: 1, sides: 20, kh: 1 }],
      modifier: 0,
    });
  });

  it('parse `+3` (modificateur plat seul)', () => {
    expect(parseDiceExpression('+3')).toEqual({ terms: [], modifier: 3 });
  });

  it('parse `-2` (modificateur plat négatif)', () => {
    expect(parseDiceExpression('-2')).toEqual({ terms: [], modifier: -2 });
  });

  it('tolère whitespace et casse', () => {
    expect(parseDiceExpression(' 1D20 + 3 ')).toEqual({
      terms: [{ count: 1, sides: 20 }],
      modifier: 3,
    });
    expect(parseDiceExpression('2D6+1d4-1')).toEqual({
      terms: [
        { count: 2, sides: 6 },
        { count: 1, sides: 4 },
      ],
      modifier: -1,
    });
  });

  it('parse `1d8-1` (modificateur négatif simple)', () => {
    expect(parseDiceExpression('1d8-1')).toEqual({
      terms: [{ count: 1, sides: 8 }],
      modifier: -1,
    });
  });

  it('parse `3d4+2d6+5` (deux termes différents + mod)', () => {
    expect(parseDiceExpression('3d4+2d6+5')).toEqual({
      terms: [
        { count: 3, sides: 4 },
        { count: 2, sides: 6 },
      ],
      modifier: 5,
    });
  });

  it('throw sur expression vide', () => {
    expect(() => parseDiceExpression('')).toThrow(/vide/);
    expect(() => parseDiceExpression('   ')).toThrow(/vide/);
  });

  it('throw sur sides < 2', () => {
    expect(() => parseDiceExpression('1d1')).toThrow(/sides/);
  });

  it('throw sur count = 0', () => {
    expect(() => parseDiceExpression('0d20')).toThrow(/count/);
  });

  it('throw sur kh > count', () => {
    expect(() => parseDiceExpression('2d20kh3')).toThrow(/kh/);
  });

  it('throw sur kl > count', () => {
    expect(() => parseDiceExpression('2d20kl3')).toThrow(/kl/);
  });

  it('throw sur token non reconnu', () => {
    expect(() => parseDiceExpression('abc')).toThrow(/non reconnu|signe attendu/);
    expect(() => parseDiceExpression('1d')).toThrow();
  });

  it('throw sur terme de dés négatif', () => {
    expect(() => parseDiceExpression('1d20-1d4')).toThrow(/négatif/);
  });
});

describe('stringifyDiceAst', () => {
  it('round-trip `1d20+5`', () => {
    const ast = parseDiceExpression('1d20+5');
    expect(stringifyDiceAst(ast)).toBe('1d20+5');
  });

  it('round-trip `2d6-1`', () => {
    const ast = parseDiceExpression('2d6-1');
    expect(stringifyDiceAst(ast)).toBe('2d6-1');
  });

  it('round-trip `2d20kh1`', () => {
    const ast = parseDiceExpression('2d20kh1');
    expect(stringifyDiceAst(ast)).toBe('2d20kh1');
  });

  it('sérialise `8d6` sans modificateur', () => {
    const ast = parseDiceExpression('8d6');
    expect(stringifyDiceAst(ast)).toBe('8d6');
  });

  it('sérialise modificateur seul `+3`', () => {
    const ast = parseDiceExpression('+3');
    expect(stringifyDiceAst(ast)).toBe('+3');
  });
});
