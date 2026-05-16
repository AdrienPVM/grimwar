import type {
  Advantage,
  DiceAst,
  DiceTerm,
  RollKind,
  RollResult,
} from './types';

/**
 * Roller digital. RNG : `crypto.getRandomValues` avec rejection sampling pour
 * éviter le biais modulo. Le stub `Math.random` du plan 07 (`src/shared/lib/dice.ts`)
 * est remplacé.
 *
 * Crit / fumble : détectés sur un terme **single-d20** retenu (un seul face kept,
 * sides = 20). Les attaques 5e roulent toujours via un terme `1d20`, `2d20kh1`
 * (advantage) ou `2d20kl1` (disadvantage) — tous éligibles.
 */

const MAX_U32 = 0xffffffff;

/** Tire un entier uniforme dans [1, sides]. */
export function rollDieCrypto(sides: number): number {
  if (sides < 2) {
    throw new Error(`[dice/roller] sides doit être >= 2 (got ${sides})`);
  }
  const buf = new Uint32Array(1);
  const limit = MAX_U32 - (MAX_U32 % sides);
  // Rejection sampling : on rejette les samples dans la zone biaisée [limit, MAX_U32].
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0]! < limit) return (buf[0]! % sides) + 1;
  }
}

export interface PerTermResult {
  term: DiceTerm;
  rawFaces: number[];
  keptFaces: number[];
}

/** Roule un terme isolé et applique kh/kl. */
export function rollTerm(term: DiceTerm): PerTermResult {
  const rawFaces: number[] = [];
  for (let i = 0; i < term.count; i += 1) rawFaces.push(rollDieCrypto(term.sides));
  const keptFaces = applyKeep(rawFaces, term);
  return { term, rawFaces, keptFaces };
}

/** Applique kh/kl à une liste de faces. Exposé pour le mode physique (plan 12.5). */
export function applyKeep(faces: readonly number[], term: DiceTerm): number[] {
  if (term.kh !== undefined) {
    return [...faces].sort((a, b) => b - a).slice(0, term.kh);
  }
  if (term.kl !== undefined) {
    return [...faces].sort((a, b) => a - b).slice(0, term.kl);
  }
  return [...faces];
}

export interface RollerOptions {
  kind: RollKind;
  label: string;
  characterId: string;
  advantage?: Advantage;
}

/**
 * Roule un AST complet et retourne le shape `RollResult` unifié.
 * `total` n'est PAS clampé ici — un d20 + mod négatif peut retourner un total
 * négatif (les jets de sauvegarde / d'attaque l'autorisent). Les dégâts sont
 * clampés au niveau du wrapper `rollDamageWithMode` (plan 12).
 */
export function rollAst(ast: DiceAst, opts: RollerOptions): RollResult {
  const perTerm = ast.terms.map(rollTerm);
  const rawFaces = perTerm.flatMap((t) => t.rawFaces);
  const keptFaces = perTerm.flatMap((t) => t.keptFaces);
  const sum = keptFaces.reduce((a, b) => a + b, 0);
  const total = sum + ast.modifier;

  let crit = false;
  let fumble = false;
  for (const t of perTerm) {
    if (t.term.sides === 20 && t.keptFaces.length === 1) {
      const face = t.keptFaces[0]!;
      if (face === 20) crit = true;
      else if (face === 1) fumble = true;
      break;
    }
  }

  return {
    kind: opts.kind,
    label: opts.label,
    mode: 'digital',
    dice: ast.terms,
    rawFaces,
    keptFaces,
    modifier: ast.modifier,
    total,
    crit,
    fumble,
    advantage: opts.advantage ?? 'normal',
    characterId: opts.characterId,
    timestamp: Date.now(),
  };
}

/** Construit l'AST d'un d20 + modificateur + advantage. */
export function buildD20Ast(modifier: number, advantage: Advantage): DiceAst {
  if (advantage === 'advantage') {
    return { terms: [{ count: 2, sides: 20, kh: 1 }], modifier };
  }
  if (advantage === 'disadvantage') {
    return { terms: [{ count: 2, sides: 20, kl: 1 }], modifier };
  }
  return { terms: [{ count: 1, sides: 20 }], modifier };
}
