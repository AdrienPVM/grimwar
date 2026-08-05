import {
  cross,
  dot,
  length,
  normalize,
  sub,
  type PolyFace,
  type Vec3,
} from './polyhedra';

/**
 * Passage de la géométrie aux transformations CSS 3D.
 *
 * Deux opérations, et rien d'autre :
 *
 *  1. `placeFace` — poser un plan 2D (le contenu d'une face : son polygone et
 *     son chiffre) exactement sur une face du solide. Résultat : une
 *     `matrix3d` prête à coller dans un `transform`.
 *  2. `landingRotation` — faire tourner le solide ENTIER pour qu'une face
 *     donnée regarde la caméra. C'est ce qui fait qu'un dé « tombe » sur le
 *     chiffre effectivement tiré, et pas sur un chiffre décoratif.
 *
 * **Le texte n'est jamais en miroir.** Le repère de face est `(u, w, n)` avec
 * `w = n × u`, donc `u × w = n` : le déterminant vaut +1, la transformation
 * préserve l'orientation. Un repère gauche retournerait chaque chiffre comme
 * dans un rétroviseur — le genre de défaut qu'on ne voit qu'une fois le dé posé.
 */

export interface FacePlacement {
  readonly value: number;
  /** `transform` CSS plaçant le contenu de la face sur le solide. */
  readonly transform: string;
  /**
   * Sommets du polygone de la face, en pixels, dans le repère de la face
   * (origine au centre de la face).
   */
  readonly polygon: readonly (readonly [number, number])[];
  /**
   * Boîte SERRÉE autour du polygone — c'est-à-dire l'élément à créer pour porter
   * la face.
   *
   * **Pourquoi elle ne peut pas être la boîte du solide.** Première version :
   * chaque face était un carré de la taille du dé, rendu transparent hors du
   * polygone. Sur un cube, cela marche — les carrés coïncident avec les faces.
   * Sur un icosaèdre, vingt carrés bien plus grands que leurs triangles
   * s'interpénètrent en trois dimensions, et le compositeur de Chromium ne sait
   * pas trier des couches qui se croisent : il en laisse tomber. Résultat, un
   * solide troué en son centre, faces éparpillées — alors que la géométrie
   * était exacte (sonde : douze sommets distincts partagés par cinq faces
   * chacun). Avec une boîte serrée, les faces ne se rencontrent qu'aux arêtes,
   * comme celles d'un cube, et le tri redevient trivial.
   *
   * `offsetX`/`offsetY` positionnent le coin haut-gauche de la boîte par rapport
   * au centre de la face ; l'origine de transformation vaut donc leur opposé.
   */
  readonly box: {
    readonly width: number;
    readonly height: number;
    readonly offsetX: number;
    readonly offsetY: number;
  };
}

/** Repère orthonormé direct d'une face : `u` dans le plan, `w = n × u`, `n` normale. */
function faceBasis(face: PolyFace): { u: Vec3; w: Vec3; n: Vec3 } {
  const n = face.normal;
  const u = normalize(sub(face.vertices[0]!, face.centroid));
  return { u, w: cross(n, u), n };
}

/**
 * Place le contenu d'une face sur le solide, pour un rayon circonscrit donné.
 *
 * `radiusPx` est le rayon circonscrit du solide à l'écran : les sommets du
 * polyèdre étant normalisés à 1, tout se ramène à une homothétie.
 */
export function placeFace(face: PolyFace, radiusPx: number): FacePlacement {
  const { u, w, n } = faceBasis(face);
  const t: Vec3 = [
    face.centroid[0] * radiusPx,
    face.centroid[1] * radiusPx,
    face.centroid[2] * radiusPx,
  ];

  // `matrix3d` est en COLONNES : les quatre premiers nombres forment l'image de
  // l'axe x local, les quatre suivants celle de y, puis z, puis la translation.
  const m = [
    u[0], u[1], u[2], 0,
    w[0], w[1], w[2], 0,
    n[0], n[1], n[2], 0,
    t[0], t[1], t[2], 1,
  ];

  const polygon = face.vertices.map((v) => {
    const d = sub(v, face.centroid);
    return [dot(d, u) * radiusPx, dot(d, w) * radiusPx] as const;
  });

  const xs = polygon.map((p) => p[0]);
  const ys = polygon.map((p) => p[1]);
  const offsetX = Math.min(...xs);
  const offsetY = Math.min(...ys);

  return {
    value: face.value,
    transform: `matrix3d(${m.map((x) => round(x)).join(',')})`,
    polygon,
    box: {
      width: Math.max(...xs) - offsetX,
      height: Math.max(...ys) - offsetY,
      offsetX,
      offsetY,
    },
  };
}

/**
 * Rotation amenant une face face à la caméra (normale vers `+z`).
 *
 * Renvoie un axe et un angle en degrés, forme directement consommable par
 * `rotate3d()`. On utilise un axe/angle et non une matrice pour une raison
 * d'animation : CSS n'interpole linéairement l'angle de deux `rotate3d` que
 * s'ils partagent le MÊME axe. Une culbute de trois tours exprimée en matrices
 * serait ramenée au plus court chemin — le dé ne tournerait pas.
 */
export function landingRotation(face: PolyFace): {
  axis: Vec3;
  angleDeg: number;
} {
  const n = face.normal;
  const z: Vec3 = [0, 0, 1];
  const cosine = Math.min(1, Math.max(-1, dot(n, z)));

  // Face déjà tournée vers la caméra.
  if (cosine > 1 - 1e-9) return { axis: [0, 0, 1], angleDeg: 0 };
  // Face à l'opposé exact : l'axe n × z est nul, n'importe quelle
  // perpendiculaire convient — on prend x.
  if (cosine < -1 + 1e-9) return { axis: [1, 0, 0], angleDeg: 180 };

  const rawAxis = cross(n, z);
  return {
    axis: normalize(rawAxis),
    angleDeg: (Math.acos(cosine) * 180) / Math.PI,
  };
}

/** Applique une rotation d'axe/angle à un vecteur (formule de Rodrigues). */
export function rotateVec(v: Vec3, axis: Vec3, angleDeg: number): Vec3 {
  const th = (angleDeg * Math.PI) / 180;
  const c = Math.cos(th);
  const s = Math.sin(th);
  const kv = cross(axis, v);
  const kd = dot(axis, v) * (1 - c);
  return [
    v[0] * c + kv[0] * s + axis[0] * kd,
    v[1] * c + kv[1] * s + axis[1] * kd,
    v[2] * c + kv[2] * s + axis[2] * kd,
  ];
}

/**
 * Éclairement d'une face une fois le dé POSÉ, entre 0 (tranche) et 1 (de face).
 *
 * Sans ce dégradé, toutes les facettes ont le même remplissage et le solide se
 * lit comme une tache sombre : c'est ce qu'a montré la première capture. Un
 * ombrage suivant la normale rend le volume immédiatement lisible.
 *
 * L'éclairement est calculé sur l'orientation FINALE, pas sur l'orientation
 * courante de la culbute — la lumière tourne donc avec le dé pendant la chute,
 * comme si elle y était accrochée, puis devient exacte au moment précis où on
 * se met à le regarder. Recalculer l'ombrage à chaque image du tournoiement
 * coûterait un recalcul de style par facette et par image pour un gain que
 * personne ne perçoit sur un dé qui tourne.
 */
export function restLighting(
  normal: Vec3,
  landing: { axis: Vec3; angleDeg: number },
): number {
  const rotated = rotateVec(normal, landing.axis, landing.angleDeg);
  // La lumière vient d'en haut à gauche, légèrement en avant du spectateur.
  const light = normalize([-0.35, -0.55, 0.76]);
  const diffuse = Math.max(0, dot(rotated, light));
  // Composante AMBIANTE indispensable. Sans elle, toute facette tournant le dos
  // à la lumière retombe à zéro, donc à une teinte quasi identique au fond très
  // sombre de l'app : le solide se dissout et ne laisse voir que deux ou trois
  // facettes éclairées, comme des éclats flottants. Constaté en UAT.
  return AMBIENT + (1 - AMBIENT) * diffuse;
}

/** Part de lumière reçue par une facette même dos à la source. */
const AMBIENT = 0.38;

/** Forme CSS d'une rotation d'axe/angle. */
export function rotate3dCss(axis: Vec3, angleDeg: number): string {
  if (length(axis) < 1e-9 || Math.abs(angleDeg) < 1e-9) return 'rotate3d(0,0,1,0deg)';
  return `rotate3d(${round(axis[0])},${round(axis[1])},${round(axis[2])},${round(angleDeg)}deg)`;
}

/**
 * Paramètres de culbute d'un dé, dérivés d'une graine.
 *
 * Déterministe À DESSEIN : un `Math.random()` appelé au rendu redessinerait une
 * trajectoire différente à chaque re-rendu de React, et le dé se remettrait à
 * tourner en plein vol. La graine combine l'instant du jet et le rang du dé —
 * deux dés d'un même jet culbutent donc différemment, et deux jets successifs
 * ne se ressemblent pas.
 */
export function tumbleFor(seed: number): {
  axis: Vec3;
  turns: number;
  delayMs: number;
  durationMs: number;
} {
  const h = hash(seed);
  const axis = normalize([
    (h & 0xff) / 255 - 0.5,
    ((h >> 8) & 0xff) / 255 - 0.5,
    ((h >> 16) & 0xff) / 255 - 0.5,
  ]);
  return {
    // Un axe nul (tirage pile au centre) ferait un dé qui ne tourne pas.
    axis: length(axis) < 0.05 ? [0.7, 0.5, 0.5] : axis,
    turns: 2 + ((h >> 3) % 3),
    delayMs: ((h >> 5) % 7) * 26,
    durationMs: 900 + ((h >> 11) % 5) * 70,
  };
}

/** Mélangeur entier 32 bits (xorshift) — pas de dépendance, distribution correcte. */
function hash(seed: number): number {
  let x = (seed | 0) ^ 0x9e3779b9;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return Math.abs(x | 0);
}

function round(n: number): number {
  return Math.round(n * 1e5) / 1e5;
}
