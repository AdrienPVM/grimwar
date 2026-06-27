import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { MapMeta, MapToken } from '@/shared/types/map';

import { MapScene } from '../map-scene';

/**
 * Tests d'intégration du décor : MapScene alimente bien le fog avec les
 * révélations de ligne de vue calculées (preuve que LOS → fog est câblé), et
 * trace les murs en mode debug.
 *
 * MapScene rend un fragment SVG → on l'enveloppe dans un `<svg>`.
 */

function makeMap(overrides: Partial<MapMeta> = {}): MapMeta {
  return {
    id: 'm',
    name: 'Test',
    imageUrl: null,
    gridSize: 50,
    feetPerSquare: 5,
    showGrid: false,
    fogEnabled: true,
    lightingEnabled: false,
    fogPolygons: [],
    lightSources: [],
    aoeTemplates: [],
    walls: [
      { id: 'w', points: [{ x: 200, y: 100 }, { x: 200, y: 600 }] },
    ],
    losEnabled: true,
    schemaVersion: 1,
    createdAt: null,
    updatedAt: null,
    updatedBy: 'uid',
    ...overrides,
  };
}

const token: MapToken = {
  id: 'tok-1',
  kind: 'pj',
  label: 'A',
  position: { x: 100, y: 350 },
  color: '#ff0000',
  updatedAt: null,
  updatedBy: 'uid',
};

function renderScene(map: MapMeta, tokens: readonly MapToken[], showWalls = true) {
  return render(
    <svg>
      <MapScene
        map={map}
        localImageUrl={null}
        tokens={tokens}
        maskId="m-test"
        showWalls={showWalls}
      />
    </svg>,
  );
}

describe('MapScene — intégration LOS → fog', () => {
  it('calcule une révélation de ligne de vue pour un token quand losEnabled', () => {
    const { container } = renderScene(makeMap(), [token]);
    // FogLayer rend les reveals comme <polygon fill="black"> dans le <mask>.
    const reveals = container.querySelectorAll('mask polygon[fill="black"]');
    expect(reveals.length).toBeGreaterThanOrEqual(1);
  });

  it('ne calcule AUCUNE révélation LOS quand losEnabled est false', () => {
    const { container } = renderScene(
      makeMap({ losEnabled: false }),
      [token],
    );
    const reveals = container.querySelectorAll('mask polygon[fill="black"]');
    expect(reveals.length).toBe(0);
  });

  it('ignore les tokens marker pour la LOS', () => {
    const marker: MapToken = { ...token, id: 'mk', kind: 'marker' };
    const { container } = renderScene(makeMap(), [marker]);
    const reveals = container.querySelectorAll('mask polygon[fill="black"]');
    expect(reveals.length).toBe(0);
  });

  it('trace les murs en debug quand showWalls', () => {
    const { getByTestId } = renderScene(makeMap(), [token], true);
    expect(getByTestId('map-scene-walls')).toBeTruthy();
  });

  it('ne rend pas le fog quand fogEnabled est false', () => {
    const { container } = renderScene(makeMap({ fogEnabled: false }), [token]);
    expect(container.querySelector('[data-testid="fog-layer"]')).toBeNull();
  });
});

describe('MapScene — lumière occultée par les murs', () => {
  // Source à gauche du mur vertical x=200 (cf. makeMap), rayon large.
  const litMap = (overrides: Partial<MapMeta> = {}): MapMeta =>
    makeMap({
      lightingEnabled: true,
      lightSources: [
        {
          id: 'lum-1',
          position: { x: 100, y: 350 },
          brightRadius: 150,
          dimRadius: 150,
          color: '#fbbf24',
          preset: null,
        },
      ],
      ...overrides,
    });

  it('découpe la lumière par un clipPath quand des murs existent', () => {
    const { getByTestId } = renderScene(litMap(), []);
    // Le clipPath de visibilité est présent…
    expect(getByTestId('light-clip-lum-1')).toBeTruthy();
    // …et le cercle de tint le référence (la lumière est bornée par la LOS).
    const circle = getByTestId('light-source-lum-1');
    expect(circle.getAttribute('clip-path')).toBe('url(#light-clip-lum-1)');
  });

  it('NE découpe PAS la lumière en l’absence de mur (cercle plein, compat)', () => {
    const { getByTestId, queryByTestId } = renderScene(
      litMap({ walls: [] }),
      [],
    );
    expect(queryByTestId('light-clip-lum-1')).toBeNull();
    const circle = getByTestId('light-source-lum-1');
    expect(circle.getAttribute('clip-path')).toBeNull();
  });

  it('le rayon traversant un mur est coupé AU mur (occlusion réelle)', () => {
    // Source en (100,350), rayon total 300. Le mur vertical x=200 (y∈[100,600])
    // barre la route droit devant : le rayon à l'horizontale (y≈350) DOIT
    // s'arrêter à x≈200, et non atteindre x=400 (100+300) comme un cercle plein.
    // (La lumière peut légitimement déborder PAR LES BOUTS d'un mur fini — on
    //  teste donc le rayon qui le traverse de plein fouet, pas l'extension max.)
    const parsePolygon = (testId: string): { x: number; y: number }[] =>
      (
        (getByTestId(testId).querySelector('polygon')?.getAttribute('points') ??
          '')
          .trim()
          .split(/\s+/)
      ).map((pair) => {
        const [x, y] = pair.split(',').map(Number);
        return { x: x ?? 0, y: y ?? 0 };
      });

    const { getByTestId } = renderScene(litMap(), []);
    const pts = parsePolygon('light-clip-lum-1');
    expect(pts.length).toBeGreaterThanOrEqual(3);
    // Sommet le plus proche de l'horizontale droite (y≈350) : c'est le rayon
    // qui traverse le mur de plein fouet.
    const onAxis = pts
      .filter((p) => p.x > 100 && Math.abs(p.y - 350) < 3)
      .sort((a, b) => b.x - a.x)[0];
    expect(onAxis).toBeTruthy();
    expect(onAxis!.x).toBeGreaterThan(195); // touche bien le mur
    expect(onAxis!.x).toBeLessThanOrEqual(205); // sans le franchir (≠ x=400)
  });
});

describe('MapScene — rendu des templates AoE', () => {
  it("ne rend aucune couche AoE quand la liste est vide", () => {
    const { queryByTestId } = renderScene(makeMap(), [token]);
    expect(queryByTestId('aoe-layer')).toBeNull();
  });

  it("trace une sphère AoE à l'échelle RÉELLE de la carte (pieds → px)", () => {
    // Carte 70 px/case, 5 ft/case → 14 px/ft. Une sphère de 20 ft (stockée
    // radius:20 en pieds) doit être tracée avec r=280 px (et NON 20 px brut).
    const map = makeMap({
      gridSize: 70,
      feetPerSquare: 5,
      aoeTemplates: [
        {
          id: 'a1',
          shape: 'sphere',
          position: { x: 500, y: 350 },
          dimensions: { radius: 20 },
          pinned: false,
        },
      ],
    });
    const { getByTestId } = renderScene(map, [token]);
    const circle = getByTestId('aoe-a1');
    expect(circle.getAttribute('r')).toBe('280');
    expect(circle.getAttribute('cx')).toBe('500');
    expect(circle.getAttribute('cy')).toBe('350');
  });
});
