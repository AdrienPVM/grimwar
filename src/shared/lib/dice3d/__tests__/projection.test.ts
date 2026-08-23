import { describe, expect, it } from 'vitest';

import {
  dot,
  polyhedronFor,
  SUPPORTED_DIE_SIDES,
  type Polyhedron,
  type Vec3,
} from '../polyhedra';
import {
  apply,
  faceFrame,
  multiply,
  projectDie,
  restRotation,
  rotationAxisAngle,
  visualScaleFor,
  type Mat3,
} from '../projection';

/**
 * Invariants de la projection.
 *
 * Ces tests portent la seule chose que l'œil ne peut pas vérifier tout seul : la
 * projection est calculée pour SIX solides × toutes leurs faces, soit 60 poses,
 * et un défaut ne se manifeste que sur certaines d'entre elles. C'est exactement
 * ce qui s'est produit avec la version 3D CSS — le même d20 correct sur une face
 * tirée, éclaté sur une autre.
 */

const SOLIDS: Polyhedron[] = SUPPORTED_DIE_SIDES.map((s) => polyhedronFor(s)!);

/** Aire signée d'un polygone 2D (positive en sens horaire, repère écran). */
function signedArea(polygon: readonly (readonly [number, number])[]): number {
  let twice = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const [x1, y1] = polygon[i]!;
    const [x2, y2] = polygon[(i + 1) % polygon.length]!;
    twice += x1 * y2 - x2 * y1;
  }
  return twice / 2;
}

/** Enveloppe convexe 2D (parcours de Andrew), pour mesurer la silhouette. */
function hullArea(points: readonly (readonly [number, number])[]): number {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const half = (source: typeof pts): (readonly [number, number])[] => {
    const out: (readonly [number, number])[] = [];
    for (const p of source) {
      while (out.length >= 2) {
        const [ax, ay] = out[out.length - 2]!;
        const [bx, by] = out[out.length - 1]!;
        if ((bx - ax) * (p[1] - ay) - (by - ay) * (p[0] - ax) > 0) break;
        out.pop();
      }
      out.push(p);
    }
    out.pop();
    return out;
  };
  return Math.abs(signedArea([...half(pts), ...half([...pts].reverse())]));
}

const REST = { perspectivePx: 400, radiusPx: 60 };

describe('rotationAxisAngle / multiply / apply', () => {
  it('un quart de tour autour de z mène x sur y', () => {
    const r = rotationAxisAngle([0, 0, 1], Math.PI / 2);
    const v = apply(r, [1, 0, 0]);
    expect(v[0]).toBeCloseTo(0, 9);
    expect(v[1]).toBeCloseTo(1, 9);
  });

  it('compose dans l’ordre « la gauche s’applique en dernier »', () => {
    const quarterZ = rotationAxisAngle([0, 0, 1], Math.PI / 2);
    const quarterX = rotationAxisAngle([1, 0, 0], Math.PI / 2);
    // x --quarterZ--> y --quarterX--> z
    const v = apply(multiply(quarterX, quarterZ), [1, 0, 0]);
    expect(v[2]).toBeCloseTo(1, 9);
  });

  it('préserve les longueurs — une rotation ne déforme pas', () => {
    const r = rotationAxisAngle([0.3, -0.7, 0.5], 1.234);
    const v = apply(r, [0.2, 0.9, -0.4]);
    expect(Math.hypot(...v)).toBeCloseTo(Math.hypot(0.2, 0.9, -0.4), 9);
  });
});

describe('faceFrame', () => {
  it('donne un repère orthonormé DIRECT — aucun chiffre en miroir', () => {
    for (const solid of SOLIDS) {
      for (const face of solid.faces) {
        const { up, right } = faceFrame(face);
        expect(Math.hypot(...up)).toBeCloseTo(1, 9);
        expect(Math.hypot(...right)).toBeCloseTo(1, 9);
        expect(dot(up, face.normal)).toBeCloseTo(0, 9);
        expect(dot(right, face.normal)).toBeCloseTo(0, 9);
        expect(dot(right, up)).toBeCloseTo(0, 9);
        // (right, up, normal) direct ⇔ right × up = normal.
        const chirality: Vec3 = [
          right[1]! * up[2]! - right[2]! * up[1]!,
          right[2]! * up[0]! - right[0]! * up[2]!,
          right[0]! * up[1]! - right[1]! * up[0]!,
        ];
        expect(dot(chirality, face.normal)).toBeCloseTo(1, 6);
      }
    }
  });
});

describe('restRotation', () => {
  it('amène la face tirée vers la caméra, inclinée mais jamais de dos', () => {
    for (const solid of SOLIDS) {
      for (const face of solid.faces) {
        const z = apply(restRotation(solid, face), face.normal)[2]!;
        // Franchement tournée vers l'observateur : c'est la face qu'on lit.
        expect(z).toBeGreaterThan(0.8);
        // Mais jamais pile en face — sans biais, un cube est un carré et un
        // tétraèdre un triangle. C'est la régression « dés plats » de l'UAT.
        expect(z).toBeLessThan(0.9999);
      }
    }
  });

  it('redresse le chiffre de la face tirée', () => {
    for (const solid of SOLIDS) {
      for (const face of solid.faces) {
        const up = apply(restRotation(solid, face), faceFrame(face).up);
        // Le haut de la face pointe vers le haut de la scène. L'inclinaison de
        // présentation en écarte un peu — pas de quoi coucher un chiffre.
        expect(up[1]!).toBeGreaterThan(0.85);
      }
    }
  });

  it('révèle au moins une face voisine sur CHAQUE solide, d4 compris', () => {
    for (const solid of SOLIDS) {
      for (const face of solid.faces) {
        const visible = projectDie(solid, {
          ...REST,
          rotation: restRotation(solid, face),
          targetValue: face.value,
        });
        expect(visible.length).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

describe('projectDie', () => {
  it('rend toujours la face tirée, et jamais une face de dos', () => {
    for (const solid of SOLIDS) {
      for (const face of solid.faces) {
        const rotation = restRotation(solid, face);
        const visible = projectDie(solid, {
          ...REST,
          rotation,
          targetValue: face.value,
        });
        expect(visible.some((f) => f.isTarget)).toBe(true);
        expect(visible.filter((f) => f.isTarget)).toHaveLength(1);
        for (const f of visible) {
          const normal = apply(
            rotation,
            solid.faces.find((s) => s.value === f.value)!.normal,
          );
          expect(normal[2]!).toBeGreaterThan(-1e-9);
        }
      }
    }
  });

  /**
   * LE test de non-régression du « d20 éclaté ».
   *
   * Sur un convexe amputé de ses faces arrière, les faces retenues pavent
   * exactement la silhouette : ni trou, ni recouvrement. Leurs aires totalisent
   * donc précisément l'aire de l'enveloppe convexe de leurs sommets. Un trou
   * ferait tomber la somme sous l'enveloppe, un recouvrement la ferait dépasser
   * — c'est le défaut qu'on a vu à l'écran, faces voisines chassées vers
   * l'extérieur et vides entre elles.
   *
   * Vérifié rouge avant vert : en neutralisant l'élimination des faces arrière
   * dans `projectDie`, la somme passe à ~1,9 fois l'enveloppe et les 60 poses
   * échouent.
   */
  it('les faces visibles pavent la silhouette — ni trou ni recouvrement', () => {
    for (const solid of SOLIDS) {
      for (const face of solid.faces) {
        const visible = projectDie(solid, {
          ...REST,
          rotation: restRotation(solid, face),
          targetValue: face.value,
        });
        const sum = visible.reduce(
          (acc, f) => acc + Math.abs(signedArea(f.polygon)),
          0,
        );
        const hull = hullArea(visible.flatMap((f) => f.polygon));
        expect(sum / hull).toBeCloseTo(1, 3);
      }
    }
  });

  it('oriente toutes les faces visibles dans le même sens de parcours', () => {
    // Un sens de parcours qui s'inverserait d'une face à l'autre signalerait une
    // face retournée — invisible à l'œil sur un aplat, désastreuse dès qu'on
    // remplit avec un dégradé directionnel.
    for (const solid of SOLIDS) {
      const visible = projectDie(solid, {
        ...REST,
        rotation: restRotation(solid, solid.faces[0]!),
        targetValue: solid.faces[0]!.value,
      });
      const signs = new Set(visible.map((f) => Math.sign(signedArea(f.polygon))));
      expect(signs.size).toBe(1);
    }
  });

  it('la perspective grossit ce qui est proche', () => {
    const solid = polyhedronFor(6)!;
    const face = solid.faces[0]!;
    const near = projectDie(solid, {
      radiusPx: 60,
      perspectivePx: 180,
      rotation: restRotation(solid, face),
      targetValue: face.value,
    });
    const far = projectDie(solid, {
      radiusPx: 60,
      perspectivePx: 100_000,
      rotation: restRotation(solid, face),
      targetValue: face.value,
    });
    const spread = (fs: typeof near): number =>
      Math.max(
        ...fs
          .find((f) => f.isTarget)!
          .polygon.map(([x, y]) => Math.hypot(x, y)),
      );
    // La face tirée est du côté de la caméra : une caméra proche l'agrandit.
    expect(spread(near)).toBeGreaterThan(spread(far) * 1.05);
  });
});

describe('visualScaleFor', () => {
  it('donne aux six solides la même taille apparente à ±6 %', () => {
    const widths = SOLIDS.map((solid) => {
      const scale = visualScaleFor(solid);
      // Encombrement moyen une fois le facteur appliqué, moyenné sur les poses.
      const perFace = solid.faces.map((face) => {
        const rotation = restRotation(solid, face);
        const points = solid.faces.flatMap((f) =>
          f.vertices.map((v) => apply(rotation, v)),
        );
        return meanWidth(points) * scale;
      });
      return perFace.reduce((a, b) => a + b, 0) / perFace.length;
    });
    const min = Math.min(...widths);
    const max = Math.max(...widths);
    expect(max / min).toBeLessThan(1.06);
  });

  it('agrandit le d6, qui remplit mal sa sphère, plus que le d20', () => {
    expect(visualScaleFor(polyhedronFor(6)!)).toBeGreaterThan(
      visualScaleFor(polyhedronFor(20)!),
    );
  });

  it('est mémoïsé — deux appels rendent la même valeur', () => {
    const solid = polyhedronFor(12)!;
    expect(visualScaleFor(solid)).toBe(visualScaleFor(solid));
  });
});

function meanWidth(points: readonly Vec3[]): number {
  let total = 0;
  const samples = 64;
  for (let i = 0; i < samples; i += 1) {
    const theta = (Math.PI * i) / samples;
    const cx = Math.cos(theta);
    const cy = Math.sin(theta);
    let min = Infinity;
    let max = -Infinity;
    for (const p of points) {
      const d = p[0]! * cx + p[1]! * cy;
      if (d < min) min = d;
      if (d > max) max = d;
    }
    total += max - min;
  }
  return total / samples;
}

describe('digitTransform', () => {
  it('pose le chiffre de la face tirée au centre du dé, debout', () => {
    for (const solid of SOLIDS) {
      for (const face of solid.faces) {
        const target = projectDie(solid, {
          ...REST,
          rotation: restRotation(solid, face),
          targetValue: face.value,
        }).find((f) => f.isTarget)!;
        const [a, b, c, d, e, f] = target.digitTransform;

        // Près du centre : le chiffre lu est au milieu du dé, pas sur un bord.
        expect(Math.hypot(e, f)).toBeLessThan(REST.radiusPx * 0.42);
        // Debout : la colonne « bas » du repère pointe vers le bas de l'écran.
        expect(d).toBeGreaterThan(0.7);
        expect(Math.abs(c)).toBeLessThan(0.35);
        // Et non dégénéré — un déterminant nul écraserait le chiffre en trait.
        expect(Math.abs(a * d - b * c)).toBeGreaterThan(0.5);
      }
    }
  });

  it('n’inverse jamais le chiffre — déterminant positif partout', () => {
    for (const solid of SOLIDS) {
      const visible = projectDie(solid, {
        ...REST,
        rotation: restRotation(solid, solid.faces[0]!),
        targetValue: solid.faces[0]!.value,
      });
      for (const f of visible) {
        const [a, b, c, d] = f.digitTransform;
        expect(a * d - b * c).toBeGreaterThan(0);
      }
    }
  });
});

describe('la culbute se referme exactement sur la pose', () => {
  it('une rotation résiduelle nulle rend la pose à l’identique', () => {
    const solid = polyhedronFor(20)!;
    const face = solid.faces.find((f) => f.value === 20)!;
    const rest = restRotation(solid, face);
    const settled: Mat3 = multiply(rotationAxisAngle([0.3, 0.5, 0.8], 0), rest);
    expect([...settled]).toEqual([...rest]);
  });
});
