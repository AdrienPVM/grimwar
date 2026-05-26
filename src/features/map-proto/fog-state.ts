/**
 * Fog of war — pure functions module (CHANTIER E nuit 3).
 *
 * Le rendu (SVG `<mask>`) vit dans `fog-layer.tsx`, l'état (liste de
 * polygones de révélation/mask) vit dans `MapProtoScreen` qui pousse les
 * mutations via ces helpers. Tout est *pur* pour rester unit-testable —
 * pas de side-effect, pas d'I/O.
 *
 * Modèle conforme au schéma `FogPolygon` de `@/shared/types/map` :
 *   - `kind: 'reveal'` éclaircit une zone (le brouillard est retiré ici).
 *   - `kind: 'mask'` re-masque (priorité sur reveal dans le rendu).
 *
 * Le rendu applique les polygones dans l'ordre d'arrivée : reveal/mask
 * successifs s'écrasent (last-write-wins visuel). Pour la phase prototype,
 * on garde le tableau en mémoire ; quand on migrera vers Firestore, ce
 * tableau sera persisté inline sur `MapMeta.fogPolygons`.
 */
import type { FogPolygon, MapPosition } from '@/shared/types/map';

/**
 * Génère un polygone régulier approximant un cercle. 24 segments est un
 * compromis lisible (cercle visuellement rond à zoom 1, ~24 sommets =
 * payload Firestore raisonnable).
 *
 * Les coordonnées renvoyées sont en pixels image-source (les mêmes que
 * `MapPosition`). Pas de garde sur radius=0 — un cercle dégénéré reste
 * un polygone valide (3+ points superposés), donc Zod l'accepte ; à
 * l'appelant de prévenir si nécessaire.
 */
export function createCirclePolygon(
  center: MapPosition,
  radius: number,
  segments = 24,
): readonly MapPosition[] {
  if (segments < 3) {
    throw new Error(`createCirclePolygon: segments must be >= 3, got ${segments}`);
  }
  const points: MapPosition[] = [];
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    points.push({
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    });
  }
  return points;
}

/**
 * Identifiant déterministe pour un polygone de révélation lié à un token.
 * Pattern stable → idempotence : à chaque mouvement, on remplace l'entrée
 * existante au lieu d'empiler des cercles (mémoire et coût Firestore).
 */
export function tokenRevealId(tokenId: string): string {
  return `auto-reveal-${tokenId}`;
}

/**
 * Met à jour la liste de fog polygons pour refléter la position courante
 * d'un token PJ : retire l'ancien cercle de révélation lié à ce token et
 * en ajoute un neuf centré sur la nouvelle position.
 *
 * Si `radius` est 0, ne touche pas — un token sans rayon ne révèle rien
 * (cas valide : marker ou PJ aveugle).
 */
export function revealAroundToken(
  fog: readonly FogPolygon[],
  tokenId: string,
  position: MapPosition,
  radius: number,
): readonly FogPolygon[] {
  const id = tokenRevealId(tokenId);
  const withoutOld = fog.filter((p) => p.id !== id);
  if (radius <= 0) return withoutOld;
  const polygon: FogPolygon = {
    id,
    points: [...createCirclePolygon(position, radius)],
    kind: 'reveal',
    createdAt: null,
  };
  return [...withoutOld, polygon];
}

/**
 * Retire tous les masks et reveals — équivalent « Tout révéler ».
 * Le rendu ne masque alors plus rien (tout est éclairé).
 */
export function clearAllFog(_fog: readonly FogPolygon[]): readonly FogPolygon[] {
  // Le paramètre fog n'est volontairement pas utilisé : « tout révéler »
  // est un reset complet, pas un append d'un grand reveal.
  return [];
}

/**
 * « Tout remasquer » — purge la liste pour que le rendu repose à 100%
 * sur le mask opaque par défaut. Symétrique de `clearAllFog`.
 */
export function maskAllFog(_fog: readonly FogPolygon[]): readonly FogPolygon[] {
  return [];
}

/**
 * Ajoute un polygone de révélation manuel (mode MJ peinture). L'`id` est
 * généré via un prefix + timestamp pour rester unique sans dépendance UUID.
 */
export function appendManualReveal(
  fog: readonly FogPolygon[],
  points: readonly MapPosition[],
  now = Date.now(),
): readonly FogPolygon[] {
  if (points.length < 3) return fog;
  return [
    ...fog,
    {
      id: `manual-reveal-${now}-${fog.length}`,
      points: [...points],
      kind: 'reveal',
      createdAt: null,
    },
  ];
}

/**
 * Ajoute un polygone de mask manuel (mode MJ gomme). Même contrat que
 * `appendManualReveal`.
 */
export function appendManualMask(
  fog: readonly FogPolygon[],
  points: readonly MapPosition[],
  now = Date.now(),
): readonly FogPolygon[] {
  if (points.length < 3) return fog;
  return [
    ...fog,
    {
      id: `manual-mask-${now}-${fog.length}`,
      points: [...points],
      kind: 'mask',
      createdAt: null,
    },
  ];
}

/**
 * Sérialise une liste de points en attribute `points="x,y x,y …"` pour
 * `<polygon>` ou `<path>`. Helper local pour le rendu SVG.
 */
export function pointsToSvgString(points: readonly MapPosition[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(' ');
}
