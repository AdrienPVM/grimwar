/**
 * Parseur du format Dungeon Alchemist `.dd2vtt` (alias « Universal VTT »).
 *
 * Capacité titre du plan 29, jamais implémentée jusqu'ici. Le `.dd2vtt` est un
 * fichier JSON exporté par Dungeon Alchemist (et compatibles) contenant :
 *   - `resolution.map_size` : dimensions de la carte EN CASES (peut être
 *     fractionnaire), `pixels_per_grid` : taille d'une case dans l'image.
 *   - `line_of_sight` : tableau de polylignes (coords EN CASES) = les murs qui
 *     bloquent la vue. C'est exactement ce dont le moteur LOS a besoin.
 *   - `portals` : portes ; une porte `closed:true` bloque aussi la vue.
 *   - `lights` : sources lumineuses statiques (position EN CASES, `range` EN
 *     CASES, couleur hex).
 *   - `image` : l'image de fond encodée en base64 (PNG le plus souvent).
 *
 * --- Espace de coordonnées ---
 * Tout le reste du mode carte travaille dans le viewBox logique
 * `MAP_VIEWBOX_W × MAP_VIEWBOX_H` (cf. `map-viewport.ts`). On normalise donc
 * les coords « cases » du `.dd2vtt` dans ce viewBox avec deux facteurs d'échelle
 * INDÉPENDANTS `sx = W / map_size.x`, `sy = H / map_size.y`. L'image de fond
 * étant elle-même étirée sur tout le viewBox (cf. `map-live-screen`), murs et
 * lumières se superposent exactement — une légère distorsion d'aspect est
 * acceptée (proto), au profit d'UN SEUL chemin de rendu (image plein viewBox).
 *
 * Module PUR (aucune I/O, aucun side-effect) → entièrement unit-testable. La
 * lecture du fichier + la persistance Firestore vivent dans l'écran d'import.
 */
import type { LightSource, MapPosition, WallPolyline } from '@/shared/types/map';

import { MAP_VIEWBOX_H, MAP_VIEWBOX_W } from './map-viewport';

/** Point en coords « cases » du `.dd2vtt`. */
interface Dd2vttPoint {
  readonly x: number;
  readonly y: number;
}

/** Forme brute (partielle) d'un `.dd2vtt` — on ne lit que ce qu'on consomme. */
interface Dd2vttRaw {
  readonly resolution?: {
    readonly map_size?: Dd2vttPoint;
    readonly pixels_per_grid?: number;
  };
  readonly line_of_sight?: readonly (readonly Dd2vttPoint[])[];
  readonly objects_line_of_sight?: readonly (readonly Dd2vttPoint[])[];
  readonly portals?: readonly {
    readonly bounds?: readonly Dd2vttPoint[];
    readonly closed?: boolean;
  }[];
  readonly lights?: readonly {
    readonly position?: Dd2vttPoint;
    readonly range?: number;
    readonly color?: string;
  }[];
  readonly image?: string;
}

/** Résultat normalisé prêt à construire une `MapMeta`. */
export interface ParsedDd2vtt {
  /** Dimensions en cases (telles que déclarées par le fichier). */
  readonly mapSizeSquares: { readonly x: number; readonly y: number };
  /** Pixels par case dans l'image source (info, pas utilisé au rendu viewBox). */
  readonly pixelsPerGrid: number;
  /** Taille d'une case projetée dans le viewBox (moyenne des deux échelles). */
  readonly gridSizePx: number;
  /** Murs convertis en coords viewBox. */
  readonly walls: readonly WallPolyline[];
  /** Lumières statiques converties en coords viewBox. */
  readonly lights: readonly LightSource[];
  /** Data URL `data:image/png;base64,…` ou `null` si le fichier n'embarque pas d'image. */
  readonly imageDataUrl: string | null;
  /** Nombre total de sommets de murs (résumé UI). */
  readonly wallVertexCount: number;
}

/** Erreur de parsing avec message lisible (surface UI). */
export class Dd2vttParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Dd2vttParseError';
  }
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isPoint(v: unknown): v is Dd2vttPoint {
  return (
    typeof v === 'object' &&
    v !== null &&
    isFiniteNumber((v as Dd2vttPoint).x) &&
    isFiniteNumber((v as Dd2vttPoint).y)
  );
}

/** Arrondit à 1 décimale — borne la taille du payload Firestore sans perte visible. */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Normalise une couleur `.dd2vtt` (souvent `RRGGBBAA` ou `RRGGBB`, avec ou sans
 * `#`) en `#rrggbb`. Renvoie `null` si invalide (l'appelant prend un défaut).
 */
export function normalizeDd2vttColor(raw: string | undefined): string | null {
  if (!raw) return null;
  const hex = raw.replace(/^#/, '').toLowerCase();
  if (!/^[0-9a-f]{6,8}$/.test(hex)) return null;
  return `#${hex.slice(0, 6)}`;
}

/**
 * Parse une chaîne JSON `.dd2vtt` et renvoie la forme normalisée.
 *
 * @throws {Dd2vttParseError} si le JSON est invalide ou si `resolution.map_size`
 * / `pixels_per_grid` manquent (sans eux, impossible de projeter les coords).
 */
export function parseDd2vtt(jsonText: string): ParsedDd2vtt {
  let raw: Dd2vttRaw;
  try {
    raw = JSON.parse(jsonText) as Dd2vttRaw;
  } catch (err) {
    throw new Dd2vttParseError(
      `JSON illisible : ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const mapSize = raw.resolution?.map_size;
  const ppg = raw.resolution?.pixels_per_grid;
  if (!isPoint(mapSize) || mapSize.x <= 0 || mapSize.y <= 0) {
    throw new Dd2vttParseError(
      "Champ `resolution.map_size` absent ou invalide — ce n'est pas un .dd2vtt valide.",
    );
  }
  if (!isFiniteNumber(ppg) || ppg <= 0) {
    throw new Dd2vttParseError(
      'Champ `resolution.pixels_per_grid` absent ou invalide.',
    );
  }

  const sx = MAP_VIEWBOX_W / mapSize.x;
  const sy = MAP_VIEWBOX_H / mapSize.y;
  const toViewbox = (p: Dd2vttPoint): MapPosition => ({
    x: round1(p.x * sx),
    y: round1(p.y * sy),
  });

  // Murs = line_of_sight + objects_line_of_sight (mobilier occultant) + portes
  // fermées. On agrège tout en polylignes ≥ 2 points.
  const polylines: (readonly Dd2vttPoint[])[] = [
    ...(raw.line_of_sight ?? []),
    ...(raw.objects_line_of_sight ?? []),
  ];

  const walls: WallPolyline[] = [];
  let vertexCount = 0;
  polylines.forEach((line, i) => {
    if (!Array.isArray(line)) return;
    const pts = line.filter(isPoint).map(toViewbox);
    if (pts.length < 2) return;
    vertexCount += pts.length;
    walls.push({ id: `wall-${i}`, points: pts });
  });

  // Portes fermées → segment de mur (bounds = 2 points). Une porte ouverte ne
  // bloque rien, on l'ignore.
  (raw.portals ?? []).forEach((portal, i) => {
    if (portal.closed !== true) return;
    const bounds = portal.bounds;
    if (!Array.isArray(bounds)) return;
    const pts = bounds.filter(isPoint).map(toViewbox);
    if (pts.length < 2) return;
    vertexCount += pts.length;
    walls.push({ id: `portal-${i}`, points: pts });
  });

  // Lumières statiques. `range` en cases → rayon viewBox via l'échelle moyenne.
  const avgScale = (sx + sy) / 2;
  const lights: LightSource[] = [];
  (raw.lights ?? []).forEach((light, i) => {
    if (!isPoint(light.position)) return;
    const rangePx = isFiniteNumber(light.range) ? light.range * avgScale : 0;
    if (rangePx <= 0) return;
    const half = Math.max(1, Math.round(rangePx / 2));
    const color = normalizeDd2vttColor(light.color) ?? '#fbbf24';
    lights.push({
      id: `dd2vtt-light-${i}`,
      position: toViewbox(light.position),
      brightRadius: half,
      dimRadius: half,
      color,
      preset: null,
    });
  });

  const imageDataUrl =
    typeof raw.image === 'string' && raw.image.length > 0
      ? `data:image/png;base64,${raw.image}`
      : null;

  return {
    mapSizeSquares: { x: mapSize.x, y: mapSize.y },
    pixelsPerGrid: ppg,
    gridSizePx: Math.max(1, Math.round(avgScale)),
    walls,
    lights,
    imageDataUrl,
    wallVertexCount: vertexCount,
  };
}
