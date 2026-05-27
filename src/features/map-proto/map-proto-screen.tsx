import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';

import type {
  AoeTemplate,
  FogPolygon,
  LightSource,
  MapPosition,
} from '@/shared/types/map';

import { AoeLayer } from './aoe-layer';
import {
  addAoe,
  clearAoes,
  removeAoe,
  rotateAoe,
  type AoeShape,
} from './aoe-state';
import { FogLayer } from './fog-layer';
import {
  appendManualMask,
  appendManualReveal,
  clearAllFog,
  createCirclePolygon,
  maskAllFog,
  revealAroundToken,
} from './fog-state';
import { LightLayer } from './light-layer';
import {
  addStaticLight,
  attachLightToToken,
  lightRevealId,
  lightRevealRadius,
  resolveLightPosition,
} from './light-state';

/**
 * Plan « mode carte » — prototype-skeleton (PAS production).
 *
 * Cf. `plans/MAP-MODE-PROPOSAL.md` pour la justification stack + roadmap.
 *
 * Implémenté en SVG natif React (zéro dépendance) pour :
 *   - 0 install (Pixi.js réservé S4 par CLAUDE.md, Konva ~120kb non
 *     justifié pour un proto à 3 tokens) ;
 *   - hit-test gratuite (event listener sur `<g>` token) ;
 *   - transform `viewBox` gère pan + zoom sans calcul matriciel custom.
 *
 * Périmètre étendu CHANTIER E nuit 3 : fog of war vectoriel.
 *   - Toggle « Activer fog » ;
 *   - Toggle « Vue MJ / Vue joueur » (opacité 0.45 vs 0.92) ;
 *   - Auto-révélation au mouvement d'un token PJ (rayon de vision en px) ;
 *   - Outils MJ : peindre une zone à révéler / re-masquer, tout révéler,
 *     tout remasquer.
 *
 * Hors périmètre strict :
 *   - lumière dynamique (CHANTIER F) ;
 *   - AoE templates (CHANTIER G) ;
 *   - persistance Firestore / sync temps réel ;
 *   - permissions joueur vs MJ runtime (le toggle est local).
 */

type TokenKind = 'pj' | 'pnj' | 'marker';

interface Token {
  readonly id: string;
  readonly label: string;
  readonly color: string;
  readonly kind: TokenKind;
  /**
   * Rayon de vision en pixels image-source. Pour la phase prototype on
   * raisonne en px ; la conversion px ↔ ft viendra avec la migration
   * Firestore (où `feetPerSquare` × `gridSize` donne le facteur).
   * `0` = ne révèle rien (PNJ, marker).
   */
  readonly visionRadius: number;
  x: number;
  y: number;
}

const INITIAL_TOKENS: readonly Token[] = [
  {
    id: 't1',
    label: 'PJ-1',
    color: '#f59e0b',
    kind: 'pj',
    visionRadius: 110,
    x: 200,
    y: 200,
  },
  {
    id: 't2',
    label: 'PJ-2',
    color: '#3b82f6',
    kind: 'pj',
    visionRadius: 110,
    x: 320,
    y: 240,
  },
  {
    id: 't3',
    label: 'PNJ',
    color: '#ef4444',
    kind: 'pnj',
    visionRadius: 0,
    x: 480,
    y: 380,
  },
];

const VIEWBOX_BASE = { x: 0, y: 0, w: 1000, h: 700 };
const TOKEN_RADIUS = 22;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;
const FOG_OPACITY_PLAYER = 0.92;
const FOG_OPACITY_DM = 0.45;
const PAINT_MIN_SEGMENT_PX = 8; // distance min entre 2 points capturés (anti-spam)
const PAINT_MIN_POINTS = 6; // en-deçà, le clic n'engendre pas de polygone

type PaintMode = 'off' | 'reveal' | 'mask';
type PlaceMode = 'off' | 'place-torch';

export function MapProtoScreen(): JSX.Element {
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [tokens, setTokens] = useState<readonly Token[]>(INITIAL_TOKENS);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [draggingTokenId, setDraggingTokenId] = useState<string | null>(null);
  const [panning, setPanning] = useState(false);

  // Fog of war state (CHANTIER E).
  const [fogEnabled, setFogEnabled] = useState(true);
  const [viewAsPlayer, setViewAsPlayer] = useState(false);
  const [fogPolygons, setFogPolygons] = useState<readonly FogPolygon[]>([]);
  const [paintMode, setPaintMode] = useState<PaintMode>('off');
  const [paintStroke, setPaintStroke] = useState<readonly MapPosition[] | null>(null);

  // Dynamic lighting state (CHANTIER F).
  const [lightingEnabled, setLightingEnabled] = useState(true);
  const [lights, setLights] = useState<readonly LightSource[]>([]);
  const [placeMode, setPlaceMode] = useState<PlaceMode>('off');

  // AoE templates state (CHANTIER G).
  const [aoeTemplates, setAoeTemplates] = useState<readonly AoeTemplate[]>([]);
  const [aoeShape, setAoeShape] = useState<AoeShape | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const dragStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const panStart = useRef<{ clientX: number; clientY: number; px: number; py: number } | null>(
    null,
  );

  const viewBox = useMemo(() => {
    const w = VIEWBOX_BASE.w / zoom;
    const h = VIEWBOX_BASE.h / zoom;
    const x = VIEWBOX_BASE.x + pan.x;
    const y = VIEWBOX_BASE.y + pan.y;
    return `${x} ${y} ${w} ${h}`;
  }, [zoom, pan]);

  /**
   * Carte tokenId → position. Calculée dérivée à partir de `tokens`, sert
   * (a) à résoudre la position des lumières attachées à un token, (b) à
   * la couche `LightLayer` pour le rendu.
   */
  const tokenPositions = useMemo(() => {
    const m = new Map<string, MapPosition>();
    for (const t of tokens) m.set(t.id, { x: t.x, y: t.y });
    return m;
  }, [tokens]);

  /**
   * Quand le fog est activé ou qu'un token PJ se déplace, on re-pose les
   * cercles de révélation correspondants. revealAroundToken est idempotent
   * (remplace l'entrée existante par token id), donc cette synchro reste
   * O(nb_pj) par tick — pas un perf concern à 3 tokens.
   *
   * On purge aussi les reveals attachés à des tokens disparus / non-PJ
   * (cas où un token a changé de kind).
   *
   * CHANTIER F : on inclut maintenant les reveals issus des sources
   * lumineuses (statiques + attachées token). Pattern miroir, préfixe
   * d'id distinct (`light-reveal-*`) → purge ciblée par préfixe.
   */
  useEffect(() => {
    if (!fogEnabled) {
      // Fog désactivé : purger reveals automatiques mais garder les
      // reveals/masks manuels du MJ.
      setFogPolygons((prev) =>
        prev.filter(
          (p) => !p.id.startsWith('auto-reveal-') && !p.id.startsWith('light-reveal-'),
        ),
      );
      return;
    }
    setFogPolygons((prev) => {
      const livePjIds = new Set(
        tokens.filter((t) => t.kind === 'pj' && t.visionRadius > 0).map((t) => t.id),
      );
      const liveLightIds = new Set(lightingEnabled ? lights.map((l) => l.id) : []);
      const cleaned = prev.filter((p) => {
        if (p.id.startsWith('auto-reveal-')) {
          const tokenId = p.id.replace(/^auto-reveal-/, '');
          return livePjIds.has(tokenId);
        }
        if (p.id.startsWith('light-reveal-')) {
          const lightId = p.id.replace(/^light-reveal-/, '');
          return liveLightIds.has(lightId);
        }
        return true;
      });
      let next: readonly FogPolygon[] = cleaned;
      // Reveals des PJ (darkvision-like).
      for (const t of tokens) {
        if (t.kind !== 'pj' || t.visionRadius <= 0) continue;
        next = revealAroundToken(next, t.id, { x: t.x, y: t.y }, t.visionRadius);
      }
      // Reveals des lumières.
      if (lightingEnabled) {
        for (const light of lights) {
          const pos = resolveLightPosition(light, tokenPositions);
          if (!pos) continue;
          const radius = lightRevealRadius(light);
          if (radius <= 0) continue;
          const id = lightRevealId(light.id);
          // Manuellement : on retire l'ancienne entrée et on en pose une nouvelle.
          const without = next.filter((p) => p.id !== id);
          next = [
            ...without,
            {
              id,
              points: [...createCirclePolygon(pos, radius)],
              kind: 'reveal',
              createdAt: null,
            },
          ];
        }
      }
      return next;
    });
  }, [tokens, fogEnabled, lights, lightingEnabled, tokenPositions]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      setBgUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    },
    [],
  );

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

  const handleTokenPointerDown = useCallback(
    (e: ReactPointerEvent<SVGGElement>, token: Token): void => {
      // Quand on est en mode peinture, l'interaction token est suspendue.
      if (paintMode !== 'off') return;
      e.stopPropagation();
      (e.target as Element).setPointerCapture(e.pointerId);
      const svgPos = screenToSvg(e.clientX, e.clientY);
      dragStart.current = {
        x: svgPos.x,
        y: svgPos.y,
        tx: token.x,
        ty: token.y,
      };
      setDraggingTokenId(token.id);
    },
    [paintMode, screenToSvg],
  );

  const handleTokenPointerMove = useCallback(
    (e: ReactPointerEvent<SVGGElement>): void => {
      if (!draggingTokenId || !dragStart.current) return;
      const svgPos = screenToSvg(e.clientX, e.clientY);
      const dx = svgPos.x - dragStart.current.x;
      const dy = svgPos.y - dragStart.current.y;
      setTokens((prev) =>
        prev.map((t) =>
          t.id === draggingTokenId
            ? { ...t, x: dragStart.current!.tx + dx, y: dragStart.current!.ty + dy }
            : t,
        ),
      );
    },
    [draggingTokenId, screenToSvg],
  );

  const handleTokenPointerUp = useCallback((): void => {
    setDraggingTokenId(null);
    dragStart.current = null;
  }, []);

  const handleSvgPointerDown = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>): void => {
      if (draggingTokenId) return;
      // Mode placer-AoE : on dépose un template au clic et on sort du
      // mode (one-shot, comme placeMode='place-torch').
      if (aoeShape) {
        const svgPos = screenToSvg(e.clientX, e.clientY);
        setAoeTemplates((prev) => addAoe(prev, aoeShape, svgPos));
        setAoeShape(null);
        return;
      }
      // Mode placer-lumière : on dépose une torche statique au clic et
      // on sort du mode (one-shot).
      if (placeMode === 'place-torch') {
        const svgPos = screenToSvg(e.clientX, e.clientY);
        setLights((prev) => addStaticLight(prev, svgPos, 'torch'));
        setPlaceMode('off');
        return;
      }
      // Mode peinture : on capture un trait, pas de pan.
      if (paintMode !== 'off') {
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
        const svgPos = screenToSvg(e.clientX, e.clientY);
        setPaintStroke([svgPos]);
        return;
      }
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      panStart.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        px: pan.x,
        py: pan.y,
      };
      setPanning(true);
    },
    [aoeShape, draggingTokenId, paintMode, pan, placeMode, screenToSvg],
  );

  const handleSvgPointerMove = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>): void => {
      if (paintStroke) {
        const svgPos = screenToSvg(e.clientX, e.clientY);
        const last = paintStroke[paintStroke.length - 1];
        if (!last) {
          setPaintStroke([svgPos]);
          return;
        }
        const dx = svgPos.x - last.x;
        const dy = svgPos.y - last.y;
        if (dx * dx + dy * dy >= PAINT_MIN_SEGMENT_PX * PAINT_MIN_SEGMENT_PX) {
          setPaintStroke([...paintStroke, svgPos]);
        }
        return;
      }
      if (!panning || !panStart.current) return;
      const dx = e.clientX - panStart.current.clientX;
      const dy = e.clientY - panStart.current.clientY;
      // Inversion + division par zoom : un drag de l'écran déplace la vue dans la direction opposée
      setPan({
        x: panStart.current.px - dx / zoom,
        y: panStart.current.py - dy / zoom,
      });
    },
    [panStart, panning, paintStroke, screenToSvg, zoom],
  );

  const handleSvgPointerUp = useCallback((): void => {
    if (paintStroke) {
      if (paintStroke.length >= PAINT_MIN_POINTS) {
        if (paintMode === 'reveal') {
          setFogPolygons((prev) => appendManualReveal(prev, paintStroke));
        } else if (paintMode === 'mask') {
          setFogPolygons((prev) => appendManualMask(prev, paintStroke));
        }
      }
      setPaintStroke(null);
      return;
    }
    setPanning(false);
    panStart.current = null;
  }, [paintMode, paintStroke]);

  const handleWheel = useCallback((e: ReactWheelEvent<SVGSVGElement>): void => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z * factor)));
  }, []);

  const handleReset = useCallback((): void => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setTokens(INITIAL_TOKENS);
    setFogPolygons([]);
    setPaintMode('off');
    setLights([]);
    setPlaceMode('off');
    setAoeTemplates([]);
    setAoeShape(null);
  }, []);

  const handleToggleTokenTorch = useCallback((tokenId: string): void => {
    setLights((prev) => attachLightToToken(prev, tokenId, 'torch'));
  }, []);

  const handleSelectAoeShape = useCallback((shape: AoeShape): void => {
    setAoeShape((prev) => (prev === shape ? null : shape));
  }, []);

  const handleClickAoe = useCallback((id: string): void => {
    // Clic = retire l'AoE (UX simple, sans modale de confirmation).
    setAoeTemplates((prev) => removeAoe(prev, id));
  }, []);

  const handleRotateLastAoe = useCallback((deltaDeg: number): void => {
    setAoeTemplates((prev) => {
      const last = prev[prev.length - 1];
      if (!last) return prev;
      return rotateAoe(prev, last.id, deltaDeg);
    });
  }, []);

  const handleClearAoes = useCallback((): void => {
    setAoeTemplates((prev) => clearAoes(prev));
  }, []);

  const handleClearAllLights = useCallback((): void => {
    setLights([]);
  }, []);

  const tokenHasTorch = useCallback(
    (tokenId: string): boolean => lights.some((l) => l.attachedTokenId === tokenId),
    [lights],
  );

  const handleRevealAll = useCallback((): void => {
    setFogPolygons((prev) => clearAllFog(prev));
    // Couvre toute la carte d'un grand reveal : on retire tout le fog
    // ET on ajoute un reveal qui couvre le viewBox (au cas où l'effet
    // futur serait juste de re-révéler sans purger).
    const corner: MapPosition[] = [
      { x: -50, y: -50 },
      { x: VIEWBOX_BASE.w + 50, y: -50 },
      { x: VIEWBOX_BASE.w + 50, y: VIEWBOX_BASE.h + 50 },
      { x: -50, y: VIEWBOX_BASE.h + 50 },
    ];
    setFogPolygons((prev) => appendManualReveal(prev, corner));
  }, []);

  const handleMaskAll = useCallback((): void => {
    setFogPolygons((prev) => maskAllFog(prev));
  }, []);

  const togglePaintMode = useCallback((mode: PaintMode): void => {
    setPaintMode((prev) => (prev === mode ? 'off' : mode));
  }, []);

  const fogOpacity = viewAsPlayer ? FOG_OPACITY_PLAYER : FOG_OPACITY_DM;

  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <header className="border-b border-gold-dim/30 bg-bg-elev px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-title text-lg font-bold uppercase tracking-[0.12em] text-gold-bright">
            Prototype carte
          </h1>
          <span className="rounded-pill border border-gold-dim/40 bg-gold/10 px-2 py-0.5 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright">
            PROTOTYPE — Not production
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <label
              htmlFor="map-bg-upload"
              className="cursor-pointer rounded-pill border border-gold-dim/40 px-3 py-1.5 font-title text-[11px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10"
            >
              Importer un fond
            </label>
            <input
              id="map-bg-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => setShowGrid((v) => !v)}
              className="rounded-pill border border-gold-dim/40 px-3 py-1.5 font-title text-[11px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10"
            >
              {showGrid ? 'Masquer grille' : 'Afficher grille'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-pill border border-gold-dim/40 px-3 py-1.5 font-title text-[11px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10"
            >
              Réinitialiser
            </button>
            <span className="font-mono text-[11px] text-text-tertiary">
              zoom {Math.round(zoom * 100)} %
            </span>
          </div>
        </div>
        {/* Bandeau outils fog (CHANTIER E). */}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gold-dim/20 pt-3">
          <span className="font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
            Fog of war
          </span>
          <button
            type="button"
            onClick={() => setFogEnabled((v) => !v)}
            aria-pressed={fogEnabled}
            className="rounded-pill border border-gold-dim/40 px-3 py-1.5 font-title text-[11px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10 aria-pressed:bg-gold-bright/30"
          >
            {fogEnabled ? 'Fog activé' : 'Fog désactivé'}
          </button>
          <button
            type="button"
            onClick={() => setViewAsPlayer((v) => !v)}
            aria-pressed={viewAsPlayer}
            disabled={!fogEnabled}
            className="rounded-pill border border-gold-dim/40 px-3 py-1.5 font-title text-[11px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10 aria-pressed:bg-gold-bright/30 disabled:opacity-40"
          >
            {viewAsPlayer ? 'Vue joueur' : 'Vue MJ'}
          </button>
          <button
            type="button"
            onClick={() => togglePaintMode('reveal')}
            aria-pressed={paintMode === 'reveal'}
            disabled={!fogEnabled}
            className="rounded-pill border border-gold-dim/40 px-3 py-1.5 font-title text-[11px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10 aria-pressed:bg-gold-bright/30 disabled:opacity-40"
          >
            Pinceau révéler
          </button>
          <button
            type="button"
            onClick={() => togglePaintMode('mask')}
            aria-pressed={paintMode === 'mask'}
            disabled={!fogEnabled}
            className="rounded-pill border border-gold-dim/40 px-3 py-1.5 font-title text-[11px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10 aria-pressed:bg-gold-bright/30 disabled:opacity-40"
          >
            Pinceau gomme
          </button>
          <button
            type="button"
            onClick={handleRevealAll}
            disabled={!fogEnabled}
            className="rounded-pill border border-gold-dim/40 px-3 py-1.5 font-title text-[11px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10 disabled:opacity-40"
          >
            Tout révéler
          </button>
          <button
            type="button"
            onClick={handleMaskAll}
            disabled={!fogEnabled}
            className="rounded-pill border border-gold-dim/40 px-3 py-1.5 font-title text-[11px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10 disabled:opacity-40"
          >
            Tout remasquer
          </button>
        </div>
        {/* Bandeau outils lumière dynamique (CHANTIER F). */}
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-gold-dim/20 pt-3">
          <span className="font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
            Lumière
          </span>
          <button
            type="button"
            onClick={() => setLightingEnabled((v) => !v)}
            aria-pressed={lightingEnabled}
            className="rounded-pill border border-gold-dim/40 px-3 py-1.5 font-title text-[11px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10 aria-pressed:bg-gold-bright/30"
          >
            {lightingEnabled ? 'Lumière activée' : 'Lumière désactivée'}
          </button>
          <button
            type="button"
            onClick={() => setPlaceMode((m) => (m === 'place-torch' ? 'off' : 'place-torch'))}
            aria-pressed={placeMode === 'place-torch'}
            disabled={!lightingEnabled}
            className="rounded-pill border border-gold-dim/40 px-3 py-1.5 font-title text-[11px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10 aria-pressed:bg-gold-bright/30 disabled:opacity-40"
          >
            Placer torche
          </button>
          {tokens
            .filter((t) => t.kind === 'pj')
            .map((t) => (
              <button
                key={`torch-${t.id}`}
                type="button"
                onClick={() => handleToggleTokenTorch(t.id)}
                aria-pressed={tokenHasTorch(t.id)}
                disabled={!lightingEnabled}
                data-testid={`toggle-torch-${t.id}`}
                className="rounded-pill border border-gold-dim/40 px-3 py-1.5 font-title text-[11px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10 aria-pressed:bg-gold-bright/30 disabled:opacity-40"
              >
                Torche {t.label}
              </button>
            ))}
          <button
            type="button"
            onClick={handleClearAllLights}
            disabled={!lightingEnabled || lights.length === 0}
            className="rounded-pill border border-gold-dim/40 px-3 py-1.5 font-title text-[11px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10 disabled:opacity-40"
          >
            Effacer lumières
          </button>
        </div>
        {/* Bandeau outils AoE (CHANTIER G). */}
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-gold-dim/20 pt-3">
          <span className="font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
            AoE
          </span>
          {(['sphere', 'cone', 'line', 'cube'] as const).map((shape) => (
            <button
              key={`aoe-shape-${shape}`}
              type="button"
              onClick={() => handleSelectAoeShape(shape)}
              aria-pressed={aoeShape === shape}
              data-testid={`aoe-shape-${shape}`}
              className="rounded-pill border border-gold-dim/40 px-3 py-1.5 font-title text-[11px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10 aria-pressed:bg-gold-bright/30"
            >
              {shape === 'sphere'
                ? 'Sphère'
                : shape === 'cone'
                  ? 'Cône'
                  : shape === 'line'
                    ? 'Ligne'
                    : 'Cube'}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleRotateLastAoe(-15)}
            disabled={aoeTemplates.length === 0}
            data-testid="aoe-rotate-ccw"
            className="rounded-pill border border-gold-dim/40 px-3 py-1.5 font-title text-[11px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10 disabled:opacity-40"
          >
            ↺ -15°
          </button>
          <button
            type="button"
            onClick={() => handleRotateLastAoe(15)}
            disabled={aoeTemplates.length === 0}
            data-testid="aoe-rotate-cw"
            className="rounded-pill border border-gold-dim/40 px-3 py-1.5 font-title text-[11px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10 disabled:opacity-40"
          >
            ↻ +15°
          </button>
          <button
            type="button"
            onClick={handleClearAoes}
            disabled={aoeTemplates.length === 0}
            className="rounded-pill border border-gold-dim/40 px-3 py-1.5 font-title text-[11px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10 disabled:opacity-40"
          >
            Effacer AoE
          </button>
        </div>
      </header>
      <main className="flex-1 p-4">
        <p className="mb-3 font-serif text-[12px] text-text-tertiary">
          Importez une image de fond, faites glisser les tokens à la souris (ou au doigt sur tactile), molette pour zoomer, drag sur le fond pour déplacer la vue.
          {fogEnabled ? (
            <> Le brouillard est {viewAsPlayer ? 'opaque (vue joueur)' : 'translucide (vue MJ)'}, les PJ révèlent automatiquement autour d&apos;eux ; activez un pinceau pour peindre une zone manuellement.</>
          ) : null}
          <br />
          <strong>Aucune persistance</strong> — un rafraîchissement réinitialise tout.
        </p>
        <div
          className="relative overflow-hidden rounded-lg border border-gold-dim/30 bg-black/40"
          style={{ height: '70vh', minHeight: 480 }}
        >
          <svg
            ref={svgRef}
            viewBox={viewBox}
            preserveAspectRatio="xMidYMid meet"
            className="h-full w-full touch-none select-none"
            data-testid="map-proto-svg"
            style={{
              cursor: paintMode !== 'off' ? 'crosshair' : panning ? 'grabbing' : 'grab',
            }}
            onPointerDown={handleSvgPointerDown}
            onPointerMove={handleSvgPointerMove}
            onPointerUp={handleSvgPointerUp}
            onPointerCancel={handleSvgPointerUp}
            onWheel={handleWheel}
          >
            {bgUrl && (
              <image
                href={bgUrl}
                x={0}
                y={0}
                width={VIEWBOX_BASE.w}
                height={VIEWBOX_BASE.h}
                preserveAspectRatio="xMidYMid slice"
              />
            )}
            {showGrid && (
              <g stroke="rgba(220,184,108,0.18)" strokeWidth={0.5}>
                {Array.from({ length: VIEWBOX_BASE.w / 50 + 1 }).map((_, i) => (
                  <line
                    key={`v-${i}`}
                    x1={i * 50}
                    y1={0}
                    x2={i * 50}
                    y2={VIEWBOX_BASE.h}
                  />
                ))}
                {Array.from({ length: VIEWBOX_BASE.h / 50 + 1 }).map((_, i) => (
                  <line
                    key={`h-${i}`}
                    x1={0}
                    y1={i * 50}
                    x2={VIEWBOX_BASE.w}
                    y2={i * 50}
                  />
                ))}
              </g>
            )}
            {tokens.map((token) => (
              <g
                key={token.id}
                data-testid={`map-token-${token.id}`}
                style={{ cursor: draggingTokenId === token.id ? 'grabbing' : 'grab' }}
                onPointerDown={(e) => handleTokenPointerDown(e, token)}
                onPointerMove={handleTokenPointerMove}
                onPointerUp={handleTokenPointerUp}
                onPointerCancel={handleTokenPointerUp}
              >
                <circle
                  cx={token.x}
                  cy={token.y}
                  r={TOKEN_RADIUS}
                  fill={token.color}
                  stroke="white"
                  strokeWidth={2}
                  opacity={draggingTokenId === token.id ? 0.8 : 1}
                />
                <text
                  x={token.x}
                  y={token.y + 4}
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
            ))}
            {fogEnabled && (
              <FogLayer
                fogPolygons={fogPolygons}
                maskId="map-proto-fog-mask"
                width={VIEWBOX_BASE.w}
                height={VIEWBOX_BASE.h}
                opacity={fogOpacity}
              />
            )}
            {/* Teinte chaude de la lumière au-dessus du fog/tokens (CHANTIER F). */}
            {lightingEnabled && lights.length > 0 && (
              <LightLayer lights={lights} tokenPositions={tokenPositions} />
            )}
            {/* AoE templates au-dessus de tout (CHANTIER G).
               Cliquer sur un AoE le retire (UX simple). */}
            {aoeTemplates.length > 0 && (
              <AoeLayer aoes={aoeTemplates} onClickAoe={handleClickAoe} />
            )}
            {/* Aperçu en temps réel du tracé pendant qu'on peint. */}
            {paintStroke && paintStroke.length >= 2 && (
              <polyline
                data-testid="map-proto-paint-preview"
                points={paintStroke.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke={paintMode === 'reveal' ? '#fde68a' : '#a3a3a3'}
                strokeWidth={3}
                strokeDasharray="6 4"
                pointerEvents="none"
              />
            )}
          </svg>
        </div>
      </main>
    </div>
  );
}
