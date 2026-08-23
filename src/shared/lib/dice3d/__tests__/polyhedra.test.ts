import { describe, expect, it } from 'vitest';

import {
  cross,
  dot,
  length,
  normalize,
  polyhedronFor,
  sub,
  SUPPORTED_DIE_SIDES,
  type PolyFace,
  type Vec3,
} from '../polyhedra';

/**
 * Invariants géométriques des solides de dés.
 *
 * Les faces ne sont pas recopiées d'une table mais déduites d'une enveloppe
 * convexe : ces tests sont donc la seule chose qui prouve que la déduction est
 * juste. Ils valent pour les six solides d'un coup — un d10 cassé échoue au
 * même endroit qu'un d20 cassé.
 */

const TOL = 1e-6;

function faceArea(face: PolyFace): number {
  // Aire d'un polygone plan par la formule de Newell.
  let acc: Vec3 = [0, 0, 0];
  for (let i = 0; i < face.vertices.length; i += 1) {
    const a = face.vertices[i]!;
    const b = face.vertices[(i + 1) % face.vertices.length]!;
    const c = cross(a, b);
    acc = [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]];
  }
  return length(acc) / 2;
}

describe('polyhedronFor', () => {
  it('ne connaît que les six solides de dés usuels', () => {
    expect(SUPPORTED_DIE_SIDES).toEqual([4, 6, 8, 10, 12, 20]);
    expect(polyhedronFor(100)).toBeNull();
    expect(polyhedronFor(3)).toBeNull();
    expect(polyhedronFor(7)).toBeNull();
  });

  it('mémoïse — deux appels rendent le même objet', () => {
    expect(polyhedronFor(20)).toBe(polyhedronFor(20));
  });

  it.each(SUPPORTED_DIE_SIDES)('d%i a exactement autant de faces', (sides) => {
    expect(polyhedronFor(sides)!.faces).toHaveLength(sides);
  });

  it.each(SUPPORTED_DIE_SIDES)('d%i : normales unitaires et sortantes', (sides) => {
    for (const face of polyhedronFor(sides)!.faces) {
      expect(length(face.normal)).toBeCloseTo(1, 6);
      // Sortante : la normale pointe dans le même sens que le centre de face.
      expect(dot(face.normal, face.centroid)).toBeGreaterThan(0);
    }
  });

  it.each(SUPPORTED_DIE_SIDES)('d%i : chaque face est plane', (sides) => {
    for (const face of polyhedronFor(sides)!.faces) {
      for (const v of face.vertices) {
        // Distance du sommet au plan de la face : nulle si la face est plane.
        expect(Math.abs(dot(face.normal, sub(v, face.centroid)))).toBeLessThan(
          TOL,
        );
      }
    }
  });

  it.each(SUPPORTED_DIE_SIDES)('d%i : chaque face est un polygone non dégénéré', (sides) => {
    for (const face of polyhedronFor(sides)!.faces) {
      expect(face.vertices.length).toBeGreaterThanOrEqual(3);
      expect(faceArea(face)).toBeGreaterThan(0.001);
    }
  });

  it.each(SUPPORTED_DIE_SIDES)(
    'd%i : les sommets d’une face tournent dans le sens direct vu de l’extérieur',
    (sides) => {
      // Un ordre inversé retournerait la face : le chiffre s'afficherait en
      // miroir une fois posé sur le solide.
      for (const face of polyhedronFor(sides)!.faces) {
        const a = face.vertices[0]!;
        const b = face.vertices[1]!;
        const c = face.vertices[2]!;
        const woundNormal = normalize(cross(sub(b, a), sub(c, a)));
        expect(dot(woundNormal, face.normal)).toBeGreaterThan(0.9);
      }
    },
  );

  it.each(SUPPORTED_DIE_SIDES)('d%i : les chiffres vont de 1 à N sans trou', (sides) => {
    const values = polyhedronFor(sides)!
      .faces.map((f) => f.value)
      .sort((a, b) => a - b);
    expect(values).toEqual(
      Array.from({ length: sides }, (_, i) => i + 1),
    );
  });

  it.each([6, 8, 10, 12, 20])(
    'd%i : deux faces opposées totalisent N+1, comme un vrai dé',
    (sides) => {
      const poly = polyhedronFor(sides)!;
      for (const face of poly.faces) {
        const opposite = poly.faces.find(
          (f) => length(sub(f.normal, [-face.normal[0], -face.normal[1], -face.normal[2]])) < TOL,
        );
        expect(opposite, `d${sides} : face ${face.value} sans opposée`).toBeDefined();
        expect(face.value + opposite!.value).toBe(sides + 1);
      }
    },
  );

  it('le tétraèdre n’a PAS de faces opposées — numérotation séquentielle', () => {
    // Un d4 est le seul solide de dés sans paires antipodales : la règle
    // « opposées = N+1 » ne s'y applique pas, et prétendre le contraire
    // masquerait une erreur de détection sur les autres solides.
    const poly = polyhedronFor(4)!;
    for (const face of poly.faces) {
      const opposite = poly.faces.find(
        (f) => length(sub(f.normal, [-face.normal[0], -face.normal[1], -face.normal[2]])) < TOL,
      );
      expect(opposite).toBeUndefined();
    }
  });

  it.each(SUPPORTED_DIE_SIDES)('d%i : respecte la formule d’Euler S − A + F = 2', (sides) => {
    const poly = polyhedronFor(sides)!;
    const vertexKeys = new Set<string>();
    const edgeKeys = new Set<string>();
    const key = (v: Vec3): string => v.map((n) => n.toFixed(6)).join(',');

    for (const face of poly.faces) {
      for (let i = 0; i < face.vertices.length; i += 1) {
        const a = face.vertices[i]!;
        const b = face.vertices[(i + 1) % face.vertices.length]!;
        vertexKeys.add(key(a));
        edgeKeys.add([key(a), key(b)].sort().join('|'));
      }
    }
    expect(vertexKeys.size - edgeKeys.size + poly.faces.length).toBe(2);
  });

  it('le d10 a l’élancement d’un vrai d10, ni aiguille ni galet', () => {
    // Garde-fou de proportion. Le trapézoèdre est le seul solide dont la forme
    // dépend d'un paramètre libre : la coplanarité des cerfs-volants relie la
    // hauteur des apex à celle des couronnes, mais ne les fixe pas. Une valeur
    // mal choisie donne un solide géométriquement VALIDE — tous les autres
    // tests restent verts — et pourtant méconnaissable : la première essayée
    // produisait une aiguille trois fois plus haute que large.
    const vertices = polyhedronFor(10)!.faces.flatMap((f) => f.vertices);
    const height = 2 * Math.max(...vertices.map((v) => Math.abs(v[2])));
    const width =
      2 * Math.max(...vertices.map((v) => Math.hypot(v[0], v[1])));
    expect(height / width).toBeGreaterThan(1);
    expect(height / width).toBeLessThan(1.3);
  });

  it('les formes attendues : triangles, carrés, cerfs-volants, pentagones', () => {
    const shape = (sides: number): number[] =>
      Array.from(
        new Set(polyhedronFor(sides)!.faces.map((f) => f.vertices.length)),
      );
    expect(shape(4)).toEqual([3]); // tétraèdre : triangles
    expect(shape(6)).toEqual([4]); // cube : carrés
    expect(shape(8)).toEqual([3]); // octaèdre : triangles
    expect(shape(10)).toEqual([4]); // trapézoèdre : cerfs-volants
    expect(shape(12)).toEqual([5]); // dodécaèdre : pentagones
    expect(shape(20)).toEqual([3]); // icosaèdre : triangles
  });
});
