import { type JSX } from 'react';

import type { FogPolygon } from '@/shared/types/map';

import { pointsToSvgString } from './fog-state';

interface FogLayerProps {
  readonly fogPolygons: readonly FogPolygon[];
  readonly maskId: string;
  /** Bornes du viewBox (en coords image). Détermine la taille du voile. */
  readonly width: number;
  readonly height: number;
  /** Opacité du voile noir (0–1). Défaut 0.85 = quasi-opaque mais on devine la grille. */
  readonly opacity?: number;
}

/**
 * Couche de fog of war SVG vectoriel (CHANTIER E nuit 3).
 *
 * Technique : un `<mask>` SVG où :
 *   - le fond blanc rend le voile noir partout (fog visible) ;
 *   - les polygones `reveal` (noirs) percent des trous (carte visible) ;
 *   - les polygones `mask` (blancs) re-recouvrent ces trous.
 *
 * L'ordre des polygones compte : mask passe APRÈS reveal dans la séquence
 * SVG → re-peinture par-dessus = last-write-wins visuel, ce qui correspond
 * à l'attente MJ (« je gomme cette zone que j'avais révélée par erreur »).
 *
 * Le rendu lui-même est un `<rect>` noir semi-opaque appliquant ce mask.
 *
 * `maskId` est exposé pour permettre plusieurs cartes simultanées (clé
 * de mask SVG unique par instance). Le composant n'introduit aucun
 * écouteur d'événements — l'interaction (peindre, mouvement token) est
 * gérée plus haut.
 */
export function FogLayer({
  fogPolygons,
  maskId,
  width,
  height,
  opacity = 0.85,
}: FogLayerProps): JSX.Element {
  return (
    <g data-testid="fog-layer">
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse">
          {/* Fond blanc : voile visible partout par défaut. */}
          <rect x={0} y={0} width={width} height={height} fill="white" />
          {/* Reveals : noir = trou dans le voile. */}
          {fogPolygons
            .filter((p) => p.kind === 'reveal')
            .map((p) => (
              <polygon
                key={p.id}
                points={pointsToSvgString(p.points)}
                fill="black"
              />
            ))}
          {/* Masks : blanc par-dessus = re-couvre une révélation. */}
          {fogPolygons
            .filter((p) => p.kind === 'mask')
            .map((p) => (
              <polygon
                key={p.id}
                points={pointsToSvgString(p.points)}
                fill="white"
              />
            ))}
        </mask>
      </defs>
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="rgba(0,0,0,1)"
        opacity={opacity}
        mask={`url(#${maskId})`}
        pointerEvents="none"
      />
    </g>
  );
}
