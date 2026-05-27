import { type JSX } from 'react';

import type { AoeTemplate } from '@/shared/types/map';

import {
  buildConePoints,
  buildCubePoints,
  buildLinePoints,
  DEFAULT_AOE_COLORS,
  type AoeShape,
} from './aoe-state';
import { pointsToSvgString } from './fog-state';

interface AoeLayerProps {
  readonly aoes: readonly AoeTemplate[];
  readonly onClickAoe?: (id: string) => void;
}

/**
 * Couche de rendu des templates AoE (CHANTIER G nuit 3).
 *
 * Pour chaque AoE, on génère :
 *   - sphere : `<circle>` centrée sur la position
 *   - cone : `<polygon>` triangle isocèle, sommet sur la position,
 *           orienté selon `rotationDeg`
 *   - line : `<polygon>` rectangle débutant à la position, orienté
 *           selon `rotationDeg`
 *   - cube : `<polygon>` carré centré sur la position (rotation
 *           supportée mais visuellement neutre à 90/180/270°)
 *
 * Couleurs par défaut depuis `DEFAULT_AOE_COLORS`. Fill semi-transparent
 * (0.25), stroke opaque (0.85) — assez visible sans masquer le fond.
 *
 * Clic sur un AoE : remonte `onClickAoe(id)` pour permettre suppression
 * UI (l'AoeLayer ne mute pas l'état lui-même).
 */
export function AoeLayer({ aoes, onClickAoe }: AoeLayerProps): JSX.Element {
  return (
    <g data-testid="aoe-layer">
      {aoes.map((aoe) => {
        const color = DEFAULT_AOE_COLORS[aoe.shape as AoeShape];
        const onClick = onClickAoe
          ? (): void => {
              onClickAoe(aoe.id);
            }
          : undefined;
        // Stop propagation au pointerdown : sans ça, le SVG parent fait
        // setPointerCapture et le clic atterrit sur le SVG (pas sur l'AoE).
        const onPointerDownInner = (
          e: React.PointerEvent<SVGElement>,
        ): void => {
          if (onClickAoe) e.stopPropagation();
        };
        const commonProps = {
          'data-testid': `aoe-${aoe.id}`,
          style: { cursor: onClickAoe ? 'pointer' : ('default' as const) },
          onClick,
          onPointerDown: onPointerDownInner,
        };

        if (aoe.shape === 'sphere') {
          const r = aoe.dimensions.radius ?? 100;
          return (
            <circle
              key={aoe.id}
              {...commonProps}
              cx={aoe.position.x}
              cy={aoe.position.y}
              r={r}
              fill={color}
              fillOpacity={0.25}
              stroke={color}
              strokeWidth={2}
              strokeOpacity={0.85}
            />
          );
        }

        const rotation = aoe.rotationDeg ?? 0;
        const transform = `translate(${aoe.position.x} ${aoe.position.y}) rotate(${rotation})`;

        if (aoe.shape === 'cone') {
          const pts = buildConePoints(
            aoe.dimensions.radius ?? 100,
            aoe.dimensions.angleDeg ?? 53.13,
          );
          return (
            <polygon
              key={aoe.id}
              {...commonProps}
              transform={transform}
              points={pointsToSvgString(pts)}
              fill={color}
              fillOpacity={0.25}
              stroke={color}
              strokeWidth={2}
              strokeOpacity={0.85}
            />
          );
        }

        if (aoe.shape === 'line') {
          const pts = buildLinePoints(
            aoe.dimensions.length ?? 100,
            aoe.dimensions.width ?? 25,
          );
          return (
            <polygon
              key={aoe.id}
              {...commonProps}
              transform={transform}
              points={pointsToSvgString(pts)}
              fill={color}
              fillOpacity={0.25}
              stroke={color}
              strokeWidth={2}
              strokeOpacity={0.85}
            />
          );
        }

        // cube
        const pts = buildCubePoints(aoe.dimensions.side ?? 100);
        return (
          <polygon
            key={aoe.id}
            {...commonProps}
            transform={transform}
            points={pointsToSvgString(pts)}
            fill={color}
            fillOpacity={0.25}
            stroke={color}
            strokeWidth={2}
            strokeOpacity={0.85}
          />
        );
      })}
    </g>
  );
}
