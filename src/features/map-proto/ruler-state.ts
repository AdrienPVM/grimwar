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

/**
 * Échelle prototype de SECOURS : 1 case 50 px = 5 ft → 10 px = 1 ft.
 *
 * ⚠ Ne PAS coder cette valeur en dur dans la mesure réelle : chaque carte
 * porte son propre `gridSize` (px/case, défaut 70) et `feetPerSquare` (ft/case,
 * défaut 5). La conversion px→pied effective est `gridSize / feetPerSquare`
 * (cf. `pxPerFoot` ci-dessous), exactement la même que `tokenVisionPx` dans
 * `map-scene.tsx`. Cette constante ne sert que de défaut quand aucune échelle
 * n'est fournie (tests purs, fallback).
 */
export const PX_PER_FOOT = 10;

/**
 * Px par pied effectif d'une carte : `gridSize / feetPerSquare`.
 *
 * Une case fait `gridSize` px et vaut `feetPerSquare` pieds (5 ft par convention
 * SRD) ; un pied vaut donc `gridSize / feetPerSquare` px. Retombe sur
 * `PX_PER_FOOT` si l'un des deux est non positif (carte dégénérée) pour ne
 * jamais diviser par zéro côté appelant.
 */
export function pxPerFoot(gridSize: number, feetPerSquare: number): number {
  if (gridSize <= 0 || feetPerSquare <= 0) return PX_PER_FOOT;
  return gridSize / feetPerSquare;
}

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
 *
 * `feetScale` = px par pied de la carte (cf. `pxPerFoot`). Défaut `PX_PER_FOOT`
 * pour rétro-compat des tests purs ; la prod passe TOUJOURS l'échelle dérivée
 * de la carte (sinon une carte 70 px/case mesurerait 40 % trop long).
 */
export function rulerLengthFeet(
  ruler: Ruler,
  feetScale: number = PX_PER_FOOT,
): number {
  const scale = feetScale > 0 ? feetScale : PX_PER_FOOT;
  const points: MapPosition[] = [...ruler.anchors];
  if (ruler.cursor && points.length > 0) {
    points.push(ruler.cursor);
  }
  let totalPx = 0;
  for (let i = 1; i < points.length; i += 1) {
    totalPx += distancePx(points[i - 1]!, points[i]!);
  }
  return totalPx / scale;
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
