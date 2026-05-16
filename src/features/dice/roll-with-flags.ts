import { buildD20Ast, rollAst } from '@/shared/lib/dice/roller';
import type { Advantage, RollKind, RollResult } from '@/shared/lib/dice/types';
import { logRollIfCampaign } from '@/shared/lib/event-logger-stub';
import { showToast } from '@/shared/lib/slices/toast-slice';
import type { Character } from '@/shared/types/character';

import { persistRollHistory } from './persist-history';

/**
 * Pivot d20 — migré de `src/features/sheet/modes/essence/roll-with-flags.ts`
 * vers `src/features/dice/` (plan 12, étape 7). Le module n'appartient plus à
 * Essence ; il est le pivot global de tous les jets d20 de la fiche.
 *
 * Responsabilités :
 *   1. Pénalité d'exhaustion (5e 2024 : −2 par niveau d'épuisement).
 *   2. Inspiration → force `advantage` et consomme la flag.
 *   3. Construit l'AST d20 (1d20, 2d20kh1 ou 2d20kl1) et roule via `rollAst`.
 *   4. Émet le toast (`roll` / `crit` / `fumble`) — sauf si `silent: true`.
 *   5. Appelle `logRollIfCampaign` (stub no-op en S1, plan 22 le câblera).
 *   6. Persiste dans Dexie `diceHistory`.
 *
 * Plan 12.5 élargira la signature à `Promise<RollResult | null>` pour gérer le
 * cas « Passer » du mode physique. En plan 12, le retour est toujours
 * non-`null` (digital ne peut pas annuler).
 */

export interface RollWithFlagsArgs {
  character: Pick<Character, 'id' | 'inspiration' | 'exhaustion'>;
  baseMod: number;
  label: string;
  kind?: RollKind;
  /** Préférence explicite. Inspiration force `'advantage'` quoi qu'il arrive. */
  advantage?: Advantage;
  /** Persiste `inspiration: false` quand l'inspiration est consommée. */
  consumeInspiration?: () => Promise<void> | void;
  /** Si `true`, n'émet PAS le toast par défaut. Utilisé par `rollAttackDamage`
   * qui émet un toast combiné « Att X → Dgt Y ». */
  silent?: boolean;
}

export async function rollWithFlags(args: RollWithFlagsArgs): Promise<RollResult> {
  const {
    character,
    baseMod,
    label,
    kind = 'check',
    advantage = 'normal',
    consumeInspiration,
    silent = false,
  } = args;

  const exhaustionPenalty = 2 * character.exhaustion;
  const effectiveMod = baseMod - exhaustionPenalty;
  const effectiveAdvantage: Advantage = character.inspiration ? 'advantage' : advantage;

  const ast = buildD20Ast(effectiveMod, effectiveAdvantage);
  const result = rollAst(ast, {
    kind,
    label,
    characterId: character.id ?? '',
    advantage: effectiveAdvantage,
  });

  if (character.inspiration && consumeInspiration) {
    await consumeInspiration();
  }

  if (!silent) emitD20Toast(result, effectiveMod);
  await logRollIfCampaign(result);
  void persistRollHistory(result);

  return result;
}

function emitD20Toast(r: RollResult, effectiveMod: number): void {
  const kind = r.crit ? 'crit' : r.fumble ? 'fumble' : 'roll';
  const sign = effectiveMod >= 0 ? `+${effectiveMod}` : `${effectiveMod}`;
  const advNote =
    r.advantage === 'advantage'
      ? ' (Av.)'
      : r.advantage === 'disadvantage'
        ? ' (Dés.)'
        : '';
  showToast({
    kind,
    title: r.label + advNote,
    big: `${r.total}`,
    sub: `1d20${sign} → ${r.rawFaces.join(' / ')} ${sign}`,
  });
}
