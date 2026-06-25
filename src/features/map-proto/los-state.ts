/**
 * Ligne de vue / occlusion par les murs — moteur de raycasting PUR
 * (capacité titre du plan 31, jamais implémentée : la lumière ne révélait
 * jusqu'ici que des cercles, sans tenir compte des murs).
 *
 * Algorithme : balayage angulaire (« angular sweep visibility polygon »).
 * Depuis l'origine (position d'un token), on lance des rayons vers chaque
 * extrémité de mur (± un epsilon pour passer juste à côté des coins et
 * révéler ce qu'il y a derrière) PLUS un jeu de rayons régulièrement espacés
 * (pour arrondir la frontière dans les zones ouvertes). Chaque rayon s'arrête
 * au premier mur rencontré, ou au rayon de vision max. On trie les impacts par
 * angle → on obtient le polygone exact de ce que le token voit.
 *
 * 100 % pur (aucune I/O, aucun side-effect) → entièrement unit-testable, et
 * totalement réutilisable même si le rendu migrait un jour vers Konva/Pixi.
 *
 * Coords dans le viewBox logique (`map-viewport.ts`), mêmes unités que murs,
 * tokens et fog.
 */
import type { FogPolygon, MapPosition, WallPolyline } from '@/shared/types/map';

/** Segment de droite [a, b]. */
export interface Segment {
  readonly a: MapPosition;
  readonly b: MapPosition;
}

/** Bornes rectangulaires du monde (le viewBox), [0,0] → [width,height]. */
export interface WorldBounds {
  readonly width: number;
  readonly height: number;
}

const EPS_ANGLE = 0.00015; // rad — décalage de part et d'autre d'un coin
const DEFAULT_ANGULAR_SAMPLES = 72; // rayons réguliers → cap circulaire lisse

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function normalizeAngle(a: number): number {
  const twoPi = Math.PI * 2;
  return ((a % twoPi) + twoPi) % twoPi;
}

/** Éclate les polylignes de murs en segments individuels. */
export function wallsToSegments(walls: readonly WallPolyline[]): Segment[] {
  const segments: Segment[] = [];
  for (const wall of walls) {
    for (let i = 0; i < wall.points.length - 1; i += 1) {
      segments.push({ a: wall.points[i]!, b: wall.points[i + 1]! });
    }
  }
  return segments;
}

/** Les 4 arêtes du rectangle monde — un rayon ne sort jamais de la carte. */
export function boundingSegments(bounds: WorldBounds): Segment[] {
  const { width: w, height: h } = bounds;
  const tl = { x: 0, y: 0 };
  const tr = { x: w, y: 0 };
  const br = { x: w, y: h };
  const bl = { x: 0, y: h };
  return [
    { a: tl, b: tr },
    { a: tr, b: br },
    { a: br, b: bl },
    { a: bl, b: tl },
  ];
}

/**
 * Distance (le long du rayon unitaire `dir` depuis `origin`) du premier point
 * d'intersection avec le segment `[a,b]`, ou `null` si le rayon ne touche pas.
 *
 * Formulation classique par produits vectoriels :
 *   v1 = O - A ; v2 = B - A ; v3 = perp(D) = (-Dy, Dx)
 *   t1 = cross(v2, v1) / dot(v2, v3)  (distance rayon, car D unitaire)
 *   t2 = dot(v1, v3) / dot(v2, v3)    (paramètre segment ∈ [0,1])
 */
export function raySegmentDistance(
  origin: MapPosition,
  dir: MapPosition,
  a: MapPosition,
  b: MapPosition,
): number | null {
  const v1x = origin.x - a.x;
  const v1y = origin.y - a.y;
  const v2x = b.x - a.x;
  const v2y = b.y - a.y;
  const v3x = -dir.y;
  const v3y = dir.x;
  const denom = v2x * v3x + v2y * v3y;
  if (Math.abs(denom) < 1e-9) return null; // rayon ∥ segment
  const t1 = (v2x * v1y - v2y * v1x) / denom;
  const t2 = (v1x * v3x + v1y * v3y) / denom;
  if (t1 >= 0 && t2 >= -1e-9 && t2 <= 1 + 1e-9) return t1;
  return null;
}

/**
 * Calcule le polygone de visibilité depuis `origin`, borné par les murs
 * `segments` (déjà éclatés via `wallsToSegments`), le rectangle `bounds`, et
 * le rayon de vision `maxRadius`.
 *
 * Renvoie une suite ordonnée de points (≥ 3) formant le polygone visible —
 * directement utilisable comme `points` d'un `FogPolygon` de révélation.
 */
export function computeVisibilityPolygon(
  origin: MapPosition,
  segments: readonly Segment[],
  bounds: WorldBounds,
  maxRadius: number,
  angularSamples: number = DEFAULT_ANGULAR_SAMPLES,
): MapPosition[] {
  const allSegments = [...segments, ...boundingSegments(bounds)];

  const angles: number[] = [];
  // Rayons vers chaque extrémité de mur, ± epsilon pour franchir les coins.
  for (const seg of allSegments) {
    for (const p of [seg.a, seg.b]) {
      const base = Math.atan2(p.y - origin.y, p.x - origin.x);
      angles.push(
        normalizeAngle(base - EPS_ANGLE),
        normalizeAngle(base),
        normalizeAngle(base + EPS_ANGLE),
      );
    }
  }
  // Rayons réguliers → frontière arrondie dans l'espace ouvert (cap de vision).
  for (let i = 0; i < angularSamples; i += 1) {
    angles.push(normalizeAngle((i / angularSamples) * Math.PI * 2));
  }

  const hits: { angle: number; point: MapPosition }[] = [];
  for (const angle of angles) {
    const dir = { x: Math.cos(angle), y: Math.sin(angle) };
    let best = maxRadius;
    for (const seg of allSegments) {
      const t = raySegmentDistance(origin, dir, seg.a, seg.b);
      if (t !== null && t >= 0 && t < best) best = t;
    }
    hits.push({
      angle,
      point: {
        x: round1(origin.x + dir.x * best),
        y: round1(origin.y + dir.y * best),
      },
    });
  }

  hits.sort((h1, h2) => h1.angle - h2.angle);
  return hits.map((h) => h.point);
}

/** Identifiant déterministe du reveal LOS d'un token (parité `tokenRevealId`). */
export function losRevealId(tokenId: string): string {
  return `los-reveal-${tokenId}`;
}

/**
 * Construit le `FogPolygon` de révélation (non persisté) correspondant à la
 * ligne de vue d'un token. `createdAt: null` car éphémère (recalculé à chaque
 * rendu). Renvoie `null` si le polygone dégénère (< 3 points) ou si le rayon
 * est nul.
 */
export function buildLosReveal(
  tokenId: string,
  origin: MapPosition,
  walls: readonly WallPolyline[],
  bounds: WorldBounds,
  maxRadius: number,
): FogPolygon | null {
  if (maxRadius <= 0) return null;
  const polygon = computeVisibilityPolygon(
    origin,
    wallsToSegments(walls),
    bounds,
    maxRadius,
  );
  if (polygon.length < 3) return null;
  return {
    id: losRevealId(tokenId),
    points: polygon,
    kind: 'reveal',
    createdAt: null,
  };
}
