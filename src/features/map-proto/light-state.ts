/**
 * Lumière dynamique — pure functions module (CHANTIER F nuit 3).
 *
 * Mirror exact de `fog-state.ts` côté lumière : `LightSource[]` est l'état,
 * cette module fournit les helpers purs (presets, création, attache à
 * token, résolution de position) et le rendu vit dans `light-layer.tsx`.
 *
 * Rayons en pixels image-source pour le prototype (les conventions SRD
 * en pieds vivent dans les commentaires des presets — la conversion px↔ft
 * dépendra du `feetPerSquare × gridSize` de chaque map en phase Firestore).
 */
import type { LightSource, MapPosition } from '@/shared/types/map';

export type LightPresetKey = 'torch' | 'lantern' | 'light-spell' | 'candle' | 'sunlight';

/**
 * Conventions SRD (en pieds) → pixels prototype (1 case 50px = 5 ft).
 *  - Torche : 20 ft vive + 20 ft faible → 200 / 200 px
 *  - Lanterne capuchonnée : 30 ft + 30 ft → 300 / 300 px
 *  - Sort Lumière (cantrip) : 20 ft + 20 ft → 200 / 200 px (identique torche)
 *  - Bougie : 5 ft + 5 ft → 50 / 50 px
 *  - Soleil : 60 ft + 60 ft (en pratique, illimité au-delà de la carte) → 1000 / 1000 px
 *
 * Couleur par défaut : ambre chaud type flamme. Le sort « Lumière » est
 * plus blanc-cool ; le soleil neutre.
 */
export const LIGHT_PRESETS: Record<
  LightPresetKey,
  { brightRadius: number; dimRadius: number; color: string }
> = {
  torch: { brightRadius: 200, dimRadius: 200, color: '#fbbf24' },
  lantern: { brightRadius: 300, dimRadius: 300, color: '#fde68a' },
  'light-spell': { brightRadius: 200, dimRadius: 200, color: '#e0e7ff' },
  candle: { brightRadius: 50, dimRadius: 50, color: '#fcd34d' },
  sunlight: { brightRadius: 1000, dimRadius: 1000, color: '#fffbeb' },
};

/**
 * Crée une source de lumière à partir d'un preset.
 *
 * `anchor` détermine si la source est :
 *   - `{ type: 'static', position }` — placée à un point fixe
 *   - `{ type: 'token', tokenId }` — attachée à un token (suit le mouvement)
 *
 * La règle du schéma (`position XOR attachedTokenId`) est garantie ici.
 */
export type LightAnchor =
  | { readonly type: 'static'; readonly position: MapPosition }
  | { readonly type: 'token'; readonly tokenId: string };

export function createLightFromPreset(
  id: string,
  preset: LightPresetKey,
  anchor: LightAnchor,
): LightSource {
  const params = LIGHT_PRESETS[preset];
  const base = {
    id,
    brightRadius: params.brightRadius,
    dimRadius: params.dimRadius,
    color: params.color,
    preset,
  };
  if (anchor.type === 'static') {
    return { ...base, position: anchor.position };
  }
  return { ...base, attachedTokenId: anchor.tokenId };
}

/**
 * Ajoute une source statique. L'`id` est généré localement par
 * timestamp + index pour éviter les collisions sans dépendance UUID.
 */
export function addStaticLight(
  lights: readonly LightSource[],
  position: MapPosition,
  preset: LightPresetKey = 'torch',
  now = Date.now(),
): readonly LightSource[] {
  const id = `light-static-${now}-${lights.length}`;
  return [...lights, createLightFromPreset(id, preset, { type: 'static', position })];
}

/**
 * Attache une lumière à un token. Si le token a déjà une lumière attachée,
 * la remplace (un seul slot de lumière par token, comme tenir une torche).
 *
 * Si `preset` est `null` ou que le token a déjà une lumière du même preset,
 * l'opération devient un retrait (toggle on/off ergonomie MJ).
 */
export function attachLightToToken(
  lights: readonly LightSource[],
  tokenId: string,
  preset: LightPresetKey,
  now = Date.now(),
): readonly LightSource[] {
  const existing = lights.find((l) => l.attachedTokenId === tokenId);
  if (existing && existing.preset === preset) {
    // Re-clic sur même preset = retire la lumière (toggle).
    return lights.filter((l) => l.id !== existing.id);
  }
  const without = existing ? lights.filter((l) => l.id !== existing.id) : lights;
  const id = `light-token-${tokenId}-${now}`;
  return [
    ...without,
    createLightFromPreset(id, preset, { type: 'token', tokenId }),
  ];
}

export function removeLight(
  lights: readonly LightSource[],
  lightId: string,
): readonly LightSource[] {
  return lights.filter((l) => l.id !== lightId);
}

/**
 * Résout la position effective d'une lumière à l'instant courant.
 * Une source statique a une position fixe ; une source attachée à un
 * token suit la position du token. Si le token n'existe plus, renvoie
 * `null` (le rendu ignore les lumières orphelines).
 */
export function resolveLightPosition(
  light: LightSource,
  tokens: ReadonlyMap<string, MapPosition>,
): MapPosition | null {
  if (light.position) return light.position;
  if (light.attachedTokenId) {
    return tokens.get(light.attachedTokenId) ?? null;
  }
  return null;
}

/**
 * Génère un id stable pour le polygone de révélation lié à une lumière.
 * Pattern miroir de `tokenRevealId` côté fog → le useEffect d'intégration
 * peut purger les reveals orphelins par préfixe.
 */
export function lightRevealId(lightId: string): string {
  return `light-reveal-${lightId}`;
}

/**
 * Rayon total révélé par une lumière = brightRadius + dimRadius. La
 * révélation se fait sur tout le cercle (vive + faible) ; la distinction
 * visuelle (vive vs faible) vit côté rendu (gradient radial).
 */
export function lightRevealRadius(light: LightSource): number {
  return light.brightRadius + light.dimRadius;
}
