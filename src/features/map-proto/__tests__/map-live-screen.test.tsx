import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { type JSX } from 'react';
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
const mockMoveAoeTemplate = vi.fn();
const mockRotateAoeTemplate = vi.fn();
const mockRemoveAoeTemplate = vi.fn();
const mockResizeAoeTemplate = vi.fn();
const mockDeleteToken = vi.fn();
const mockCreateTokenWithId = vi.fn();
vi.mock('@/shared/lib/services/maps', () => ({
  createTokenWithId: (...args: unknown[]) => mockCreateTokenWithId(...args),
  updateToken: (...args: unknown[]) => mockUpdateToken(...args),
  updateMap: (...args: unknown[]) => mockUpdateMap(...args),
  addFogPolygon: (...args: unknown[]) => mockAddFogPolygon(...args),
  addLightSource: (...args: unknown[]) => mockAddLightSource(...args),
  addAoeTemplate: (...args: unknown[]) => mockAddAoeTemplate(...args),
  moveAoeTemplate: (...args: unknown[]) => mockMoveAoeTemplate(...args),
  rotateAoeTemplate: (...args: unknown[]) => mockRotateAoeTemplate(...args),
  removeAoeTemplate: (...args: unknown[]) => mockRemoveAoeTemplate(...args),
  resizeAoeTemplate: (...args: unknown[]) => mockResizeAoeTemplate(...args),
  deleteToken: (...args: unknown[]) => mockDeleteToken(...args),
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

/**
 * Variante qui rend ET expose un `rerender()` re-rendant le MÊME arbre. Utile
 * pour simuler un nouveau snapshot `useMap` (on mute `useMapState` puis on
 * re-render) sans changer de route.
 */
function renderWithRerender(path: string): { rerender: () => void } {
  // Élément FRAIS à chaque appel : passer la même référence à `rerender` peut
  // faire bailer la réconciliation racine → le composant ne relit pas le
  // snapshot `useMap` muté. Un nouvel objet élément force le re-render.
  const make = (): JSX.Element => (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/map-proto/cloud/:cid/maps/:mid" element={<MapLiveScreen />} />
      </Routes>
    </MemoryRouter>
  );
  const result = render(make());
  return { rerender: () => result.rerender(make()) };
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

// JSDOM ne fournit pas (fidèlement) les SVG matrix APIs ni setPointerCapture.
// On stub une transformation IDENTITÉ : screenToSvg(clientX, clientY) renvoie
// exactement (clientX, clientY), ce qui rend les coordonnées de drag
// DÉTERMINISTES dans les tests (sinon `matrixTransform` natif de JSDOM, appelé
// avec une matrice factice, renvoie NaN). On passe par `Object.defineProperty`
// (et non une simple affectation) car les versions récentes de JSDOM exposent
// `createSVGPoint` en propriété non réinscriptible : une affectation directe
// est silencieusement ignorée et on retombe sur l'implémentation native → NaN.
function definePrototype(
  proto: object,
  name: string,
  value: (...args: never[]) => unknown,
): void {
  Object.defineProperty(proto, name, { configurable: true, writable: true, value });
}

function installSvgStubs(): void {
  definePrototype(SVGSVGElement.prototype, 'createSVGPoint', function () {
    const pt = {
      x: 0,
      y: 0,
      matrixTransform(_m: unknown): { x: number; y: number } {
        return { x: pt.x, y: pt.y };
      },
    };
    return pt;
  });
  definePrototype(SVGSVGElement.prototype, 'getScreenCTM', function () {
    return { inverse: () => ({}) };
  });
  definePrototype(Element.prototype, 'setPointerCapture', function () {
    // no-op
  });
  definePrototype(Element.prototype, 'releasePointerCapture', function () {
    // no-op
  });
}

// jsdom n'expose PAS `PointerEvent` : `fireEvent.pointer*` crée alors un
// événement qui PERD `clientX`/`clientY` → les coordonnées de drag arrivent
// `undefined` dans le composant (puis NaN). Un `MouseEvent` PORTE clientX/Y et
// React écoute le *nom* de l'événement (pas la classe concrète) — on dispatch
// donc un MouseEvent au type pointer voulu pour obtenir des coordonnées
// DÉTERMINISTES. `pointerId` est absent (setPointerCapture est stubé no-op).
function firePointer(
  el: Element,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  clientX: number,
  clientY: number,
): void {
  // `fireEvent(node, event)` dispatche l'événement fourni ET l'enveloppe dans
  // act() — indispensable pour que les setState (draggingTokenId) soient
  // flushés ENTRE pointerdown et pointermove, sinon le garde de
  // handlePointerMove voit `draggingTokenId === null` et ignore le geste.
  fireEvent(
    el,
    new MouseEvent(type, { clientX, clientY, bubbles: true, cancelable: true }),
  );
}

import { MapLiveScreen } from '../map-live-screen';

beforeEach(async () => {
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
  mockMoveAoeTemplate.mockReset().mockResolvedValue(undefined);
  mockRotateAoeTemplate.mockReset().mockResolvedValue(undefined);
  mockRemoveAoeTemplate.mockReset().mockResolvedValue(undefined);
  mockResizeAoeTemplate.mockReset().mockResolvedValue(undefined);
  mockCreateTokenWithId.mockReset().mockResolvedValue('token-new');
  mockDeleteToken.mockReset().mockResolvedValue(undefined);
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

  it('aimante la position sur le centre de case quand la grille est affichée', async () => {
    // Grille 70 affichée + aimant actif par défaut. Drag de (200,200) vers
    // (260,240) → case 3 sur les deux axes → centre 245,245.
    useMapState.map = mkMap({ showGrid: true, gridSize: 70 });
    useMapState.tokens = [mkToken({ id: 't1', position: { x: 200, y: 200 } })];
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    const tokenG = screen.getByTestId('map-live-token-t1');

    firePointer(tokenG, 'pointerdown', 200, 200);
    firePointer(tokenG, 'pointermove', 260, 240);
    firePointer(tokenG, 'pointerup', 260, 240);

    await waitFor(() => {
      expect(mockUpdateToken).toHaveBeenCalledTimes(1);
    });
    const patch = mockUpdateToken.mock.calls[0]![3] as {
      position: { x: number; y: number };
    };
    expect(patch.position).toEqual({ x: 245, y: 245 });
  });

  it("n'aimante pas quand l'aimant est désactivé (position brute persistée)", async () => {
    useMapState.map = mkMap({ showGrid: true, gridSize: 70 });
    useMapState.tokens = [mkToken({ id: 't1', position: { x: 200, y: 200 } })];
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    // Aimant ON par défaut → on le coupe.
    fireEvent.click(screen.getByTestId('map-live-toggle-snap'));
    const tokenG = screen.getByTestId('map-live-token-t1');
    firePointer(tokenG, 'pointerdown', 200, 200);
    firePointer(tokenG, 'pointermove', 260, 240);
    firePointer(tokenG, 'pointerup', 260, 240);

    await waitFor(() => {
      expect(mockUpdateToken).toHaveBeenCalledTimes(1);
    });
    const patch = mockUpdateToken.mock.calls[0]![3] as {
      position: { x: number; y: number };
    };
    expect(patch.position).toEqual({ x: 260, y: 240 });
  });

  it("n'aimante pas quand la grille est masquée (showGrid false)", async () => {
    useMapState.map = mkMap({ showGrid: false, gridSize: 70 });
    useMapState.tokens = [mkToken({ id: 't1', position: { x: 200, y: 200 } })];
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    const tokenG = screen.getByTestId('map-live-token-t1');
    firePointer(tokenG, 'pointerdown', 200, 200);
    firePointer(tokenG, 'pointermove', 260, 240);
    firePointer(tokenG, 'pointerup', 260, 240);

    await waitFor(() => {
      expect(mockUpdateToken).toHaveBeenCalledTimes(1);
    });
    const patch = mockUpdateToken.mock.calls[0]![3] as {
      position: { x: number; y: number };
    };
    expect(patch.position).toEqual({ x: 260, y: 240 });
  });

  it('désactive le bouton Aimant quand la grille est masquée', () => {
    useMapState.map = mkMap({ showGrid: false });
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    const btn = screen.getByTestId('map-live-toggle-snap') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('bascule showGrid via updateMap quand "Grille" cliqué', async () => {
    useMapState.map = mkMap({ showGrid: true });
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    fireEvent.click(screen.getByTestId('map-live-toggle-grid'));
    await waitFor(() => {
      expect(mockUpdateMap).toHaveBeenCalledTimes(1);
    });
    expect(mockUpdateMap.mock.calls[0]![2]).toEqual({ showGrid: false });
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

  it('does not call updateToken when no drag occurred (tap = ouvre l’éditeur)', async () => {
    useMapState.tokens = [mkToken({ id: 't1' })];
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    const tokenG = screen.getByTestId('map-live-token-t1');
    // pointerDown puis pointerUp sans move = TAP → ouvre l'éditeur, ne persiste pas.
    firePointer(tokenG, 'pointerdown', 200, 200);
    firePointer(tokenG, 'pointerup', 200, 200);
    await new Promise((r) => setTimeout(r, 10));
    expect(mockUpdateToken).not.toHaveBeenCalled();
    expect(screen.getByTestId('token-edit-save')).toBeTruthy();
  });

  // ── Édition d'un jeton (TAP → modale nom + couleur + suppression) ────────
  it('un TAP sur un jeton ouvre l’éditeur avec son nom et sa couleur courants', () => {
    useMapState.tokens = [
      mkToken({ id: 't1', label: 'Gobelin', color: '#f87171', kind: 'pnj' }),
    ];
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    const tokenG = screen.getByTestId('map-live-token-t1');
    firePointer(tokenG, 'pointerdown', 200, 200);
    firePointer(tokenG, 'pointerup', 200, 200);
    const input = screen.getByTestId('token-edit-label') as HTMLInputElement;
    expect(input.value).toBe('Gobelin');
    // La pastille rouge (#f87171) est cochée.
    expect(
      screen.getByTestId('token-color-f87171').getAttribute('aria-checked'),
    ).toBe('true');
  });

  it('un VRAI drag ne déclenche PAS l’éditeur (persiste la position)', async () => {
    useMapState.map = mkMap({ showGrid: false });
    useMapState.tokens = [mkToken({ id: 't1', position: { x: 200, y: 200 } })];
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    const tokenG = screen.getByTestId('map-live-token-t1');
    firePointer(tokenG, 'pointerdown', 200, 200);
    firePointer(tokenG, 'pointermove', 260, 240);
    firePointer(tokenG, 'pointerup', 260, 240);
    await waitFor(() => {
      expect(mockUpdateToken).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByTestId('token-edit-save')).toBeNull();
  });

  it('Enregistrer écrit le nom + la couleur via updateToken puis ferme', async () => {
    useMapState.tokens = [mkToken({ id: 't1', label: 'PNJ', color: '#f87171' })];
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    const tokenG = screen.getByTestId('map-live-token-t1');
    firePointer(tokenG, 'pointerdown', 200, 200);
    firePointer(tokenG, 'pointerup', 200, 200);

    const input = screen.getByTestId('token-edit-label') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Gobelin chef' } });
    fireEvent.click(screen.getByTestId('token-color-4ade80')); // vert
    fireEvent.click(screen.getByTestId('token-edit-save'));

    await waitFor(() => {
      expect(mockUpdateToken).toHaveBeenCalledTimes(1);
    });
    const [cidArg, midArg, tidArg, patchArg, uidArg] = mockUpdateToken.mock.calls[0]!;
    expect(cidArg).toBe('camp-1');
    expect(midArg).toBe('m-1');
    expect(tidArg).toBe('t1');
    expect(uidArg).toBe('user-alice');
    // Un PJ porte une vision : le patch inclut le défaut 30 ft (non modifié ici).
    expect(patchArg).toEqual({
      label: 'Gobelin chef',
      color: '#4ade80',
      visionRadius: 30,
    });
    // La modale se ferme après enregistrement.
    await waitFor(() => {
      expect(screen.queryByTestId('token-edit-save')).toBeNull();
    });
  });

  it('Supprimer ce jeton appelle deleteToken puis ferme la modale', async () => {
    useMapState.tokens = [mkToken({ id: 't1' })];
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    const tokenG = screen.getByTestId('map-live-token-t1');
    firePointer(tokenG, 'pointerdown', 200, 200);
    firePointer(tokenG, 'pointerup', 200, 200);

    fireEvent.click(screen.getByTestId('token-edit-delete'));

    await waitFor(() => {
      expect(mockDeleteToken).toHaveBeenCalledTimes(1);
    });
    expect(mockDeleteToken.mock.calls[0]!.slice(0, 3)).toEqual(['camp-1', 'm-1', 't1']);
    await waitFor(() => {
      expect(screen.queryByTestId('token-edit-save')).toBeNull();
    });
  });

  it('Dupliquer crée un clone (mêmes props, décalé d’une case) via createTokenWithId', async () => {
    useMapState.tokens = [
      mkToken({ id: 't1', label: 'Gobelin', color: '#4ade80', visionRadius: 60 }),
    ];
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    const tokenG = screen.getByTestId('map-live-token-t1');
    firePointer(tokenG, 'pointerdown', 200, 200);
    firePointer(tokenG, 'pointerup', 200, 200);

    fireEvent.click(screen.getByTestId('token-edit-duplicate'));

    await waitFor(() => {
      expect(mockCreateTokenWithId).toHaveBeenCalledTimes(1);
    });
    const [cidArg, midArg, idArg, inputArg, uidArg] =
      mockCreateTokenWithId.mock.calls[0]!;
    expect(cidArg).toBe('camp-1');
    expect(midArg).toBe('m-1');
    // Id slug frais (jamais l'id source) — cf. createTokenWithId vs createToken.
    expect(typeof idArg).toBe('string');
    expect(idArg).not.toBe('t1');
    expect(uidArg).toBe('user-alice');
    // Clone : mêmes type/nom/couleur/vision, position décalée d'une case (70).
    expect(inputArg).toEqual({
      kind: 'pj',
      label: 'Gobelin',
      color: '#4ade80',
      visionRadius: 60,
      position: { x: 270, y: 270 }, // {200,200} + gridSize 70
    });
    // La modale se ferme après duplication.
    await waitFor(() => {
      expect(screen.queryByTestId('token-edit-save')).toBeNull();
    });
  });

  it('la modale d’édition se referme si le jeton disparaît du snapshot', () => {
    useMapState.tokens = [mkToken({ id: 't1' })];
    const { rerender } = renderWithRerender('/map-proto/cloud/camp-1/maps/m-1');
    const tokenG = screen.getByTestId('map-live-token-t1');
    firePointer(tokenG, 'pointerdown', 200, 200);
    firePointer(tokenG, 'pointerup', 200, 200);
    expect(screen.getByTestId('token-edit-save')).toBeTruthy();
    // Un autre client supprime le jeton → snapshot vide → modale fermée.
    useMapState.tokens = [];
    rerender();
    expect(screen.queryByTestId('token-edit-save')).toBeNull();
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

  it('pose une torche aux rayons SRD convertis à l’échelle de la carte (px)', async () => {
    // Carte fixture : gridSize 70, feetPerSquare 5 → 14 px/pied. Torche SRD =
    // 20 ft vive + 20 ft faible → 280 px chacun. `LightLayer` trace le rayon
    // BRUT en px (pas de mise à l'échelle) comme l'import .dd2vtt et les presets
    // proto ; écrire 20 (pieds) rendait la torche à 40 px (un point). Cette
    // assertion chiffrée est le garde-fou anti-régression (l'ancien « > 0 »
    // passait pendant que la torche était invisible).
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    fireEvent.click(screen.getByTestId('map-live-add-torch'));
    await waitFor(() => {
      expect(mockAddLightSource).toHaveBeenCalledTimes(1);
    });
    const light = mockAddLightSource.mock.calls[0]![3] as {
      preset: string;
      brightRadius: number;
      dimRadius: number;
      position: { x: number; y: number };
    };
    expect(light.preset).toBe('torch');
    expect(light.brightRadius).toBe(280); // 20 ft × 14 px/ft
    expect(light.dimRadius).toBe(280);
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

  // ── Mesure de distance (outil MJ) ──────────────────────────────────────

  it('mesure OFF par défaut, sans contrôles de règle visibles', () => {
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    expect(screen.getByTestId('map-live-toggle-measure').textContent).toContain('OFF');
    expect(screen.queryByTestId('map-live-ruler-total')).toBeNull();
    expect(screen.queryByTestId('map-live-clear-measure')).toBeNull();
  });

  it('active le mode mesure et révèle le total + le bouton effacer', () => {
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    fireEvent.click(screen.getByTestId('map-live-toggle-measure'));
    expect(screen.getByTestId('map-live-toggle-measure').textContent).toContain('ON');
    // Total à 0 m tant qu'aucune ancre, bouton effacer désactivé.
    expect(screen.getByTestId('map-live-ruler-total').textContent).toContain('0 m');
    const clearBtn = screen.getByTestId('map-live-clear-measure') as HTMLButtonElement;
    expect(clearBtn.disabled).toBe(true);
  });

  it("mesure la distance à l'échelle RÉELLE de la carte (70 px/case → 14 px/ft), affichée en mètres", () => {
    // Carte par défaut : gridSize 70, feetPerSquare 5 → 14 px/ft. Un segment
    // de 140 px = 10 ft (et NON 14 ft que donnerait le défaut codé en dur de
    // 10 px/ft) → affiché 3 m (convention FR : 10 ft × 0,3 = 3 m). C'est
    // l'invariant « identité du contenu », pas présence.
    useMapState.map = mkMap({ gridSize: 70, feetPerSquare: 5 });
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    fireEvent.click(screen.getByTestId('map-live-toggle-measure'));
    const svg = screen.getByTestId('map-live-svg');
    // 1ʳᵉ ancre en (0,0), curseur en (140,0) → segment vivant de 140 px.
    firePointer(svg, 'pointerdown', 0, 0);
    firePointer(svg, 'pointermove', 140, 0);
    expect(screen.getByTestId('map-live-ruler-total').textContent).toContain('3 m');
    expect(screen.getByTestId('map-live-ruler-label').textContent).toBe('3 m');
  });

  it('additionne plusieurs segments (chaîne de clics)', () => {
    useMapState.map = mkMap({ gridSize: 70, feetPerSquare: 5 });
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    fireEvent.click(screen.getByTestId('map-live-toggle-measure'));
    const svg = screen.getByTestId('map-live-svg');
    // (0,0) → (140,0) ancré (10 ft) puis curseur vers (280,0) (+10 ft) = 20 ft → 6 m.
    firePointer(svg, 'pointerdown', 0, 0);
    firePointer(svg, 'pointerdown', 140, 0);
    firePointer(svg, 'pointermove', 280, 0);
    expect(screen.getByTestId('map-live-ruler-total').textContent).toContain('6 m');
  });

  it('« Effacer mesure » réinitialise la règle', () => {
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    fireEvent.click(screen.getByTestId('map-live-toggle-measure'));
    const svg = screen.getByTestId('map-live-svg');
    firePointer(svg, 'pointerdown', 0, 0);
    firePointer(svg, 'pointermove', 140, 0);
    expect(screen.getByTestId('map-live-ruler-label')).toBeTruthy();
    fireEvent.click(screen.getByTestId('map-live-clear-measure'));
    expect(screen.queryByTestId('map-live-ruler-label')).toBeNull();
    expect(screen.getByTestId('map-live-ruler-total').textContent).toContain('0 m');
  });

  it('quitter le mode mesure purge la règle', () => {
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    fireEvent.click(screen.getByTestId('map-live-toggle-measure'));
    const svg = screen.getByTestId('map-live-svg');
    firePointer(svg, 'pointerdown', 0, 0);
    firePointer(svg, 'pointermove', 140, 0);
    expect(screen.getByTestId('map-live-ruler-label')).toBeTruthy();
    // OFF puis de nouveau ON → la règle doit être repartie de zéro.
    fireEvent.click(screen.getByTestId('map-live-toggle-measure'));
    fireEvent.click(screen.getByTestId('map-live-toggle-measure'));
    expect(screen.queryByTestId('map-live-ruler-label')).toBeNull();
    expect(screen.getByTestId('map-live-ruler-total').textContent).toContain('0 m');
  });

  it("ne déplace PAS un jeton pendant la mesure (updateToken non appelé)", async () => {
    useMapState.tokens = [mkToken({ id: 't1', position: { x: 200, y: 200 } })];
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    fireEvent.click(screen.getByTestId('map-live-toggle-measure'));
    const tokenG = screen.getByTestId('map-live-token-t1');
    firePointer(tokenG, 'pointerdown', 200, 200);
    firePointer(tokenG, 'pointermove', 260, 240);
    firePointer(tokenG, 'pointerup', 260, 240);
    await new Promise((r) => setTimeout(r, 10));
    expect(mockUpdateToken).not.toHaveBeenCalled();
  });

  // ── Drag des templates AoE (CHANTIER carte — drag + aimantage) ──────────

  function mkAoeMap(overrides: Partial<MapMeta> = {}): MapMeta {
    return mkMap({
      aoeTemplates: [
        {
          id: 'a1',
          shape: 'sphere',
          position: { x: 200, y: 200 },
          dimensions: { radius: 20 },
          pinned: false,
        },
      ],
      ...overrides,
    });
  }

  function mkConeAoeMap(overrides: Partial<MapMeta> = {}): MapMeta {
    return mkMap({
      aoeTemplates: [
        {
          id: 'a1',
          shape: 'cone',
          position: { x: 200, y: 200 },
          dimensions: { radius: 15, angleDeg: 53.13 },
          rotationDeg: 0,
          pinned: false,
        },
      ],
      ...overrides,
    });
  }

  it('rend chaque template AoE comme une forme draggable (data-testid aoe-<id>)', () => {
    useMapState.map = mkAoeMap();
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    const shape = screen.getByTestId('aoe-a1');
    expect(shape).toBeTruthy();
    // Curseur grab → la couche est interactive (pas le simple décor read-only).
    expect((shape as unknown as SVGElement).style.cursor).toBe('grab');
  });

  it('repositionne un AoE via moveAoeTemplate au lâcher (aimanté au centre de case)', async () => {
    // Grille 70 + aimant ON par défaut. Drag (200,200) → (260,240) → case 3 sur
    // les deux axes → centre 245,245 (même règle que les jetons).
    useMapState.map = mkAoeMap({ showGrid: true, gridSize: 70 });
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    const shape = screen.getByTestId('aoe-a1');
    firePointer(shape, 'pointerdown', 200, 200);
    firePointer(shape, 'pointermove', 260, 240);
    firePointer(shape, 'pointerup', 260, 240);

    await waitFor(() => {
      expect(mockMoveAoeTemplate).toHaveBeenCalledTimes(1);
    });
    const [cidArg, midArg, currentArg, idArg, posArg, uidArg] =
      mockMoveAoeTemplate.mock.calls[0]!;
    expect(cidArg).toBe('camp-1');
    expect(midArg).toBe('m-1');
    expect(Array.isArray(currentArg)).toBe(true);
    expect(idArg).toBe('a1');
    expect(uidArg).toBe('user-alice');
    expect(posArg).toEqual({ x: 245, y: 245 });
  });

  it("n'aimante PAS un AoE quand la grille est masquée (position brute)", async () => {
    useMapState.map = mkAoeMap({ showGrid: false, gridSize: 70 });
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    const shape = screen.getByTestId('aoe-a1');
    firePointer(shape, 'pointerdown', 200, 200);
    firePointer(shape, 'pointermove', 260, 240);
    firePointer(shape, 'pointerup', 260, 240);

    await waitFor(() => {
      expect(mockMoveAoeTemplate).toHaveBeenCalledTimes(1);
    });
    expect(mockMoveAoeTemplate.mock.calls[0]![4]).toEqual({ x: 260, y: 240 });
  });

  it('ne déplace PAS un AoE pendant la mesure (moveAoeTemplate non appelé)', async () => {
    useMapState.map = mkAoeMap({ showGrid: true, gridSize: 70 });
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    fireEvent.click(screen.getByTestId('map-live-toggle-measure'));
    const shape = screen.getByTestId('aoe-a1');
    firePointer(shape, 'pointerdown', 200, 200);
    firePointer(shape, 'pointermove', 260, 240);
    firePointer(shape, 'pointerup', 260, 240);
    await new Promise((r) => setTimeout(r, 10));
    expect(mockMoveAoeTemplate).not.toHaveBeenCalled();
  });

  it('surface une erreur de write AoE et nettoie la position locale', async () => {
    mockMoveAoeTemplate.mockRejectedValueOnce(new Error('aoe-rules-denied'));
    useMapState.map = mkAoeMap({ showGrid: true, gridSize: 70 });
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    const shape = screen.getByTestId('aoe-a1');
    firePointer(shape, 'pointerdown', 200, 200);
    firePointer(shape, 'pointermove', 260, 240);
    firePointer(shape, 'pointerup', 260, 240);
    await waitFor(() => {
      expect(screen.getByTestId('map-live-write-error').textContent).toContain(
        'aoe-rules-denied',
      );
    });
  });

  // ── Pose des 4 formes + rotation du gabarit sélectionné ────────────────

  it('place un cône via le bouton dédié (addAoeTemplate shape cone, 15 ft)', async () => {
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    fireEvent.click(screen.getByTestId('map-live-add-cone-aoe'));
    await waitFor(() => {
      expect(mockAddAoeTemplate).toHaveBeenCalledTimes(1);
    });
    const template = mockAddAoeTemplate.mock.calls[0]![3] as {
      shape: string;
      dimensions: { radius: number; angleDeg: number };
    };
    expect(template.shape).toBe('cone');
    expect(template.dimensions.radius).toBe(15);
    expect(template.dimensions.angleDeg).toBeCloseTo(53.13, 2);
  });

  it('place une ligne via le bouton dédié (60 ft × 5 ft)', async () => {
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    fireEvent.click(screen.getByTestId('map-live-add-line-aoe'));
    await waitFor(() => {
      expect(mockAddAoeTemplate).toHaveBeenCalledTimes(1);
    });
    const template = mockAddAoeTemplate.mock.calls[0]![3] as {
      shape: string;
      dimensions: { length: number; width: number };
    };
    expect(template.shape).toBe('line');
    expect(template.dimensions.length).toBe(60);
    expect(template.dimensions.width).toBe(5);
  });

  it('place un cube via le bouton dédié (15 ft)', async () => {
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    fireEvent.click(screen.getByTestId('map-live-add-cube-aoe'));
    await waitFor(() => {
      expect(mockAddAoeTemplate).toHaveBeenCalledTimes(1);
    });
    const template = mockAddAoeTemplate.mock.calls[0]![3] as {
      shape: string;
      dimensions: { side: number };
    };
    expect(template.shape).toBe('cube');
    expect(template.dimensions.side).toBe(15);
  });

  it('le label du bouton sphère affiche la portée en mètres (20 ft → 6 m)', () => {
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    expect(screen.getByTestId('map-live-add-sphere-aoe').textContent).toContain(
      '6 m',
    );
    // Cône 15 ft → 4,5 m (virgule française).
    expect(screen.getByTestId('map-live-add-cone-aoe').textContent).toContain(
      '4,5 m',
    );
  });

  it('aucun contrôle de rotation tant qu’aucun AoE n’est sélectionné', () => {
    useMapState.map = mkConeAoeMap();
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    expect(screen.queryByTestId('map-live-aoe-selection')).toBeNull();
    expect(screen.queryByTestId('map-live-rotate-cw')).toBeNull();
  });

  it('saisir un AoE le sélectionne et révèle les contrôles de rotation', () => {
    useMapState.map = mkConeAoeMap();
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    const shape = screen.getByTestId('aoe-a1');
    firePointer(shape, 'pointerdown', 200, 200);
    firePointer(shape, 'pointerup', 200, 200);
    const selection = screen.getByTestId('map-live-aoe-selection');
    expect(selection.textContent).toContain('Cône');
    expect(selection.textContent).toContain('0°');
    // Cône → rotation active.
    const cw = screen.getByTestId('map-live-rotate-cw') as HTMLButtonElement;
    const ccw = screen.getByTestId('map-live-rotate-ccw') as HTMLButtonElement;
    expect(cw.disabled).toBe(false);
    expect(ccw.disabled).toBe(false);
  });

  it('pivote le gabarit sélectionné de +15° via rotateAoeTemplate', async () => {
    useMapState.map = mkConeAoeMap();
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    const shape = screen.getByTestId('aoe-a1');
    firePointer(shape, 'pointerdown', 200, 200);
    firePointer(shape, 'pointerup', 200, 200);
    fireEvent.click(screen.getByTestId('map-live-rotate-cw'));
    await waitFor(() => {
      expect(mockRotateAoeTemplate).toHaveBeenCalledTimes(1);
    });
    const [cidArg, midArg, currentArg, idArg, deltaArg, uidArg] =
      mockRotateAoeTemplate.mock.calls[0]!;
    expect(cidArg).toBe('camp-1');
    expect(midArg).toBe('m-1');
    expect(Array.isArray(currentArg)).toBe(true);
    expect(idArg).toBe('a1');
    expect(deltaArg).toBe(15);
    expect(uidArg).toBe('user-alice');
  });

  it('pivote de −15° via le bouton antihoraire', async () => {
    useMapState.map = mkConeAoeMap();
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    const shape = screen.getByTestId('aoe-a1');
    firePointer(shape, 'pointerdown', 200, 200);
    firePointer(shape, 'pointerup', 200, 200);
    fireEvent.click(screen.getByTestId('map-live-rotate-ccw'));
    await waitFor(() => {
      expect(mockRotateAoeTemplate).toHaveBeenCalledTimes(1);
    });
    expect(mockRotateAoeTemplate.mock.calls[0]![4]).toBe(-15);
  });

  it('désactive la rotation quand une sphère est sélectionnée (orientation neutre)', () => {
    useMapState.map = mkAoeMap(); // a1 = sphère
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    const shape = screen.getByTestId('aoe-a1');
    firePointer(shape, 'pointerdown', 200, 200);
    firePointer(shape, 'pointerup', 200, 200);
    expect(screen.getByTestId('map-live-aoe-selection').textContent).toContain(
      'Sphère',
    );
    const cw = screen.getByTestId('map-live-rotate-cw') as HTMLButtonElement;
    expect(cw.disabled).toBe(true);
  });

  it('surligne le gabarit sélectionné (contour épaissi à 4)', () => {
    useMapState.map = mkConeAoeMap();
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    const shape = screen.getByTestId('aoe-a1');
    // Avant sélection : contour standard (2).
    expect(shape.getAttribute('stroke-width')).toBe('2');
    firePointer(shape, 'pointerdown', 200, 200);
    firePointer(shape, 'pointerup', 200, 200);
    // Après sélection : contour épaissi (4) + pointillé.
    expect(shape.getAttribute('stroke-width')).toBe('4');
    expect(shape.getAttribute('stroke-dasharray')).toBe('6 4');
  });

  it('affiche la taille du gabarit sélectionné en mètres (cône 15 ft → 4,5 m)', () => {
    useMapState.map = mkConeAoeMap();
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    const shape = screen.getByTestId('aoe-a1');
    firePointer(shape, 'pointerdown', 200, 200);
    firePointer(shape, 'pointerup', 200, 200);
    expect(screen.getByTestId('map-live-aoe-size').textContent).toContain('4,5');
  });

  it('agrandit le gabarit sélectionné d’une case via resizeAoeTemplate', async () => {
    useMapState.map = mkConeAoeMap(); // feetPerSquare 5
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    const shape = screen.getByTestId('aoe-a1');
    firePointer(shape, 'pointerdown', 200, 200);
    firePointer(shape, 'pointerup', 200, 200);
    fireEvent.click(screen.getByTestId('map-live-grow-aoe'));
    await waitFor(() => {
      expect(mockResizeAoeTemplate).toHaveBeenCalledTimes(1);
    });
    const [cidArg, midArg, currentArg, idArg, deltaArg, uidArg, minArg] =
      mockResizeAoeTemplate.mock.calls[0]!;
    expect(cidArg).toBe('camp-1');
    expect(midArg).toBe('m-1');
    expect(Array.isArray(currentArg)).toBe(true);
    expect(idArg).toBe('a1');
    expect(deltaArg).toBe(5); // +1 case × feetPerSquare 5
    expect(uidArg).toBe('user-alice');
    expect(minArg).toBe(5); // plancher = une case
  });

  it('réduit le gabarit sélectionné d’une case (delta négatif)', async () => {
    useMapState.map = mkConeAoeMap();
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    const shape = screen.getByTestId('aoe-a1');
    firePointer(shape, 'pointerdown', 200, 200);
    firePointer(shape, 'pointerup', 200, 200);
    fireEvent.click(screen.getByTestId('map-live-shrink-aoe'));
    await waitFor(() => {
      expect(mockResizeAoeTemplate).toHaveBeenCalledTimes(1);
    });
    expect(mockResizeAoeTemplate.mock.calls[0]![4]).toBe(-5);
  });

  it('désactive « − » quand la taille est au plancher (une case)', () => {
    useMapState.map = mkConeAoeMap({
      aoeTemplates: [
        {
          id: 'a1',
          shape: 'cone',
          position: { x: 200, y: 200 },
          dimensions: { radius: 5, angleDeg: 53.13 }, // = feetPerSquare
          rotationDeg: 0,
          pinned: false,
        },
      ],
    });
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    const shape = screen.getByTestId('aoe-a1');
    firePointer(shape, 'pointerdown', 200, 200);
    firePointer(shape, 'pointerup', 200, 200);
    const shrink = screen.getByTestId('map-live-shrink-aoe') as HTMLButtonElement;
    expect(shrink.disabled).toBe(true);
    // « + » reste actif (pas de plafond haut).
    const grow = screen.getByTestId('map-live-grow-aoe') as HTMLButtonElement;
    expect(grow.disabled).toBe(false);
  });

  it('supprime LE SEUL gabarit sélectionné via removeAoeTemplate', async () => {
    useMapState.map = mkConeAoeMap();
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    const shape = screen.getByTestId('aoe-a1');
    firePointer(shape, 'pointerdown', 200, 200);
    firePointer(shape, 'pointerup', 200, 200);
    // Le bouton n'apparaît qu'avec une sélection.
    fireEvent.click(screen.getByTestId('map-live-delete-aoe'));
    await waitFor(() => {
      expect(mockRemoveAoeTemplate).toHaveBeenCalledTimes(1);
    });
    const [cidArg, midArg, currentArg, idArg, uidArg] =
      mockRemoveAoeTemplate.mock.calls[0]!;
    expect(cidArg).toBe('camp-1');
    expect(midArg).toBe('m-1');
    expect(Array.isArray(currentArg)).toBe(true);
    expect(idArg).toBe('a1');
    expect(uidArg).toBe('user-alice');
    // « Effacer AoE » (vide tout) n'est PAS appelé : suppression ciblée.
    expect(mockUpdateMap).not.toHaveBeenCalled();
    // La sélection est purgée localement (contrôles masqués).
    expect(screen.queryByTestId('map-live-aoe-selection')).toBeNull();
  });

  it('aucun bouton Supprimer tant qu’aucun AoE n’est sélectionné', () => {
    useMapState.map = mkConeAoeMap();
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    expect(screen.queryByTestId('map-live-delete-aoe')).toBeNull();
  });

  it('« Effacer AoE » réinitialise la sélection (contrôles de rotation masqués)', async () => {
    useMapState.map = mkConeAoeMap();
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    const shape = screen.getByTestId('aoe-a1');
    firePointer(shape, 'pointerdown', 200, 200);
    firePointer(shape, 'pointerup', 200, 200);
    expect(screen.getByTestId('map-live-aoe-selection')).toBeTruthy();
    fireEvent.click(screen.getByTestId('map-live-clear-aoe'));
    await waitFor(() => {
      expect(mockUpdateMap).toHaveBeenCalled();
    });
    // La sélection est purgée même si le snapshot n'a pas encore ré-émis.
    expect(screen.queryByTestId('map-live-aoe-selection')).toBeNull();
  });

  // ── Portrait de jeton (base64 INLINE sur le doc → synchro cross-device) ──

  it('rend un portrait <image> (recadré en disque) à partir de token.imageDataUrl', () => {
    const portrait = 'data:image/webp;base64,PORTRAIT';
    useMapState.tokens = [mkToken({ id: 't1', imageDataUrl: portrait })];
    renderAt('/map-proto/cloud/camp-1/maps/m-1');
    // Plus d'async : le portrait vient du doc (listener), pas d'IndexedDB.
    const img = screen.getByTestId('map-live-token-image-t1');
    expect(img.getAttribute('href')).toBe(portrait);
    expect(img.getAttribute('clip-path')).toBe('url(#live-tok-clip-t1)');
    // Le disque coloré « plein » + le label centré sont remplacés (portrait).
    expect(screen.queryByText('PJ-1')).toBeNull();
  });

  it('Dupliquer recopie le portrait dans l’input du clone (une seule écriture)', async () => {
    const portrait = 'data:image/webp;base64,GOBELIN';
    useMapState.tokens = [
      mkToken({ id: 't1', label: 'Gobelin', imageDataUrl: portrait }),
    ];
    renderAt('/map-proto/cloud/camp-1/maps/m-1');

    const tokenG = screen.getByTestId('map-live-token-image-t1');
    firePointer(tokenG, 'pointerdown', 200, 200);
    firePointer(tokenG, 'pointerup', 200, 200);
    fireEvent.click(screen.getByTestId('token-edit-duplicate'));

    await waitFor(() => {
      expect(mockCreateTokenWithId).toHaveBeenCalledTimes(1);
    });
    // Le portrait est passé DANS l'input de création (recopié en 1 write,
    // pas un second write d'image) — preuve de la synchro inline sur le doc.
    const [, , , input] = mockCreateTokenWithId.mock.calls[0]!;
    expect((input as { imageDataUrl?: string }).imageDataUrl).toBe(portrait);
  });

  it('retirer le portrait écrit imageDataUrl:null sur le doc (updateToken partiel)', async () => {
    const portrait = 'data:image/webp;base64,AEFFACER';
    useMapState.tokens = [mkToken({ id: 't1', imageDataUrl: portrait })];
    renderAt('/map-proto/cloud/camp-1/maps/m-1');

    // Ouvre la modale d'édition (tap sur le jeton).
    const tokenG = screen.getByTestId('map-live-token-image-t1');
    firePointer(tokenG, 'pointerdown', 200, 200);
    firePointer(tokenG, 'pointerup', 200, 200);

    // Le bouton « Retirer l'image » n'apparaît que si un portrait est présent.
    fireEvent.click(screen.getByTestId('token-image-remove'));
    await waitFor(() => {
      const removeCall = mockUpdateToken.mock.calls.find(
        (c) => (c[3] as { imageDataUrl?: unknown }).imageDataUrl === null,
      );
      expect(removeCall).toBeTruthy();
    });
    // Écriture PARTIELLE : seul imageDataUrl est dans le patch (pas position).
    const removeCall = mockUpdateToken.mock.calls.find(
      (c) => (c[3] as { imageDataUrl?: unknown }).imageDataUrl === null,
    )!;
    expect(removeCall[3]).toEqual({ imageDataUrl: null });
  });
});
