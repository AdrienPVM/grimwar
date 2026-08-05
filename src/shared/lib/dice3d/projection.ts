import {
  cross,
  dot,
  length,
  normalize,
  sub,
  type PolyFace,
  type Polyhedron,
  type Vec3,
} from './polyhedra';

/**
 * Projection d'un solide de dé vers un tracé 2D — caméra, faces cachées,
 * éclairage, orientation des chiffres.
 *
 * **Pourquoi on projette nous-mêmes au lieu de laisser faire CSS.** La première
 * version posait chaque face dans l'espace par `matrix3d` sous un
 * `transform-style: preserve-3d`, et laissait le navigateur composer. Ça marche
 * pour un cube. Ça ne marche PAS pour un icosaèdre : le compositeur de Chromium
 * trie des couches entières, pas des fragments, et vingt faces qui se croisent
 * n'ont pas d'ordre de tri valide. Résultat observé au banc d'essai : le MÊME
 * d20, avec la même géométrie, sort correct sur une face tirée et éclaté en
 * moulin à vent sur une autre — les faces voisines chassées vers l'extérieur,
 * séparées du solide par des trous. Un défaut qui dépend de l'orientation ne se
 * corrige pas au cas par cas.
 *
 * Ici, rien n'est laissé au compositeur : on tourne les sommets, on projette, on
 * écarte les faces arrière, et l'appelant remplit des polygones. **Un solide
 * CONVEXE dont on a retiré les faces arrière n'a plus aucun recouvrement** — il
 * n'y a donc même pas de tri à faire, et le défaut disparaît par construction et
 * non par réglage.
 */

/** Matrice 3×3 en ligne majeure. */
export type Mat3 = readonly [
  number, number, number,
  number, number, number,
  number, number, number,
];

export const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

export function multiply(a: Mat3, b: Mat3): Mat3 {
  const out: number[] = [];
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      out.push(
        a[r * 3]! * b[c]! +
          a[r * 3 + 1]! * b[3 + c]! +
          a[r * 3 + 2]! * b[6 + c]!,
      );
    }
  }
  return out as unknown as Mat3;
}

export function apply(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0]! * v[0]! + m[1]! * v[1]! + m[2]! * v[2]!,
    m[3]! * v[0]! + m[4]! * v[1]! + m[5]! * v[2]!,
    m[6]! * v[0]! + m[7]! * v[1]! + m[8]! * v[2]!,
  ];
}

/** Rotation d'axe unitaire et d'angle en radians (Rodrigues, forme matricielle). */
export function rotationAxisAngle(axis: Vec3, angleRad: number): Mat3 {
  const a = normalize(axis);
  if (length(a) < 1e-9) return IDENTITY;
  const [x, y, z] = a;
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  const t = 1 - c;
  return [
    t * x * x + c, t * x * y - s * z, t * x * z + s * y,
    t * x * y + s * z, t * y * y + c, t * y * z - s * x,
    t * x * z - s * y, t * y * z + s * x, t * z * z + c,
  ];
}

/**
 * Repère d'une face : `up` est le HAUT du chiffre, `right` sa direction de
 * lecture.
 *
 * **Pourquoi une référence globale et pas le premier sommet.** La version
 * précédente prenait `vertices[0] - centroid` comme axe de lecture — une
 * direction qui ne dépend que de l'ordre de découverte des sommets. Les chiffres
 * sortaient donc pivotés au hasard : le « 4 » du d4 couché sur le flanc, le
 * « 6 » du d6 à l'envers, le « 12 » du d12 tête en bas. Dérivé d'une référence
 * commune, l'ensemble des faces d'un solide partage désormais une verticale.
 */
export function faceFrame(face: PolyFace): { up: Vec3; right: Vec3 } {
  const n = face.normal;
  // Référence : le haut du monde. Sur une face horizontale (normale colinéaire
  // à la référence) la projection s'annule — on bascule alors sur la profondeur.
  const ref: Vec3 = Math.abs(n[1]!) > 0.985 ? [0, 0, 1] : [0, 1, 0];
  const up = normalize(sub(ref, scaled(n, dot(ref, n))));
  // `right = up × n` donne un repère direct : (right, up, n) de déterminant +1,
  // donc aucun chiffre en miroir.
  return { up, right: cross(up, n) };
}

function scaled(v: Vec3, k: number): Vec3 {
  return [v[0]! * k, v[1]! * k, v[2]! * k];
}

/**
 * Inclinaison de présentation, appliquée APRÈS la pose.
 *
 * Un dé posé pile en face de la caméra n'a AUCUN relief : un cube vu
 * perpendiculairement à une face est un carré, un tétraèdre un triangle. C'est
 * ce que montraient les premières captures — deux dés plats au milieu de quatre
 * dés en volume. Un vrai dé photographié sur une table est toujours un peu de
 * biais.
 *
 * **L'angle n'est pas le même pour tous les solides, et ne peut pas l'être.**
 * Une face voisine n'entre dans le champ que si sa normale s'écarte de moins de
 * 90° de l'axe de vue. Or cet écart est une propriété du solide : 41,8° sur un
 * icosaèdre (les voisines sont visibles sans rien incliner), mais 109,5° sur un
 * tétraèdre — qui reste donc rigoureusement plat tant qu'on ne l'a pas penché de
 * plus de 19,5°.
 *
 * **Et l'angle ne se calcule pas de tête.** Première tentative : dériver
 * l'inclinaison du seul écart angulaire entre faces voisines. Elle échoue, parce
 * que le résultat dépend aussi de l'AZIMUT des voisines autour de la face tirée.
 * Sur un tétraèdre les trois voisines sont à 120° l'une de l'autre ; quand
 * l'inclinaison tombe pile entre deux d'entre elles, son effet utile est réduit
 * de moitié et aucune n'entre dans le champ. Le test des 60 poses l'a attrapé —
 * une seule face visible sur certaines poses du d4, c'est-à-dire un dé plat.
 *
 * On MESURE donc, au lieu d'estimer : on essaie des inclinaisons croissantes et
 * on retient la première qui, sur TOUTES les faces du solide, dégage une voisine
 * d'une surface appréciable. Le d4 cesse d'être une exception écrite à la main,
 * et le trapézoèdre du d10 — le seul solide à faces irrégulières — est traité
 * par la même mesure.
 */
const BASE_TILT_RAD = (21 * Math.PI) / 180;
const MAX_TILT_RAD = (52 * Math.PI) / 180;
const TILT_STEP_RAD = (1 * Math.PI) / 180;
/** Part minimale de la silhouette qu'une face voisine doit occuper. */
const MIN_NEIGHBOUR_SHARE = 0.07;
/** Répartition de l'inclinaison entre « on voit le dessus » et « on voit le flanc ». */
const TILT_PITCH_SHARE = -0.62;
const TILT_YAW_SHARE = 0.79;

function tiltMatrix(magnitude: number): Mat3 {
  return multiply(
    rotationAxisAngle([1, 0, 0], magnitude * TILT_PITCH_SHARE),
    rotationAxisAngle([0, 1, 0], magnitude * TILT_YAW_SHARE),
  );
}

function tiltFor(solid: Polyhedron): Mat3 {
  const cached = TILT_CACHE.get(solid.sides);
  if (cached) return cached;

  let chosen = tiltMatrix(MAX_TILT_RAD);
  for (
    let magnitude = BASE_TILT_RAD;
    magnitude <= MAX_TILT_RAD;
    magnitude += TILT_STEP_RAD
  ) {
    const candidate = tiltMatrix(magnitude);
    if (solid.faces.every((face) => neighbourShare(solid, face, candidate) >= MIN_NEIGHBOUR_SHARE)) {
      chosen = candidate;
      break;
    }
  }

  TILT_CACHE.set(solid.sides, chosen);
  return chosen;
}

/**
 * Part de la silhouette occupée par la plus grande face AUTRE que la face tirée.
 *
 * Mesurée en projection parallèle : la question est celle de la visibilité, pas
 * du rendu exact, et la perspective ne changerait pas quelle face entre dans le
 * champ.
 */
function neighbourShare(
  solid: Polyhedron,
  target: PolyFace,
  tilt: Mat3,
): number {
  const rotation = poseFor(target, tilt);
  let total = 0;
  let best = 0;
  for (const face of solid.faces) {
    if (apply(rotation, face.normal)[2]! <= 0) continue;
    const area = Math.abs(
      shoelace(face.vertices.map((v) => apply(rotation, v))),
    );
    total += area;
    if (face !== target) best = Math.max(best, area);
  }
  return total > 0 ? best / total : 0;
}

function shoelace(points: readonly Vec3[]): number {
  let twice = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    twice += a[0]! * b[1]! - b[0]! * a[1]!;
  }
  return twice / 2;
}

const TILT_CACHE = new Map<number, Mat3>();

/**
 * Rotation amenant `face` devant la caméra, chiffre à l'endroit, légèrement de
 * biais.
 *
 * Trois étapes composées : la normale vers l'observateur, puis une rotation
 * autour de l'axe de vue pour redresser le chiffre, puis l'inclinaison de
 * présentation.
 */
export function restRotation(solid: Polyhedron, face: PolyFace): Mat3 {
  return poseFor(face, tiltFor(solid));
}

function poseFor(face: PolyFace, tilt: Mat3): Mat3 {
  const toCamera = rotateOnto(face.normal, [0, 0, 1]);

  // Redressement : une fois la face de front, son haut doit pointer vers le haut
  // de l'écran. Il est déjà dans le plan xy — un simple pivot autour de z suffit.
  const upAfter = apply(toCamera, faceFrame(face).up);
  const spin = rotationAxisAngle(
    [0, 0, 1],
    Math.PI / 2 - Math.atan2(upAfter[1]!, upAfter[0]!),
  );

  return multiply(tilt, multiply(spin, toCamera));
}

/** Rotation la plus courte amenant `from` sur `to` (vecteurs unitaires). */
function rotateOnto(from: Vec3, to: Vec3): Mat3 {
  const c = Math.min(1, Math.max(-1, dot(from, to)));
  if (c > 1 - 1e-9) return IDENTITY;
  // Antipodes : l'axe `from × to` est nul, n'importe quelle perpendiculaire fait
  // l'affaire.
  if (c < -1 + 1e-9) {
    const seed: Vec3 = Math.abs(from[0]!) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    return rotationAxisAngle(normalize(cross(from, seed)), Math.PI);
  }
  return rotationAxisAngle(normalize(cross(from, to)), Math.acos(c));
}

/** Direction de la lumière — en haut à gauche, un peu en avant du spectateur. */
const LIGHT: Vec3 = normalize([-0.38, 0.62, 0.68]);

/**
 * Direction de la lumière projetée à l'écran (y vers le bas), unitaire.
 *
 * Sert à dégrader CHAQUE face de son arête éclairée vers son arête à l'ombre.
 * Sans ce dégradé, deux faces voisines d'orientations proches reçoivent presque
 * le même éclairement et se confondent en un seul aplat : le d8 se lisait comme
 * un losange plat alors que sa géométrie était juste et sa voisine à 60 % de
 * l'aire de la face tirée. Le relief ne venait pas à manquer, c'est le CONTRASTE
 * qui manquait.
 */
export const LIGHT_SCREEN: readonly [number, number] = (() => {
  const x = LIGHT[0]!;
  const y = -LIGHT[1]!;
  const l = Math.hypot(x, y) || 1;
  return [x / l, y / l];
})();

/**
 * Part de lumière reçue même dos à la source.
 *
 * Sans elle, une facette tournée à l'opposé retombe à zéro, donc à une teinte
 * quasi confondue avec le fond très sombre de l'app : le solide se dissout et il
 * ne reste que deux ou trois éclats flottants. Constaté en UAT.
 */
const AMBIENT = 0.26;

export interface ProjectedFace {
  readonly value: number;
  /** Polygone en pixels, origine au centre du dé, y vers le BAS (repère écran). */
  readonly polygon: readonly (readonly [number, number])[];
  /** Éclairement, de 0 (dos à la lumière) à 1 (de face). */
  readonly shade: number;
  /** `true` pour la face tirée — celle qu'on lit une fois le dé posé. */
  readonly isTarget: boolean;
  /**
   * Pose du chiffre : une transformation affine 2D `[a, b, c, d, e, f]` menant
   * du repère de la face (pixels, y vers le bas, origine au centre de la face)
   * au repère du canevas. Elle porte le raccourci de perspective : un chiffre
   * sur une face de biais s'aplatit comme le ferait sa gravure.
   */
  readonly digitTransform: readonly [number, number, number, number, number, number];
  /** Taille du chiffre, en pixels du repère de la face. */
  readonly digitSize: number;
}

export interface ProjectOptions {
  /** Rayon circonscrit visé, en pixels. */
  readonly radiusPx: number;
  /** Rotation courante du solide (culbute comprise). */
  readonly rotation: Mat3;
  /** Distance de la caméra, en pixels. Plus elle est faible, plus la fuite est marquée. */
  readonly perspectivePx: number;
  /** Face tirée par le moteur. */
  readonly targetValue: number;
}

/**
 * Projette les faces VISIBLES d'un solide.
 *
 * Aucun tri n'est nécessaire : le solide est convexe et les faces arrière sont
 * écartées, donc deux faces retenues ne se recouvrent jamais.
 */
export function projectDie(
  solid: Polyhedron,
  { radiusPx, rotation, perspectivePx, targetValue }: ProjectOptions,
): ProjectedFace[] {
  const camera: Vec3 = [0, 0, perspectivePx];
  const out: ProjectedFace[] = [];

  for (const face of solid.faces) {
    const normal = apply(rotation, face.normal);
    const centroid = scaled(apply(rotation, face.centroid), radiusPx);
    // Face arrière : la caméra est du côté intérieur de son plan.
    if (dot(normal, sub(camera, centroid)) <= 0) continue;

    const project = (v: Vec3): [number, number] => {
      const p = scaled(apply(rotation, v), radiusPx);
      // Un point ne peut pas passer derrière la caméra : le solide tient dans une
      // sphère de rayon `radiusPx`, et la perspective est bornée plus loin.
      const s = perspectivePx / (perspectivePx - p[2]!);
      return [p[0]! * s, -p[1]! * s];
    };

    const origin = project(face.centroid);
    const { up, right } = faceFrame(face);
    // Une base de mesure courte : la déformation locale autour du centre de la
    // face, donc le raccourci de perspective réellement subi par le chiffre.
    const probe = 0.15;
    const [ux, uy] = delta(project(add(face.centroid, scaled(right, probe))), origin);
    const [vx, vy] = delta(project(add(face.centroid, scaled(up, probe))), origin);
    const unit = probe * radiusPx;

    out.push({
      value: face.value,
      polygon: face.vertices.map(project),
      // La lumière est fixée dans le repère de la SCÈNE et non du solide : elle
      // reste accrochée à la pièce pendant que le dé tourne, comme une vraie.
      shade: AMBIENT + (1 - AMBIENT) * Math.max(0, dot(normal, LIGHT)),
      isTarget: face.value === targetValue,
      // Le repère de la face a son y vers le BAS (convention canevas) : la
      // colonne du bas est donc l'opposée du haut de la face.
      digitTransform: [ux / unit, uy / unit, -vx / unit, -vy / unit, origin[0], origin[1]],
      digitSize: face.inradius * radiusPx * 1.05,
    });
  }

  return out;
}

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0]! + b[0]!, a[1]! + b[1]!, a[2]! + b[2]!];
}

function delta(a: readonly [number, number], b: readonly [number, number]): [number, number] {
  return [a[0] - b[0], a[1] - b[1]];
}

/**
 * Largeur moyenne visée, en unités de rayon circonscrit.
 *
 * Vaut à peu près celle d'un icosaèdre : le d20 garde donc sa taille de
 * référence, et ce sont les autres solides qui viennent à lui.
 */
const TARGET_MEAN_WIDTH = 1.76;

/** Nombre de directions échantillonnées pour la largeur moyenne. */
const WIDTH_SAMPLES = 64;

/**
 * Facteur ramenant tous les solides à la MÊME taille apparente.
 *
 * **Ce que le rayon circonscrit ne dit pas.** Tous les solides sont normalisés à
 * un circonscrit de 1, mais ils ne remplissent pas leur sphère de la même façon :
 * un cube vu de face n'occupe que 1,15 unité de large là où un icosaèdre en
 * occupe 1,9. À circonscrit égal, le d6 paraissait donc bien plus petit que le
 * d20 du même jet. Mesurer le rayon maximal projeté ne corrige rien — il vaut 1
 * pour tout solide unitaire, puisqu'un sommet finit toujours près du bord.
 *
 * On mesure donc la LARGEUR MOYENNE de la silhouette — l'encombrement moyen du
 * solide, toutes directions confondues. L'aire, essayée d'abord, égalise mal :
 * à aire égale, un triangle paraît plus grand qu'un disque parce qu'il s'étend
 * plus loin. La largeur moyenne rend précisément cet étalement. Moyennée sur
 * toutes les poses possibles, pour qu'un même dé ne change pas de taille d'un
 * jet à l'autre.
 */
export function visualScaleFor(solid: Polyhedron): number {
  const cached = SCALE_CACHE.get(solid.sides);
  if (cached !== undefined) return cached;

  let total = 0;
  for (const face of solid.faces) {
    total += meanWidth(solid, restRotation(solid, face));
  }
  const scale = TARGET_MEAN_WIDTH / (total / solid.faces.length);
  SCALE_CACHE.set(solid.sides, scale);
  return scale;
}

/**
 * Largeur moyenne de la silhouette sous une rotation donnée, en projection
 * parallèle.
 *
 * Pour chaque direction du plan de l'écran, la largeur du solide est l'écart
 * entre ses deux appuis extrêmes ; on en prend la moyenne. Aucun calcul
 * d'enveloppe n'est nécessaire — les appuis sont des sommets.
 */
function meanWidth(solid: Polyhedron, rotation: Mat3): number {
  const points = solid.faces.flatMap((f) =>
    f.vertices.map((v) => apply(rotation, v)),
  );
  let total = 0;
  for (let i = 0; i < WIDTH_SAMPLES; i += 1) {
    const theta = (Math.PI * i) / WIDTH_SAMPLES;
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
  return total / WIDTH_SAMPLES;
}

const SCALE_CACHE = new Map<number, number>();
