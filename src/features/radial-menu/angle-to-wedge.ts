/**
 * Géométrie pure du radial FAB (plan 11, step 20).
 *
 * Cette couche est **déterministe et sans état** : elle convertit un delta de
 * pointeur (px, repère écran y-vers-le-bas) en un index de wedge, ou `null` si
 * le pointeur est dans la zone morte centrale ou hors de l'arc.
 *
 * Elle est livrée AVANT le geste press-hold-drag (qui reste à valider en main
 * par Adrien — « le geste est l'âme de l'app ») : le menu tactile docké de
 * cette livraison ne consomme PAS ces fonctions, mais la future couche
 * gestuelle s'appuiera dessus sans réécriture. Garder pure = testable seule.
 *
 * Convention d'angle « math » : 0° = droite, 90° = haut, 180° = gauche. L'arc
 * par défaut couvre l'hémisphère supérieur de 180° (gauche) à 0° (droite),
 * `index 0 ↔ arcStartDeg`.
 */

export interface RadialLayout {
  /** Nombre de wedges à disposer sur l'arc. */
  count: number;
  /** Angle de départ de l'arc (deg, convention math). Défaut 180 (gauche). */
  arcStartDeg?: number;
  /** Angle de fin de l'arc (deg, convention math). Défaut 0 (droite). */
  arcEndDeg?: number;
  /** Demi-fenêtre de détection autour du centre d'un wedge (deg). Défaut 30. */
  toleranceDeg?: number;
  /** En-deçà de cette distance au centre du FAB (px), aucun wedge. Défaut 30. */
  deadZonePx?: number;
}

const DEFAULT_ARC_START = 180;
const DEFAULT_ARC_END = 0;
const DEFAULT_TOLERANCE = 30;
const DEFAULT_DEAD_ZONE = 30;

/**
 * Centres des `count` wedges répartis régulièrement sur `[arcStart, arcEnd]`.
 * `index 0` correspond toujours à `arcStart`. Avec 5 wedges sur 180°→0° :
 * `[180, 135, 90, 45, 0]`.
 */
export function wedgeCentersDeg(
  count: number,
  arcStartDeg: number = DEFAULT_ARC_START,
  arcEndDeg: number = DEFAULT_ARC_END,
): number[] {
  if (count <= 0) return [];
  if (count === 1) return [(arcStartDeg + arcEndDeg) / 2];
  const step = (arcEndDeg - arcStartDeg) / (count - 1);
  return Array.from({ length: count }, (_, i) => arcStartDeg + step * i);
}

/**
 * Normalise un delta (repère écran, y-vers-le-bas) en angle convention math
 * (deg, `[0, 360)`, 90° = haut). On inverse `dy` pour passer de l'écran
 * (y descendant) au plan math (y montant).
 */
export function deltaToAngleDeg(dx: number, dy: number): number {
  const deg = (Math.atan2(-dy, dx) * 180) / Math.PI;
  return deg < 0 ? deg + 360 : deg;
}

/** Écart angulaire signé minimal entre deux angles (deg), dans `[-180, 180]`. */
function angularDelta(a: number, b: number): number {
  let d = (a - b) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

/**
 * Mappe un delta de pointeur sur l'index du wedge ciblé, ou `null`.
 *
 * `null` si : la distance est sous la zone morte, OU le wedge le plus proche
 * dépasse la tolérance angulaire (pointeur hors de l'arc, ex. vers le bas).
 */
export function pointerToWedge(
  dx: number,
  dy: number,
  layout: RadialLayout,
): number | null {
  const { count } = layout;
  if (count <= 0) return null;

  const deadZonePx = layout.deadZonePx ?? DEFAULT_DEAD_ZONE;
  if (Math.hypot(dx, dy) < deadZonePx) return null;

  const arcStartDeg = layout.arcStartDeg ?? DEFAULT_ARC_START;
  const arcEndDeg = layout.arcEndDeg ?? DEFAULT_ARC_END;
  const toleranceDeg = layout.toleranceDeg ?? DEFAULT_TOLERANCE;

  const angle = deltaToAngleDeg(dx, dy);
  const centers = wedgeCentersDeg(count, arcStartDeg, arcEndDeg);

  let bestIndex = -1;
  let bestDiff = Number.POSITIVE_INFINITY;
  centers.forEach((center, i) => {
    const diff = Math.abs(angularDelta(angle, center));
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIndex = i;
    }
  });

  return bestDiff <= toleranceDeg ? bestIndex : null;
}
