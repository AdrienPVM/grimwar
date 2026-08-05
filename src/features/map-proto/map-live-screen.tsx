import {
  useCallback,
  useRef,
  useState,
  type JSX,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '@/features/auth/use-auth';
import { Tooltip } from '@/shared/components/tooltip';
import { t, type StringKey } from '@/shared/lib/i18n';
import {
  addAoeTemplate,
  addFogPolygon,
  addLightSource,
  createTokenWithId,
  deleteToken,
  moveAoeTemplate,
  removeAoeTemplate,
  resizeAoeTemplate,
  rotateAoeTemplate,
  updateMap,
  updateToken,
} from '@/shared/lib/services/maps';
import type { Monster } from '@/shared/types/content';
import type {
  AoeTemplate,
  FogPolygon,
  LightSource,
  MapToken,
} from '@/shared/types/map';

import { AoeLayer } from './aoe-layer';
import { aoePrimaryDimensionFt, scaleAoeDimensions } from './aoe-state';
import { createCirclePolygon } from './fog-state';
import { snapToGridCell } from './grid-snap';
import {
  carriedLightPreset,
  LIGHT_PRESETS,
  setTokenCarriedLight,
  type LightPresetKey,
} from './light-state';
import { MapScene } from './map-scene';
import {
  MapSettingsModal,
  type MapSettingsPatch,
} from './map-settings-modal';
import { monsterToTokenInput } from './monster-token';
import { MonsterPickerModal } from './monster-picker-modal';
import {
  addAnchor,
  EMPTY_RULER,
  formatMeters,
  pxPerFoot,
  rulerLengthFeet,
  setCursor,
  type Ruler,
} from './ruler-state';
import { TokenEditModal } from './token-edit-modal';
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
// Opacité du voile côté MJ : atténuée pour piloter à travers le brouillard.
const FOG_OPACITY_DM = 0.45;
// Opacité vue par la table (identique à `map-tv-screen`) — ce que le toggle
// « Vue joueur » (M33) permet de vérifier AVANT de dévoiler.
const FOG_OPACITY_PLAYER = 0.92;
/**
 * Presets de lumière SRD, en PIEDS (rayon vif / faible), convertis en px à
 * l'ÉCHELLE RÉELLE de la carte au moment de la pose (cf. `handleAddLight`) —
 * `LightLayer` trace le rayon BRUT en px, comme l'import .dd2vtt. Valeurs et
 * couleurs reprises de `LIGHT_PRESETS` (`light-state.ts`, SRD-sourcé) : on garde
 * ici la version EN PIEDS (la table partagée est en px proto, fausse pour une
 * carte importée à 14 px/ft) et on pioche la couleur dans la table partagée.
 */
const LIGHT_PRESET_FT: Record<
  LightPresetKey,
  { brightFt: number; dimFt: number; labelKey: StringKey }
> = {
  candle: { brightFt: 5, dimFt: 5, labelKey: 'map.light.candle' },
  torch: { brightFt: 20, dimFt: 20, labelKey: 'map.light.torch' },
  'light-spell': { brightFt: 20, dimFt: 20, labelKey: 'map.light.spell' },
  lantern: { brightFt: 30, dimFt: 30, labelKey: 'map.light.lantern' },
  sunlight: { brightFt: 60, dimFt: 60, labelKey: 'map.light.sunlight' },
};
/** Ordre d'affichage des boutons de lumière (rayon croissant). */
const LIGHT_PRESET_ORDER: readonly LightPresetKey[] = [
  'candle',
  'torch',
  'light-spell',
  'lantern',
  'sunlight',
];
const TOKEN_VISION_FT = 30; // vision normale par défaut (alimente la LOS)
// Seuil (px viewBox) en deçà duquel un pointerdown+up sur un jeton est lu comme
// un TAP (→ ouvre l'éditeur) plutôt qu'un drag (→ déplace + persiste). Un vrai
// déplacement franchit largement ce seuil ; un appui « sur place » reste dessous.
const TOKEN_TAP_THRESHOLD_PX = 6;
/**
 * Plafond dur de la chaîne base64 d'un portrait écrite sur le doc Firestore
 * (~700 Ko < limite de 1 Mio d'un doc, marge pour les autres champs). Le preset
 * portrait vise ~32 Ko : ce garde-fou n'attrape qu'un cas pathologique (canvas
 * indisponible → image brute via le repli de l'optimiseur).
 */
const MAX_TOKEN_PORTRAIT_BYTES = 700 * 1024;

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
const AOE_SHAPE_LABEL_KEYS: Record<AoeTemplate['shape'], StringKey> = {
  sphere: 'map.aoe.sphere',
  cone: 'map.aoe.cone',
  line: 'map.aoe.line',
  cube: 'map.aoe.cube',
};
// Pas de rotation des boutons ±15° (multiple commode de 90° et assez fin).
const AOE_ROTATE_STEP_DEG = 15;
const TOKEN_COLORS: Record<MapToken['kind'], string> = {
  pj: '#60a5fa',
  pnj: '#f87171',
  marker: '#9ca3af',
};
const TOKEN_LABELS: Record<MapToken['kind'], StringKey> = {
  pj: 'map.live.tokenAbbrevPj',
  pnj: 'map.live.tokenAbbrevPnj',
  marker: 'map.live.tokenAbbrevMarker',
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
  // Jeton en cours d'édition (ouvert au TAP) — `null` quand la modale est
  // fermée. Le jeton lui-même est dérivé du snapshot (pas de copie d'état) :
  // si un autre client le supprime, la modale se referme toute seule.
  const [editingTokenId, setEditingTokenId] = useState<string | null>(null);
  // Sélecteur de bestiaire ouvert (autofill carte depuis un monstre).
  const [showMonsterPicker, setShowMonsterPicker] = useState(false);
  // Panneau de réglages de la carte (nom, calibrage de grille, image partagée).
  const [settingsOpen, setSettingsOpen] = useState(false);
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
  // « Vue joueur » (M33) — bascule LOCALE de l'opacité du voile sur celle de la
  // vue TV. Le MJ voit au travers du brouillard par défaut (0.45) pour piloter ;
  // ce toggle lui montre ce que la table voit réellement AVANT de dévoiler.
  // Rien n'est persisté : c'est une lunette, pas un réglage de carte.
  const [viewAsPlayer, setViewAsPlayer] = useState(false);
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
    const start = dragStart.current;
    setDraggingTokenId(null);
    dragStart.current = null;
    if (!tokenId || !cid || !mid || !user) return;
    const rawPos = localPositions[tokenId];
    // TAP (appui sans glissement franc) → ouvrir l'éditeur du jeton plutôt que
    // de persister un déplacement. `rawPos` absent = aucun pointermove ; sinon
    // on mesure la distance parcourue depuis la position de départ du jeton.
    const movedPx =
      rawPos && start
        ? Math.hypot(rawPos.x - start.tokenX, rawPos.y - start.tokenY)
        : 0;
    if (movedPx < TOKEN_TAP_THRESHOLD_PX) {
      // Purge un éventuel micro-override local avant d'ouvrir la modale.
      if (rawPos) {
        setLocalPositions((prev) => {
          const next = { ...prev };
          delete next[tokenId];
          return next;
        });
      }
      setEditingTokenId(tokenId);
      return;
    }
    // Au-delà du seuil, `rawPos` est nécessairement défini (movedPx > 0 l'exige) ;
    // garde défensif pour le typeur.
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

  const handleAddLight = useCallback(
    async (preset: LightPresetKey): Promise<void> => {
      if (!cid || !mid || !user || !map) return;
      // `LightLayer` trace le rayon BRUT en px viewBox (pas de mise à l'échelle),
      // et les autres producteurs de lumières (presets proto + import .dd2vtt)
      // stockent déjà des PIXELS. On convertit donc les pieds SRD du preset en px
      // à l'échelle réelle de la carte (comme `dd2vtt` fait `range_cases ×
      // échelle`), alignant la lumière sur le contrat px de fait. NB : le
      // nettoyage « pieds canoniques partout + scale au rendu » (cf. schéma
      // `map.ts`) reste à faire — il changerait l'interprétation d'un champ
      // persisté (migration des cartes .dd2vtt déjà importées) → décision Adrien.
      const scale = pxPerFoot(map.gridSize, map.feetPerSquare);
      const spec = LIGHT_PRESET_FT[preset];
      const light: LightSource = {
        id: randomSlug(`manual-${preset}`),
        position: { x: CENTER_X, y: CENTER_Y },
        attachedTokenId: null,
        brightRadius: Math.round(spec.brightFt * scale),
        dimRadius: Math.round(spec.dimFt * scale),
        // Teinte SRD du preset (torche ambre, sort Lumière blanc-froid, soleil
        // neutre) — source unique : la table partagée `LIGHT_PRESETS`.
        color: LIGHT_PRESETS[preset].color,
        preset,
      };
      try {
        await addLightSource(cid, mid, map.lightSources, light, user.uid);
        setWriteError(null);
      } catch (err: unknown) {
        setWriteError(err instanceof Error ? err.message : String(err));
      }
    },
    [cid, map, mid, user],
  );

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

  // Redimensionne le gabarit sélectionné d'un pas de grille (une case =
  // `feetPerSquare`, défaut 5 ft SRD) ; plancher = une case. La dimension
  // principale dépend de la forme (radius/length/side) — délégué au service.
  const handleResizeSelectedAoe = useCallback(
    async (deltaSquares: number): Promise<void> => {
      if (!cid || !mid || !user || !map || !selectedAoeId) return;
      const stepFt = map.feetPerSquare;
      try {
        await resizeAoeTemplate(
          cid,
          mid,
          map.aoeTemplates,
          selectedAoeId,
          deltaSquares * stepFt,
          user.uid,
          stepFt, // plancher : jamais sous une case
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

  // Suppression DU SEUL gabarit sélectionné (≠ « Effacer AoE » qui vide tout).
  // Réutilise `removeAoeTemplate` (filtre par id) — symétrique de la suppression
  // unitaire d'un jeton. La sélection se vide localement ; le listener `useMap`
  // ré-émet ensuite la liste sans ce gabarit.
  const handleDeleteSelectedAoe = useCallback(async (): Promise<void> => {
    if (!cid || !mid || !user || !map || !selectedAoeId) return;
    try {
      await removeAoeTemplate(
        cid,
        mid,
        map.aoeTemplates,
        selectedAoeId,
        user.uid,
      );
      setSelectedAoeId(null);
      setWriteError(null);
    } catch (err: unknown) {
      setWriteError(err instanceof Error ? err.message : String(err));
    }
  }, [cid, mid, user, map, selectedAoeId]);

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

  // Bascule l'éclairage dynamique. Quand OFF, le rendu ignore TOUTES les
  // sources (torche, lumière portée…) — utile pour une scène en plein jour où
  // la teinte chaude n'a pas lieu d'être. Les sources restent persistées et
  // réapparaissent au ré-activage. `lightingEnabled` existe déjà sur le schéma.
  const handleToggleLighting = useCallback(async (): Promise<void> => {
    if (!cid || !mid || !user || !map) return;
    try {
      await updateMap(
        cid,
        mid,
        { lightingEnabled: !map.lightingEnabled },
        user.uid,
      );
      setWriteError(null);
    } catch (err: unknown) {
      setWriteError(err instanceof Error ? err.message : String(err));
    }
  }, [cid, map, mid, user]);

  /**
   * Réglages de la carte (M30) — nom, calibrage de grille, image de fond
   * partagée. Écriture unique : les 4 champs partent ensemble, donc une carte
   * recalibrée ne passe jamais par un état intermédiaire incohérent (grille
   * neuve avec ancienne échelle). Tout dérive ensuite : règle, portées de
   * vision, gabarits d'AoE, rayons de lumière.
   */
  const handleSaveSettings = useCallback(
    async (patch: MapSettingsPatch): Promise<void> => {
      if (!cid || !mid || !user) return;
      try {
        await updateMap(cid, mid, { ...patch }, user.uid);
        setWriteError(null);
        setSettingsOpen(false);
      } catch (err: unknown) {
        setWriteError(err instanceof Error ? err.message : String(err));
      }
    },
    [cid, mid, user],
  );

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
            label: t(TOKEN_LABELS[kind]),
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

  // ── Autofill carte depuis un monstre du bestiaire ──────────────────────
  // Le monstre choisi dans le sélecteur devient un jeton PNJ au centre, son
  // nom dédoublonné (« Gobelin 2 »…) et son rayon de vision tiré du bloc de
  // stats (vision dans le noir → LOS). Mapping pur dans `monsterToTokenInput`.
  const handleAddMonsterToken = useCallback(
    async (monster: Monster): Promise<void> => {
      if (!cid || !mid || !user) return;
      try {
        const input = monsterToTokenInput(monster, {
          center: { x: CENTER_X, y: CENTER_Y },
          color: TOKEN_COLORS.pnj,
          fallbackVisionFt: TOKEN_VISION_FT,
          existingLabels: tokens.map((tk) => tk.label),
          bounds: { width: VIEWBOX_W, height: VIEWBOX_H, radius: TOKEN_RADIUS },
        });
        await createTokenWithId(cid, mid, randomSlug('token'), input, user.uid);
        setShowMonsterPicker(false);
        setWriteError(null);
      } catch (err: unknown) {
        setWriteError(err instanceof Error ? err.message : String(err));
      }
    },
    [cid, mid, user, tokens],
  );

  const handleClearTokens = useCallback(async (): Promise<void> => {
    if (!cid || !mid) return;
    try {
      // Le portrait vit sur le doc du jeton → supprimé avec lui (rien à purger).
      await Promise.all(tokens.map((tk) => deleteToken(cid, mid, tk.id)));
      setWriteError(null);
    } catch (err: unknown) {
      setWriteError(err instanceof Error ? err.message : String(err));
    }
  }, [cid, mid, tokens]);

  // ── Édition d'un jeton (nom + couleur + suppression unitaire) ──────────
  const handleSaveToken = useCallback(
    async (patch: {
      kind: MapToken['kind'];
      label: string;
      color: string;
      visionRadius?: number;
    }): Promise<void> => {
      const tokenId = editingTokenId;
      if (!tokenId || !cid || !mid || !user) return;
      setEditingTokenId(null);
      try {
        await updateToken(cid, mid, tokenId, patch, user.uid);
        setWriteError(null);
      } catch (err: unknown) {
        setWriteError(err instanceof Error ? err.message : String(err));
      }
    },
    [cid, editingTokenId, mid, user],
  );

  const handleDeleteEditingToken = useCallback(async (): Promise<void> => {
    const tokenId = editingTokenId;
    if (!tokenId || !cid || !mid) return;
    setEditingTokenId(null);
    try {
      // Le portrait vit INLINE sur le doc → supprimé avec le jeton.
      await deleteToken(cid, mid, tokenId);
      setWriteError(null);
    } catch (err: unknown) {
      setWriteError(err instanceof Error ? err.message : String(err));
    }
  }, [cid, editingTokenId, mid]);

  // ── Portrait d'un jeton (base64 INLINE sur le doc → synchro cross-device) ──
  // Le data URL arrive DÉJÀ optimisé par la modale (`fileToTokenImage` →
  // `PORTRAIT_PRESET`, recadré disque ≤192 px, budget ~32 Ko). On l'écrit sur le
  // doc du jeton via `updateToken` (écriture PARTIELLE : un déplacement ne
  // ré-envoie pas l'image). La vue TV + les autres appareils le reçoivent par
  // le listener `useMap`. Garde-fou dur : on refuse une chaîne anormalement
  // lourde (canvas indisponible → image brute) pour ne JAMAIS approcher la
  // limite de 1 Mio d'un doc Firestore.
  const handleUploadTokenImage = useCallback(
    async (dataUrl: string): Promise<void> => {
      const tokenId = editingTokenId;
      if (!tokenId || !cid || !mid || !user) return;
      if (dataUrl.length > MAX_TOKEN_PORTRAIT_BYTES) {
        setWriteError(t('map.live.portraitTooHeavy'));
        return;
      }
      try {
        await updateToken(cid, mid, tokenId, { imageDataUrl: dataUrl }, user.uid);
        setWriteError(null);
      } catch (err: unknown) {
        setWriteError(err instanceof Error ? err.message : String(err));
      }
    },
    [cid, editingTokenId, mid, user],
  );

  const handleRemoveTokenImage = useCallback(async (): Promise<void> => {
    const tokenId = editingTokenId;
    if (!tokenId || !cid || !mid || !user) return;
    try {
      await updateToken(cid, mid, tokenId, { imageDataUrl: null }, user.uid);
      setWriteError(null);
    } catch (err: unknown) {
      setWriteError(err instanceof Error ? err.message : String(err));
    }
  }, [cid, editingTokenId, mid, user]);

  // ── Lumière PORTÉE par un jeton (torche de PJ qui suit le déplacement) ──────
  // La lumière vit dans `map.lightSources` (inline sur le doc carte), attachée
  // via `attachedTokenId` → `LightLayer` la résout à la position courante du
  // token. On la construit à l'ÉCHELLE RÉELLE de la carte (feet→px), comme une
  // lumière statique, puis on substitue celle du token dans le tableau. Écriture
  // immédiate (pas via « Enregistrer ») pour un retour visuel direct.
  const handleSetCarriedLight = useCallback(
    async (preset: LightPresetKey | null): Promise<void> => {
      const tokenId = editingTokenId;
      if (!tokenId || !cid || !mid || !user || !map) return;
      let replacement: LightSource | null = null;
      if (preset) {
        const scale = pxPerFoot(map.gridSize, map.feetPerSquare);
        const spec = LIGHT_PRESET_FT[preset];
        replacement = {
          id: randomSlug(`carried-${preset}`),
          attachedTokenId: tokenId,
          brightRadius: Math.round(spec.brightFt * scale),
          dimRadius: Math.round(spec.dimFt * scale),
          color: LIGHT_PRESETS[preset].color,
          preset,
        };
      }
      const nextLights = setTokenCarriedLight(
        map.lightSources,
        tokenId,
        replacement,
      );
      try {
        // `updateMap` attend un tableau mutable ; `setTokenCarriedLight` est pur
        // (readonly) → on copie.
        await updateMap(cid, mid, { lightSources: [...nextLights] }, user.uid);
        setWriteError(null);
      } catch (err: unknown) {
        setWriteError(err instanceof Error ? err.message : String(err));
      }
    },
    [cid, editingTokenId, mid, user, map],
  );

  // Duplique le jeton en cours d'édition (gain de temps majeur pour poser une
  // meute : un gobelin → « Dupliquer » ×4). Copie kind/label/couleur/vision,
  // décale d'une case en bas-à-droite (clamp viewBox) pour éviter le
  // chevauchement exact, puis ferme la modale (le clone est posé, le MJ le
  // déplace ou re-tape pour dupliquer encore). Réutilise `createTokenWithId`
  // (id slug stable) — JAMAIS `createToken`/`addDoc` (id majuscule → filtré).
  const handleDuplicateToken = useCallback(async (): Promise<void> => {
    if (!cid || !mid || !user || !map) return;
    const src = tokens.find((t) => t.id === editingTokenId);
    if (!src) return;
    setEditingTokenId(null);
    const position = {
      x: Math.min(VIEWBOX_W, src.position.x + map.gridSize),
      y: Math.min(VIEWBOX_H, src.position.y + map.gridSize),
    };
    // Id du clone capturé pour copier aussi son portrait (meute : on dessine
    // une fois le gobelin, chaque « Dupliquer » garde l'art).
    const cloneId = randomSlug('token');
    try {
      await createTokenWithId(
        cid,
        mid,
        cloneId,
        {
          kind: src.kind,
          label: src.label,
          position,
          color: src.color,
          ...(src.visionRadius != null
            ? { visionRadius: src.visionRadius }
            : {}),
          // Le portrait vit sur le doc → recopié en une seule écriture (meute :
          // on dessine le gobelin une fois, chaque « Dupliquer » garde l'art).
          ...(src.imageDataUrl ? { imageDataUrl: src.imageDataUrl } : {}),
        },
        user.uid,
      );
      setWriteError(null);
    } catch (err: unknown) {
      setWriteError(err instanceof Error ? err.message : String(err));
    }
  }, [cid, mid, user, map, tokens, editingTokenId]);

  if (!cid || !mid) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-6 text-text">
        <p
          data-testid="map-live-missing-params"
          className="font-serif text-sm text-text-secondary"
        >
          {t('map.tv.missingParams')}
        </p>
      </main>
    );
  }
  if (!isReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-6 text-text">
        <p className="font-serif text-sm text-text-secondary">
          {t('map.common.loading')}
        </p>
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
          {t('map.live.signedOut')}
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
          {t('map.common.errorPrefix')}
          {error.message}
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
          {t('map.common.loadingMap')}
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
          {t('map.tv.notFound')}
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
  // Taille de la dimension principale (pieds) + garde de rétrécissement : on ne
  // descend pas sous une case (le service plafonne aussi, mais on grise le −).
  const selectedAoeSizeFt = selectedAoe
    ? aoePrimaryDimensionFt(selectedAoe.shape, selectedAoe.dimensions)
    : 0;
  const canShrinkAoe =
    selectedAoe != null && selectedAoeSizeFt > map.feetPerSquare;
  const rulerFeet = rulerLengthFeet(ruler, feetScale);
  const rulerPoints = ruler.cursor
    ? [...ruler.anchors, ruler.cursor]
    : [...ruler.anchors];
  const rulerLabelAt = ruler.cursor ?? ruler.anchors[ruler.anchors.length - 1] ?? null;
  // Jeton édité, dérivé du snapshot (pas une copie d'état) : disparaît du
  // tableau → la modale se referme d'elle-même (`open={token !== null}`).
  const editingToken = editingTokenId
    ? (tokens.find((t) => t.id === editingTokenId) ?? null)
    : null;

  return (
    <main className="mx-auto w-full max-w-[1200px] p-4 sm:p-6">
      <header className="mb-4 border-b border-gold-dim/30 pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-testid="map-live-back"
            onClick={() => navigate(`/map-proto/cloud/${cid}`)}
            className="rounded-pill border border-gold-dim/30 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary transition-colors duration-200 ease-base hover:border-gold-bright hover:text-gold-bright"
          >
            ← {t('map.import.back')}
          </button>
          <h1 className="font-display text-xl uppercase tracking-[0.18em] text-gold-bright">
            {map.name}
          </h1>
          <span className="rounded-pill border border-gold-dim/40 bg-gold/10 px-2 py-0.5 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright">
            {t('map.live.badge')}
          </span>
          {/* Réglages (M30) : le nom, le calibrage de grille et l'image de fond
              n'étaient éditables NULLE PART après la création — or tout le reste
              de la carte (distances, vision, AoE, lumières) en dérive. */}
          <Tooltip label={t('map.tip.openSettings')} placement="bottom" decorative>
            <button
              type="button"
              data-testid="map-live-open-settings"
              onClick={() => setSettingsOpen(true)}
              className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10"
            >
              {t('map.live.settingsButton')}
            </button>
          </Tooltip>
        </div>
        <p
          data-testid="map-live-meta"
          className="mt-1 font-mono text-[11px] text-text-tertiary"
        >
          {cid} / {mid} — {tokens.length}{' '}
          {t(
            tokens.length > 1
              ? 'map.live.metaTokenPlural'
              : 'map.live.metaTokenSingular',
          )}
        </p>
        {writeError && (
          <p
            data-testid="map-live-write-error"
            className="mt-2 rounded-md border border-crimson/40 bg-crimson/10 px-3 py-1.5 font-mono text-[11px] text-crimson"
          >
            {t('map.live.writeErrorPrefix')}
            {writeError}
          </p>
        )}
        {/* D.5 — boutons persistance fog / lights / AoE. */}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gold-dim/20 pt-3">
          <span
            data-testid="map-live-fog-count"
            className="font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary"
          >
            {t('map.live.fogLabel')} ({map.fogPolygons.length})
          </span>
          <button
            type="button"
            data-testid="map-live-add-fog-reveal"
            onClick={() => {
              void handleAddFogReveal();
            }}
            className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10"
          >
            {t('map.live.addFogReveal')}
          </button>
          <button
            type="button"
            data-testid="map-live-add-fog-mask"
            onClick={() => {
              void handleAddFogMask();
            }}
            className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10"
          >
            {t('map.live.addFogMask')}
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
            {t('map.live.clearFog')}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-gold-dim/20 pt-3">
          <span
            data-testid="map-live-lights-count"
            className="font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary"
          >
            {t('map.live.lightsLabel')} ({map.lightSources.length})
          </span>
          {LIGHT_PRESET_ORDER.map((preset) => {
            const spec = LIGHT_PRESET_FT[preset];
            // Rayon total (vive + faible) affiché en mètres FR (×0,3) pour situer
            // la taille de chaque source d'un coup d'œil. `formatMeters` prend
            // des PIEDS.
            const totalM = formatMeters(spec.brightFt + spec.dimFt);
            return (
              <button
                key={preset}
                type="button"
                // La torche garde son testid historique (e2e + test px) ; les
                // autres presets prennent `map-live-add-light-<preset>`.
                data-testid={
                  preset === 'torch'
                    ? 'map-live-add-torch'
                    : `map-live-add-light-${preset}`
                }
                onClick={() => {
                  void handleAddLight(preset);
                }}
                title={`${t('map.live.lightTooltipPrefix')}${t(spec.labelKey)}${t('map.live.lightTooltipMid')}${totalM})`}
                className="inline-flex items-center gap-1 rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10"
              >
                {/* Pastille de teinte SRD du preset → repère visuel rapide. */}
                <span
                  aria-hidden
                  style={{ backgroundColor: LIGHT_PRESETS[preset].color }}
                  className="h-2.5 w-2.5 rounded-full border border-white-8"
                />
                {t(spec.labelKey)}
              </button>
            );
          })}
          <button
            type="button"
            data-testid="map-live-clear-lights"
            onClick={() => {
              void handleClearLights();
            }}
            disabled={map.lightSources.length === 0}
            className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10 disabled:opacity-40"
          >
            {t('map.live.clearLights')}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-gold-dim/20 pt-3">
          <span
            data-testid="map-live-aoe-count"
            className="font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary"
          >
            {t('map.live.aoeLabel')} ({map.aoeTemplates.length})
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
              {t(AOE_SHAPE_LABEL_KEYS[shape])} {formatMeters(AOE_LABEL_FT[shape])}
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
            {t('map.live.clearAoe')}
          </button>
          {/* Rotation du gabarit sélectionné — apparaît dès qu'un AoE est saisi.
              Désactivée pour une sphère (orientation sans effet visuel). */}
          {selectedAoe && (
            <span
              data-testid="map-live-aoe-selection"
              className="ml-1 inline-flex items-center gap-2 rounded-pill border border-gold-dim/30 bg-gold/5 px-3 py-1"
            >
              <span className="font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright">
                {t(AOE_SHAPE_LABEL_KEYS[selectedAoe.shape])} ·{' '}
                <span data-testid="map-live-aoe-size">
                  {formatMeters(selectedAoeSizeFt)}
                </span>{' '}
                · {Math.round(selectedAoe.rotationDeg ?? 0)}°
              </span>
              <Tooltip label={t('map.tip.shrinkAoe')} placement="bottom" decorative>
                <button
                  type="button"
                  data-testid="map-live-shrink-aoe"
                  onClick={() => {
                    void handleResizeSelectedAoe(-1);
                  }}
                  disabled={!canShrinkAoe}
                  className="rounded-pill border border-gold-dim/40 px-2 py-0.5 font-mono text-[12px] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10 disabled:opacity-40"
                >
                  −
                </button>
              </Tooltip>
              <Tooltip label={t('map.tip.growAoe')} placement="bottom" decorative>
                <button
                  type="button"
                  data-testid="map-live-grow-aoe"
                  onClick={() => {
                    void handleResizeSelectedAoe(1);
                  }}
                  className="rounded-pill border border-gold-dim/40 px-2 py-0.5 font-mono text-[12px] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10"
                >
                  +
                </button>
              </Tooltip>
              <Tooltip
                label={
                  canRotate ? t('map.tip.rotateAoeCcw') : t('map.tip.sphereNoRotation')
                }
                placement="bottom"
                decorative
              >
                <button
                  type="button"
                  data-testid="map-live-rotate-ccw"
                  onClick={() => {
                    void handleRotateSelectedAoe(-AOE_ROTATE_STEP_DEG);
                  }}
                  disabled={!canRotate}
                  className="rounded-pill border border-gold-dim/40 px-2 py-0.5 font-mono text-[12px] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10 disabled:opacity-40"
                >
                  ⟲ −{AOE_ROTATE_STEP_DEG}°
                </button>
              </Tooltip>
              <Tooltip
                label={
                  canRotate ? t('map.tip.rotateAoeCw') : t('map.tip.sphereNoRotation')
                }
                placement="bottom"
                decorative
              >
                <button
                  type="button"
                  data-testid="map-live-rotate-cw"
                  onClick={() => {
                    void handleRotateSelectedAoe(AOE_ROTATE_STEP_DEG);
                  }}
                  disabled={!canRotate}
                  className="rounded-pill border border-gold-dim/40 px-2 py-0.5 font-mono text-[12px] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10 disabled:opacity-40"
                >
                  ⟳ +{AOE_ROTATE_STEP_DEG}°
                </button>
              </Tooltip>
              <Tooltip label={t('map.tip.deleteAoe')} placement="bottom" decorative>
                <button
                  type="button"
                  data-testid="map-live-delete-aoe"
                  onClick={() => {
                    void handleDeleteSelectedAoe();
                  }}
                  className="rounded-pill border border-crimson/40 px-2 py-0.5 font-title text-[10px] uppercase tracking-[0.16em] text-crimson transition-colors duration-200 ease-base hover:bg-crimson/[0.08]"
                >
                  {t('map.live.deleteAoe')}
                </button>
              </Tooltip>
            </span>
          )}
        </div>
        {/* Tokens — affordance prototype « au centre » (parité fog/light/AoE). */}
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-gold-dim/20 pt-3">
          <span
            data-testid="map-live-tokens-count"
            className="font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary"
          >
            {t('map.live.tokensLabel')} ({tokens.length})
          </span>
          <button
            type="button"
            data-testid="map-live-add-pj"
            onClick={() => {
              void handleAddToken('pj');
            }}
            className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10"
          >
            {t('map.live.addPj')}
          </button>
          <button
            type="button"
            data-testid="map-live-add-pnj"
            onClick={() => {
              void handleAddToken('pnj');
            }}
            className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10"
          >
            {t('map.live.addPnj')}
          </button>
          <Tooltip label={t('map.tip.addMonster')} decorative>
            <button
              type="button"
              data-testid="map-live-add-monster"
              onClick={() => setShowMonsterPicker(true)}
              className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10"
            >
              {t('map.live.addBestiary')}
            </button>
          </Tooltip>
          <button
            type="button"
            data-testid="map-live-clear-tokens"
            onClick={() => {
              void handleClearTokens();
            }}
            disabled={tokens.length === 0}
            className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10 disabled:opacity-40"
          >
            {t('map.live.clearTokens')}
          </button>
        </div>
        {/* Ligne de vue + voile + vue présentation. */}
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-gold-dim/20 pt-3">
          <span
            data-testid="map-live-walls-count"
            className="font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary"
          >
            {t('map.live.wallsLabel')} ({(map.walls ?? []).length})
          </span>
          <Tooltip label={t('map.tip.toggleGrid')} placement="bottom" decorative>
            <button
              type="button"
              data-testid="map-live-toggle-grid"
              onClick={() => {
                void handleToggleGrid();
              }}
              className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10"
            >
              {t('map.live.gridToggle')} {map.showGrid ? 'ON' : 'OFF'}
            </button>
          </Tooltip>
          <Tooltip
            label={
              map.showGrid
                ? t('map.tip.snapToGrid')
                : t('map.tip.snapNeedsGrid')
            }
            placement="bottom"
            decorative
          >
            <button
              type="button"
              data-testid="map-live-toggle-snap"
              onClick={() => setSnapEnabled((s) => !s)}
              disabled={!map.showGrid}
              className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10 disabled:opacity-40"
            >
              {t('map.live.snapToggle')} {snapEnabled ? 'ON' : 'OFF'}
            </button>
          </Tooltip>
          {/* « Vue joueur » (M33) : bascule locale sur l'opacité de voile de la
              vue TV. Savoir ce que la table voit AVANT de dévoiler. */}
          <Tooltip label={t('map.tip.viewAsPlayer')} placement="bottom" decorative>
            <button
              type="button"
              data-testid="map-live-toggle-player-view"
              aria-pressed={viewAsPlayer}
              onClick={() => setViewAsPlayer((v) => !v)}
              className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10"
            >
              {t('map.live.playerViewToggle')} {viewAsPlayer ? 'ON' : 'OFF'}
            </button>
          </Tooltip>
          <Tooltip label={t('map.tip.toggleFog')} placement="bottom" decorative>
            <button
              type="button"
              data-testid="map-live-toggle-fog"
              onClick={() => {
                void handleToggleFogEnabled();
              }}
              className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10"
            >
              {t('map.live.fogToggleLabel')} {map.fogEnabled ? 'ON' : 'OFF'}
            </button>
          </Tooltip>
          <Tooltip label={t('map.tip.toggleLos')} placement="bottom" decorative>
            <button
              type="button"
              data-testid="map-live-toggle-los"
              onClick={() => {
                void handleToggleLos();
              }}
              className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10"
            >
              {t('map.live.losToggle')} {map.losEnabled === true ? 'ON' : 'OFF'}
            </button>
          </Tooltip>
          <Tooltip label={t('map.tip.toggleLighting')} placement="bottom" decorative>
            <button
              type="button"
              data-testid="map-live-toggle-lighting"
              onClick={() => {
                void handleToggleLighting();
              }}
              className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10"
            >
              {t('map.live.lightingToggle')} {map.lightingEnabled ? 'ON' : 'OFF'}
            </button>
          </Tooltip>
          <button
            type="button"
            data-testid="map-live-open-tv"
            onClick={() => navigate(`/map-proto/cloud/${cid}/maps/${mid}/tv`)}
            className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10"
          >
            {t('map.live.tvView')} ▸
          </button>
        </div>
        {/* Mesure de distance — outil MJ éphémère (clics sur le fond = ancres). */}
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-gold-dim/20 pt-3">
          <span className="font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
            {t('map.live.measureLabel')}
          </span>
          <Tooltip label={t('map.tip.toggleMeasure')} placement="bottom" decorative>
            <button
              type="button"
              data-testid="map-live-toggle-measure"
              onClick={handleToggleMeasure}
              aria-pressed={measureMode}
              className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10 aria-pressed:bg-gold/15"
            >
              {t('map.live.measureToggle')} {measureMode ? 'ON' : 'OFF'}
            </button>
          </Tooltip>
          {measureMode && (
            <>
              <span
                data-testid="map-live-ruler-total"
                className="rounded-pill border border-gold-dim/30 bg-gold/5 px-3 py-1 font-mono text-[11px] text-gold-bright"
              >
                {t('map.live.distancePrefix')}
                {formatMeters(rulerFeet)}
              </span>
              <button
                type="button"
                data-testid="map-live-clear-measure"
                onClick={handleClearMeasure}
                disabled={ruler.anchors.length === 0}
                className="rounded-pill border border-gold-dim/40 px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em] text-gold-bright transition-colors duration-200 ease-base hover:bg-gold/10 disabled:opacity-40"
              >
                {t('map.live.clearMeasure')}
              </button>
              <span className="font-serif text-[11px] text-text-tertiary">
                {t('map.live.measureHint')}
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
            fogOpacity={viewAsPlayer ? FOG_OPACITY_PLAYER : FOG_OPACITY_DM}
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
            const portrait = token.imageDataUrl ?? undefined;
            const clipId = `live-tok-clip-${token.id}`;
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
                {portrait ? (
                  // Portrait recadré en disque. L'image EST la cible de clic
                  // (cliquable dans la zone détourée) → tap/drag inchangés ;
                  // la couleur du jeton devient l'anneau (indice de faction).
                  <>
                    <clipPath id={clipId}>
                      <circle cx={pos.x} cy={pos.y} r={TOKEN_RADIUS} />
                    </clipPath>
                    <image
                      data-testid={`map-live-token-image-${token.id}`}
                      href={portrait}
                      x={pos.x - TOKEN_RADIUS}
                      y={pos.y - TOKEN_RADIUS}
                      width={TOKEN_RADIUS * 2}
                      height={TOKEN_RADIUS * 2}
                      preserveAspectRatio="xMidYMid slice"
                      clipPath={`url(#${clipId})`}
                      opacity={isDragging ? 0.8 : 1}
                    />
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={TOKEN_RADIUS}
                      fill="none"
                      stroke={token.color}
                      strokeWidth={3}
                      pointerEvents="none"
                    />
                  </>
                ) : (
                  <>
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
                  </>
                )}
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

      <TokenEditModal
        token={editingToken}
        imageUrl={editingToken ? (editingToken.imageDataUrl ?? null) : null}
        onClose={() => setEditingTokenId(null)}
        onSave={(patch) => {
          void handleSaveToken(patch);
        }}
        onUploadImage={(dataUrl) => {
          void handleUploadTokenImage(dataUrl);
        }}
        onRemoveImage={() => {
          void handleRemoveTokenImage();
        }}
        onDuplicate={() => {
          void handleDuplicateToken();
        }}
        onDelete={() => {
          void handleDeleteEditingToken();
        }}
        carriedLight={
          editingToken
            ? carriedLightPreset(map.lightSources, editingToken.id)
            : null
        }
        onCarriedLightChange={(preset) => {
          void handleSetCarriedLight(preset);
        }}
      />

      <MapSettingsModal
        map={settingsOpen ? map : null}
        onClose={() => setSettingsOpen(false)}
        onSave={(patch) => {
          void handleSaveSettings(patch);
        }}
      />

      <MonsterPickerModal
        open={showMonsterPicker}
        onClose={() => setShowMonsterPicker(false)}
        onPick={(monster) => {
          void handleAddMonsterToken(monster);
        }}
      />
    </main>
  );
}
