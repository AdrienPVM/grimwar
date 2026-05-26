import { describe, it, expect } from 'vitest';

import { fogPolygonSchema } from '@/shared/types/map';

import {
  appendManualMask,
  appendManualReveal,
  clearAllFog,
  createCirclePolygon,
  maskAllFog,
  pointsToSvgString,
  revealAroundToken,
  tokenRevealId,
} from '../fog-state';

describe('fog-state — createCirclePolygon', () => {
  it('produit un polygone fermé avec le nombre de segments demandé', () => {
    const pts = createCirclePolygon({ x: 100, y: 100 }, 50, 12);
    expect(pts).toHaveLength(12);
    // Le premier point est sur l'horizontale droite (angle 0).
    expect(pts[0]).toEqual({ x: 150, y: 100 });
  });

  it('produit un polygone Zod-valide via fogPolygonSchema', () => {
    const polygon = {
      id: 'p1',
      points: [...createCirclePolygon({ x: 0, y: 0 }, 50)],
      kind: 'reveal' as const,
      createdAt: null,
    };
    expect(() => fogPolygonSchema.parse(polygon)).not.toThrow();
  });

  it('lève une erreur explicite si segments < 3', () => {
    expect(() => createCirclePolygon({ x: 0, y: 0 }, 50, 2)).toThrow(
      /segments must be >= 3/,
    );
  });

  it('utilise 24 segments par défaut (cercle visuellement rond)', () => {
    expect(createCirclePolygon({ x: 0, y: 0 }, 30)).toHaveLength(24);
  });
});

describe('fog-state — revealAroundToken', () => {
  it("ajoute un cercle de révélation à la position d'un token absent", () => {
    const next = revealAroundToken([], 'pj-1', { x: 200, y: 200 }, 80);
    expect(next).toHaveLength(1);
    const p0 = next[0]!;
    expect(p0.id).toBe(tokenRevealId('pj-1'));
    expect(p0.kind).toBe('reveal');
  });

  it("REMPLACE l'ancien cercle de ce token au lieu de l'empiler", () => {
    const first = revealAroundToken([], 'pj-1', { x: 100, y: 100 }, 80);
    const second = revealAroundToken(first, 'pj-1', { x: 500, y: 500 }, 80);
    expect(second).toHaveLength(1);
    // Le centre du polygone est désormais autour de (500, 500), pas (100, 100).
    const firstPoint = second[0]!.points[0]!;
    expect(firstPoint.x).toBeGreaterThan(400);
    expect(firstPoint.y).toBe(500);
  });

  it("ne touche pas aux polygones liés à d'autres tokens ou manuels", () => {
    const seed = revealAroundToken([], 'pj-A', { x: 100, y: 100 }, 80);
    const manualSeed = appendManualReveal(seed, [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ]);
    const next = revealAroundToken(manualSeed, 'pj-B', { x: 700, y: 700 }, 80);
    // PJ-A + manual + PJ-B = 3 entrées.
    expect(next).toHaveLength(3);
    expect(next.find((p) => p.id === tokenRevealId('pj-A'))).toBeDefined();
    expect(next.find((p) => p.id === tokenRevealId('pj-B'))).toBeDefined();
  });

  it("avec radius <= 0, retire le polygone de ce token sans en créer", () => {
    const seed = revealAroundToken([], 'pj-1', { x: 100, y: 100 }, 80);
    const next = revealAroundToken(seed, 'pj-1', { x: 500, y: 500 }, 0);
    expect(next).toHaveLength(0);
  });
});

describe('fog-state — clear/mask all', () => {
  it("'tout révéler' purge la liste (reveal complet via absence de mask)", () => {
    const seed = appendManualReveal(
      [],
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ],
    );
    expect(clearAllFog(seed)).toEqual([]);
  });

  it("'tout remasquer' purge la liste (rendu repose sur mask opaque par défaut)", () => {
    const seed = appendManualReveal(
      [],
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ],
    );
    expect(maskAllFog(seed)).toEqual([]);
  });
});

describe('fog-state — appendManualReveal / appendManualMask', () => {
  it("refuse silencieusement un polygone à moins de 3 points", () => {
    const before = appendManualReveal([], [{ x: 0, y: 0 }]);
    expect(before).toEqual([]);
  });

  it('produit un id unique préfixé manual-*', () => {
    const next = appendManualReveal(
      [],
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
      ],
      1234567890,
    );
    expect(next[0]!.id).toMatch(/^manual-reveal-/);
  });

  it("appendManualMask produit un polygone kind='mask'", () => {
    const next = appendManualMask(
      [],
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
      ],
    );
    expect(next[0]!.kind).toBe('mask');
  });
});

describe('fog-state — pointsToSvgString', () => {
  it('sérialise les points au format SVG "x,y x,y …"', () => {
    expect(
      pointsToSvgString([
        { x: 10, y: 20 },
        { x: 30, y: 40 },
      ]),
    ).toBe('10,20 30,40');
  });

  it('renvoie une chaîne vide pour un tableau vide', () => {
    expect(pointsToSvgString([])).toBe('');
  });
});
