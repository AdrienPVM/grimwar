import { describe, expect, it } from 'vitest';

import type { WallPolyline } from '@/shared/types/map';

import {
  boundingSegments,
  buildLosReveal,
  computeVisibilityPolygon,
  losRevealId,
  raySegmentDistance,
  wallsToSegments,
  type WorldBounds,
} from '../los-state';

const BOUNDS: WorldBounds = { width: 1000, height: 700 };

describe('wallsToSegments', () => {
  it('éclate une polyligne de N points en N-1 segments', () => {
    const walls: WallPolyline[] = [
      {
        id: 'w',
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 10 },
        ],
      },
    ];
    expect(wallsToSegments(walls)).toHaveLength(2);
  });

  it('renvoie [] pour aucune polyligne', () => {
    expect(wallsToSegments([])).toHaveLength(0);
  });
});

describe('boundingSegments', () => {
  it('produit les 4 arêtes du rectangle monde', () => {
    expect(boundingSegments(BOUNDS)).toHaveLength(4);
  });
});

describe('raySegmentDistance', () => {
  it('renvoie la distance exacte à un mur vertical droit devant', () => {
    // origine (0,0), direction est (1,0), mur vertical x=5 de y=-5 à y=5
    const t = raySegmentDistance(
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 5, y: -5 },
      { x: 5, y: 5 },
    );
    expect(t).toBeCloseTo(5, 5);
  });

  it('renvoie null si le mur est derrière le rayon', () => {
    const t = raySegmentDistance(
      { x: 0, y: 0 },
      { x: -1, y: 0 }, // direction ouest, mur à l'est
      { x: 5, y: -5 },
      { x: 5, y: 5 },
    );
    expect(t).toBeNull();
  });

  it('renvoie null si le rayon manque le segment (hors bornes u)', () => {
    const t = raySegmentDistance(
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 5, y: 10 }, // segment entièrement au-dessus
      { x: 5, y: 20 },
    );
    expect(t).toBeNull();
  });

  it('renvoie null pour un rayon parallèle au segment', () => {
    const t = raySegmentDistance(
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 5 },
      { x: 10, y: 5 }, // segment horizontal, rayon horizontal
    );
    expect(t).toBeNull();
  });
});

describe('computeVisibilityPolygon', () => {
  it('en espace ouvert, borne la visibilité au rayon max (cap circulaire)', () => {
    const poly = computeVisibilityPolygon(
      { x: 500, y: 350 },
      [],
      BOUNDS,
      100,
    );
    expect(poly.length).toBeGreaterThan(3);
    // tous les sommets sont à ~100 de l'origine (cap), tolérance epsilon coins.
    for (const p of poly) {
      const d = Math.hypot(p.x - 500, p.y - 350);
      expect(d).toBeLessThanOrEqual(101);
    }
  });

  it('un mur occlut la vision : le rayon est raccourci derrière le mur', () => {
    // origine (100,350), mur vertical x=200 de y=300 à y=400, rayon max 500.
    const wall = { a: { x: 200, y: 300 }, b: { x: 200, y: 400 } };
    const poly = computeVisibilityPolygon(
      { x: 100, y: 350 },
      [wall],
      BOUNDS,
      500,
    );
    // Les sommets ~à hauteur de l'origine (y≈350) sont bloqués par le mur
    // → x plafonné autour de 200, JAMAIS jusqu'au cap (600).
    const nearMid = poly.filter((p) => Math.abs(p.y - 350) < 5);
    expect(nearMid.length).toBeGreaterThan(0);
    const maxX = Math.max(...nearMid.map((p) => p.x));
    expect(maxX).toBeLessThanOrEqual(210);
  });

  it('sans mur, le même rayon atteint le cap (preuve de l’occlusion)', () => {
    const poly = computeVisibilityPolygon(
      { x: 100, y: 350 },
      [],
      BOUNDS,
      500,
    );
    const nearMid = poly.filter((p) => Math.abs(p.y - 350) < 5);
    const maxX = Math.max(...nearMid.map((p) => p.x));
    // cap 500 depuis x=100 → ~600, bien au-delà du mur occlus précédent.
    expect(maxX).toBeGreaterThan(500);
  });
});

describe('buildLosReveal', () => {
  const walls: WallPolyline[] = [
    {
      id: 'w',
      points: [
        { x: 200, y: 300 },
        { x: 200, y: 400 },
      ],
    },
  ];

  it('construit un FogPolygon reveal avec id déterministe', () => {
    const reveal = buildLosReveal('tok1', { x: 100, y: 350 }, walls, BOUNDS, 300);
    expect(reveal).not.toBeNull();
    expect(reveal!.id).toBe(losRevealId('tok1'));
    expect(reveal!.kind).toBe('reveal');
    expect(reveal!.createdAt).toBeNull();
    expect(reveal!.points.length).toBeGreaterThanOrEqual(3);
  });

  it('renvoie null pour un rayon de vision nul', () => {
    expect(buildLosReveal('t', { x: 0, y: 0 }, walls, BOUNDS, 0)).toBeNull();
  });
});
