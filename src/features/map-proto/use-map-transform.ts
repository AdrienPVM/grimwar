import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';

import { MAP_VIEWBOX_W } from './map-viewport';
import {
  IDENTITY_TRANSFORM,
  MAP_ZOOM_MAX,
  MAP_ZOOM_MIN,
  MAP_ZOOM_STEP,
  panBy,
  toViewBox,
  zoomBy,
  zoomPercent,
  type MapTransform,
} from './map-transform';

/**
 * Cadrage local d'une vue de carte : zoom par crans + panoramique au glisser.
 * Partagé par la vue live MJ et la vue présentation/TV — les deux avaient
 * exactement le même `viewBox` figé.
 *
 * Le déplacement se calcule à l'échelle FIGÉE AU DÉBUT DU GESTE : convertir
 * chaque `pointermove` avec le `viewBox` courant serait auto-référentiel (le
 * viewBox bouge parce qu'on le déplace), et la carte partirait en accélération.
 */
export interface UseMapTransformResult {
  readonly transform: MapTransform;
  /** Chaîne prête pour l'attribut `viewBox` du SVG. */
  readonly viewBox: string;
  readonly percent: number;
  readonly canZoomIn: boolean;
  readonly canZoomOut: boolean;
  /** `true` dès qu'un cadrage n'est plus la vue entière (active « Recadrer »). */
  readonly isFramed: boolean;
  readonly isPanning: boolean;
  readonly zoomIn: () => void;
  readonly zoomOut: () => void;
  readonly reset: () => void;
  readonly beginPan: (e: ReactPointerEvent<SVGSVGElement>) => void;
  readonly movePan: (e: ReactPointerEvent<SVGSVGElement>) => void;
  readonly endPan: () => void;
}

export function useMapTransform(
  svgRef: RefObject<SVGSVGElement>,
): UseMapTransformResult {
  const [transform, setTransform] = useState<MapTransform>(IDENTITY_TRANSFORM);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStart = useRef<{
    clientX: number;
    clientY: number;
    panX: number;
    panY: number;
    /** Unités de carte par pixel écran, gelées au début du geste. */
    scale: number;
  } | null>(null);

  const zoomIn = useCallback(() => {
    setTransform((s) => zoomBy(s, MAP_ZOOM_STEP));
  }, []);

  const zoomOut = useCallback(() => {
    setTransform((s) => zoomBy(s, 1 / MAP_ZOOM_STEP));
  }, []);

  const reset = useCallback(() => {
    setTransform(IDENTITY_TRANSFORM);
  }, []);

  const beginPan = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>): void => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0) return;
      panStart.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        panX: transform.panX,
        panY: transform.panY,
        scale: MAP_VIEWBOX_W / transform.zoom / rect.width,
      };
      setIsPanning(true);
    },
    [svgRef, transform],
  );

  const movePan = useCallback((e: ReactPointerEvent<SVGSVGElement>): void => {
    const start = panStart.current;
    if (!start) return;
    // Le doigt tire la CARTE, pas la fenêtre : glisser vers la droite dévoile
    // ce qui est à gauche, d'où le signe négatif.
    const dx = -(e.clientX - start.clientX) * start.scale;
    const dy = -(e.clientY - start.clientY) * start.scale;
    // Le pan repart TOUJOURS de la position au début du geste (pas du pan
    // courant) : cumuler les deltas ferait dériver le cadrage image par image.
    setTransform((s) =>
      panBy({ zoom: s.zoom, panX: start.panX, panY: start.panY }, dx, dy),
    );
  }, []);

  const endPan = useCallback((): void => {
    panStart.current = null;
    setIsPanning(false);
  }, []);

  return useMemo(
    () => ({
      transform,
      viewBox: toViewBox(transform),
      percent: zoomPercent(transform),
      canZoomIn: transform.zoom < MAP_ZOOM_MAX,
      canZoomOut: transform.zoom > MAP_ZOOM_MIN,
      isFramed:
        transform.zoom !== 1 || transform.panX !== 0 || transform.panY !== 0,
      isPanning,
      zoomIn,
      zoomOut,
      reset,
      beginPan,
      movePan,
      endPan,
    }),
    [transform, isPanning, zoomIn, zoomOut, reset, beginPan, movePan, endPan],
  );
}
