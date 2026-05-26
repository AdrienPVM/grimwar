import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type JSX,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';

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
 * Hors périmètre strict :
 *   - fog of war / lumière dynamique / lignes de vue ;
 *   - persistance Firestore / sync temps réel ;
 *   - permissions joueur vs MJ ;
 *   - intégration fiche personnage.
 */

interface Token {
  readonly id: string;
  readonly label: string;
  readonly color: string;
  x: number;
  y: number;
}

const INITIAL_TOKENS: readonly Token[] = [
  { id: 't1', label: 'PJ-1', color: '#f59e0b', x: 200, y: 200 },
  { id: 't2', label: 'PJ-2', color: '#3b82f6', x: 320, y: 240 },
  { id: 't3', label: 'PNJ', color: '#ef4444', x: 480, y: 380 },
];

const VIEWBOX_BASE = { x: 0, y: 0, w: 1000, h: 700 };
const TOKEN_RADIUS = 22;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;

export function MapProtoScreen(): JSX.Element {
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [tokens, setTokens] = useState<readonly Token[]>(INITIAL_TOKENS);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [draggingTokenId, setDraggingTokenId] = useState<string | null>(null);
  const [panning, setPanning] = useState(false);

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
    [screenToSvg],
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
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      panStart.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        px: pan.x,
        py: pan.y,
      };
      setPanning(true);
    },
    [draggingTokenId, pan],
  );

  const handleSvgPointerMove = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>): void => {
      if (!panning || !panStart.current) return;
      const dx = e.clientX - panStart.current.clientX;
      const dy = e.clientY - panStart.current.clientY;
      // Inversion + division par zoom : un drag de l'écran déplace la vue dans la direction opposée
      setPan({
        x: panStart.current.px - dx / zoom,
        y: panStart.current.py - dy / zoom,
      });
    },
    [panning, zoom],
  );

  const handleSvgPointerUp = useCallback((): void => {
    setPanning(false);
    panStart.current = null;
  }, []);

  const handleWheel = useCallback((e: ReactWheelEvent<SVGSVGElement>): void => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z * factor)));
  }, []);

  const handleReset = useCallback((): void => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setTokens(INITIAL_TOKENS);
  }, []);

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
      </header>
      <main className="flex-1 p-4">
        <p className="mb-3 font-serif text-[12px] text-text-tertiary">
          Importez une image de fond, faites glisser les tokens à la souris (ou au doigt sur tactile), molette pour zoomer, drag sur le fond pour déplacer la vue. <strong>Aucune persistance</strong> — un rafraîchissement réinitialise tout.
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
            style={{ cursor: panning ? 'grabbing' : 'grab' }}
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
          </svg>
        </div>
      </main>
    </div>
  );
}
