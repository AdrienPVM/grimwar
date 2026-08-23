/**
 * Types du moteur de dés — plan 12 (digital) + plan 12.5 (physique).
 *
 * Le shape `RollResult` est partagé : `mode: 'digital' | 'physical'` distingue
 * les jets roulés par l'app et les jets saisis depuis des vrais dés.
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
  /**
   * Sens du terme dans la somme : `1` (défaut, absent) ou `-1`. Le 5e retire
   * des dés autant qu'il en ajoute — Fardeau (`1d20-1d4`), Malédiction, pénalité
   * de conditions maison. Sans ce champ, ces mécaniques étaient inexprimables :
   * le parseur refusait catégoriquement un terme de dés précédé d'un moins.
   *
   * Le tirage et les `kh`/`kl` ignorent le signe — on lance 1d4 normalement,
   * c'est la SOMME qui le soustrait. Un « garder le plus haut » sur un terme
   * soustractif garde donc bien le dé le plus haut, qu'on retranche ensuite.
   */
  sign?: 1 | -1;
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
 * Mode de dés. Plan 12 a livré `'digital'` ; plan 12.5 ajoute `'physical'`.
 *
 * Le type vit côté `dice/types.ts` (proche du shape de résultat). Le helper
 * `effectiveDiceMode(user, campaign)` qui résout le mode applicable vit côté
 * `rules/dice-mode.ts` (proche de la règle).
 */
export type DiceMode = 'digital' | 'physical';

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
  /**
   * Slug de compétence (plan 22.2) — renseigné UNIQUEMENT par les jets de
   * compétence (`skills-list`), pour que l'event-logger incrémente
   * `stats.skillUses[skillId]`. Optionnel : absent sur attaque / sauvegarde /
   * dégâts / init. C'est un identifiant machine (slug), jamais affiché — pas
   * concerné par l'i18n. Non persisté dans l'historique Dexie.
   */
  skillId?: string;
  timestamp: number;
}
