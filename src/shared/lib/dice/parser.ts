import type { DiceAst, DiceTerm } from './types';

/**
 * Parser d'expressions de dés. Supporte les notations courantes 5e :
 *   - `1d20`, `2d6+3`, `1d20+1d4-2`, `8d6`
 *   - `1d20kh1` / `1d20kl1` (no-ops sur single d20, allowed pour cohérence)
 *   - `2d20kh1` (advantage) / `2d20kl1` (disadvantage)
 *   - `+3` ou `-2` (modificateur plat seul)
 *   - whitespace + casse tolérés
 *
 * Failloud sur expressions invalides — pas de fallback silencieux : le caller
 * doit donner une formule canonique (issue du parser de contenu ou du shape
 * Item.damage.dice).
 */

const DICE_TOKEN_RE = /^([+-])(\d+)d(\d+)(?:k([hl])(\d+))?$/i;
const NUM_TOKEN_RE = /^([+-])(\d+)$/;

export function parseDiceExpression(expr: string): DiceAst {
  let normalized = expr.replace(/\s+/g, '').toLowerCase();
  if (!normalized) throw new Error(`[dice/parser] expression vide`);
  if (!/^[+-]/.test(normalized)) normalized = `+${normalized}`;

  // Découpe en tokens (chaque token commence par + ou -).
  const tokens: string[] = [];
  let cursor = 0;
  while (cursor < normalized.length) {
    const sign = normalized[cursor];
    if (sign !== '+' && sign !== '-') {
      throw new Error(
        `[dice/parser] signe attendu position ${cursor} dans "${expr}"`,
      );
    }
    let next = cursor + 1;
    while (
      next < normalized.length &&
      normalized[next] !== '+' &&
      normalized[next] !== '-'
    ) {
      next += 1;
    }
    tokens.push(normalized.slice(cursor, next));
    cursor = next;
  }

  const terms: DiceTerm[] = [];
  let modifier = 0;

  for (const tok of tokens) {
    const diceMatch = tok.match(DICE_TOKEN_RE);
    if (diceMatch) {
      if (diceMatch[1] === '-') {
        throw new Error(`[dice/parser] terme de dés négatif non supporté: "${tok}"`);
      }
      const count = Number(diceMatch[2]);
      const sides = Number(diceMatch[3]);
      if (count < 1) throw new Error(`[dice/parser] count doit être >= 1 dans "${tok}"`);
      if (sides < 2) throw new Error(`[dice/parser] sides doit être >= 2 dans "${tok}"`);
      const term: DiceTerm = { count, sides };
      if (diceMatch[4] === 'h' && diceMatch[5]) {
        const k = Number(diceMatch[5]);
        if (k > count) throw new Error(`[dice/parser] kh${k} > count ${count} dans "${tok}"`);
        if (k < 1) throw new Error(`[dice/parser] kh doit être >= 1 dans "${tok}"`);
        term.kh = k;
      } else if (diceMatch[4] === 'l' && diceMatch[5]) {
        const k = Number(diceMatch[5]);
        if (k > count) throw new Error(`[dice/parser] kl${k} > count ${count} dans "${tok}"`);
        if (k < 1) throw new Error(`[dice/parser] kl doit être >= 1 dans "${tok}"`);
        term.kl = k;
      }
      terms.push(term);
      continue;
    }
    const numMatch = tok.match(NUM_TOKEN_RE);
    if (numMatch) {
      const n = Number(numMatch[2]);
      modifier += numMatch[1] === '-' ? -n : n;
      continue;
    }
    throw new Error(`[dice/parser] token non reconnu: "${tok}" dans "${expr}"`);
  }

  return { terms, modifier };
}

/**
 * Sérialise un AST en notation canonique — utilisé pour les labels d'historique
 * et l'affichage des prompts physiques. Le modificateur est rendu avec son signe.
 */
export function stringifyDiceAst(ast: DiceAst): string {
  const parts: string[] = [];
  for (const t of ast.terms) {
    const k = t.kh ? `kh${t.kh}` : t.kl ? `kl${t.kl}` : '';
    parts.push(`${t.count}d${t.sides}${k}`);
  }
  if (parts.length === 0) {
    return ast.modifier >= 0 ? `+${ast.modifier}` : `${ast.modifier}`;
  }
  let str = parts.join('+');
  if (ast.modifier > 0) str += `+${ast.modifier}`;
  else if (ast.modifier < 0) str += `${ast.modifier}`;
  return str;
}
