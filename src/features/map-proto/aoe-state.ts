/**
 * AoE templates — pure functions module (CHANTIER G nuit 3).
 *
 * Pose des gabarits de zone d'effet (sphère, cône, ligne, cube) sur le
 * prototype carte. Schéma `AoeTemplate` déjà posé en CHANTIER D ; ce
 * module fournit les helpers de création/mutation et le rendu vit dans
 * `aoe-layer.tsx`.
 *
 * Scope CHANTIER G — assumé :
 *   - AoE templates côté map seulement.
 *   - 4 formes SRD (sphere/cone/line/cube).
 *   - Placement au clic au centre du curseur, dimensions par défaut.
 *
 * Scope CHANTIER G — DIFFÉRÉ explicitement (cf. PR / DEBT) :
 *   - Champ `areaOfEffect` sur le schéma spell + extraction des 30 sorts
 *     AoE majeurs SRD.
 *   - Bouton « Placer sur la carte » dans `SpellDetailModal`.
 *   - Mécanisme « map active » (Zustand global ou champ profil).
 *   - Rotation interactive, drag-to-resize.
 *
 * Le pipeline « sort → AoE » sera reposé quand la map sera migrée vers
 * Firestore (post-prototype). Le schéma `AoeTemplate.spellSlug?` est déjà
 * prêt à recevoir la liaison.
 */
import type { AoeTemplate, MapPosition } from '@/shared/types/map';

export type AoeShape = AoeTemplate['shape'];

/**
 * Dimensions par défaut SRD à 1 case 50 px = 5 ft.
 *   - sphere : Boule de feu = rayon 20 ft → 200 px.
 *   - cone : Souffle = 15 ft → 150 px de profondeur ; angle SRD = 53.13°
 *           (ratio largeur/longueur = 1:1 à la pointe).
 *   - line : Foudre = 100 ft × 5 ft → 1000 × 50 px. On utilise 600 × 50
 *           pour rester lisible à 1× zoom.
 *   - cube : Mur de feu segment = 5 ft cube → 50 px (trop petit) ;
 *           on utilise 200 px = 20 ft pour rester lisible (Onde de tonnerre
 *           cube 15 ft, Brume mortelle sphère 20 ft → cube 200 px raisonnable).
 *
 * Format de `dimensions` calqué sur le schéma Zod (`Record<string, number>`)
 * — validation au consommateur (rendu).
 */
export const DEFAULT_AOE_DIMENSIONS: Record<AoeShape, Record<string, number>> = {
  sphere: { radius: 200 },
  cone: { radius: 150, angleDeg: 53.13 },
  line: { length: 600, width: 50 },
  cube: { side: 200 },
};

/**
 * Clés de `dimensions` exprimées en PIEDS (à convertir en px au rendu via
 * l'échelle de la carte). `angleDeg` en est exclue : c'est un angle, pas une
 * longueur — elle ne se met jamais à l'échelle.
 */
const FEET_DIMENSION_KEYS = new Set(['radius', 'length', 'width', 'side']);

/**
 * Convertit les dimensions d'un AoE de PIEDS vers PIXELS viewBox.
 *
 * Le schéma `AoeTemplate.dimensions` est canoniquement en pieds (cf. `map.ts`),
 * mais `aoe-layer.tsx` trace en pixels. `feetScale` = px par pied de la carte
 * (`gridSize / feetPerSquare`) ; on multiplie chaque longueur, en laissant les
 * angles intacts. Un `feetScale` non positif (carte dégénérée) laisse les
 * dimensions telles quelles (pas de division/multiplication absurde).
 */
export function scaleAoeDimensions(
  dimensions: Record<string, number>,
  feetScale: number,
): Record<string, number> {
  if (feetScale <= 0) return { ...dimensions };
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(dimensions)) {
    out[key] = FEET_DIMENSION_KEYS.has(key) ? value * feetScale : value;
  }
  return out;
}

/** Couleurs par défaut par forme (overrides plus tard, par sort). */
export const DEFAULT_AOE_COLORS: Record<AoeShape, string> = {
  sphere: '#fb7185', // rose feu (Boule de feu, Souffle de glace…)
  cone: '#60a5fa', // bleu froid (Cône de froid, Souffle d'haleine…)
  line: '#facc15', // jaune électrique (Foudre, Trait…)
  cube: '#a78bfa', // violet (Onde de tonnerre, Mur de force…)
};

/**
 * Crée un template AoE. Les dimensions sont les defaults sauf override
 * explicite. `pinned` défaut `true` (l'AoE reste à l'écran jusqu'au
 * retrait manuel — la version « éphémère par défaut » serait perturbante
 * pour le MJ qui pose le template pour montrer aux joueurs).
 */
export function createAoe(
  id: string,
  shape: AoeShape,
  position: MapPosition,
  options?: {
    readonly dimensions?: Record<string, number>;
    readonly pinned?: boolean;
    readonly rotationDeg?: number;
    readonly spellSlug?: string;
    readonly sourceCharacterId?: string;
  },
): AoeTemplate {
  return {
    id,
    shape,
    position,
    dimensions: options?.dimensions ?? DEFAULT_AOE_DIMENSIONS[shape],
    pinned: options?.pinned ?? true,
    rotationDeg: options?.rotationDeg ?? 0,
    ...(options?.spellSlug ? { spellSlug: options.spellSlug } : {}),
    ...(options?.sourceCharacterId
      ? { sourceCharacterId: options.sourceCharacterId }
      : {}),
  };
}

export function addAoe(
  aoes: readonly AoeTemplate[],
  shape: AoeShape,
  position: MapPosition,
  now = Date.now(),
): readonly AoeTemplate[] {
  const id = `aoe-${shape}-${now}-${aoes.length}`;
  return [...aoes, createAoe(id, shape, position)];
}

export function removeAoe(
  aoes: readonly AoeTemplate[],
  id: string,
): readonly AoeTemplate[] {
  return aoes.filter((a) => a.id !== id);
}

export function rotateAoe(
  aoes: readonly AoeTemplate[],
  id: string,
  deltaDeg: number,
): readonly AoeTemplate[] {
  return aoes.map((a) => {
    if (a.id !== id) return a;
    const current = a.rotationDeg ?? 0;
    let next = (current + deltaDeg) % 360;
    if (next < 0) next += 360;
    return { ...a, rotationDeg: next };
  });
}

export function clearAoes(_aoes: readonly AoeTemplate[]): readonly AoeTemplate[] {
  return [];
}

/**
 * Clé de la dimension « principale » redimensionnable, par forme :
 *   - sphere / cone → `radius` (portée du gabarit)
 *   - line          → `length` (l'épaisseur `width` reste fixe)
 *   - cube          → `side`
 * `Record<AoeShape, …>` force la complétude au compile-time : ajouter une forme
 * sans clé principale fait échouer le typecheck (même garde côté service).
 */
export const AOE_PRIMARY_DIMENSION_KEY: Record<AoeShape, string> = {
  sphere: 'radius',
  cone: 'radius',
  line: 'length',
  cube: 'side',
};

/** Valeur (en pieds) de la dimension principale d'un AoE — pour l'étiquette. */
export function aoePrimaryDimensionFt(
  shape: AoeShape,
  dimensions: Record<string, number>,
): number {
  return dimensions[AOE_PRIMARY_DIMENSION_KEY[shape]] ?? 0;
}

/**
 * Redimensionne (version tableau) la dimension principale d'un AoE de `deltaFt`
 * pieds, plancher `minFt` (on ne descend pas sous une case). L'angle d'un cône
 * et l'épaisseur d'une ligne sont préservés — seule la portée bouge. Jumelle
 * pure de `resizeAoeTemplate` (service) — cf. note layering sur `rotateAoe`.
 */
export function resizeAoe(
  aoes: readonly AoeTemplate[],
  id: string,
  deltaFt: number,
  minFt = 5,
): readonly AoeTemplate[] {
  return aoes.map((a) => {
    if (a.id !== id) return a;
    const key = AOE_PRIMARY_DIMENSION_KEY[a.shape];
    const current = a.dimensions[key] ?? 0;
    const next = Math.max(minFt, current + deltaFt);
    return { ...a, dimensions: { ...a.dimensions, [key]: next } };
  });
}

/**
 * Construit la liste de points d'un cône isocèle en partant de l'origine.
 *   - longueur `radius` (du sommet au milieu de la base) ;
 *   - angle d'ouverture total `angleDeg` (SRD : cone = 53.13° par défaut) ;
 *   - orientation par défaut : pointe vers la droite (axe X positif).
 *
 * Renvoie 3 points : [sommet, coin base haut, coin base bas].
 * Utilisé par `aoe-layer.tsx`.
 */
export function buildConePoints(
  radius: number,
  angleDeg: number,
): readonly MapPosition[] {
  const half = (angleDeg * Math.PI) / 360; // demi-angle en rad
  const baseY = radius * Math.tan(half);
  return [
    { x: 0, y: 0 },
    { x: radius, y: -baseY },
    { x: radius, y: baseY },
  ];
}

/**
 * Construit la liste de points d'une ligne rectangulaire orientée vers
 * l'axe X positif depuis l'origine. `length` × `width` (width = épaisseur
 * dans l'axe Y, centrée sur 0).
 */
export function buildLinePoints(
  length: number,
  width: number,
): readonly MapPosition[] {
  const halfW = width / 2;
  return [
    { x: 0, y: -halfW },
    { x: length, y: -halfW },
    { x: length, y: halfW },
    { x: 0, y: halfW },
  ];
}

/**
 * Construit la liste de points d'un carré (vue de dessus) centré sur
 * l'origine, côté `side`.
 */
export function buildCubePoints(side: number): readonly MapPosition[] {
  const h = side / 2;
  return [
    { x: -h, y: -h },
    { x: h, y: -h },
    { x: h, y: h },
    { x: -h, y: h },
  ];
}
