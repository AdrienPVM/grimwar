/**
 * Parseur du format Dungeon Alchemist `.dd2vtt` (alias « Universal VTT »).
 *
 * Capacité titre du plan 29, jamais implémentée jusqu'ici. Le `.dd2vtt` est un
 * fichier JSON exporté par Dungeon Alchemist (et compatibles) contenant :
 *   - `resolution.map_size` : dimensions de la carte EN CASES (peut être
 *     fractionnaire), `pixels_per_grid` : taille d'une case dans l'image,
 *     `map_origin` : décalage du cadre exporté (non nul sur un export partiel).
 *   - `line_of_sight` : tableau de polylignes (coords EN CASES) = les murs qui
 *     bloquent la vue. C'est exactement ce dont le moteur LOS a besoin.
 *   - `portals` : portes ; une porte `closed:true` bloque aussi la vue.
 *   - `lights` : sources lumineuses statiques (position EN CASES, `range` EN
 *     CASES, couleur hex).
 *   - `environment.baked_lighting` : l'image porte déjà son éclairage.
 *   - `image` : l'image de fond encodée en base64 (PNG ou WEBP). Sur un export
 *     réel elle pèse plusieurs dizaines de Mo — l'appelant DOIT la réduire
 *     avant de l'afficher ou de l'entreposer.
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
    readonly map_origin?: Dd2vttPoint;
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
  readonly environment?: {
    readonly baked_lighting?: boolean;
  };
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
  /** Data URL `data:image/<png|webp|jpeg>;base64,…`, ou `null` sans image. */
  readonly imageDataUrl: string | null;
  /** Nombre total de sommets de murs (résumé UI). */
  readonly wallVertexCount: number;
  /**
   * `environment.baked_lighting` : l'image de fond porte DÉJÀ son éclairage.
   * Vrai sur tous les exports Dungeondraft observés. Superposer notre couche
   * de lumière par-dessus assombrirait une carte déjà éclairée — l'appelant
   * importe donc les sources sans allumer la couche.
   */
  readonly bakedLighting: boolean;
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
 * Devine le type MIME d'une image base64 à ses octets de tête. La spec Universal
 * VTT dit « base64 encoded PNG or WEBP » : préfixer aveuglément `image/png`
 * mentait sur un export WEBP. Les navigateurs renifflent souvent le contenu et
 * affichent quand même, mais un data URL honnête coûte trois comparaisons.
 *
 * Les préfixes base64 sont stables : les 3 premiers octets d'un flux occupent
 * toujours les 4 premiers caractères base64, sans dépendre de l'alignement.
 */
export function sniffImageMime(base64: string): string {
  if (base64.startsWith('iVBORw0KGgo')) return 'image/png';
  if (base64.startsWith('UklGR')) return 'image/webp';
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  // Inconnu → on garde le défaut historique du format ; le navigateur reniflera.
  return 'image/png';
}

/**
 * Normalise une couleur `.dd2vtt` (souvent `RRGGBBAA` ou `RRGGBB`, avec ou sans
 * `#`) en `#rrggbb`. Renvoie `null` si invalide (l'appelant prend un défaut).
 *
 * ORDRE DES COMPOSANTES — la spec Universal VTT dit seulement « colour code
 * hex » sans trancher RGBA / ARGB. On lit **RRGGBBAA** (les 6 premiers
 * caractères sont la couleur, le dernier octet l'alpha), établi sur les exports
 * réels : les 14 lampes de `FelderHouse.dd2vtt` valent toutes `ffce0af7`, soit
 * `#ffce0a` — l'ambre chaud d'une lampe — en RGBA, contre `#ce0af7` — un magenta
 * vif — en ARGB. Personne n'éclaire une ferme au néon rose.
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

  // `resolution.map_origin` : coin haut-gauche de la carte dans le repère du
  // fichier. Nul sur un export plein cadre, NON NUL sur un export partiel — et
  // les coords de murs/lumières restent alors absolues. Sans cette soustraction,
  // toute la géométrie d'un export recadré se décale silencieusement (même
  // correction que `uvtt2fgu`, l'implémentation Fantasy Grounds de référence).
  const origin = isPoint(raw.resolution?.map_origin)
    ? raw.resolution.map_origin
    : { x: 0, y: 0 };

  const sx = MAP_VIEWBOX_W / mapSize.x;
  const sy = MAP_VIEWBOX_H / mapSize.y;
  const toViewbox = (p: Dd2vttPoint): MapPosition => ({
    x: round1((p.x - origin.x) * sx),
    y: round1((p.y - origin.y) * sy),
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
  //
  // RAYONS — `range` est la portée de lumière VIVE ; la lumière FAIBLE porte au
  // double, comme toute source du SRD (une torche éclaire vivement à 20 pieds et
  // faiblement à 40). C'est aussi la convention de `uvtt2fgu`, qui écrit
  // `range,0.75,range*2,0.5`. On lisait auparavant `range` comme un diamètre,
  // ce qui rendait chaque lampe importée deux fois trop petite.
  const avgScale = (sx + sy) / 2;
  const lights: LightSource[] = [];
  (raw.lights ?? []).forEach((light, i) => {
    if (!isPoint(light.position)) return;
    const brightPx = isFiniteNumber(light.range) ? light.range * avgScale : 0;
    if (brightPx <= 0) return;
    const bright = Math.max(1, Math.round(brightPx));
    const color = normalizeDd2vttColor(light.color) ?? '#fbbf24';
    lights.push({
      id: `dd2vtt-light-${i}`,
      position: toViewbox(light.position),
      brightRadius: bright,
      dimRadius: bright * 2,
      color,
      preset: null,
    });
  });

  const imageDataUrl =
    typeof raw.image === 'string' && raw.image.length > 0
      ? `data:${sniffImageMime(raw.image)};base64,${raw.image}`
      : null;

  return {
    mapSizeSquares: { x: mapSize.x, y: mapSize.y },
    pixelsPerGrid: ppg,
    gridSizePx: Math.max(1, Math.round(avgScale)),
    walls,
    lights,
    imageDataUrl,
    wallVertexCount: vertexCount,
    bakedLighting: raw.environment?.baked_lighting === true,
  };
}
