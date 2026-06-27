import { useMemo, type JSX } from 'react';

import type {
  LightSource,
  MapPosition,
  WallPolyline,
} from '@/shared/types/map';

import { pointsToSvgString } from './fog-state';
import { resolveLightPosition } from './light-state';
import {
  computeVisibilityPolygon,
  wallsToSegments,
  type Segment,
  type WorldBounds,
} from './los-state';

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
  /**
   * Murs occultants (line_of_sight + mobilier + portes/fenêtres FERMÉES,
   * agrégés par le parseur `.dd2vtt`). Si fournis et non vides, la lumière
   * de CHAQUE source est DÉCOUPÉE par sa ligne de vue depuis son origine :
   * elle ne traverse plus un mur, une porte close, une fenêtre ni un muret.
   * Absents (ou vides) → cercle plein, comme avant (cartes sans occluseurs).
   */
  readonly walls?: readonly WallPolyline[];
  /** Bornes du monde (viewBox) — requises pour le découpage par murs. */
  readonly bounds?: WorldBounds;
}

/** Une lumière prête à rendre : sa position résolue, son rayon, son clip. */
interface ResolvedLight {
  readonly light: LightSource;
  readonly pos: MapPosition;
  readonly radius: number;
  /**
   * Points du polygone de visibilité (clip), ou `null` si la lumière n'est
   * pas occultée (pas de murs) → cercle plein.
   */
  readonly clip: readonly MapPosition[] | null;
}

/**
 * Couche de rendu des sources lumineuses (CHANTIER F nuit 3).
 *
 * Pour chaque lumière, on dépose un `<radialGradient>` à 3 stops :
 *   - 0 → 50% (= rayon `bright`) : teinte solide.
 *   - 50 → 100% (= rayon total `bright + dim`) : fade vers 0.
 * Puis un `<circle>` de rayon `bright + dim` rempli avec ce gradient.
 *
 * --- Occlusion par les murs (exigence Adrien : « les lumières ne passent
 * pas au travers des murs ») ---
 * Quand `walls` est fourni, on calcule pour chaque source son POLYGONE DE
 * VISIBILITÉ (raycasting `computeVisibilityPolygon`, le même moteur que la
 * ligne de vue des tokens) borné par son rayon. On l'attache comme
 * `<clipPath>` au cercle de tint : la teinte chaude n'apparaît donc QUE là
 * où la lumière « voit » réellement — derrière un mur, une porte close, une
 * fenêtre ou un muret (tous agrégés dans `walls` par le parseur `.dd2vtt`),
 * la lumière est coupée net. Sans murs, on garde le cercle plein (pas de
 * clip), comportement et coût d'avant.
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
  walls,
  bounds,
}: LightLayerProps): JSX.Element {
  // Résolution + découpage mémoïsés : le raycasting est O(rayons × segments)
  // par source, on ne le refait que si lumières / positions / murs changent.
  const resolved = useMemo<ResolvedLight[]>(() => {
    const occlude = !!walls && walls.length > 0 && !!bounds;
    const segments: readonly Segment[] = occlude
      ? wallsToSegments(walls)
      : [];
    const out: ResolvedLight[] = [];
    for (const light of lights) {
      const pos = resolveLightPosition(light, tokenPositions);
      if (!pos) continue;
      const radius = light.brightRadius + light.dimRadius;
      if (radius <= 0) continue;
      let clip: readonly MapPosition[] | null = null;
      if (occlude && bounds) {
        const polygon = computeVisibilityPolygon(
          pos,
          segments,
          bounds,
          radius,
        );
        // < 3 points = polygone dégénéré : on retombe sur le cercle plein
        // plutôt que de masquer toute la lumière.
        if (polygon.length >= 3) clip = polygon;
      }
      out.push({ light, pos, radius, clip });
    }
    return out;
  }, [lights, tokenPositions, walls, bounds]);

  return (
    <g data-testid="light-layer">
      <defs>
        {resolved.map(({ light }) => {
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
        {/* Un clipPath par lumière occultée — le polygone de visibilité. */}
        {resolved.map(({ light, clip }) =>
          clip ? (
            <clipPath
              key={`clip-${light.id}`}
              id={`light-clip-${light.id}`}
              data-testid={`light-clip-${light.id}`}
            >
              <polygon points={pointsToSvgString(clip)} />
            </clipPath>
          ) : null,
        )}
      </defs>
      {resolved.map(({ light, pos, radius, clip }) => (
        <circle
          key={light.id}
          data-testid={`light-source-${light.id}`}
          cx={pos.x}
          cy={pos.y}
          r={radius}
          fill={`url(#light-grad-${light.id})`}
          clipPath={clip ? `url(#light-clip-${light.id})` : undefined}
          pointerEvents="none"
        />
      ))}
    </g>
  );
}
