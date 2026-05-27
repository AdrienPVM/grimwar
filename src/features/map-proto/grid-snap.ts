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
