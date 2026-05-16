import { useMemo } from 'react';

import { parseDiceExpression } from '@/shared/lib/dice/parser';
import { rollAst } from '@/shared/lib/dice/roller';
import type {
  Advantage,
  DiceAst,
  RollKind,
  RollResult,
} from '@/shared/lib/dice/types';
import { logRollIfCampaign } from '@/shared/lib/event-logger-stub';
import { showToast } from '@/shared/lib/slices/toast-slice';
import type { Character } from '@/shared/types/character';

import { persistRollHistory } from './persist-history';
import { rollWithFlags, type RollWithFlagsArgs } from './roll-with-flags';

/**
 * `useDice()` — API unifiée pour tous les call sites de la fiche (plan 12).
 *
 * Les méthodes retournent `RollResult`. Le mode est `'digital'` en plan 12 ;
 * plan 12.5 ajoutera la branche physique sans changer la signature (sauf
 * widening à `RollResult | null` quand le joueur « Passe »).
 *
 * Le hook n'a pas d'état interne — il sert d'agrégation cohérente pour que les
 * call sites n'aient qu'un seul import.
 */

export interface CharacterCtx {
  character: Pick<Character, 'id' | 'inspiration' | 'exhaustion'>;
  consumeInspiration?: () => Promise<void> | void;
}

export interface RollD20Opts extends CharacterCtx {
  label: string;
  kind?: RollKind;
  advantage?: Advantage;
  silent?: boolean;
}

export interface RollDamageOpts {
  label: string;
  characterId: string;
  kind?: RollKind;
  /** Doubler les dés (modificateur non doublé) pour les dégâts critiques 5e. */
  crit?: boolean;
  silent?: boolean;
}

export interface RollAttackDamageOpts extends CharacterCtx {
  label: string;
  damageTypeLabel?: string;
  advantage?: Advantage;
  /** Force le crit indépendamment du jet d'attaque (long-press « Crit »). */
  forceCrit?: boolean;
}

export interface AttackDamageOutcome {
  attack: RollResult;
  /** `null` sur fumble (pas de dégâts). */
  damage: RollResult | null;
}

export interface UseDiceApi {
  rollD20Plus(modifier: number, opts: RollD20Opts): Promise<RollResult>;
  rollExpression(expr: string, opts: RollDamageOpts): Promise<RollResult>;
  rollWithAdvantage(modifier: number, opts: Omit<RollD20Opts, 'advantage'>): Promise<RollResult>;
  rollWithDisadvantage(modifier: number, opts: Omit<RollD20Opts, 'advantage'>): Promise<RollResult>;
  rollDamageWithMode(formula: string, opts: RollDamageOpts): Promise<RollResult>;
  rollAttackDamage(
    attackBonus: number,
    damageExpr: string,
    opts: RollAttackDamageOpts,
  ): Promise<AttackDamageOutcome>;
}

async function rollD20Plus(modifier: number, opts: RollD20Opts): Promise<RollResult> {
  const args: RollWithFlagsArgs = {
    character: opts.character,
    baseMod: modifier,
    label: opts.label,
    kind: opts.kind ?? 'check',
    advantage: opts.advantage,
    consumeInspiration: opts.consumeInspiration,
    silent: opts.silent,
  };
  return rollWithFlags(args);
}

async function rollWithAdvantage(
  modifier: number,
  opts: Omit<RollD20Opts, 'advantage'>,
): Promise<RollResult> {
  return rollD20Plus(modifier, { ...opts, advantage: 'advantage' });
}

async function rollWithDisadvantage(
  modifier: number,
  opts: Omit<RollD20Opts, 'advantage'>,
): Promise<RollResult> {
  return rollD20Plus(modifier, { ...opts, advantage: 'disadvantage' });
}

async function rollExpression(expr: string, opts: RollDamageOpts): Promise<RollResult> {
  return rollDamageWithMode(expr, opts);
}

/**
 * Roule une formule générique (dégâts, sorts utilitaires…) et persiste/log.
 * En plan 12 (digital) : tire les dés. Plan 12.5 ajoutera la branche physique.
 *
 * Si `crit: true`, double le nombre de dés de chaque terme (modificateur NON
 * doublé, conforme SRD 5e). Le total est clampé à 0 minimum (un coup ne peut
 * pas soigner par dégâts négatifs).
 */
async function rollDamageWithMode(
  formula: string,
  opts: RollDamageOpts,
): Promise<RollResult> {
  const ast = parseDiceExpression(formula);
  const finalAst: DiceAst = opts.crit
    ? { terms: ast.terms.map((t) => ({ ...t, count: t.count * 2 })), modifier: ast.modifier }
    : ast;
  const raw = rollAst(finalAst, {
    kind: opts.kind ?? 'damage',
    label: opts.label,
    characterId: opts.characterId,
  });
  const result: RollResult = { ...raw, total: Math.max(0, raw.total) };

  if (!opts.silent) emitDamageToast(result, opts.crit === true);
  await logRollIfCampaign(result);
  void persistRollHistory(result);

  return result;
}

function emitDamageToast(r: RollResult, crit: boolean): void {
  showToast({
    kind: crit ? 'crit' : 'damage',
    title: r.label,
    big: `${r.total}`,
    sub: `${r.rawFaces.join(' + ')}${r.modifier !== 0 ? ` ${signedMod(r.modifier)}` : ''}${crit ? ' · ×2 dés' : ''}`,
  });
}

function signedMod(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

/**
 * Séquence digitale attaque → dégâts. Un seul toast combiné « Att X → Dgt Y ».
 * Plan 12.5 ajoutera la séquence physique (gate Touché/Raté + crit-doublé).
 *
 * Le pivot `rollWithFlags` est appelé en `silent: true` pour éviter le toast
 * d20 séparé ; on émet un toast combiné après le jet de dégâts. Fumble : un
 * toast dédié `fumble` est émis, pas de dégâts.
 */
async function rollAttackDamage(
  attackBonus: number,
  damageExpr: string,
  opts: RollAttackDamageOpts,
): Promise<AttackDamageOutcome> {
  const attack = await rollWithFlags({
    character: opts.character,
    baseMod: attackBonus,
    label: opts.label,
    kind: 'attack',
    advantage: opts.advantage,
    consumeInspiration: opts.consumeInspiration,
    silent: true,
  });

  const isFumble = attack.fumble && !opts.forceCrit;
  if (isFumble) {
    showToast({
      kind: 'fumble',
      title: opts.label,
      big: '✗ Échec',
      sub: `1d20 (1) ${signedMod(attackBonus)} = ${attack.total}`,
    });
    return { attack, damage: null };
  }

  const isCrit = opts.forceCrit === true || attack.crit;
  const damage = await rollDamageWithMode(damageExpr, {
    label: opts.label,
    characterId: opts.character.id ?? '',
    kind: 'damage',
    crit: isCrit,
    silent: true,
  });

  const advNote =
    attack.advantage === 'advantage'
      ? ' (av)'
      : attack.advantage === 'disadvantage'
        ? ' (dés)'
        : '';
  showToast({
    kind: isCrit ? 'crit' : 'roll',
    title: opts.label,
    big: `${attack.total} → ${damage.total}`,
    sub: `Att ${attack.keptFaces[0]}${advNote} ${signedMod(attackBonus)} · Dgt ${damageExpr}${isCrit ? ' ×2 dés' : ''} → ${damage.total}${opts.damageTypeLabel ? ` ${opts.damageTypeLabel}` : ''}`,
    durationMs: 2800,
  });

  return { attack, damage };
}

export function useDice(): UseDiceApi {
  return useMemo<UseDiceApi>(
    () => ({
      rollD20Plus,
      rollExpression,
      rollWithAdvantage,
      rollWithDisadvantage,
      rollDamageWithMode,
      rollAttackDamage,
    }),
    [],
  );
}
