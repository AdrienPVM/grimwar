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
