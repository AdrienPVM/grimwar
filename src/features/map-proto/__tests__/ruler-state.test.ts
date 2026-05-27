import { describe, it, expect } from 'vitest';

import {
  addAnchor,
  clearRuler,
  distancePx,
  EMPTY_RULER,
  formatFeet,
  PX_PER_FOOT,
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
