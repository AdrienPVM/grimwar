import {
  useCallback,
  useRef,
  useState,
  type JSX,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '@/features/auth/use-auth';
import {
  addAoeTemplate,
  addFogPolygon,
  addLightSource,
  createTokenWithId,
  deleteToken,
  moveAoeTemplate,
  rotateAoeTemplate,
  updateMap,
  updateToken,
} from '@/shared/lib/services/maps';
import type {
  AoeTemplate,
  FogPolygon,
  LightSource,
  MapToken,
} from '@/shared/types/map';

import { AoeLayer } from './aoe-layer';
import { scaleAoeDimensions } from './aoe-state';
import { createCirclePolygon } from './fog-state';
import { snapToGridCell } from './grid-snap';
import { MapScene } from './map-scene';
import {
  addAnchor,
  EMPTY_RULER,
  formatMeters,
  pxPerFoot,
  rulerLengthFeet,
  setCursor,
  type Ruler,
} from './ruler-state';
import { useMap } from './use-map';
import { useMapImage } from './use-map-image';

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
const TOKEN_VISION_FT = 30; // vision normale par défaut (alimente la LOS)

// Dimensions par défaut SRD (en PIEDS — le schéma `AoeTemplate.dimensions` est
// canonique en pieds, converti en px au rendu). Une forme = un sort SRD témoin :
//   - sphere : Boule de feu (Fireball) → rayon 20 ft
//   - cone   : Mains brûlantes (Burning Hands) → cône 15 ft (angle SRD 53,13°,
//              « largeur = distance à l'origine »)
//   - line   : Mur de feu, option ligne (Wall of Fire) → 60 ft × 5 ft
//   - cube   : Onde de tonnerre (Thunderwave) → cube 15 ft
const AOE_DEFAULTS_FT: Record<AoeTemplate['shape'], Record<string, number>> = {
  sphere: { radius: 20 },
  cone: { radius: 15, angleDeg: 53.13 },
  line: { length: 60, width: 5 },
  cube: { side: 15 },
};
// Dimension « principale » en pieds servant à étiqueter le bouton (affichée en m).
const AOE_LABEL_FT: Record<AoeTemplate['shape'], number> = {
  sphere: 20,
  cone: 15,
  line: 60,
  cube: 15,
};
const AOE_SHAPE_LABELS_FR: Record<AoeTemplate['shape'], string> = {
  sphere: 'Sphère',
  cone: 'Cône',
  line: 'Ligne',
  cube: 'Cube',
};
// Pas de rotation des boutons ±15° (multiple commode de 90° et assez fin).
const AOE_ROTATE_STEP_DEG = 15;
const TOKEN_COLORS: Record<MapToken['kind'], string> = {
  pj: '#60a5fa',
  pnj: '#f87171',
  marker: '#9ca3af',
};
const TOKEN_LABELS: Record<MapToken['kind'], string> = {
  pj: 'PJ',
  pnj: 'PNJ',
  marker: '•',
};

function randomSlug(prefix: string): string {
  // 8 chars [a-z0-9] — conforme au regex slug de mapMetaSchema.
  const rand = Math.random().toString(36).slice(2, 10) || 'x';
  return `${prefix}-${rand}`;
}

export function MapLiveScreen(): JSX.Element {
  const { cid, mid } = useParams<{ cid: string; mid: string }>();
  const navigate = useNavigate();
  const { user, isReady } = useAuth();
  const { map, tokens, isLoading, error } = useMap(cid, mid);
  const { localImageUrl } = useMapImage(cid, mid);
  const [localPositions, setLocalPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [draggingTokenId, setDraggingTokenId] = useState<string | null>(null);
  // Drag des templates AoE — même machinerie que les tokens (override local
  // pendant le glisser, write Firestore au lâcher). Distinct du drag de token :
  // un AoE et un token peuvent coexister, et l'AoE se rend SOUS les tokens.
  const [localAoePositions, setLocalAoePositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [draggingAoeId, setDraggingAoeId] = useState<string | null>(null);
  // Template AoE sélectionné — cible des boutons de rotation ±15°. La sélection
  // se pose au pointerdown (saisir = sélectionner) et survit au drag. Réinit au
  // « Effacer AoE » ; si l'id disparaît du snapshot, les contrôles se masquent.
  const [selectedAoeId, setSelectedAoeId] = useState<string | null>(null);
  const aoeDragStart = useRef<{
    pointerX: number;
    pointerY: number;
    aoeX: number;
    aoeY: number;
  } | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);
  // Aimantage à la grille — préférence d'affichage LOCALE (pas persistée :
  // c'est un confort de manipulation côté MJ, pas une donnée de la carte).
  const [snapEnabled, setSnapEnabled] = useState(true);
  // Mesure de distance — outil MJ éphémère, jamais persisté (comme l'aimant).
  // En mode mesure, les jetons deviennent non-interactifs et un clic sur le
  // fond pose les ancres ; le curseur dessine le segment vivant.
  const [measureMode, setMeasureMode] = useState(false);
  const [ruler, setRuler] = useState<Ruler>(EMPTY_RULER);
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
      // En mode mesure, les jetons ne se déplacent pas : on laisse le clic
      // remonter au fond SVG pour poser une ancre de règle.
      if (measureMode) return;
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
    [measureMode, positionOf, screenToSvg],
  );

  // ── Mesure de distance (outil MJ éphémère) ─────────────────────────────
  const handleToggleMeasure = useCallback((): void => {
    setMeasureMode((on) => {
      // À la sortie du mode, on purge la règle pour ne pas la laisser traîner.
      if (on) setRuler(EMPTY_RULER);
      return !on;
    });
  }, []);

  const handleMeasurePointerDown = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>): void => {
      const p = screenToSvg(e.clientX, e.clientY);
      setRuler((r) => addAnchor(r, p));
    },
    [screenToSvg],
  );

  const handleMeasurePointerMove = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>): void => {
      const p = screenToSvg(e.clientX, e.clientY);
      setRuler((r) => setCursor(r, p));
    },
    [screenToSvg],
  );

  const handleClearMeasure = useCallback((): void => {
    setRuler(EMPTY_RULER);
  }, []);

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
    const rawPos = localPositions[tokenId];
    if (!rawPos) return;
    // Aimantage : si la grille est affichée ET que l'aimant est actif, on
    // aligne le jeton sur le CENTRE de sa case (convention VTT — une créature
    // occupe une case de 1,50 m). Sinon, position libre (battlemap sans grille
    // ou aimant désactivé par le MJ).
    const finalPos =
      snapEnabled && map?.showGrid ? snapToGridCell(rawPos, map.gridSize) : rawPos;
    // Reflet visuel immédiat : on pose la position alignée en local AVANT le
    // round-trip Firestore, pour que le jeton « claque » dans sa case sans
    // attendre l'aller-retour du listener.
    setLocalPositions((prev) => ({ ...prev, [tokenId]: finalPos }));
    try {
      await updateToken(cid, mid, tokenId, { position: finalPos }, user.uid);
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
  }, [cid, draggingTokenId, localPositions, mid, user, map, snapEnabled]);

  // ── Drag des templates AoE (réutilise l'infra de drag des tokens) ──────
  // Le MJ pose une sphère/un gabarit au centre, puis le glisse là où le sort
  // atterrit. `position` est en pixels viewBox (comme les tokens) ; les
  // dimensions du template restent en pieds côté schéma et sont mises à
  // l'échelle au rendu seulement.
  const aoePositionOf = useCallback(
    (aoe: AoeTemplate): { x: number; y: number } =>
      localAoePositions[aoe.id] ?? aoe.position,
    [localAoePositions],
  );

  const handleAoePointerDown = useCallback(
    (e: ReactPointerEvent<SVGElement>, id: string): void => {
      if (measureMode || !map) return;
      const aoe = map.aoeTemplates.find((a) => a.id === id);
      if (!aoe) return;
      (e.target as Element).setPointerCapture(e.pointerId);
      const pos = aoePositionOf(aoe);
      const svgPos = screenToSvg(e.clientX, e.clientY);
      aoeDragStart.current = {
        pointerX: svgPos.x,
        pointerY: svgPos.y,
        aoeX: pos.x,
        aoeY: pos.y,
      };
      setDraggingAoeId(id);
      // Saisir un gabarit le sélectionne (cible des contrôles de rotation).
      setSelectedAoeId(id);
    },
    [measureMode, map, aoePositionOf, screenToSvg],
  );

  const handleAoePointerMove = useCallback(
    (e: ReactPointerEvent<SVGElement>, id: string): void => {
      if (draggingAoeId !== id || !aoeDragStart.current) return;
      const svgPos = screenToSvg(e.clientX, e.clientY);
      const dx = svgPos.x - aoeDragStart.current.pointerX;
      const dy = svgPos.y - aoeDragStart.current.pointerY;
      setLocalAoePositions((prev) => ({
        ...prev,
        [id]: {
          x: aoeDragStart.current!.aoeX + dx,
          y: aoeDragStart.current!.aoeY + dy,
        },
      }));
    },
    [draggingAoeId, screenToSvg],
  );

  const handleAoePointerUp = useCallback(
    async (_e: ReactPointerEvent<SVGElement>, id: string): Promise<void> => {
      if (draggingAoeId !== id) return;
      setDraggingAoeId(null);
      aoeDragStart.current = null;
      if (!cid || !mid || !user || !map) return;
      const rawPos = localAoePositions[id];
      if (!rawPos) return;
      // Aimantage : centre de case si la grille est affichée ET l'aimant actif
      // (même règle que les tokens). Sinon position libre.
      const finalPos =
        snapEnabled && map.showGrid
          ? snapToGridCell(rawPos, map.gridSize)
          : rawPos;
      setLocalAoePositions((prev) => ({ ...prev, [id]: finalPos }));
      try {
        await moveAoeTemplate(cid, mid, map.aoeTemplates, id, finalPos, user.uid);
        setLocalAoePositions((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setWriteError(null);
      } catch (err: unknown) {
        setWriteError(err instanceof Error ? err.message : String(err));
        setLocalAoePositions((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    },
    [draggingAoeId, cid, mid, user, map, localAoePositions, snapEnabled],
  );

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

  const handleAddAoe = useCallback(
    async (shape: AoeTemplate['shape']): Promise<void> => {
      if (!cid || !mid || !user || !map) return;
      const template: AoeTemplate = {
        id: randomSlug(`manual-${shape}`),
        shape,
        position: { x: CENTER_X, y: CENTER_Y },
        dimensions: { ...AOE_DEFAULTS_FT[shape] },
        pinned: false,
      };
      try {
        await addAoeTemplate(cid, mid, map.aoeTemplates, template, user.uid);
        setWriteError(null);
      } catch (err: unknown) {
        setWriteError(err instanceof Error ? err.message : String(err));
      }
    },
    [cid, map, mid, user],
  );

  // Rotation du gabarit sélectionné via le service (write Firestore → le
  // listener ré-émet le `rotationDeg` normalisé). Pas d'override local : la
  // rotation est ponctuelle, pas un geste continu < frame.
  const handleRotateSelectedAoe = useCallback(
    async (deltaDeg: number): Promise<void> => {
      if (!cid || !mid || !user || !map || !selectedAoeId) return;
      try {
        await rotateAoeTemplate(
          cid,
          mid,
          map.aoeTemplates,
          selectedAoeId,
          deltaDeg,
          user.uid,
        );
        setWriteError(null);
      } catch (err: unknown) {
        setWriteError(err instanceof Error ? err.message : String(err));
      }
    },
    [cid, mid, user, map, selectedAoeId],
  );

  const handleClearAoe = useCallback(async (): Promise<void> => {
    if (!cid || !mid || !user) return;
    try {
      await updateMap(cid, mid, { aoeTemplates: [] }, user.uid);
      setSelectedAoeId(null);
      setWriteError(null);
    } catch (err: unknown) {
      setWriteError(err instanceof Error ? err.message : String(err));
    }
  }, [cid, mid, user]);

  // ── Toggles fog / ligne de vue ─────────────────────────────────────────
  const handleToggleFogEnabled = useCallback(async (): Promise<void> => {
    if (!cid || !mid || !user || !map) return;
    try {
      await updateMap(cid, mid, { fogEnabled: !map.fogEnabled }, user.uid);
      setWriteError(null);
    } catch (err: unknown) {
      setWriteError(err instanceof Error ? err.message : String(err));
    }
  }, [cid, map, mid, user]);

  const handleToggleLos = useCallback(async (): Promise<void> => {
    if (!cid || !mid || !user || !map) return;
    try {
      await updateMap(cid, mid, { losEnabled: !(map.losEnabled === true) }, user.uid);
      setWriteError(null);
    } catch (err: unknown) {
      setWriteError(err instanceof Error ? err.message : String(err));
    }
  }, [cid, map, mid, user]);

  const handleToggleGrid = useCallback(async (): Promise<void> => {
    if (!cid || !mid || !user || !map) return;
    try {
      await updateMap(cid, mid, { showGrid: !map.showGrid }, user.uid);
      setWriteError(null);
    } catch (err: unknown) {
      setWriteError(err instanceof Error ? err.message : String(err));
    }
  }, [cid, map, mid, user]);

  // ── Tokens (affordance prototype « au centre », parité fog/light/AoE) ───
  // N'arbitre PAS la décision produit F23 (UX d'édition complète) : c'est le
  // même geste minimal que les boutons « Torche/Sphère au centre » déjà
  // mergés. Le token apparaît au centre, draggable, et alimente la LOS via
  // son rayon de vision par défaut.
  const handleAddToken = useCallback(
    async (kind: MapToken['kind']): Promise<void> => {
      if (!cid || !mid || !user) return;
      try {
        await createTokenWithId(
          cid,
          mid,
          randomSlug('token'),
          {
            kind,
            label: TOKEN_LABELS[kind],
            position: { x: CENTER_X, y: CENTER_Y },
            color: TOKEN_COLORS[kind],
            ...(kind !== 'marker' ? { visionRadius: TOKEN_VISION_FT } : {}),
          },
          user.uid,
        );
        setWriteError(null);
      } catch (err: unknown) {
        setWriteError(err instanceof Error ? err.message : String(err));
      }
    },
    [cid, mid, user],
  );

  const handleClearTokens = useCallback(async (): Promise<void> => {
    if (!cid || !mid) return;
    try {
      await Promise.all(tokens.map((tk) => deleteToken(cid, mid, tk.id)));
      setWriteError(null);
    } catch (err: unknown) {
      setWriteError(err instanceof Error ? err.message : String(err));
    }
  }, [cid, mid, tokens]);

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

  // Échelle réelle de CETTE carte (px par pied) — dérivée de gridSize/feetPerSquare,
  // jamais le défaut 50 px/case. Alimente la longueur affichée de la règle.
  const feetScale = pxPerFoot(map.gridSize, map.feetPerSquare);
  // Templates AoE prêts au rendu : dimensions mises à l'échelle (pieds → px)
  // et position résolue (override local pendant un drag, sinon Firestore).
  // Même conversion que `MapScene`, mais ici la couche est draggable.
  const aoesPxLive: readonly AoeTemplate[] = map.aoeTemplates.map((aoe) => ({
    ...aoe,
    position: aoePositionOf(aoe),
    dimensions: scaleAoeDimensions(aoe.dimensions, feetScale),
  }));
  // Gabarit sélectionné (résolu sur le snapshot live, donc `rotationDeg` à jour
  // après un round-trip). Une sphère n'a pas d'orientation : la rotation reste
  // visible mais désactivée pour éviter un bouton sans effet.
  const selectedAoe =
    selectedAoeId != null
      ? (map.aoeTemplates.find((a) => a.id === selectedAoeId) ?? null)
      : null;
  const canRotate = selectedAoe != null && selectedAoe.shape !== 'sphere';
  const rulerFeet = rulerLengthFeet(ruler, feetScale);
  const rulerPoints = ruler.cursor
    ? [...ruler.anchors, ruler.cursor]
    : [...ruler.anchors];
  const rulerLabelAt = ruler.cursor ?? ruler.anchors[ruler.anchors.length - 1] ?? null;

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
          {(['sphere', 'cone', 'line', 'cube'] as const).map((shape) => (
            <button
              key={shape}
              type="button"
              data-testid={`map-live-add-${shape}-aoe`}
              onClick={() => {
                void handleAddAoe(shape);
              }}
              className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10"
            >
              {AOE_SHAPE_LABELS_FR[shape]} {formatMeters(AOE_LABEL_FT[shape])}
            </button>
          ))}
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
          {/* Rotation du gabarit sélectionné — apparaît dès qu'un AoE est saisi.
              Désactivée pour une sphère (orientation sans effet visuel). */}
          {selectedAoe && (
            <span
              data-testid="map-live-aoe-selection"
              className="ml-1 inline-flex items-center gap-2 rounded-pill border border-gold-dim/30 bg-gold/5 px-3 py-1"
            >
              <span className="font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright">
                {AOE_SHAPE_LABELS_FR[selectedAoe.shape]} ·{' '}
                {Math.round(selectedAoe.rotationDeg ?? 0)}°
              </span>
              <button
                type="button"
                data-testid="map-live-rotate-ccw"
                onClick={() => {
                  void handleRotateSelectedAoe(-AOE_ROTATE_STEP_DEG);
                }}
                disabled={!canRotate}
                title={
                  canRotate
                    ? `Pivoter de ${AOE_ROTATE_STEP_DEG}° dans le sens antihoraire`
                    : "Une sphère n'a pas d'orientation"
                }
                className="rounded-pill border border-gold-dim/40 px-2 py-0.5 font-mono text-[12px] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10 disabled:opacity-40"
              >
                ⟲ −{AOE_ROTATE_STEP_DEG}°
              </button>
              <button
                type="button"
                data-testid="map-live-rotate-cw"
                onClick={() => {
                  void handleRotateSelectedAoe(AOE_ROTATE_STEP_DEG);
                }}
                disabled={!canRotate}
                title={
                  canRotate
                    ? `Pivoter de ${AOE_ROTATE_STEP_DEG}° dans le sens horaire`
                    : "Une sphère n'a pas d'orientation"
                }
                className="rounded-pill border border-gold-dim/40 px-2 py-0.5 font-mono text-[12px] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10 disabled:opacity-40"
              >
                ⟳ +{AOE_ROTATE_STEP_DEG}°
              </button>
            </span>
          )}
        </div>
        {/* Tokens — affordance prototype « au centre » (parité fog/light/AoE). */}
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-gold-dim/20 pt-3">
          <span
            data-testid="map-live-tokens-count"
            className="font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary"
          >
            Tokens ({tokens.length})
          </span>
          <button
            type="button"
            data-testid="map-live-add-pj"
            onClick={() => {
              void handleAddToken('pj');
            }}
            className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10"
          >
            + PJ
          </button>
          <button
            type="button"
            data-testid="map-live-add-pnj"
            onClick={() => {
              void handleAddToken('pnj');
            }}
            className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10"
          >
            + PNJ
          </button>
          <button
            type="button"
            data-testid="map-live-clear-tokens"
            onClick={() => {
              void handleClearTokens();
            }}
            disabled={tokens.length === 0}
            className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10 disabled:opacity-40"
          >
            Effacer tokens
          </button>
        </div>
        {/* Ligne de vue + voile + vue présentation. */}
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-gold-dim/20 pt-3">
          <span
            data-testid="map-live-walls-count"
            className="font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary"
          >
            Murs ({(map.walls ?? []).length})
          </span>
          <button
            type="button"
            data-testid="map-live-toggle-grid"
            onClick={() => {
              void handleToggleGrid();
            }}
            className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10"
          >
            Grille : {map.showGrid ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            data-testid="map-live-toggle-snap"
            onClick={() => setSnapEnabled((s) => !s)}
            disabled={!map.showGrid}
            title={
              map.showGrid
                ? "Aligner les jetons sur le centre de leur case"
                : "Affichez d'abord la grille pour aimanter les jetons"
            }
            className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10 disabled:opacity-40"
          >
            Aimant : {snapEnabled ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            data-testid="map-live-toggle-fog"
            onClick={() => {
              void handleToggleFogEnabled();
            }}
            className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10"
          >
            Voile : {map.fogEnabled ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            data-testid="map-live-toggle-los"
            onClick={() => {
              void handleToggleLos();
            }}
            className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10"
          >
            Ligne de vue : {map.losEnabled === true ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            data-testid="map-live-open-tv"
            onClick={() => navigate(`/map-proto/cloud/${cid}/maps/${mid}/tv`)}
            className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10"
          >
            Vue présentation ▸
          </button>
        </div>
        {/* Mesure de distance — outil MJ éphémère (clics sur le fond = ancres). */}
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-gold-dim/20 pt-3">
          <span className="font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
            Mesure
          </span>
          <button
            type="button"
            data-testid="map-live-toggle-measure"
            onClick={handleToggleMeasure}
            aria-pressed={measureMode}
            className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10 aria-pressed:bg-gold/15"
          >
            Mesure : {measureMode ? 'ON' : 'OFF'}
          </button>
          {measureMode && (
            <>
              <span
                data-testid="map-live-ruler-total"
                className="rounded-pill border border-gold-dim/30 bg-gold/5 px-3 py-1 font-mono text-[11px] text-gold-bright"
              >
                Distance : {formatMeters(rulerFeet)}
              </span>
              <button
                type="button"
                data-testid="map-live-clear-measure"
                onClick={handleClearMeasure}
                disabled={ruler.anchors.length === 0}
                className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10 disabled:opacity-40"
              >
                Effacer mesure
              </button>
              <span className="font-serif text-[11px] text-text-tertiary">
                Cliquez sur la carte pour poser les points.
              </span>
            </>
          )}
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
          style={measureMode ? { cursor: 'crosshair' } : undefined}
          data-testid="map-live-svg"
          onPointerDown={measureMode ? handleMeasurePointerDown : undefined}
          onPointerMove={measureMode ? handleMeasurePointerMove : undefined}
        >
          {/* Décor partagé : image, grille, murs (debug MJ), fog (voile
              atténué côté MJ pour qu'il voie au travers) + LOS, lumières. Les
              tokens draggables sont rendus PAR-DESSUS, juste après. */}
          <MapScene
            map={map}
            localImageUrl={localImageUrl}
            tokens={tokens}
            maskId={`fog-live-${mid}`}
            showWalls
            fogOpacity={0.45}
            renderAoe={false}
          />
          {/* Couche AoE draggable (live MJ) — rendue SOUS les tokens (décor
              tactique), au-dessus du décor de `MapScene`. En mode mesure, elle
              laisse passer les clics au fond SVG. */}
          {aoesPxLive.length > 0 && (
            <AoeLayer
              aoes={aoesPxLive}
              draggingId={draggingAoeId}
              selectedId={selectedAoeId}
              interactionDisabled={measureMode}
              onAoePointerDown={handleAoePointerDown}
              onAoePointerMove={handleAoePointerMove}
              onAoePointerUp={(e, id) => {
                void handleAoePointerUp(e, id);
              }}
            />
          )}
          {tokens.map((token) => {
            const pos = positionOf(token);
            const isDragging = draggingTokenId === token.id;
            return (
              <g
                key={token.id}
                data-testid={`map-live-token-${token.id}`}
                // En mode mesure, les jetons laissent passer les clics au fond
                // SVG (poser une ancre par-dessus un jeton reste possible).
                pointerEvents={measureMode ? 'none' : undefined}
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

          {/* Règle de mesure — overlay décoratif (clics gérés par le fond SVG).
              Tracé doré pointillé + pastilles aux ancres + étiquette en mètres. */}
          {measureMode && rulerPoints.length >= 2 && (
            <g data-testid="map-live-ruler" pointerEvents="none">
              <polyline
                points={rulerPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="rgba(220,184,108,0.9)"
                strokeWidth={2}
                strokeDasharray="8 6"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {ruler.anchors.map((p, i) => (
                <circle
                  key={`anchor-${i}`}
                  cx={p.x}
                  cy={p.y}
                  r={4}
                  fill="rgba(220,184,108,0.95)"
                  stroke="#1a1208"
                  strokeWidth={1}
                />
              ))}
              {rulerLabelAt && (
                <text
                  data-testid="map-live-ruler-label"
                  x={rulerLabelAt.x + 12}
                  y={rulerLabelAt.y - 12}
                  fontFamily="monospace"
                  fontWeight="bold"
                  fontSize={18}
                  fill="#e8c87d"
                  stroke="#0a0a0a"
                  strokeWidth={4}
                  paintOrder="stroke"
                >
                  {formatMeters(rulerFeet)}
                </text>
              )}
            </g>
          )}
        </svg>
      </div>
    </main>
  );
}
