import { describe, it, expect } from 'vitest';

import {
  addAnchor,
  clearRuler,
  distancePx,
  EMPTY_RULER,
  formatFeet,
  formatMeters,
  metersFromFeet,
  PX_PER_FOOT,
  pxPerFoot,
  rulerLengthFeet,
  setCursor,
} from '../ruler-state';

describe('ruler-state — distancePx', () => {
  it('mesure euclidienne classique', () => {
    expect(distancePx({ x: 0, y: 0 }, { x: 30, y: 40 })).toBe(50);
  });

  it('renvoie 0 pour 2 points identiques', () => {
    expect(distancePx({ x: 10, y: 10 }, { x: 10, y: 10 })).toBe(0);
  });
});

describe('ruler-state — rulerLengthFeet', () => {
  it('règle vide → 0 ft', () => {
    expect(rulerLengthFeet(EMPTY_RULER)).toBe(0);
  });

  it('un seul ancrage sans cursor → 0 ft', () => {
    const ruler = addAnchor(EMPTY_RULER, { x: 0, y: 0 });
    expect(rulerLengthFeet(ruler)).toBe(0);
  });

  it('un ancrage + cursor → distance vivante', () => {
    // 50 px = 5 ft selon PX_PER_FOOT = 10.
    const ruler = setCursor(
      addAnchor(EMPTY_RULER, { x: 0, y: 0 }),
      { x: 50, y: 0 },
    );
    expect(rulerLengthFeet(ruler)).toBe(5);
  });

  it('deux ancrages + cursor → somme des segments', () => {
    // 0→100 = 10 ft, 100→200 = 10 ft, 200→cursor 250 = 5 ft → 25 ft.
    let ruler = addAnchor(EMPTY_RULER, { x: 0, y: 0 });
    ruler = addAnchor(ruler, { x: 100, y: 0 });
    ruler = addAnchor(ruler, { x: 200, y: 0 });
    ruler = setCursor(ruler, { x: 250, y: 0 });
    expect(rulerLengthFeet(ruler)).toBe(25);
  });

  it('respecte PX_PER_FOOT (10 px / ft)', () => {
    expect(PX_PER_FOOT).toBe(10);
  });

  it("utilise l'échelle de carte fournie, pas le défaut 50 px/case", () => {
    // Carte par défaut : gridSize 70, feetPerSquare 5 → 14 px/ft.
    // 140 px de segment = 10 ft (et NON 14 ft comme le donnerait le défaut 10).
    const scale = pxPerFoot(70, 5);
    expect(scale).toBe(14);
    const ruler = setCursor(addAnchor(EMPTY_RULER, { x: 0, y: 0 }), { x: 140, y: 0 });
    expect(rulerLengthFeet(ruler, scale)).toBe(10);
    // Garde-fou anti-régression : le défaut codé en dur donnerait une mesure fausse.
    expect(rulerLengthFeet(ruler)).toBe(14);
  });
});

describe('ruler-state — pxPerFoot', () => {
  it('dérive px/pied de gridSize ÷ feetPerSquare', () => {
    expect(pxPerFoot(70, 5)).toBe(14);
    expect(pxPerFoot(50, 5)).toBe(10);
    expect(pxPerFoot(100, 10)).toBe(10);
  });

  it('retombe sur PX_PER_FOOT pour une carte dégénérée (0 ou négatif)', () => {
    expect(pxPerFoot(0, 5)).toBe(PX_PER_FOOT);
    expect(pxPerFoot(70, 0)).toBe(PX_PER_FOOT);
    expect(pxPerFoot(-70, 5)).toBe(PX_PER_FOOT);
  });
});

describe('ruler-state — setCursor', () => {
  it("ne fait rien si la règle est vide (rien à attacher)", () => {
    const ruler = setCursor(EMPTY_RULER, { x: 100, y: 100 });
    expect(ruler).toEqual(EMPTY_RULER);
  });

  it("attache le curseur si au moins un ancrage existe", () => {
    const ruler = setCursor(
      addAnchor(EMPTY_RULER, { x: 0, y: 0 }),
      { x: 50, y: 50 },
    );
    expect(ruler.cursor).toEqual({ x: 50, y: 50 });
  });
});

describe('ruler-state — clearRuler', () => {
  it("purge complètement", () => {
    const seeded = setCursor(
      addAnchor(EMPTY_RULER, { x: 0, y: 0 }),
      { x: 50, y: 0 },
    );
    expect(clearRuler(seeded)).toEqual(EMPTY_RULER);
  });
});

describe('ruler-state — formatFeet', () => {
  it("arrondit à l'entier", () => {
    expect(formatFeet(4.3)).toBe('4 ft');
    expect(formatFeet(4.6)).toBe('5 ft');
  });

  it("gère 0 ft", () => {
    expect(formatFeet(0)).toBe('0 ft');
  });
});

describe('ruler-state — metersFromFeet / formatMeters', () => {
  it('convertit selon la convention officielle FR (0,3 m/pied)', () => {
    // 5 ft = 1,50 m ; 30 ft = 9 m (identité avec le bundle SRD FR).
    expect(metersFromFeet(5)).toBeCloseTo(1.5, 5);
    expect(metersFromFeet(30)).toBeCloseTo(9, 5);
    expect(metersFromFeet(0)).toBe(0);
  });

  it('formate les valeurs entières sans décimale, unité « m »', () => {
    expect(formatMeters(20)).toBe('6 m'); // sphère AoE 20 ft → 6 m
    expect(formatMeters(30)).toBe('9 m'); // portée classique 30 ft → 9 m
    expect(formatMeters(10)).toBe('3 m');
    expect(formatMeters(0)).toBe('0 m');
  });

  it('formate les fractions avec une décimale et virgule française', () => {
    expect(formatMeters(5)).toBe('1,5 m'); // 1 case = 1,50 m
    // Diagonale ~14,14 ft → 4,24 m, arrondi à 0,1 m près.
    expect(formatMeters(14.142)).toBe('4,2 m');
  });
});
