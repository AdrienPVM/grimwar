import { describe, expect, it } from 'vitest';

import { parseDiceExpression } from '../parser';
import { applyKeep, buildD20Ast, rollAst, rollDieCrypto, rollTerm } from '../roller';

describe('rollDieCrypto', () => {
  it('throws sur sides < 2', () => {
    expect(() => rollDieCrypto(1)).toThrow();
    expect(() => rollDieCrypto(0)).toThrow();
  });

  it('produit des valeurs dans [1, sides]', () => {
    for (let i = 0; i < 200; i += 1) {
      const v = rollDieCrypto(20);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(20);
    }
  });
});

describe('rollTerm', () => {
  it('roule N dés de F faces', () => {
    const r = rollTerm({ count: 3, sides: 6 });
    expect(r.rawFaces).toHaveLength(3);
    r.rawFaces.forEach((f) => {
      expect(f).toBeGreaterThanOrEqual(1);
      expect(f).toBeLessThanOrEqual(6);
    });
    expect(r.keptFaces).toEqual(r.rawFaces);
  });

  it('applique kh1 sur 2d20', () => {
    // 10000 trials : keptFaces[0] doit toujours être le max.
    for (let i = 0; i < 100; i += 1) {
      const r = rollTerm({ count: 2, sides: 20, kh: 1 });
      expect(r.rawFaces).toHaveLength(2);
      expect(r.keptFaces).toHaveLength(1);
      expect(r.keptFaces[0]).toBe(Math.max(...r.rawFaces));
    }
  });

  it('applique kl1 sur 2d20', () => {
    for (let i = 0; i < 100; i += 1) {
      const r = rollTerm({ count: 2, sides: 20, kl: 1 });
      expect(r.keptFaces).toHaveLength(1);
      expect(r.keptFaces[0]).toBe(Math.min(...r.rawFaces));
    }
  });
});

describe('applyKeep', () => {
  it('kh garde les N plus grandes', () => {
    expect(applyKeep([3, 1, 4, 2], { count: 4, sides: 6, kh: 2 })).toEqual([4, 3]);
  });

  it('kl garde les N plus petites', () => {
    expect(applyKeep([3, 1, 4, 2], { count: 4, sides: 6, kl: 2 })).toEqual([1, 2]);
  });

  it('sans kh/kl, retourne une copie', () => {
    const faces = [1, 2, 3];
    const r = applyKeep(faces, { count: 3, sides: 6 });
    expect(r).toEqual(faces);
    expect(r).not.toBe(faces);
  });
});

describe('rollAst — distributions', () => {
  it('1d20 — uniforme sur 1-20 (10000 samples)', () => {
    const ast = parseDiceExpression('1d20');
    const buckets = new Array<number>(21).fill(0);
    for (let i = 0; i < 10000; i += 1) {
      const r = rollAst(ast, { kind: 'check', label: 't', characterId: '' });
      const face = r.keptFaces[0]!;
      buckets[face] = (buckets[face] ?? 0) + 1;
    }
    // Chaque face devrait apparaître ~500 fois ; tolérance large (250-750).
    for (let f = 1; f <= 20; f += 1) {
      expect(buckets[f]).toBeGreaterThan(250);
      expect(buckets[f]).toBeLessThan(750);
    }
  });

  it('2d20kh1 — moyenne ~13.825 sur 10000 samples (vs 10.5 plain d20)', () => {
    const ast = parseDiceExpression('2d20kh1');
    let sum = 0;
    const N = 10000;
    for (let i = 0; i < N; i += 1) {
      const r = rollAst(ast, { kind: 'check', label: 't', characterId: '' });
      sum += r.keptFaces[0]!;
    }
    const mean = sum / N;
    expect(mean).toBeGreaterThan(13.0);
    expect(mean).toBeLessThan(14.5);
  });

  it('2d20kl1 — moyenne ~7.175 sur 10000 samples', () => {
    const ast = parseDiceExpression('2d20kl1');
    let sum = 0;
    const N = 10000;
    for (let i = 0; i < N; i += 1) {
      const r = rollAst(ast, { kind: 'check', label: 't', characterId: '' });
      sum += r.keptFaces[0]!;
    }
    const mean = sum / N;
    expect(mean).toBeGreaterThan(6.0);
    expect(mean).toBeLessThan(8.0);
  });

  it('total = somme des keptFaces + modifier', () => {
    const ast = parseDiceExpression('2d6+3');
    for (let i = 0; i < 50; i += 1) {
      const r = rollAst(ast, { kind: 'damage', label: 't', characterId: '' });
      const sum = r.keptFaces.reduce((a, b) => a + b, 0);
      expect(r.total).toBe(sum + 3);
    }
  });
});

describe('rollAst — crit/fumble flags', () => {
  it('crit flag uniquement quand single-d20 retenu vaut 20', () => {
    // On force la sortie via mock de rollDieCrypto serait propre, mais ici on
    // se contente d'asserter le schema : seul un terme single-d20 trigger.
    const ast = parseDiceExpression('1d20');
    const r = rollAst(ast, { kind: 'check', label: 't', characterId: '' });
    expect(r.crit).toBe(r.keptFaces[0] === 20);
    expect(r.fumble).toBe(r.keptFaces[0] === 1);
  });

  it('crit/fumble flag NE déclenche PAS sur 1d6 ou autres dés', () => {
    const ast = parseDiceExpression('1d6');
    for (let i = 0; i < 100; i += 1) {
      const r = rollAst(ast, { kind: 'damage', label: 't', characterId: '' });
      expect(r.crit).toBe(false);
      expect(r.fumble).toBe(false);
    }
  });

  it('advantage 2d20kh1 : crit si le retenu est 20', () => {
    const ast = parseDiceExpression('2d20kh1');
    for (let i = 0; i < 100; i += 1) {
      const r = rollAst(ast, { kind: 'attack', label: 't', characterId: '' });
      expect(r.crit).toBe(r.keptFaces[0] === 20);
    }
  });
});

describe('buildD20Ast', () => {
  it('normal → 1d20', () => {
    expect(buildD20Ast(5, 'normal')).toEqual({
      terms: [{ count: 1, sides: 20 }],
      modifier: 5,
    });
  });
  it('advantage → 2d20kh1', () => {
    expect(buildD20Ast(3, 'advantage')).toEqual({
      terms: [{ count: 2, sides: 20, kh: 1 }],
      modifier: 3,
    });
  });
  it('disadvantage → 2d20kl1', () => {
    expect(buildD20Ast(-1, 'disadvantage')).toEqual({
      terms: [{ count: 2, sides: 20, kl: 1 }],
      modifier: -1,
    });
  });
});
