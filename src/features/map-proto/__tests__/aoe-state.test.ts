import { describe, it, expect } from 'vitest';

import { aoeTemplateSchema } from '@/shared/types/map';

import {
  addAoe,
  buildConePoints,
  buildCubePoints,
  buildLinePoints,
  clearAoes,
  createAoe,
  DEFAULT_AOE_DIMENSIONS,
  removeAoe,
  rotateAoe,
} from '../aoe-state';

describe('aoe-state — DEFAULT_AOE_DIMENSIONS', () => {
  it('sphere : radius 200 px (Boule de feu 20 ft)', () => {
    expect(DEFAULT_AOE_DIMENSIONS.sphere).toEqual({ radius: 200 });
  });

  it('cone : radius 150 + angleDeg 53.13° (SRD)', () => {
    expect(DEFAULT_AOE_DIMENSIONS.cone).toEqual({ radius: 150, angleDeg: 53.13 });
  });

  it('line : length 600 × width 50', () => {
    expect(DEFAULT_AOE_DIMENSIONS.line).toEqual({ length: 600, width: 50 });
  });

  it('cube : side 200', () => {
    expect(DEFAULT_AOE_DIMENSIONS.cube).toEqual({ side: 200 });
  });
});

describe('aoe-state — createAoe', () => {
  it('produit un template Zod-valide pour chaque forme', () => {
    for (const shape of ['sphere', 'cone', 'line', 'cube'] as const) {
      const aoe = createAoe(`a-${shape}`, shape, { x: 100, y: 100 });
      expect(() => aoeTemplateSchema.parse(aoe)).not.toThrow();
      expect(aoe.shape).toBe(shape);
      expect(aoe.pinned).toBe(true);
    }
  });

  it('accepte un override de dimensions', () => {
    const aoe = createAoe('a1', 'sphere', { x: 0, y: 0 }, {
      dimensions: { radius: 500 },
    });
    expect(aoe.dimensions).toEqual({ radius: 500 });
  });

  it("propage spellSlug et sourceCharacterId quand fournis", () => {
    const aoe = createAoe('a1', 'sphere', { x: 0, y: 0 }, {
      spellSlug: 'boule-de-feu',
      sourceCharacterId: 'char-001',
    });
    expect(aoe.spellSlug).toBe('boule-de-feu');
    expect(aoe.sourceCharacterId).toBe('char-001');
  });
});

describe('aoe-state — addAoe / removeAoe', () => {
  it("addAoe ajoute un template avec dimensions par défaut", () => {
    const next = addAoe([], 'sphere', { x: 100, y: 100 });
    expect(next).toHaveLength(1);
    expect(next[0]!.dimensions).toEqual({ radius: 200 });
  });

  it("removeAoe retire par id", () => {
    const seed = addAoe([], 'sphere', { x: 0, y: 0 }, 1000);
    const next = removeAoe(seed, seed[0]!.id);
    expect(next).toEqual([]);
  });
});

describe('aoe-state — rotateAoe', () => {
  it("ajoute rotationDeg modulo 360", () => {
    const seed = addAoe([], 'cone', { x: 0, y: 0 }, 1000);
    const r1 = rotateAoe(seed, seed[0]!.id, 90);
    expect(r1[0]!.rotationDeg).toBe(90);
    const r2 = rotateAoe(r1, seed[0]!.id, 290);
    expect(r2[0]!.rotationDeg).toBe(20); // (90 + 290) % 360 = 20
  });

  it("gère les rotations négatives (wraparound)", () => {
    const seed = addAoe([], 'cone', { x: 0, y: 0 }, 1000);
    const r1 = rotateAoe(seed, seed[0]!.id, -30);
    expect(r1[0]!.rotationDeg).toBe(330);
  });
});

describe('aoe-state — clearAoes', () => {
  it("purge la liste", () => {
    const seed = addAoe([], 'sphere', { x: 0, y: 0 });
    expect(clearAoes(seed)).toEqual([]);
  });
});

describe('aoe-state — geometry helpers', () => {
  it("buildConePoints produit un triangle isocèle pointe à l'origine", () => {
    const pts = buildConePoints(100, 53.13);
    expect(pts).toHaveLength(3);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[1]!.x).toBe(100);
    expect(pts[2]!.x).toBe(100);
    // Symétrie haut/bas.
    expect(pts[1]!.y).toBeCloseTo(-pts[2]!.y, 5);
  });

  it("buildLinePoints produit un rectangle centré sur l'axe X", () => {
    const pts = buildLinePoints(200, 40);
    expect(pts).toHaveLength(4);
    expect(pts[0]).toEqual({ x: 0, y: -20 });
    expect(pts[1]).toEqual({ x: 200, y: -20 });
    expect(pts[2]).toEqual({ x: 200, y: 20 });
    expect(pts[3]).toEqual({ x: 0, y: 20 });
  });

  it("buildCubePoints produit un carré centré sur l'origine", () => {
    const pts = buildCubePoints(100);
    expect(pts).toHaveLength(4);
    expect(pts[0]).toEqual({ x: -50, y: -50 });
    expect(pts[2]).toEqual({ x: 50, y: 50 });
  });
});
