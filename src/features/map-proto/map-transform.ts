import { MAP_VIEWBOX_H, MAP_VIEWBOX_W } from './map-viewport';

/**
 * Zoom et panoramique d'une vue de carte (M32 de l'audit de malléabilité).
 *
 * Le prototype jetable savait déjà zoomer et se déplacer (`map-proto-screen`) ;
 * la capacité s'est PERDUE au passage à Firestore, où les deux vues persistées
 * ont figé leur `viewBox` à `0 0 1000 700`. Sur une carte de donjon entière
 * affichée dans un écran de téléphone, un jeton fait quelques pixels : la salle
 * du trône est illisible.
 *
 * Modèle : on ne touche à AUCUNE géométrie — ni jetons, ni AoE, ni murs. Seul
 * le `viewBox` du SVG bouge, ce qui laisse `getScreenCTM()` faire la conversion
 * écran → carte pour tous les gestes existants (règle, glisser de jeton, AoE).
 *
 * État LOCAL non persisté, comme l'aimant à la grille et la règle : chacun
 * cadre son écran comme il veut, personne ne recadre celui des autres. Zéro
 * écriture Firestore, zéro champ de schéma.
 */

/** Cadrage courant : facteur de zoom + coin haut-gauche de la fenêtre visible. */
export interface MapTransform {
  readonly zoom: number;
  readonly panX: number;
  readonly panY: number;
}

/** Vue entière, non déplacée — l'état d'origine des deux écrans. */
export const IDENTITY_TRANSFORM: MapTransform = { zoom: 1, panX: 0, panY: 0 };

/**
 * Plancher à 1 : on ne dézoome jamais SOUS la carte entière. En dessous, le
 * fond ne remplit plus le cadre et la vue devient une image flottant dans du
 * noir — un recadrage qu'aucun MJ ne demande.
 */
export const MAP_ZOOM_MIN = 1;
/** Plafond : ×6 rend une case de 70 px large comme un pouce sur un téléphone. */
export const MAP_ZOOM_MAX = 6;
/** Facteur d'un cran de zoom (≈ 6 crans du plancher au plafond). */
export const MAP_ZOOM_STEP = 1.35;

function clampNumber(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/**
 * Ramène un cadrage dans les bornes : zoom entre plancher et plafond, puis
 * fenêtre visible entièrement contenue dans la carte. Le clamp du pan dépend du
 * zoom — d'où l'ordre, et d'où le fait que tout passe par cette fonction.
 */
export function clampTransform(transform: MapTransform): MapTransform {
  const zoom = clampNumber(transform.zoom, MAP_ZOOM_MIN, MAP_ZOOM_MAX);
  const visibleW = MAP_VIEWBOX_W / zoom;
  const visibleH = MAP_VIEWBOX_H / zoom;
  return {
    zoom,
    panX: clampNumber(transform.panX, 0, MAP_VIEWBOX_W - visibleW),
    panY: clampNumber(transform.panY, 0, MAP_VIEWBOX_H - visibleH),
  };
}

/**
 * Zoome d'un facteur en gardant le CENTRE de la vue immobile. Zoomer autour du
 * coin haut-gauche donnerait l'impression que la carte fuit vers le bas-droite
 * à chaque cran — le centre est le point que l'œil suit.
 */
export function zoomBy(transform: MapTransform, factor: number): MapTransform {
  const current = clampTransform(transform);
  const nextZoom = clampNumber(
    current.zoom * factor,
    MAP_ZOOM_MIN,
    MAP_ZOOM_MAX,
  );
  const centerX = current.panX + MAP_VIEWBOX_W / current.zoom / 2;
  const centerY = current.panY + MAP_VIEWBOX_H / current.zoom / 2;
  return clampTransform({
    zoom: nextZoom,
    panX: centerX - MAP_VIEWBOX_W / nextZoom / 2,
    panY: centerY - MAP_VIEWBOX_H / nextZoom / 2,
  });
}

/** Déplace la fenêtre visible d'un delta EXPRIMÉ EN UNITÉS DE CARTE. */
export function panBy(
  transform: MapTransform,
  dx: number,
  dy: number,
): MapTransform {
  return clampTransform({
    zoom: transform.zoom,
    panX: transform.panX + dx,
    panY: transform.panY + dy,
  });
}

/** Chaîne `viewBox` prête pour l'attribut SVG. */
export function toViewBox(transform: MapTransform): string {
  const { zoom, panX, panY } = clampTransform(transform);
  return `${panX} ${panY} ${MAP_VIEWBOX_W / zoom} ${MAP_VIEWBOX_H / zoom}`;
}

/** Pourcentage entier affiché sur le bouton de zoom (`100 %`, `135 %`…). */
export function zoomPercent(transform: MapTransform): number {
  return Math.round(transform.zoom * 100);
}
