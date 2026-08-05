/**
 * Géométrie des solides de dés — d4, d6, d8, d10, d12, d20.
 *
 * **Pourquoi une construction générique plutôt que des tables de faces.** La
 * tentation, pour un icosaèdre, est de recopier ses 20 triplets d'indices
 * trouvés quelque part. Une seule coquille dans 20 triplets donne une face
 * retournée qu'aucun test ne rattrape et que l'œil met longtemps à voir. On ne
 * fournit donc QUE les sommets — la partie courte et vérifiable — et les faces
 * sont déduites par recherche d'enveloppe convexe. Un seul algorithme, six
 * solides, et des invariants (Euler, planéité, normales unitaires sortantes)
 * qui se testent sur tous à la fois.
 *
 * Les faces sont ensuite numérotées comme un vrai dé : deux faces opposées
 * totalisent `sides + 1`. Le tétraèdre est la seule exception — il n'a pas de
 * faces opposées, ses faces sont donc numérotées en séquence.
 *
 * Tous les solides sont centrés sur l'origine et normalisés à un rayon
 * circonscrit de 1 : l'échelle en pixels est décidée au rendu.
 */

export type Vec3 = readonly [number, number, number];

export interface PolyFace {
  /** Sommets ordonnés autour de la normale (sens direct vu de l'extérieur). */
  readonly vertices: readonly Vec3[];
  readonly centroid: Vec3;
  /** Normale unitaire sortante. */
  readonly normal: Vec3;
  /** Chiffre gravé sur la face. */
  readonly value: number;
  /**
   * Rayon inscrit de la face — la plus grande pastille qui y tient.
   *
   * C'est ce qui dimensionne le chiffre : un triangle d'icosaèdre et un
   * pentagone de dodécaèdre ont des circonscrits comparables mais des inscrits
   * très différents, et un chiffre calé sur le circonscrit déborderait du
   * triangle.
   */
  readonly inradius: number;
}

export interface Polyhedron {
  readonly sides: number;
  readonly faces: readonly PolyFace[];
}

/** Tolérance géométrique — les sommets sont construits en flottants. */
const EPS = 1e-9;

export function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function length(a: Vec3): number {
  return Math.sqrt(dot(a, a));
}

export function normalize(a: Vec3): Vec3 {
  const l = length(a);
  if (l < EPS) return [0, 0, 0];
  return [a[0] / l, a[1] / l, a[2] / l];
}

function scale(a: Vec3, k: number): Vec3 {
  return [a[0] * k, a[1] * k, a[2] * k];
}

/**
 * Déduit les faces d'un nuage de sommets formant un polyèdre CONVEXE.
 *
 * Pour chaque triplet non aligné, on teste si son plan est un plan d'appui
 * (tous les autres sommets du même côté). Si oui, la face est l'ensemble des
 * sommets posés dessus. Les plans sont dédupliqués par leur signature
 * (normale, distance) arrondie.
 *
 * Coût : O(n³) sur n ≤ 20 sommets, soit au pire ~1140 triplets évalués une
 * seule fois au chargement du module. Aucune raison d'optimiser.
 */
function facesFromConvexVertices(vertices: readonly Vec3[]): {
  vertices: Vec3[];
  centroid: Vec3;
  normal: Vec3;
}[] {
  // Déduplication par TOLÉRANCE et non par clé arrondie : une face pentagonale
  // possède dix triplets de sommets, dont chacun produit une normale
  // infinitésimalement différente. Arrondir à 6 décimales laissait passer les
  // écarts qui tombent de part et d'autre d'une frontière d'arrondi — le
  // dodécaèdre sortait avec 24 faces au lieu de 12.
  const planes: { normal: Vec3; offset: number }[] = [];
  const alreadyKnown = (normal: Vec3, offset: number): boolean =>
    planes.some(
      (p) => dot(p.normal, normal) > 1 - 1e-9 && Math.abs(p.offset - offset) < 1e-6,
    );

  for (let i = 0; i < vertices.length; i += 1) {
    for (let j = i + 1; j < vertices.length; j += 1) {
      for (let k = j + 1; k < vertices.length; k += 1) {
        const a = vertices[i]!;
        const raw = cross(sub(vertices[j]!, a), sub(vertices[k]!, a));
        if (length(raw) < 1e-7) continue; // sommets alignés
        let normal = normalize(raw);
        let offset = dot(normal, a);

        let above = 0;
        let below = 0;
        for (const v of vertices) {
          const d = dot(normal, v) - offset;
          if (d > 1e-6) above += 1;
          else if (d < -1e-6) below += 1;
        }
        // Plan d'appui : tout le solide d'un seul côté.
        if (above > 0 && below > 0) continue;
        // On oriente la normale vers l'EXTÉRIEUR (le solide est du côté négatif).
        if (above > 0) {
          normal = scale(normal, -1);
          offset = -offset;
        }

        if (!alreadyKnown(normal, offset)) planes.push({ normal, offset });
      }
    }
  }

  return planes.map(({ normal, offset }) => {
    const members = vertices.filter(
      (v) => Math.abs(dot(normal, v) - offset) < 1e-6,
    );
    const centroid = scale(
      members.reduce<Vec3>(
        (acc, v) => [acc[0] + v[0], acc[1] + v[1], acc[2] + v[2]],
        [0, 0, 0],
      ),
      1 / members.length,
    );
    return {
      vertices: orderAroundNormal(members, centroid, normal),
      centroid,
      normal,
    };
  });
}

/** Trie les sommets d'une face par angle polaire autour de sa normale. */
function orderAroundNormal(
  members: readonly Vec3[],
  centroid: Vec3,
  normal: Vec3,
): Vec3[] {
  const u = normalize(sub(members[0]!, centroid));
  const w = cross(normal, u);
  return [...members].sort((p, q) => {
    const dp = sub(p, centroid);
    const dq = sub(q, centroid);
    return (
      Math.atan2(dot(dp, w), dot(dp, u)) - Math.atan2(dot(dq, w), dot(dq, u))
    );
  });
}

/**
 * Numérote les faces à la manière d'un vrai dé : opposées = `sides + 1`.
 *
 * L'ordre de départ est rendu déterministe par un tri sur la normale — sans
 * lui, la numérotation dépendrait de l'ordre de parcours des triplets, donc
 * changerait au moindre remaniement de la construction.
 */
function numberFaces(
  faces: { vertices: Vec3[]; centroid: Vec3; normal: Vec3 }[],
  sides: number,
): PolyFace[] {
  const sorted = [...faces].sort((a, b) => {
    for (let axis = 2; axis >= 0; axis -= 1) {
      const d = b.normal[axis]! - a.normal[axis]!;
      if (Math.abs(d) > 1e-6) return d;
    }
    return 0;
  });

  const values = new Map<number, number>();
  let next = 1;
  for (let i = 0; i < sorted.length; i += 1) {
    if (values.has(i)) continue;
    values.set(i, next);
    const opposite = sorted.findIndex(
      (f, idx) =>
        idx !== i &&
        !values.has(idx) &&
        length(
          sub(f.normal, [
            -sorted[i]!.normal[0],
            -sorted[i]!.normal[1],
            -sorted[i]!.normal[2],
          ]),
        ) < 1e-6,
    );
    if (opposite >= 0) values.set(opposite, sides + 1 - next);
    next += 1;
  }

  return sorted.map((f, idx) => ({
    vertices: f.vertices,
    centroid: f.centroid,
    normal: f.normal,
    value: values.get(idx) ?? idx + 1,
    inradius: faceInradius(f.vertices, f.centroid),
  }));
}

/** Distance du centre de la face à son arête la plus proche. */
function faceInradius(vertices: readonly Vec3[], centroid: Vec3): number {
  let min = Infinity;
  for (let i = 0; i < vertices.length; i += 1) {
    const a = sub(vertices[i]!, centroid);
    const b = sub(vertices[(i + 1) % vertices.length]!, centroid);
    const edge = sub(b, a);
    const len = length(edge);
    // Aire du triangle (centre, a, b) = ½·|edge|·hauteur.
    if (len > EPS) min = Math.min(min, length(cross(a, b)) / len);
  }
  return min;
}

/** Ramène le solide à un rayon circonscrit de 1. */
function unitize(vertices: readonly Vec3[]): Vec3[] {
  const max = Math.max(...vertices.map(length));
  return vertices.map((v) => scale(v, 1 / max));
}

const PHI = (1 + Math.sqrt(5)) / 2;

function tetrahedronVertices(): Vec3[] {
  return [
    [1, 1, 1],
    [1, -1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
  ];
}

function cubeVertices(): Vec3[] {
  const out: Vec3[] = [];
  for (const x of [-1, 1])
    for (const y of [-1, 1]) for (const z of [-1, 1]) out.push([x, y, z]);
  return out;
}

function octahedronVertices(): Vec3[] {
  return [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
}

function icosahedronVertices(): Vec3[] {
  const out: Vec3[] = [];
  for (const s1 of [-1, 1]) {
    for (const s2 of [-1, 1]) {
      out.push([0, s1 * 1, s2 * PHI]);
      out.push([s1 * 1, s2 * PHI, 0]);
      out.push([s2 * PHI, 0, s1 * 1]);
    }
  }
  return out;
}

function dodecahedronVertices(): Vec3[] {
  const out: Vec3[] = [...cubeVertices()];
  const inv = 1 / PHI;
  for (const s1 of [-1, 1]) {
    for (const s2 of [-1, 1]) {
      out.push([0, s1 * inv, s2 * PHI]);
      out.push([s1 * inv, s2 * PHI, 0]);
      out.push([s2 * PHI, 0, s1 * inv]);
    }
  }
  return out;
}

/**
 * Trapézoèdre pentagonal — la forme réelle d'un d10 (10 faces en cerf-volant).
 *
 * Deux couronnes de 5 sommets décalées de 36°, plus deux apex. La hauteur des
 * apex n'est pas libre : elle est CONTRAINTE par la coplanarité des quatre
 * sommets d'un cerf-volant. On la résout numériquement par dichotomie plutôt
 * que de recopier une constante — la recherche de faces rejetterait de toute
 * façon un solide mal fichu, et le test de planéité le prouverait.
 */
function trapezohedronVertices(): Vec3[] {
  const n = 5;
  // Demi-hauteur des couronnes. Elle FIXE l'élancement du solide, puisque la
  // coplanarité impose ensuite la hauteur des apex : 0,12 donne des apex à
  // ≈ 1,14 pour un rayon de couronne de 1, soit un dé à peine plus haut que
  // large — les proportions d'un vrai d10. La première valeur essayée (0,35)
  // envoyait les apex à 3,3 et donnait une aiguille, qui de face ressemblait à
  // une lentille. Cf. le test d'élancement, qui borne ce rapport.
  const c = 0.12;
  const step = (2 * Math.PI) / n;
  const upper = (i: number): Vec3 => [
    Math.cos(i * step),
    Math.sin(i * step),
    c,
  ];
  const lower = (i: number): Vec3 => [
    Math.cos((i + 0.5) * step),
    Math.sin((i + 0.5) * step),
    -c,
  ];

  // f(h) = 0 quand apex, upper0, lower0 et upper1 sont coplanaires.
  const planarityDefect = (h: number): number => {
    const apex: Vec3 = [0, 0, h];
    const u0 = upper(0);
    const u1 = upper(1);
    const l0 = lower(0);
    return dot(cross(sub(u0, apex), sub(u1, apex)), sub(l0, apex));
  };

  let lo = c + 1e-6;
  let hi = 20;
  if (planarityDefect(lo) * planarityDefect(hi) > 0) {
    throw new Error(
      '[dice3d] trapézoèdre : aucun changement de signe, la dichotomie ne peut pas converger.',
    );
  }
  for (let iter = 0; iter < 200; iter += 1) {
    const mid = (lo + hi) / 2;
    if (planarityDefect(lo) * planarityDefect(mid) <= 0) hi = mid;
    else lo = mid;
  }
  const h = (lo + hi) / 2;

  const out: Vec3[] = [
    [0, 0, h],
    [0, 0, -h],
  ];
  for (let i = 0; i < n; i += 1) {
    out.push(upper(i));
    out.push(lower(i));
  }
  return out;
}

const VERTEX_SETS: Record<number, () => Vec3[]> = {
  4: tetrahedronVertices,
  6: cubeVertices,
  8: octahedronVertices,
  10: trapezohedronVertices,
  12: dodecahedronVertices,
  20: icosahedronVertices,
};

/** Nombre de faces attendu — garde-fou contre une construction silencieusement fausse. */
function buildPolyhedron(sides: number): Polyhedron {
  const make = VERTEX_SETS[sides];
  if (!make) {
    throw new Error(`[dice3d] aucun solide défini pour un d${sides}.`);
  }
  const faces = numberFaces(
    facesFromConvexVertices(unitize(make())),
    sides,
  );
  if (faces.length !== sides) {
    throw new Error(
      `[dice3d] d${sides} : ${faces.length} faces trouvées au lieu de ${sides}.`,
    );
  }
  return { sides, faces };
}

const CACHE = new Map<number, Polyhedron>();

/** Solides supportés, du plus petit au plus grand. */
export const SUPPORTED_DIE_SIDES: readonly number[] = [4, 6, 8, 10, 12, 20];

/**
 * Solide d'un dé à `sides` faces. Mémoïsé : la construction est faite une fois.
 *
 * Un dé non supporté (d100, d3 maison…) retourne `null` — l'appelant retombe
 * alors sur un rendu 2D. On ne lève pas : un dé exotique dans une formule ne
 * doit jamais casser un jet.
 */
export function polyhedronFor(sides: number): Polyhedron | null {
  if (!SUPPORTED_DIE_SIDES.includes(sides)) return null;
  const cached = CACHE.get(sides);
  if (cached) return cached;
  const built = buildPolyhedron(sides);
  CACHE.set(sides, built);
  return built;
}
