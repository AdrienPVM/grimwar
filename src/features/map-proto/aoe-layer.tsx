import { type JSX, type PointerEvent as ReactPointerEvent } from 'react';

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
  /**
   * Drag MJ (carte live). Si `onAoePointerDown` est fourni, chaque template
   * devient saisissable : curseur `grab`/`grabbing` et handlers pointeur par
   * id. Absents → couche read-only (vue TV, décor partagé).
   */
  readonly draggingId?: string | null;
  readonly onAoePointerDown?: (
    e: ReactPointerEvent<SVGElement>,
    id: string,
  ) => void;
  readonly onAoePointerMove?: (
    e: ReactPointerEvent<SVGElement>,
    id: string,
  ) => void;
  readonly onAoePointerUp?: (
    e: ReactPointerEvent<SVGElement>,
    id: string,
  ) => void;
  /**
   * Neutralise toute interaction sur la couche (mode mesure : les clics
   * doivent traverser jusqu'au fond SVG pour poser des ancres de règle).
   */
  readonly interactionDisabled?: boolean;
  /**
   * Template actuellement sélectionné (carte live MJ). Le gabarit sélectionné
   * reçoit un contour plus épais et pointillé pour signaler qu'il est la cible
   * des contrôles de rotation. Absent → aucun surlignage (vue TV).
   */
  readonly selectedId?: string | null;
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
 * Interaction : clic simple via `onClickAoe(id)`, OU drag MJ via les handlers
 * pointeur (`onAoePointerDown/Move/Up`). L'AoeLayer ne mute jamais l'état
 * lui-même — il remonte les événements au parent.
 */
export function AoeLayer({
  aoes,
  onClickAoe,
  draggingId,
  onAoePointerDown,
  onAoePointerMove,
  onAoePointerUp,
  interactionDisabled = false,
  selectedId,
}: AoeLayerProps): JSX.Element {
  const draggable = onAoePointerDown !== undefined;
  return (
    <g data-testid="aoe-layer">
      {aoes.map((aoe) => {
        const color = DEFAULT_AOE_COLORS[aoe.shape as AoeShape];
        const isDragging = draggingId === aoe.id;
        const isSelected = selectedId != null && selectedId === aoe.id;
        // Contour : le gabarit sélectionné est épaissi + pointillé pour le
        // distinguer comme cible des boutons de rotation. Fill inchangé.
        const strokeProps = {
          fill: color,
          fillOpacity: 0.25,
          stroke: color,
          strokeWidth: isSelected ? 4 : 2,
          strokeOpacity: isSelected ? 1 : 0.85,
          ...(isSelected ? { strokeDasharray: '6 4' } : {}),
        };
        const onClick = onClickAoe
          ? (): void => {
              onClickAoe(aoe.id);
            }
          : undefined;
        // Stop propagation au pointerdown : sans ça, le SVG parent fait
        // setPointerCapture et le clic atterrit sur le SVG (pas sur l'AoE).
        const onPointerDownInner = (
          e: ReactPointerEvent<SVGElement>,
        ): void => {
          if (onAoePointerDown) {
            e.stopPropagation();
            onAoePointerDown(e, aoe.id);
          } else if (onClickAoe) {
            e.stopPropagation();
          }
        };
        const cursor = draggable
          ? isDragging
            ? 'grabbing'
            : 'grab'
          : onClickAoe
            ? 'pointer'
            : 'default';
        const commonProps = {
          'data-testid': `aoe-${aoe.id}`,
          style: { cursor },
          // En mode mesure, la couche laisse passer les clics au fond SVG.
          pointerEvents: interactionDisabled
            ? ('none' as const)
            : undefined,
          opacity: isDragging ? 0.8 : 1,
          onClick,
          onPointerDown: onPointerDownInner,
          onPointerMove: onAoePointerMove
            ? (e: ReactPointerEvent<SVGElement>): void => {
                onAoePointerMove(e, aoe.id);
              }
            : undefined,
          onPointerUp: onAoePointerUp
            ? (e: ReactPointerEvent<SVGElement>): void => {
                onAoePointerUp(e, aoe.id);
              }
            : undefined,
          onPointerCancel: onAoePointerUp
            ? (e: ReactPointerEvent<SVGElement>): void => {
                onAoePointerUp(e, aoe.id);
              }
            : undefined,
        };

        if (aoe.shape === 'sphere') {
          const r = aoe.dimensions.radius ?? 100;
          return (
            <circle
              key={aoe.id}
              {...commonProps}
              {...strokeProps}
              cx={aoe.position.x}
              cy={aoe.position.y}
              r={r}
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
              {...strokeProps}
              transform={transform}
              points={pointsToSvgString(pts)}
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
              {...strokeProps}
              transform={transform}
              points={pointsToSvgString(pts)}
            />
          );
        }

        // cube
        const pts = buildCubePoints(aoe.dimensions.side ?? 100);
        return (
          <polygon
            key={aoe.id}
            {...commonProps}
            {...strokeProps}
            transform={transform}
            points={pointsToSvgString(pts)}
          />
        );
      })}
    </g>
  );
}
