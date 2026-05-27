/**
 * Mesure de distance — pure functions module (CHANTIER H nuit 3).
 *
 * Une « règle » est une suite de points (MapPosition[]) tracée par le
 * MJ. Les segments consécutifs s'additionnent en pieds selon l'échelle
 * de la carte (par convention prototype : 1 case = 50 px = 5 ft).
 *
 * Stocke aussi un « curseur courant » (cursor) optionnel : entre 2
 * clics, on dessine une ligne de prévisualisation entre le dernier
 * point et le curseur — la longueur totale en pieds inclut ce segment.
 */
import type { MapPosition } from '@/shared/types/map';

/** Échelle prototype : 1 case 50 px = 5 ft → 10 px = 1 ft. */
export const PX_PER_FOOT = 10;

export interface Ruler {
  readonly anchors: readonly MapPosition[];
  readonly cursor: MapPosition | null;
}

export const EMPTY_RULER: Ruler = { anchors: [], cursor: null };

export function distancePx(a: MapPosition, b: MapPosition): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Longueur totale en pieds d'une règle (anchors + segment vivant vers
 * cursor si présent).
 */
export function rulerLengthFeet(ruler: Ruler): number {
  const points: MapPosition[] = [...ruler.anchors];
  if (ruler.cursor && points.length > 0) {
    points.push(ruler.cursor);
  }
  let totalPx = 0;
  for (let i = 1; i < points.length; i += 1) {
    totalPx += distancePx(points[i - 1]!, points[i]!);
  }
  return totalPx / PX_PER_FOOT;
}

/**
 * Ajoute un point d'ancrage (clic).
 * Convention : le premier clic n'ajoute pas seulement l'ancrage, il
 * démarre aussi la chaîne ; les suivants segmentent.
 */
export function addAnchor(ruler: Ruler, point: MapPosition): Ruler {
  return { ...ruler, anchors: [...ruler.anchors, point] };
}

/**
 * Met à jour le curseur (pour l'aperçu temps réel). Pas d'effet si la
 * règle est vide (rien à attacher à la prévue).
 */
export function setCursor(ruler: Ruler, point: MapPosition | null): Ruler {
  if (ruler.anchors.length === 0) return ruler;
  return { ...ruler, cursor: point };
}

/** Reset complet — utilisé à la sortie du mode règle ou via Effacer. */
export function clearRuler(_ruler: Ruler): Ruler {
  return EMPTY_RULER;
}

/**
 * Formate une distance en pieds avec arrondi à l'entier le plus proche.
 * Convention SRD : les distances de mouvement / portée s'expriment en
 * pieds entiers.
 */
export function formatFeet(feet: number): string {
  return `${Math.round(feet)} ft`;
}
