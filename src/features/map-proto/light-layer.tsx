import { type JSX } from 'react';

import type { LightSource, MapPosition } from '@/shared/types/map';

import { resolveLightPosition } from './light-state';

interface LightLayerProps {
  readonly lights: readonly LightSource[];
  /**
   * Carte tokenId → position courante. Sert à résoudre les lumières
   * attachées à un token (qui doivent suivre son mouvement).
   */
  readonly tokenPositions: ReadonlyMap<string, MapPosition>;
  /**
   * Opacité globale du tint chaud appliqué dans les rayons. Le rendu
   * du fog gère sa propre opacité — celle-ci ne couvre que la teinte
   * de lumière, pas le voile noir.
   *
   * Défaut 0.55 : assez visible pour que le MJ repère un cône de torche
   * dans un couloir, mais pas opaque au point de masquer les tokens.
   */
  readonly tintOpacity?: number;
}

/**
 * Couche de rendu des sources lumineuses (CHANTIER F nuit 3).
 *
 * Pour chaque lumière, on dépose un `<radialGradient>` à 3 stops :
 *   - 0 → 50% (= rayon `bright`) : teinte solide.
 *   - 50 → 100% (= rayon total `bright + dim`) : fade vers 0.
 * Puis un `<circle>` de rayon `bright + dim` rempli avec ce gradient.
 *
 * Limite assumée : la transition vive→faible vit dans le même gradient,
 * sans cassure visuelle. La SRD distingue vive (avantage normal de
 * vision) vs faible (désavantage Perception) ; le prototype ne marque
 * pas cette distinction mécaniquement — un MJ peut le faire à l'œil sur
 * le gradient.
 *
 * `pointerEvents='none'` : les cercles ne bloquent pas les clics token
 * ou paint mode.
 *
 * Ordre SVG attendu : ABOVE fog, BELOW tokens. La couche tinte la zone
 * éclairée par-dessus le voile (qui est lui-même percé par les reveals
 * fog liés à la lumière, gérés côté MapProtoScreen).
 */
export function LightLayer({
  lights,
  tokenPositions,
  tintOpacity = 0.55,
}: LightLayerProps): JSX.Element {
  return (
    <g data-testid="light-layer">
      <defs>
        {lights.map((light) => {
          const color = light.color ?? '#fbbf24';
          // Pourcentage de rayon où la zone vive s'arrête. Si dim = 0,
          // la lumière est purement vive (un seul step). Si bright = 0,
          // la lumière est purement faible (une seule fade).
          const total = light.brightRadius + light.dimRadius;
          const brightStop = total > 0 ? (light.brightRadius / total) * 100 : 100;
          return (
            <radialGradient
              key={light.id}
              id={`light-grad-${light.id}`}
              cx="50%"
              cy="50%"
              r="50%"
            >
              <stop
                offset="0%"
                stopColor={color}
                stopOpacity={tintOpacity}
              />
              <stop
                offset={`${brightStop}%`}
                stopColor={color}
                stopOpacity={tintOpacity * 0.45}
              />
              <stop
                offset="100%"
                stopColor={color}
                stopOpacity={0}
              />
            </radialGradient>
          );
        })}
      </defs>
      {lights.map((light) => {
        const pos = resolveLightPosition(light, tokenPositions);
        if (!pos) return null;
        const r = light.brightRadius + light.dimRadius;
        if (r <= 0) return null;
        return (
          <circle
            key={light.id}
            data-testid={`light-source-${light.id}`}
            cx={pos.x}
            cy={pos.y}
            r={r}
            fill={`url(#light-grad-${light.id})`}
            pointerEvents="none"
          />
        );
      })}
    </g>
  );
}
