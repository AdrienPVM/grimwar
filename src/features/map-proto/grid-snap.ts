/**
 * Grid snap — pure function (CHANTIER H nuit 3).
 *
 * Aligne une position sur la grille la plus proche. Par convention
 * prototype : grille de 50 px. La conversion vers la grille effective
 * d'une `MapMeta.gridSize` viendra avec la migration Firestore.
 */
import type { MapPosition } from '@/shared/types/map';

export const DEFAULT_GRID_PX = 50;

export function snapToGrid(
  pos: MapPosition,
  gridPx = DEFAULT_GRID_PX,
): MapPosition {
  if (gridPx <= 0) return pos;
  return {
    x: Math.round(pos.x / gridPx) * gridPx,
    y: Math.round(pos.y / gridPx) * gridPx,
  };
}

/**
 * Aligne une position sur le CENTRE de la case de grille qui la contient.
 *
 * La grille est tracée à `x = i · gridPx` (cf. `map-scene.tsx`) : les lignes
 * tombent aux multiples de `gridPx`, donc la case `[i·g, (i+1)·g]` a son centre
 * en `(i + 0,5)·g`. Un jeton représente une créature qui occupe une case
 * (1,50 m = 1 case SRD) : son centre se pose donc au centre de case — la
 * convention VTT standard. C'est différent de `snapToGrid`, qui aligne sur
 * l'intersection à 4 cases (utile pour des murs ou des gabarits, pas pour
 * poser un pion).
 */
export function snapToGridCell(
  pos: MapPosition,
  gridPx = DEFAULT_GRID_PX,
): MapPosition {
  if (gridPx <= 0) return pos;
  return {
    x: (Math.floor(pos.x / gridPx) + 0.5) * gridPx,
    y: (Math.floor(pos.y / gridPx) + 0.5) * gridPx,
  };
}
