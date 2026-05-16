/**
 * Moteur de dés minimal — stub plan 07 en attendant le moteur custom du plan 12.
 *
 * Pourquoi un stub : plan 07 a besoin de lancers (initiative, attaques, sauvegardes
 * de mort) avant que plan 12 ne livre le moteur complet (advantage natif, séries,
 * roll engine custom, 3D différé S5). On expose ici la surface minimale qu'utilise
 * la fiche Combat ; plan 12 remplacera l'implémentation sans toucher aux call sites.
 *
 * Math.random suffit pour ce stub : le seul critère est de produire un d20 plausible.
 */

export type Advantage = 'normal' | 'advantage' | 'disadvantage';

export interface D20Roll {
  /** Valeur naturelle retenue (1-20). */
  natural: number;
  /** Total avec modificateur. */
  total: number;
  /** Modificateur appliqué (peut être 0). */
  modifier: number;
  /** Toutes les valeurs naturelles lancées (1 en normal, 2 en advantage/disadvantage). */
  rolls: readonly number[];
  /** Type d'avantage utilisé. */
  advantage: Advantage;
}

/** Tire un entier uniforme dans [1, sides]. */
export function rollDie(sides: number): number {
  if (sides < 2) throw new Error(`[dice] sides must be >= 2 (got ${sides})`);
  return Math.floor(Math.random() * sides) + 1;
}

/** Lance un d20 + modificateur, avec gestion adv/disadv (prend le max ou min de 2 lancers). */
export function rollD20(modifier: number, advantage: Advantage = 'normal'): D20Roll {
  const rolls = advantage === 'normal' ? [rollDie(20)] : [rollDie(20), rollDie(20)];
  const natural =
    advantage === 'advantage'
      ? Math.max(...rolls)
      : advantage === 'disadvantage'
        ? Math.min(...rolls)
        : rolls[0]!;
  return {
    natural,
    total: natural + modifier,
    modifier,
    rolls,
    advantage,
  };
}

/**
 * Parse + lance une formule de dégâts simplifiée "NdX[+/-mod]" — ex: "1d8+3", "2d6", "3d4-1".
 * Ne supporte volontairement pas les types de dégâts ou les combinaisons (ex: "1d8+1d6").
 * Plan 12 généralisera. Le crit double les dés (pas le modificateur), conformément à 5e.
 */
export interface DamageRoll {
  total: number;
  rolls: readonly number[];
  formula: string;
  crit: boolean;
}

const DAMAGE_RE = /^(\d+)d(\d+)([+-]\d+)?$/i;

export function rollDamage(formula: string, crit: boolean = false): DamageRoll {
  const match = formula.replace(/\s+/g, '').match(DAMAGE_RE);
  if (!match) throw new Error(`[dice] formule de dégâts invalide: "${formula}"`);
  const baseCount = Number.parseInt(match[1]!, 10);
  const sides = Number.parseInt(match[2]!, 10);
  const modifier = match[3] ? Number.parseInt(match[3], 10) : 0;
  const count = crit ? baseCount * 2 : baseCount;
  const rolls: number[] = [];
  for (let i = 0; i < count; i += 1) rolls.push(rollDie(sides));
  const total = rolls.reduce((acc, r) => acc + r, 0) + modifier;
  return { total: Math.max(0, total), rolls, formula, crit };
}
