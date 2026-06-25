import { useMemo, type JSX } from 'react';

import type {
  AoeTemplate,
  FogPolygon,
  MapMeta,
  MapPosition,
  MapToken,
} from '@/shared/types/map';

import { AoeLayer } from './aoe-layer';
import { scaleAoeDimensions } from './aoe-state';
import { FogLayer } from './fog-layer';
import { pointsToSvgString } from './fog-state';
import { LightLayer } from './light-layer';
import { buildLosReveal } from './los-state';
import { MAP_VIEWBOX_H, MAP_VIEWBOX_W } from './map-viewport';

/**
 * Décor read-only d'une carte : image de fond, grille, murs (optionnel),
 * brouillard (manuel + ligne de vue calculée) et lumières. Rendu PARTAGÉ entre
 * la vue live MJ (`map-live-screen`) et la vue présentation/TV
 * (`map-tv-screen`) — chaque écran rend ENSUITE sa propre couche de tokens
 * par-dessus (draggable en live, statique en TV).
 *
 * Ordre des calques (bas → haut) : image, grille, murs, fog (voile percé), tint
 * de lumière. Les tokens sont rendus par le parent, donc au-dessus de tout ça.
 *
 * Ligne de vue : si `map.losEnabled` et qu'il y a des murs, on calcule pour
 * chaque token-créature (pj/pnj) un polygone de visibilité borné par les murs +
 * son rayon de vision, et on l'ajoute aux révélations de fog. Calcul mémoïsé,
 * NON persisté (recalculé au rendu) — cf. `los-state.ts`.
 */

const DEFAULT_VISION_FT = 30; // vision normale en lumière vive (6 cases SRD)

interface MapSceneProps {
  readonly map: MapMeta;
  /** Image de fond locale (IndexedDB) si `map.imageUrl` est null. */
  readonly localImageUrl: string | null;
  /** Tokens aux positions déjà résolues (la LOS suit ces positions). */
  readonly tokens: readonly MapToken[];
  /** Id unique du `<mask>` SVG (plusieurs scènes simultanées possibles). */
  readonly maskId: string;
  /** Trace les murs en surimpression (debug MJ). Défaut `false`. */
  readonly showWalls?: boolean;
  /** Opacité du voile de fog. Défaut 0.85. */
  readonly fogOpacity?: number;
}

/** Rayon de vision d'un token converti en pixels viewBox. */
function tokenVisionPx(token: MapToken, map: MapMeta): number {
  const ft = token.visionRadius ?? DEFAULT_VISION_FT;
  return (ft / map.feetPerSquare) * map.gridSize;
}

export function MapScene({
  map,
  localImageUrl,
  tokens,
  maskId,
  showWalls = false,
  fogOpacity = 0.85,
}: MapSceneProps): JSX.Element {
  const imageHref = map.imageUrl ?? localImageUrl;
  const walls = useMemo(() => map.walls ?? [], [map.walls]);
  const losEnabled = map.losEnabled === true && walls.length > 0;

  // Révélations de ligne de vue (calculées, non persistées).
  const losReveals = useMemo<FogPolygon[]>(() => {
    if (!losEnabled) return [];
    const bounds = { width: MAP_VIEWBOX_W, height: MAP_VIEWBOX_H };
    const reveals: FogPolygon[] = [];
    for (const token of tokens) {
      if (token.kind === 'marker') continue;
      const reveal = buildLosReveal(
        token.id,
        token.position,
        walls,
        bounds,
        tokenVisionPx(token, map),
      );
      if (reveal) reveals.push(reveal);
    }
    return reveals;
  }, [losEnabled, tokens, walls, map]);

  // Fog effectif = polygones persistés (manuels) + LOS calculée. Les masks
  // persistés gardent leur priorité de re-couverture (rendus en dernier par
  // FogLayer qui filtre par `kind`).
  const fogPolygons = useMemo<readonly FogPolygon[]>(
    () => [...map.fogPolygons, ...losReveals],
    [map.fogPolygons, losReveals],
  );

  const tokenPositions = useMemo<ReadonlyMap<string, MapPosition>>(() => {
    const m = new Map<string, MapPosition>();
    for (const token of tokens) m.set(token.id, token.position);
    return m;
  }, [tokens]);

  // Templates AoE : leurs `dimensions` sont stockées en PIEDS (schéma canonique),
  // mais `AoeLayer` trace en pixels viewBox. On convertit via l'échelle réelle
  // de la carte (gridSize/feetPerSquare) — même conversion que `tokenVisionPx`.
  const aoesPx = useMemo<readonly AoeTemplate[]>(() => {
    const feetScale = map.gridSize / map.feetPerSquare;
    return map.aoeTemplates.map((aoe) => ({
      ...aoe,
      dimensions: scaleAoeDimensions(aoe.dimensions, feetScale),
    }));
  }, [map.aoeTemplates, map.gridSize, map.feetPerSquare]);

  return (
    <>
      {imageHref && (
        <image
          href={imageHref}
          x={0}
          y={0}
          width={MAP_VIEWBOX_W}
          height={MAP_VIEWBOX_H}
          preserveAspectRatio={map.imageUrl ? 'xMidYMid slice' : 'none'}
        />
      )}

      {map.showGrid && (
        <g stroke="rgba(220,184,108,0.18)" strokeWidth={0.5}>
          {Array.from({ length: Math.floor(MAP_VIEWBOX_W / map.gridSize) + 1 }).map(
            (_, i) => (
              <line
                key={`v-${i}`}
                x1={i * map.gridSize}
                y1={0}
                x2={i * map.gridSize}
                y2={MAP_VIEWBOX_H}
              />
            ),
          )}
          {Array.from({ length: Math.floor(MAP_VIEWBOX_H / map.gridSize) + 1 }).map(
            (_, i) => (
              <line
                key={`h-${i}`}
                x1={0}
                y1={i * map.gridSize}
                x2={MAP_VIEWBOX_W}
                y2={i * map.gridSize}
              />
            ),
          )}
        </g>
      )}

      {showWalls && walls.length > 0 && (
        <g
          data-testid="map-scene-walls"
          fill="none"
          stroke="rgba(220,184,108,0.35)"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          pointerEvents="none"
        >
          {walls.map((w) => (
            <polyline key={w.id} points={pointsToSvgString(w.points)} />
          ))}
        </g>
      )}

      {map.fogEnabled && (
        <FogLayer
          fogPolygons={fogPolygons}
          maskId={maskId}
          width={MAP_VIEWBOX_W}
          height={MAP_VIEWBOX_H}
          opacity={fogOpacity}
        />
      )}

      {map.lightingEnabled && (
        <LightLayer lights={map.lightSources} tokenPositions={tokenPositions} />
      )}

      {/* Templates AoE — overlays tactiques posés par le MJ. Rendus au-dessus du
          décor (fog/lumière) pour rester visibles, sous les tokens (dessinés par
          l'écran parent). Read-only ici : le retrait passe par « Effacer AoE ». */}
      {aoesPx.length > 0 && <AoeLayer aoes={aoesPx} />}
    </>
  );
}
