import {
  useCallback,
  useRef,
  useState,
  type JSX,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useParams } from 'react-router-dom';

import { useAuth } from '@/features/auth/use-auth';
import {
  addAoeTemplate,
  addFogPolygon,
  addLightSource,
  updateMap,
  updateToken,
} from '@/shared/lib/services/maps';
import type {
  AoeTemplate,
  FogPolygon,
  LightSource,
  MapToken,
} from '@/shared/types/map';

import { createCirclePolygon } from './fog-state';
import { useMap } from './use-map';

/**
 * Vue live de carte côté MJ (CHANTIER D phase 2, tracer D.4).
 *
 * Route : `/map-proto/cloud/:cid/maps/:mid`. Consomme `useMap(cid, mid)`
 * (listener Firestore phase 1, single doc + sous-collection tokens) et
 * persiste les mouvements de token via `updateToken` du service phase 2.
 *
 * Hors scope D.4 (à D.5+) :
 *   - Persistance fog of war / lumière / AoE depuis l'UI (D.5).
 *   - Création / suppression de tokens depuis cette vue (différé — pour le
 *     prototype on suppose que les tokens sont posés ailleurs ou par DM CLI).
 *   - Edit du `MapMeta` (gridSize, imageUrl, etc.) — c'est l'écran liste D.3
 *     qui crée la carte ; un écran d'édition arrivera en chantier dédié.
 *
 * UX du drag :
 *   - Pendant le glisser, on rend la position LOCALE (réactivité immédiate).
 *   - Au pointerUp, on appelle `updateToken(cid, mid, tid, position, uid)`.
 *   - Quand le listener `useMap` ré-émet le snapshot, la position locale est
 *     remplacée par celle de Firestore (last-write-wins).
 *   - Si `updateToken` échoue, on remet la position locale à zéro et on
 *     surface l'erreur — ça évite que la UI mente sur une écriture refusée.
 *
 * Convention prototype — chaînes FR inline, comme `map-proto-screen.tsx`.
 */

const VIEWBOX_W = 1000;
const VIEWBOX_H = 700;
const TOKEN_RADIUS = 22;
const CENTER_X = VIEWBOX_W / 2;
const CENTER_Y = VIEWBOX_H / 2;
const FOG_DEFAULT_RADIUS = 120;
const LIGHT_TORCH_BRIGHT = 20; // ft
const LIGHT_TORCH_DIM = 20; // ft
const AOE_SPHERE_RADIUS = 20; // ft

function randomSlug(prefix: string): string {
  // 8 chars [a-z0-9] — conforme au regex slug de mapMetaSchema.
  const rand = Math.random().toString(36).slice(2, 10) || 'x';
  return `${prefix}-${rand}`;
}

export function MapLiveScreen(): JSX.Element {
  const { cid, mid } = useParams<{ cid: string; mid: string }>();
  const { user, isReady } = useAuth();
  const { map, tokens, isLoading, error } = useMap(cid, mid);
  const [localPositions, setLocalPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [draggingTokenId, setDraggingTokenId] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragStart = useRef<{
    pointerX: number;
    pointerY: number;
    tokenX: number;
    tokenY: number;
  } | null>(null);

  const screenToSvg = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      const transformed = pt.matrixTransform(ctm.inverse());
      return { x: transformed.x, y: transformed.y };
    },
    [],
  );

  const positionOf = useCallback(
    (token: MapToken): { x: number; y: number } =>
      localPositions[token.id] ?? token.position,
    [localPositions],
  );

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<SVGGElement>, token: MapToken): void => {
      e.stopPropagation();
      (e.target as Element).setPointerCapture(e.pointerId);
      const pos = positionOf(token);
      const svgPos = screenToSvg(e.clientX, e.clientY);
      dragStart.current = {
        pointerX: svgPos.x,
        pointerY: svgPos.y,
        tokenX: pos.x,
        tokenY: pos.y,
      };
      setDraggingTokenId(token.id);
    },
    [positionOf, screenToSvg],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<SVGGElement>): void => {
      if (!draggingTokenId || !dragStart.current) return;
      const svgPos = screenToSvg(e.clientX, e.clientY);
      const dx = svgPos.x - dragStart.current.pointerX;
      const dy = svgPos.y - dragStart.current.pointerY;
      setLocalPositions((prev) => ({
        ...prev,
        [draggingTokenId]: {
          x: dragStart.current!.tokenX + dx,
          y: dragStart.current!.tokenY + dy,
        },
      }));
    },
    [draggingTokenId, screenToSvg],
  );

  const handlePointerUp = useCallback(async (): Promise<void> => {
    const tokenId = draggingTokenId;
    setDraggingTokenId(null);
    dragStart.current = null;
    if (!tokenId || !cid || !mid || !user) return;
    const newPos = localPositions[tokenId];
    if (!newPos) return;
    try {
      await updateToken(cid, mid, tokenId, { position: newPos }, user.uid);
      // Le listener `useMap` ré-émettra le token avec la nouvelle position ;
      // on retire l'override local pour ne pas masquer un éventuel re-write.
      setLocalPositions((prev) => {
        const next = { ...prev };
        delete next[tokenId];
        return next;
      });
      setWriteError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setWriteError(msg);
      // Sur échec : on remet la position locale à zéro pour réafficher la
      // position Firestore source-of-truth.
      setLocalPositions((prev) => {
        const next = { ...prev };
        delete next[tokenId];
        return next;
      });
    }
  }, [cid, draggingTokenId, localPositions, mid, user]);

  // ── D.5 : fog / lights / AoE persistence via service maps.ts ───────────
  // Toutes les actions inline qui suivent posent la valeur côté Firestore et
  // attendent que le listener `useMap` ré-émette le snapshot — la UI ne
  // maintient pas d'override local pour ces 3 surfaces (peu fréquentes,
  // pas de besoin de réactivité < frame). Sur erreur de write : surface
  // dans `writeError`.

  const handleAddFogReveal = useCallback(async (): Promise<void> => {
    if (!cid || !mid || !user || !map) return;
    const polygon: FogPolygon = {
      id: randomSlug('manual-reveal'),
      points: [...createCirclePolygon({ x: CENTER_X, y: CENTER_Y }, FOG_DEFAULT_RADIUS)],
      kind: 'reveal',
      createdAt: null,
    };
    try {
      await addFogPolygon(cid, mid, map.fogPolygons, polygon, user.uid);
      setWriteError(null);
    } catch (err: unknown) {
      setWriteError(err instanceof Error ? err.message : String(err));
    }
  }, [cid, map, mid, user]);

  const handleAddFogMask = useCallback(async (): Promise<void> => {
    if (!cid || !mid || !user || !map) return;
    const polygon: FogPolygon = {
      id: randomSlug('manual-mask'),
      points: [...createCirclePolygon({ x: CENTER_X, y: CENTER_Y }, FOG_DEFAULT_RADIUS)],
      kind: 'mask',
      createdAt: null,
    };
    try {
      await addFogPolygon(cid, mid, map.fogPolygons, polygon, user.uid);
      setWriteError(null);
    } catch (err: unknown) {
      setWriteError(err instanceof Error ? err.message : String(err));
    }
  }, [cid, map, mid, user]);

  const handleClearFog = useCallback(async (): Promise<void> => {
    if (!cid || !mid || !user) return;
    try {
      await updateMap(cid, mid, { fogPolygons: [] }, user.uid);
      setWriteError(null);
    } catch (err: unknown) {
      setWriteError(err instanceof Error ? err.message : String(err));
    }
  }, [cid, mid, user]);

  const handleAddTorch = useCallback(async (): Promise<void> => {
    if (!cid || !mid || !user || !map) return;
    const light: LightSource = {
      id: randomSlug('manual-torch'),
      position: { x: CENTER_X, y: CENTER_Y },
      attachedTokenId: null,
      brightRadius: LIGHT_TORCH_BRIGHT,
      dimRadius: LIGHT_TORCH_DIM,
      preset: 'torch',
    };
    try {
      await addLightSource(cid, mid, map.lightSources, light, user.uid);
      setWriteError(null);
    } catch (err: unknown) {
      setWriteError(err instanceof Error ? err.message : String(err));
    }
  }, [cid, map, mid, user]);

  const handleClearLights = useCallback(async (): Promise<void> => {
    if (!cid || !mid || !user) return;
    try {
      await updateMap(cid, mid, { lightSources: [] }, user.uid);
      setWriteError(null);
    } catch (err: unknown) {
      setWriteError(err instanceof Error ? err.message : String(err));
    }
  }, [cid, mid, user]);

  const handleAddSphereAoe = useCallback(async (): Promise<void> => {
    if (!cid || !mid || !user || !map) return;
    const template: AoeTemplate = {
      id: randomSlug('manual-sphere'),
      shape: 'sphere',
      position: { x: CENTER_X, y: CENTER_Y },
      dimensions: { radius: AOE_SPHERE_RADIUS },
      pinned: false,
    };
    try {
      await addAoeTemplate(cid, mid, map.aoeTemplates, template, user.uid);
      setWriteError(null);
    } catch (err: unknown) {
      setWriteError(err instanceof Error ? err.message : String(err));
    }
  }, [cid, map, mid, user]);

  const handleClearAoe = useCallback(async (): Promise<void> => {
    if (!cid || !mid || !user) return;
    try {
      await updateMap(cid, mid, { aoeTemplates: [] }, user.uid);
      setWriteError(null);
    } catch (err: unknown) {
      setWriteError(err instanceof Error ? err.message : String(err));
    }
  }, [cid, mid, user]);

  if (!cid || !mid) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-6 text-text">
        <p
          data-testid="map-live-missing-params"
          className="font-serif text-sm text-text-secondary"
        >
          URL invalide : il manque `cid` ou `mid`.
        </p>
      </main>
    );
  }
  if (!isReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-6 text-text">
        <p className="font-serif text-sm text-text-secondary">Chargement…</p>
      </main>
    );
  }
  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-6 text-text">
        <p
          data-testid="map-live-signed-out"
          className="font-serif text-sm text-text-secondary"
        >
          Connexion requise pour gérer la carte.
        </p>
      </main>
    );
  }
  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-6 text-text">
        <p
          data-testid="map-live-error"
          className="rounded-md border border-crimson/40 bg-crimson/10 px-3 py-2 font-mono text-[11px] text-crimson"
        >
          Erreur : {error.message}
        </p>
      </main>
    );
  }
  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-6 text-text">
        <p
          data-testid="map-live-loading"
          className="font-serif text-sm text-text-secondary"
        >
          Chargement de la carte…
        </p>
      </main>
    );
  }
  if (!map) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-6 text-text">
        <p
          data-testid="map-live-not-found"
          className="font-serif text-sm text-text-secondary"
        >
          Carte introuvable.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1200px] p-4 sm:p-6">
      <header className="mb-4 border-b border-gold-dim/30 pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-xl uppercase tracking-[0.18em] text-gold-bright">
            {map.name}
          </h1>
          <span className="rounded-pill border border-gold-dim/40 bg-gold/10 px-2 py-0.5 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright">
            PROTOTYPE — Firestore live
          </span>
        </div>
        <p
          data-testid="map-live-meta"
          className="mt-1 font-mono text-[11px] text-text-tertiary"
        >
          {cid} / {mid} — {tokens.length} token{tokens.length > 1 ? 's' : ''}
        </p>
        {writeError && (
          <p
            data-testid="map-live-write-error"
            className="mt-2 rounded-md border border-crimson/40 bg-crimson/10 px-3 py-1.5 font-mono text-[11px] text-crimson"
          >
            Écriture refusée : {writeError}
          </p>
        )}
        {/* D.5 — boutons persistance fog / lights / AoE. */}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gold-dim/20 pt-3">
          <span
            data-testid="map-live-fog-count"
            className="font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary"
          >
            Fog ({map.fogPolygons.length})
          </span>
          <button
            type="button"
            data-testid="map-live-add-fog-reveal"
            onClick={() => {
              void handleAddFogReveal();
            }}
            className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10"
          >
            Reveal au centre
          </button>
          <button
            type="button"
            data-testid="map-live-add-fog-mask"
            onClick={() => {
              void handleAddFogMask();
            }}
            className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10"
          >
            Mask au centre
          </button>
          <button
            type="button"
            data-testid="map-live-clear-fog"
            onClick={() => {
              void handleClearFog();
            }}
            disabled={map.fogPolygons.length === 0}
            className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10 disabled:opacity-40"
          >
            Effacer fog
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-gold-dim/20 pt-3">
          <span
            data-testid="map-live-lights-count"
            className="font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary"
          >
            Lumières ({map.lightSources.length})
          </span>
          <button
            type="button"
            data-testid="map-live-add-torch"
            onClick={() => {
              void handleAddTorch();
            }}
            className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10"
          >
            Torche au centre
          </button>
          <button
            type="button"
            data-testid="map-live-clear-lights"
            onClick={() => {
              void handleClearLights();
            }}
            disabled={map.lightSources.length === 0}
            className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10 disabled:opacity-40"
          >
            Effacer lumières
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-gold-dim/20 pt-3">
          <span
            data-testid="map-live-aoe-count"
            className="font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary"
          >
            AoE ({map.aoeTemplates.length})
          </span>
          <button
            type="button"
            data-testid="map-live-add-sphere-aoe"
            onClick={() => {
              void handleAddSphereAoe();
            }}
            className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10"
          >
            Sphère 20 ft au centre
          </button>
          <button
            type="button"
            data-testid="map-live-clear-aoe"
            onClick={() => {
              void handleClearAoe();
            }}
            disabled={map.aoeTemplates.length === 0}
            className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10 disabled:opacity-40"
          >
            Effacer AoE
          </button>
        </div>
      </header>

      <div
        className="overflow-hidden rounded-lg border border-gold-dim/30 bg-black/40"
        style={{ height: '70vh', minHeight: 480 }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full touch-none select-none"
          data-testid="map-live-svg"
        >
          {map.imageUrl && (
            <image
              href={map.imageUrl}
              x={0}
              y={0}
              width={VIEWBOX_W}
              height={VIEWBOX_H}
              preserveAspectRatio="xMidYMid slice"
            />
          )}
          {map.showGrid && (
            <g stroke="rgba(220,184,108,0.18)" strokeWidth={0.5}>
              {Array.from({ length: Math.floor(VIEWBOX_W / map.gridSize) + 1 }).map((_, i) => (
                <line
                  key={`v-${i}`}
                  x1={i * map.gridSize}
                  y1={0}
                  x2={i * map.gridSize}
                  y2={VIEWBOX_H}
                />
              ))}
              {Array.from({ length: Math.floor(VIEWBOX_H / map.gridSize) + 1 }).map((_, i) => (
                <line
                  key={`h-${i}`}
                  x1={0}
                  y1={i * map.gridSize}
                  x2={VIEWBOX_W}
                  y2={i * map.gridSize}
                />
              ))}
            </g>
          )}
          {tokens.map((token) => {
            const pos = positionOf(token);
            const isDragging = draggingTokenId === token.id;
            return (
              <g
                key={token.id}
                data-testid={`map-live-token-${token.id}`}
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                onPointerDown={(e) => handlePointerDown(e, token)}
                onPointerMove={handlePointerMove}
                onPointerUp={() => {
                  void handlePointerUp();
                }}
                onPointerCancel={() => {
                  void handlePointerUp();
                }}
              >
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={TOKEN_RADIUS}
                  fill={token.color}
                  stroke="white"
                  strokeWidth={2}
                  opacity={isDragging ? 0.8 : 1}
                />
                <text
                  x={pos.x}
                  y={pos.y + 4}
                  textAnchor="middle"
                  fontFamily="sans-serif"
                  fontWeight="bold"
                  fontSize="11"
                  fill="white"
                  pointerEvents="none"
                >
                  {token.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </main>
  );
}
