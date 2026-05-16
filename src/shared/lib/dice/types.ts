/**
 * Types du moteur de dés — plan 12.
 *
 * Le shape `RollResult` est forward-compat avec plan 12.5 : `mode` est ici
 * forcé à `'digital'`. Plan 12.5 élargira le type union à `'digital' | 'physical'`
 * sans casser les paths digitaux existants.
 */

export type Advantage = 'normal' | 'advantage' | 'disadvantage';

/**
 * Un terme de dés : N dés à F faces, optionnellement avec keep-highest/lowest.
 *  - `1d20` → `{ count: 1, sides: 20 }`
 *  - `2d20kh1` (advantage) → `{ count: 2, sides: 20, kh: 1 }`
 *  - `2d20kl1` (disadvantage) → `{ count: 2, sides: 20, kl: 1 }`
 *  - `8d6` (boule de feu) → `{ count: 8, sides: 6 }`
 */
export interface DiceTerm {
  count: number;
  sides: number;
  /** keep-highest N (mutuellement exclusif avec `kl`). */
  kh?: number;
  /** keep-lowest N. */
  kl?: number;
}

/** AST d'une expression de dés : somme de termes + modificateur plat. */
export interface DiceAst {
  terms: DiceTerm[];
  modifier: number;
}

export type RollKind =
  | 'attack'
  | 'damage'
  | 'check'
  | 'save'
  | 'init'
  | 'death-save'
  | 'cantrip-attack'
  | 'custom';

/**
 * Mode de dés. En plan 12 (digital), forcé à `'digital'`. Plan 12.5 élargit à
 * `'digital' | 'physical'` — le shape reste compatible.
 */
export type DiceMode = 'digital';

/**
 * Résultat unifié d'un jet — utilisé par le pivot, l'historique Dexie, le toast
 * et (plan 22) l'event-logger. Un seul shape pour les deux modes.
 */
export interface RollResult {
  kind: RollKind;
  label: string;
  mode: DiceMode;
  /** Spec demandée — utile pour réafficher la formule (`1d20+5`) ou pour le
   * mode physique (plan 12.5) qui prompt par DiceTerm. */
  dice: DiceTerm[];
  /** Toutes les faces rollées (digital) ou saisies (physique, plan 12.5). */
  rawFaces: number[];
  /** Sous-ensemble retenu après application des `kh` / `kl` (advantage). */
  keptFaces: number[];
  /** Modificateur effectif (post-exhaustion / proficiency / etc.). */
  modifier: number;
  total: number;
  crit: boolean;
  fumble: boolean;
  advantage: Advantage;
  /** Identifiant du personnage qui a lancé. Empty string si N/A. */
  characterId: string;
  timestamp: number;
}
