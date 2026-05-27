import { describe, it, expect } from 'vitest';

import { DEFAULT_GRID_PX, snapToGrid } from '../grid-snap';

describe('grid-snap — snapToGrid', () => {
  it('aligne sur la grille la plus proche (50 px par défaut)', () => {
    expect(snapToGrid({ x: 23, y: 47 })).toEqual({ x: 0, y: 50 });
    expect(snapToGrid({ x: 27, y: 73 })).toEqual({ x: 50, y: 50 });
    expect(snapToGrid({ x: 130, y: 175 })).toEqual({ x: 150, y: 200 });
  });

  it('respecte une grille personnalisée', () => {
    expect(snapToGrid({ x: 23, y: 47 }, 10)).toEqual({ x: 20, y: 50 });
  });

  it("renvoie la position inchangée si gridPx <= 0", () => {
    expect(snapToGrid({ x: 23, y: 47 }, 0)).toEqual({ x: 23, y: 47 });
  });

  it('DEFAULT_GRID_PX = 50', () => {
    expect(DEFAULT_GRID_PX).toBe(50);
  });
});
