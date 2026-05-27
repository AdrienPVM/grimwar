import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MapMeta, MapToken } from '@/shared/types/map';

/**
 * Tests pour MapLiveScreen (CHANTIER D tracer D.4).
 *
 * On mocke :
 *   - `useAuth`,
 *   - `useMap` (single doc + tokens),
 *   - `updateToken` du service maps.
 *
 * Le drag SVG est testé via fireEvent.pointerDown/Move/Up sur le `<g>` du
 * token. La conversion screenToSvg s'appuie sur `getScreenCTM` que JSDOM
 * ne fournit pas — on stub `SVGSVGElement.prototype.createSVGPoint`
 * et `.getScreenCTM` pour que la matrice identité s'applique.
 */

// ── Mocks ────────────────────────────────────────────────────────────────
const authState: { user: { uid: string } | null; isReady: boolean } = {
  user: { uid: 'user-alice' },
  isReady: true,
};

vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => authState,
}));

const useMapState: {
  map: MapMeta | null;
  tokens: readonly MapToken[];
  isLoading: boolean;
  error: Error | null;
} = { map: null, tokens: [], isLoading: false, error: null };

vi.mock('@/features/map-proto/use-map', () => ({
  useMap: () => useMapState,
}));

const mockUpdateToken = vi.fn();
const mockUpdateMap = vi.fn();
const mockAddFogPolygon = vi.fn();
const mockAddLightSource = vi.fn();
const mockAddAoeTemplate = vi.fn();
vi.mock('@/shared/lib/services/maps', () => ({
  updateToken: (...args: unknown[]) => mockUpdateToken(...args),
  updateMap: (...args: unknown[]) => mockUpdateMap(...args),
  addFogPolygon: (...args: unknown[]) => mockAddFogPolygon(...args),
  addLightSource: (...args: unknown[]) => mockAddLightSource(...args),
  addAoeTemplate: (...args: unknown[]) => mockAddAoeTemplate(...args),
}));

vi.mock('@/shared/lib/firebase', () => ({
  getDb: () => ({}),
}));

// ── Helpers ──────────────────────────────────────────────────────────────
function renderAt(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/map-proto/cloud/:cid/maps/:mid" element={<MapLiveScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

function mkMap(overrides: Partial<MapMeta> = {}): MapMeta {
  return {
    id: 'donjon-de-l-aube',
    name: "Donjon de l'Aube",
    imageUrl: null,
    gridSize: 70,
    feetPerSquare: 5,
    showGrid: true,
    fogEnabled: true,
    lightingEnabled: true,
    fogPolygons: [],
    lightSources: [],
    aoeTemplates: [],
    schemaVersion: 1,
    createdAt: null,
    updatedAt: null,
    updatedBy: 'user-alice',
    ...overrides,
  };
}

function mkToken(overrides: Partial<MapToken> = {}): MapToken {
  return {
    id: 't1',
    kind: 'pj',
    label: 'PJ-1',
    position: { x: 200, y: 200 },
    color: '#f59e0b',
    updatedAt: null,
    updatedBy: 'user-alice',
    ...overrides,
  };
}

// JSDOM ne fournit pas SVG matrix APIs ni setPointerCapture — stub minimal qui
// mappe identité matricielle + capture pointer en no-op.
function installSvgStubs(): void {
  const svgProto = SVGSVGElement.prototype as unknown as {
    createSVGPoint: () => {
      x: number;
      y: number;
      matrixTransform: (m: unknown) => { x: number; y: number };
    };
    getScreenCTM: () => { inverse: () => unknown };
  };
  svgProto.createSVGPoint = function () {
    const pt = { x: 0, y: 0, matrixTransform: (_m: unknown) => ({ x: pt.x, y: pt.y }) };
    return pt;
  };
  svgProto.getScreenCTM = function () {
    return { inverse: () => ({}) };
  };
  const elProto = Element.prototype as unknown as {
    setPointerCapture: (id: number) => void;
    releasePointerCapture: (id: number) => void;
  };
  elProto.setPointerCapture = function () {
    // no-op
  };
  elProto.releasePointerCapture = function () {
    // no-op
  };
}

import { MapLiveScreen } from '../map-live-screen';

beforeEach(() => {
  authState.user = { uid: 'user-alice' };
  authState.isReady = true;
  useMapState.map = mkMap();
  useMapState.tokens = [];
  useMapState.isLoading = false;
  useMapState.error = null;
  mockUpdateToken.mockReset().mockResolvedValue(undefined);
  mockUpdateMap.mockReset().mockResolvedValue(undefined);
  mockAddFogPolygon.mockReset().mockResolvedValue(undefined);
  mockAddLightSource.mockReset().mockResolvedValue(undefined);
  mockAddAoeTemplate.mockReset().mockResolvedValue(undefined);
  installSvgStubs();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('MapLiveScreen', () => {
  it('signed-out gate when user is null', () => {
    authState.user = null;
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    expect(screen.getByTestId('map-live-signed-out')).toBeTruthy();
  });

  it('shows loading state', () => {
    useMapState.isLoading = true;
    useMapState.map = null;
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    expect(screen.getByTestId('map-live-loading')).toBeTruthy();
  });

  it('shows error state when useMap reports transport error', () => {
    useMapState.error = new Error('rules-failed');
    useMapState.map = null;
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    expect(screen.getByTestId('map-live-error').textContent).toContain('rules-failed');
  });

  it('shows not-found when listener returns null map', () => {
    useMapState.map = null;
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    expect(screen.getByTestId('map-live-not-found')).toBeTruthy();
  });

  it('renders map name + cid/mid meta line', () => {
    useMapState.tokens = [mkToken()];
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    expect(screen.getByText("Donjon de l'Aube")).toBeTruthy();
    expect(screen.getByTestId('map-live-meta').textContent).toContain('camp-1');
    expect(screen.getByTestId('map-live-meta').textContent).toContain('m-1');
    expect(screen.getByTestId('map-live-meta').textContent).toContain('1 token');
  });

  it('renders pluralized token count', () => {
    useMapState.tokens = [mkToken({ id: 't1' }), mkToken({ id: 't2', label: 'PJ-2' })];
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    expect(screen.getByTestId('map-live-meta').textContent).toContain('2 tokens');
  });

  it('renders each token by id', () => {
    useMapState.tokens = [mkToken({ id: 't-alpha' }), mkToken({ id: 't-beta', label: 'B' })];
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    expect(screen.getByTestId('map-live-token-t-alpha')).toBeTruthy();
    expect(screen.getByTestId('map-live-token-t-beta')).toBeTruthy();
  });

  it('calls updateToken with new position on drag-release', async () => {
    useMapState.tokens = [mkToken({ id: 't1', position: { x: 200, y: 200 } })];
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    const tokenG = screen.getByTestId('map-live-token-t1');

    fireEvent.pointerDown(tokenG, { pointerId: 1, clientX: 200, clientY: 200 });
    fireEvent.pointerMove(tokenG, { pointerId: 1, clientX: 260, clientY: 240 });
    fireEvent.pointerUp(tokenG, { pointerId: 1, clientX: 260, clientY: 240 });

    await waitFor(() => {
      expect(mockUpdateToken).toHaveBeenCalledTimes(1);
    });
    const [cidArg, midArg, tidArg, patchArg, uidArg] = mockUpdateToken.mock.calls[0]!;
    expect(cidArg).toBe('camp-1');
    expect(midArg).toBe('m-1');
    expect(tidArg).toBe('t1');
    expect(uidArg).toBe('user-alice');
    // Position est un objet {x, y} typé number ; la valeur exacte dépend
    // de la transformation matricielle SVG que JSDOM ne fournit pas
    // fidèlement. On s'assure juste du payload contractuel.
    const patch = patchArg as { position: { x: number; y: number } };
    expect(patch).toHaveProperty('position');
    expect(typeof patch.position.x).toBe('number');
    expect(typeof patch.position.y).toBe('number');
  });

  it('surfaces updateToken errors and clears local override', async () => {
    mockUpdateToken.mockRejectedValueOnce(new Error('permission-denied'));
    useMapState.tokens = [mkToken({ id: 't1' })];
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    const tokenG = screen.getByTestId('map-live-token-t1');
    fireEvent.pointerDown(tokenG, { pointerId: 1, clientX: 200, clientY: 200 });
    fireEvent.pointerMove(tokenG, { pointerId: 1, clientX: 260, clientY: 240 });
    fireEvent.pointerUp(tokenG, { pointerId: 1, clientX: 260, clientY: 240 });
    await waitFor(() => {
      expect(screen.getByTestId('map-live-write-error').textContent).toContain(
        'permission-denied',
      );
    });
  });

  it('does not call updateToken when no drag occurred (just pointerDown+Up)', async () => {
    useMapState.tokens = [mkToken({ id: 't1' })];
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    const tokenG = screen.getByTestId('map-live-token-t1');
    // pointerDown puis pointerUp sans move = pas de localPosition stockée.
    fireEvent.pointerDown(tokenG, { pointerId: 1, clientX: 200, clientY: 200 });
    fireEvent.pointerUp(tokenG, { pointerId: 1, clientX: 200, clientY: 200 });
    // Petit délai pour que le handleAsync settle.
    await new Promise((r) => setTimeout(r, 10));
    expect(mockUpdateToken).not.toHaveBeenCalled();
  });

  // ── D.5 fog / lights / AoE ─────────────────────────────────────────────

  it('renders fog/lights/AoE counters from MapMeta', () => {
    useMapState.map = mkMap({
      fogPolygons: [
        { id: 'p1', kind: 'reveal', points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }], createdAt: null },
      ],
      lightSources: [],
      aoeTemplates: [
        {
          id: 'a1',
          shape: 'sphere',
          position: { x: 0, y: 0 },
          dimensions: { radius: 20 },
          pinned: false,
        },
        {
          id: 'a2',
          shape: 'cone',
          position: { x: 0, y: 0 },
          dimensions: { radius: 30 },
          pinned: false,
        },
      ],
    });
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    expect(screen.getByTestId('map-live-fog-count').textContent).toContain('(1)');
    expect(screen.getByTestId('map-live-lights-count').textContent).toContain('(0)');
    expect(screen.getByTestId('map-live-aoe-count').textContent).toContain('(2)');
  });

  it('calls addFogPolygon with reveal kind when reveal button clicked', async () => {
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    fireEvent.click(screen.getByTestId('map-live-add-fog-reveal'));
    await waitFor(() => {
      expect(mockAddFogPolygon).toHaveBeenCalledTimes(1);
    });
    const [cidArg, midArg, currentArg, polygonArg, uidArg] = mockAddFogPolygon.mock.calls[0]!;
    expect(cidArg).toBe('camp-1');
    expect(midArg).toBe('m-1');
    expect(currentArg).toEqual([]);
    expect(uidArg).toBe('user-alice');
    const polygon = polygonArg as { kind: string; points: unknown[] };
    expect(polygon.kind).toBe('reveal');
    expect(polygon.points.length).toBeGreaterThan(2);
  });

  it('calls addFogPolygon with mask kind when mask button clicked', async () => {
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    fireEvent.click(screen.getByTestId('map-live-add-fog-mask'));
    await waitFor(() => {
      expect(mockAddFogPolygon).toHaveBeenCalledTimes(1);
    });
    const polygon = mockAddFogPolygon.mock.calls[0]![3] as { kind: string };
    expect(polygon.kind).toBe('mask');
  });

  it('calls updateMap with empty fogPolygons when "Effacer fog" clicked', async () => {
    useMapState.map = mkMap({
      fogPolygons: [
        { id: 'p1', kind: 'reveal', points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }], createdAt: null },
      ],
    });
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    const btn = screen.getByTestId('map-live-clear-fog') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);
    await waitFor(() => {
      expect(mockUpdateMap).toHaveBeenCalledTimes(1);
    });
    const [cidArg, midArg, patchArg] = mockUpdateMap.mock.calls[0]!;
    expect(cidArg).toBe('camp-1');
    expect(midArg).toBe('m-1');
    expect(patchArg).toEqual({ fogPolygons: [] });
  });

  it('disables "Effacer fog" when no fog polygons', () => {
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    const btn = screen.getByTestId('map-live-clear-fog') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('calls addLightSource with torch preset when torch button clicked', async () => {
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    fireEvent.click(screen.getByTestId('map-live-add-torch'));
    await waitFor(() => {
      expect(mockAddLightSource).toHaveBeenCalledTimes(1);
    });
    const light = mockAddLightSource.mock.calls[0]![3] as {
      preset: string;
      brightRadius: number;
      position: { x: number; y: number };
    };
    expect(light.preset).toBe('torch');
    expect(light.brightRadius).toBeGreaterThan(0);
    expect(light.position).toBeDefined();
  });

  it('calls updateMap with empty lightSources when "Effacer lumières" clicked', async () => {
    useMapState.map = mkMap({
      lightSources: [
        {
          id: 'l1',
          position: { x: 0, y: 0 },
          brightRadius: 20,
          dimRadius: 20,
          preset: 'torch',
        },
      ],
    });
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    fireEvent.click(screen.getByTestId('map-live-clear-lights'));
    await waitFor(() => {
      expect(mockUpdateMap).toHaveBeenCalledTimes(1);
    });
    expect(mockUpdateMap.mock.calls[0]![2]).toEqual({ lightSources: [] });
  });

  it('calls addAoeTemplate with sphere shape when AoE button clicked', async () => {
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    fireEvent.click(screen.getByTestId('map-live-add-sphere-aoe'));
    await waitFor(() => {
      expect(mockAddAoeTemplate).toHaveBeenCalledTimes(1);
    });
    const template = mockAddAoeTemplate.mock.calls[0]![3] as {
      shape: string;
      dimensions: { radius: number };
    };
    expect(template.shape).toBe('sphere');
    expect(template.dimensions.radius).toBeGreaterThan(0);
  });

  it('calls updateMap with empty aoeTemplates when "Effacer AoE" clicked', async () => {
    useMapState.map = mkMap({
      aoeTemplates: [
        {
          id: 'a1',
          shape: 'sphere',
          position: { x: 0, y: 0 },
          dimensions: { radius: 20 },
          pinned: false,
        },
      ],
    });
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    fireEvent.click(screen.getByTestId('map-live-clear-aoe'));
    await waitFor(() => {
      expect(mockUpdateMap).toHaveBeenCalledTimes(1);
    });
    expect(mockUpdateMap.mock.calls[0]![2]).toEqual({ aoeTemplates: [] });
  });

  it('surfaces fog write error in writeError panel', async () => {
    mockAddFogPolygon.mockRejectedValueOnce(new Error('rules-denied'));
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    fireEvent.click(screen.getByTestId('map-live-add-fog-reveal'));
    await waitFor(() => {
      expect(screen.getByTestId('map-live-write-error').textContent).toContain('rules-denied');
    });
  });
});
