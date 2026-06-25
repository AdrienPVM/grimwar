import { describe, expect, it } from 'vitest';

import {
  deltaToAngleDeg,
  pointerToWedge,
  wedgeCentersDeg,
} from '../angle-to-wedge';

/**
 * Géométrie pure du radial FAB (plan 11, step 20). Socle de la future couche
 * gestuelle — testé seul, sans rendu. Convention math : 0° = droite, 90° = haut,
 * 180° = gauche. 5 wedges sur l'hémisphère supérieur → centres `[180,135,90,45,0]`,
 * `index 0 ↔ 180°` (gauche).
 */
describe('wedgeCentersDeg', () => {
  it('répartit 5 wedges de 180° à 0°', () => {
    expect(wedgeCentersDeg(5)).toEqual([180, 135, 90, 45, 0]);
  });

  it('un seul wedge → centre milieu de l’arc', () => {
    expect(wedgeCentersDeg(1)).toEqual([90]);
  });

  it('zéro wedge → liste vide', () => {
    expect(wedgeCentersDeg(0)).toEqual([]);
  });
});

describe('deltaToAngleDeg', () => {
  it('vers le haut (dy négatif écran) → 90°', () => {
    expect(deltaToAngleDeg(0, -100)).toBeCloseTo(90);
  });
  it('vers la droite → 0°', () => {
    expect(deltaToAngleDeg(100, 0)).toBeCloseTo(0);
  });
  it('vers la gauche → 180°', () => {
    expect(deltaToAngleDeg(-100, 0)).toBeCloseTo(180);
  });
  it('vers le bas → 270°', () => {
    expect(deltaToAngleDeg(0, 100)).toBeCloseTo(270);
  });
});

describe('pointerToWedge (5 wedges, arc 180→0)', () => {
  const layout = { count: 5 } as const;

  it('haut → wedge central (index 2)', () => {
    expect(pointerToWedge(0, -100, layout)).toBe(2);
  });

  it('gauche → index 0', () => {
    expect(pointerToWedge(-100, 0, layout)).toBe(0);
  });

  it('droite → index 4', () => {
    expect(pointerToWedge(100, 0, layout)).toBe(4);
  });

  it('diagonale haut-gauche (135°) → index 1', () => {
    expect(pointerToWedge(-70, -70, layout)).toBe(1);
  });

  it('diagonale haut-droite (45°) → index 3', () => {
    expect(pointerToWedge(70, -70, layout)).toBe(3);
  });

  it('dans la zone morte (dist < 30px) → null quel que soit l’angle', () => {
    expect(pointerToWedge(0, -10, layout)).toBeNull();
  });

  it('vers le bas (hors hémisphère) → null', () => {
    expect(pointerToWedge(0, 100, layout)).toBeNull();
  });

  it('respecte la tolérance : hors de l’arc supérieur → null', () => {
    // Angle 215° (bas-gauche). Centre le plus proche = 180° (gauche), écart 35°
    // > tolérance 30° → aucun wedge. (À l'intérieur de [0,180] les fenêtres ±30°
    // se chevauchent — il n'y a de null que hors de l'hémisphère supérieur.)
    const rad = (215 * Math.PI) / 180;
    const dx = Math.cos(rad) * 100;
    const dy = -Math.sin(rad) * 100;
    expect(pointerToWedge(dx, dy, { count: 5, toleranceDeg: 30 })).toBeNull();
  });
});
