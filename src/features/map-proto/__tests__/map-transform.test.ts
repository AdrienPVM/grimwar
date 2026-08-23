import { describe, expect, it } from 'vitest';

import {
  clampTransform,
  IDENTITY_TRANSFORM,
  MAP_ZOOM_MAX,
  MAP_ZOOM_MIN,
  panBy,
  toViewBox,
  zoomBy,
  zoomPercent,
} from '../map-transform';
import { MAP_VIEWBOX_H, MAP_VIEWBOX_W } from '../map-viewport';

describe('map-transform — bornes', () => {
  it('la vue entière est le cadrage par défaut', () => {
    expect(toViewBox(IDENTITY_TRANSFORM)).toBe(
      `0 0 ${MAP_VIEWBOX_W} ${MAP_VIEWBOX_H}`,
    );
    expect(zoomPercent(IDENTITY_TRANSFORM)).toBe(100);
  });

  it('ne dézoome jamais sous la carte entière', () => {
    const out = zoomBy(IDENTITY_TRANSFORM, 0.1);
    expect(out.zoom).toBe(MAP_ZOOM_MIN);
    expect(toViewBox(out)).toBe(`0 0 ${MAP_VIEWBOX_W} ${MAP_VIEWBOX_H}`);
  });

  it('plafonne le zoom', () => {
    expect(zoomBy({ zoom: 5.5, panX: 0, panY: 0 }, 4).zoom).toBe(MAP_ZOOM_MAX);
  });

  it('la fenêtre visible reste toujours DANS la carte', () => {
    // Pan volontairement absurde à zoom ×2 : la fenêtre fait 500×350, donc le
    // coin haut-gauche ne peut pas dépasser (500, 350).
    const out = clampTransform({ zoom: 2, panX: 9999, panY: 9999 });
    expect(out.panX).toBe(MAP_VIEWBOX_W / 2);
    expect(out.panY).toBe(MAP_VIEWBOX_H / 2);
    const outNeg = clampTransform({ zoom: 2, panX: -9999, panY: -9999 });
    expect(outNeg.panX).toBe(0);
    expect(outNeg.panY).toBe(0);
  });
});

describe('map-transform — le zoom garde le centre', () => {
  it('zoomer depuis la vue entière recentre la fenêtre sur le milieu', () => {
    const out = zoomBy(IDENTITY_TRANSFORM, 2);
    expect(out.zoom).toBe(2);
    // Fenêtre 500×350 centrée sur (500, 350) → coin (250, 175).
    expect(out.panX).toBe(250);
    expect(out.panY).toBe(175);
    expect(toViewBox(out)).toBe('250 175 500 350');
  });

  it('dézoomer puis rezoomer revient au même cadrage (opération réversible)', () => {
    const zoomed = zoomBy(IDENTITY_TRANSFORM, 2);
    const panned = panBy(zoomed, 100, 50);
    const roundTrip = zoomBy(zoomBy(panned, 2), 0.5);
    expect(roundTrip.zoom).toBeCloseTo(panned.zoom, 6);
    expect(roundTrip.panX).toBeCloseTo(panned.panX, 6);
    expect(roundTrip.panY).toBeCloseTo(panned.panY, 6);
  });

  it('un zoom arrière depuis un coin ne sort pas de la carte', () => {
    const corner = clampTransform({ zoom: 4, panX: 9999, panY: 9999 });
    const out = zoomBy(corner, 0.25);
    expect(out.zoom).toBe(1);
    expect(out.panX).toBe(0);
    expect(out.panY).toBe(0);
  });
});

describe('map-transform — panoramique', () => {
  it('déplace la fenêtre du delta demandé, en unités de carte', () => {
    const out = panBy({ zoom: 2, panX: 100, panY: 100 }, 40, -30);
    expect(out.panX).toBe(140);
    expect(out.panY).toBe(70);
  });

  it('à zoom 1 le panoramique est sans effet — rien à révéler', () => {
    const out = panBy(IDENTITY_TRANSFORM, 300, 300);
    expect(out.panX).toBe(0);
    expect(out.panY).toBe(0);
  });
});
