import { describe, expect, it } from 'vitest';

import {
  cross,
  dot,
  length,
  polyhedronFor,
  SUPPORTED_DIE_SIDES,
  sub,
  type Vec3,
} from '../polyhedra';
import {
  landingRotation,
  placeFace,
  rotate3dCss,
  tumbleFor,
} from '../transforms';

/**
 * Les transformations sont la charnière entre géométrie juste et rendu juste.
 * Une erreur ici ne casse rien : elle produit un dé qui affiche le mauvais
 * chiffre, ou des chiffres en miroir. D'où des assertions numériques.
 */

/** Applique une rotation d'axe/angle à un vecteur (formule de Rodrigues). */
function rotate(v: Vec3, axis: Vec3, angleDeg: number): Vec3 {
  const th = (angleDeg * Math.PI) / 180;
  const k = axis;
  const c = Math.cos(th);
  const s = Math.sin(th);
  const kv = cross(k, v);
  const kd = dot(k, v) * (1 - c);
  return [
    v[0] * c + kv[0] * s + k[0] * kd,
    v[1] * c + kv[1] * s + k[1] * kd,
    v[2] * c + kv[2] * s + k[2] * kd,
  ];
}

function parseMatrix(transform: string): number[] {
  const inner = transform.replace('matrix3d(', '').replace(')', '');
  return inner.split(',').map(Number);
}

describe('landingRotation', () => {
  it.each(SUPPORTED_DIE_SIDES)(
    'd%i : la rotation amène bien CHAQUE face face à la caméra',
    (sides) => {
      for (const face of polyhedronFor(sides)!.faces) {
        const { axis, angleDeg } = landingRotation(face);
        const landed = rotate(face.normal, axis, angleDeg);
        // La normale tournée doit pointer vers +z, à la précision numérique près.
        expect(landed[2]).toBeCloseTo(1, 6);
        expect(landed[0]).toBeCloseTo(0, 6);
        expect(landed[1]).toBeCloseTo(0, 6);
      }
    },
  );

  it('une face déjà tournée vers la caméra ne tourne pas', () => {
    const face = {
      vertices: [[1, 0, 1], [0, 1, 1], [-1, 0, 1]] as Vec3[],
      centroid: [0, 0, 1] as Vec3,
      normal: [0, 0, 1] as Vec3,
      value: 1,
    };
    expect(landingRotation(face).angleDeg).toBe(0);
  });

  it('une face à l’opposé exact bascule d’un demi-tour (axe non nul)', () => {
    // Cas limite : n × z est nul, l'axe doit être choisi arbitrairement mais
    // valide — un axe nul laisserait la face dos à la caméra.
    const face = {
      vertices: [[1, 0, -1], [0, 1, -1], [-1, 0, -1]] as Vec3[],
      centroid: [0, 0, -1] as Vec3,
      normal: [0, 0, -1] as Vec3,
      value: 1,
    };
    const { axis, angleDeg } = landingRotation(face);
    expect(angleDeg).toBe(180);
    expect(length(axis)).toBeCloseTo(1, 9);
    expect(rotate(face.normal, axis, angleDeg)[2]).toBeCloseTo(1, 9);
  });
});

describe('placeFace', () => {
  it.each(SUPPORTED_DIE_SIDES)(
    'd%i : le repère de face est orthonormé DIRECT (chiffres non miroités)',
    (sides) => {
      for (const face of polyhedronFor(sides)!.faces) {
        const m = parseMatrix(placeFace(face, 100).transform);
        const u: Vec3 = [m[0]!, m[1]!, m[2]!];
        const w: Vec3 = [m[4]!, m[5]!, m[6]!];
        const n: Vec3 = [m[8]!, m[9]!, m[10]!];

        expect(length(u)).toBeCloseTo(1, 4);
        expect(length(w)).toBeCloseTo(1, 4);
        expect(length(n)).toBeCloseTo(1, 4);
        expect(dot(u, w)).toBeCloseTo(0, 4);
        expect(dot(u, n)).toBeCloseTo(0, 4);
        // Déterminant +1 ⇔ u × w = n ⇔ aucune symétrie miroir.
        expect(length(sub(cross(u, w), n))).toBeLessThan(1e-3);
      }
    },
  );

  it.each(SUPPORTED_DIE_SIDES)(
    'd%i : la translation pose la face à la bonne distance du centre',
    (sides) => {
      const radius = 64;
      for (const face of polyhedronFor(sides)!.faces) {
        const m = parseMatrix(placeFace(face, radius).transform);
        const t: Vec3 = [m[12]!, m[13]!, m[14]!];
        // Le centre de face est à `inradius × rayon` du centre du solide.
        expect(length(t)).toBeCloseTo(length(face.centroid) * radius, 3);
        // …et dans la direction de la normale.
        expect(dot(t, face.normal)).toBeGreaterThan(0);
      }
    },
  );

  it.each(SUPPORTED_DIE_SIDES)(
    'd%i : le polygone 2D conserve les longueurs d’arête',
    (sides) => {
      const radius = 50;
      for (const face of polyhedronFor(sides)!.faces) {
        const placed = placeFace(face, radius);
        expect(placed.polygon).toHaveLength(face.vertices.length);
        for (let i = 0; i < face.vertices.length; i += 1) {
          const j = (i + 1) % face.vertices.length;
          const edge3d = length(sub(face.vertices[i]!, face.vertices[j]!)) * radius;
          const [x1, y1] = placed.polygon[i]!;
          const [x2, y2] = placed.polygon[j]!;
          const edge2d = Math.hypot(x1 - x2, y1 - y2);
          expect(edge2d).toBeCloseTo(edge3d, 2);
        }
      }
    },
  );

  it('le polygone est centré sur l’origine', () => {
    for (const face of polyhedronFor(20)!.faces) {
      const poly = placeFace(face, 40).polygon;
      const cx = poly.reduce((a, p) => a + p[0], 0) / poly.length;
      const cy = poly.reduce((a, p) => a + p[1], 0) / poly.length;
      expect(cx).toBeCloseTo(0, 6);
      expect(cy).toBeCloseTo(0, 6);
    }
  });
});

describe('tumbleFor', () => {
  it('est déterministe — une même graine donne une même culbute', () => {
    expect(tumbleFor(42)).toEqual(tumbleFor(42));
  });

  it('deux dés d’un même jet ne culbutent pas pareil', () => {
    expect(tumbleFor(1000)).not.toEqual(tumbleFor(1001));
  });

  it('produit toujours un axe unitaire et au moins deux tours', () => {
    for (let seed = 0; seed < 500; seed += 1) {
      const { axis, turns, durationMs } = tumbleFor(seed);
      expect(length(axis)).toBeCloseTo(1, 6);
      expect(turns).toBeGreaterThanOrEqual(2);
      expect(durationMs).toBeGreaterThan(0);
    }
  });
});

describe('rotate3dCss', () => {
  it('rend une rotation nulle explicitement (pas de NaN sur axe nul)', () => {
    expect(rotate3dCss([0, 0, 0], 90)).toBe('rotate3d(0,0,1,0deg)');
    expect(rotate3dCss([1, 0, 0], 0)).toBe('rotate3d(0,0,1,0deg)');
  });

  it('rend un axe et un angle lisibles par CSS', () => {
    expect(rotate3dCss([1, 0, 0], 90)).toBe('rotate3d(1,0,0,90deg)');
  });
});
