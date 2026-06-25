import { describe, it, expect } from 'vitest';

import { DEFAULT_GRID_PX, snapToGrid, snapToGridCell } from '../grid-snap';

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

describe('grid-snap — snapToGridCell', () => {
  it('aligne sur le CENTRE de la case qui contient le point (grille 70)', () => {
    // Case 0 = [0,70) → centre 35 ; case 3 = [210,280) → centre 245.
    expect(snapToGridCell({ x: 23, y: 47 }, 70)).toEqual({ x: 35, y: 35 });
    expect(snapToGridCell({ x: 260, y: 240 }, 70)).toEqual({ x: 245, y: 245 });
  });

  it('place le centre à un demi-pas, jamais sur une ligne (grille 50)', () => {
    // Contraste avec snapToGrid : ici on ne tombe pas sur 0/50/100 mais sur
    // 25/75/125 (milieux de case).
    expect(snapToGridCell({ x: 0, y: 0 }, 50)).toEqual({ x: 25, y: 25 });
    expect(snapToGridCell({ x: 49, y: 51 }, 50)).toEqual({ x: 25, y: 75 });
    expect(snapToGridCell({ x: 130, y: 175 }, 50)).toEqual({ x: 125, y: 175 });
  });

  it('un point sur une ligne appartient à la case de droite/bas', () => {
    // x = 70 (ligne entre case 0 et 1) → case 1, centre 105.
    expect(snapToGridCell({ x: 70, y: 140 }, 70)).toEqual({ x: 105, y: 175 });
  });

  it("renvoie la position inchangée si gridPx <= 0", () => {
    expect(snapToGridCell({ x: 23, y: 47 }, 0)).toEqual({ x: 23, y: 47 });
  });
});
