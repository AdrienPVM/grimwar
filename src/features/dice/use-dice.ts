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
import { effectiveDiceMode } from '@/shared/lib/rules/dice-mode';
import { showToast } from '@/shared/lib/slices/toast-slice';
import {
  requestHitMissGate,
  requestPhysicalRoll,
  type PhysicalRollSpec,
} from '@/shared/lib/slices/ui-modals-slice';
import { useUserSettingsStore } from '@/shared/lib/slices/user-settings-slice';
import type { Character } from '@/shared/types/character';

import { persistRollHistory } from './persist-history';
import {
  buildPhysicalResult,
  rollWithFlags,
  type RollWithFlagsArgs,
} from './roll-with-flags';

/**
 * `useDice()` — API unifiée pour tous les call sites de la fiche (plan 12 +
 * plan 12.5).
 *
 * Les méthodes retournent `RollResult | null` (digital ne peut pas retourner
 * `null`, mais on aligne la signature pour le mode physique « Passer »). Les
 * call sites doivent toujours guard sur `null` — en mode physique un joueur
 * peut décider de ne rien logger.
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
  /** `null` si le joueur a Passé en mode physique. */
  attack: RollResult | null;
  /** `null` sur fumble, miss manuel, ou prompt damage Passé. */
  damage: RollResult | null;
}

export interface UseDiceApi {
  rollD20Plus(modifier: number, opts: RollD20Opts): Promise<RollResult | null>;
  rollExpression(expr: string, opts: RollDamageOpts): Promise<RollResult | null>;
  rollWithAdvantage(modifier: number, opts: Omit<RollD20Opts, 'advantage'>): Promise<RollResult | null>;
  rollWithDisadvantage(modifier: number, opts: Omit<RollD20Opts, 'advantage'>): Promise<RollResult | null>;
  rollDamageWithMode(formula: string, opts: RollDamageOpts): Promise<RollResult | null>;
  rollAttackDamage(
    attackBonus: number,
    damageExpr: string,
    opts: RollAttackDamageOpts,
  ): Promise<AttackDamageOutcome>;
}

async function rollD20Plus(modifier: number, opts: RollD20Opts): Promise<RollResult | null> {
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
): Promise<RollResult | null> {
  return rollD20Plus(modifier, { ...opts, advantage: 'advantage' });
}

async function rollWithDisadvantage(
  modifier: number,
  opts: Omit<RollD20Opts, 'advantage'>,
): Promise<RollResult | null> {
  return rollD20Plus(modifier, { ...opts, advantage: 'disadvantage' });
}

async function rollExpression(expr: string, opts: RollDamageOpts): Promise<RollResult | null> {
  return rollDamageWithMode(expr, opts);
}

function resolveMode(): 'digital' | 'physical' {
  const { diceMode, followCampaignDiceMode } = useUserSettingsStore.getState();
  return effectiveDiceMode({ diceMode, followCampaignDiceMode }, null);
}

/**
 * Roule une formule générique (dégâts, sorts utilitaires…) et persiste/log.
 * Plan 12 : digital uniquement. Plan 12.5 : ajoute la branche physique
 * (`<PhysicalRollModal />` prompt + `null` si « Passer »).
 *
 * Si `crit: true`, double le nombre de dés de chaque terme (modificateur NON
 * doublé, conforme SRD 5e). Le total est clampé à 0 minimum (un coup ne peut
 * pas soigner par dégâts négatifs).
 */
async function rollDamageWithMode(
  formula: string,
  opts: RollDamageOpts,
): Promise<RollResult | null> {
  const ast = parseDiceExpression(formula);
  const finalAst: DiceAst = opts.crit
    ? { terms: ast.terms.map((t) => ({ ...t, count: t.count * 2 })), modifier: ast.modifier }
    : ast;
  const mode = resolveMode();

  if (mode === 'digital') {
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

  const spec: PhysicalRollSpec = {
    dice: finalAst.terms,
    modifier: finalAst.modifier,
    label: opts.label + (opts.crit ? ' (crit · dés ×2)' : ''),
    advantage: 'normal',
  };
  const resolution = await requestPhysicalRoll(spec);
  if (!resolution) return null;

  const raw = buildPhysicalResult({
    ast: finalAst,
    rawFaces: resolution.rawFaces,
    kind: opts.kind ?? 'damage',
    label: opts.label,
    characterId: opts.characterId,
    advantage: 'normal',
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
 * Séquence attaque → dégâts mode-aware (plan 12.5).
 *
 * Digital : chain automatique, toast combiné « Att X → Dgt Y ». Comportement
 * inchangé depuis plan 12.
 *
 * Physique :
 *   - Attaque via `rollWithFlags`. Si « Passer » → `{attack:null, damage:null}`.
 *   - Sur face 20 → auto-Touché + crit, skip gate, prompt dégâts dés doublés.
 *   - Sur face 1 → auto-Raté + fumble, skip gate, pas de dégâts.
 *   - Sur face neutre → `<HitMissGateModal />` Touché/Raté ; Passer = abort.
 *   - Si Touché et `forceCrit`, doubler les dés au prompt de dégâts.
 *
 * Le toast combiné est émis seulement quand on a au moins un résultat
 * d'attaque non-`null`. Les sous-jets utilisent `silent: true` pour éviter
 * les toasts en cascade.
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

  if (!attack) return { attack: null, damage: null };

  // Détection du gate :
  //   - mode physique + face neutre (≠ 20, ≠ 1) ⇒ HitMissGate manuel.
  //   - mode physique + face 20 ⇒ auto-hit, crit.
  //   - mode physique + face 1 ⇒ auto-miss, fumble.
  //   - mode digital ⇒ pas de gate (chain auto comme plan 12).
  let outcome: 'hit' | 'miss';
  if (attack.mode === 'physical') {
    if (attack.crit) outcome = 'hit';
    else if (attack.fumble) outcome = 'miss';
    else {
      const gate = await requestHitMissGate({
        label: opts.label,
        hint: `Total ${attack.total} — choisis selon la CA de la cible.`,
      });
      if (gate === null) return { attack, damage: null };
      outcome = gate;
    }
  } else {
    outcome = attack.fumble && !opts.forceCrit ? 'miss' : 'hit';
  }

  if (outcome === 'miss') {
    showToast({
      kind: attack.fumble ? 'fumble' : 'roll',
      title: opts.label,
      big: attack.fumble ? '✗ Échec critique' : '✗ Raté',
      sub: `Att ${attack.keptFaces[0]} ${signedMod(attackBonus)} = ${attack.total}`,
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

  if (!damage) {
    // Joueur a Passé le prompt de dégâts (mode physique). Le pivot ne logge
    // rien — on émet quand même un toast d'attaque pour que le joueur ait
    // un retour visuel : « Att X → ? ».
    showToast({
      kind: isCrit ? 'crit' : 'roll',
      title: opts.label,
      big: `${attack.total}`,
      sub: `Att ${attack.keptFaces[0]} ${signedMod(attackBonus)} · Dégâts passés`,
    });
    return { attack, damage: null };
  }

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
