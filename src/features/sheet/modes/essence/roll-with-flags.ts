import { rollD20, type Advantage, type D20Roll } from '@/shared/lib/dice';
import { showToast } from '@/shared/lib/slices/toast-slice';
import type { Character } from '@/shared/types/character';

/**
 * Pivot des d20 d'Essence (et plus tard du radial FAB). Centralise :
 *   1. la pénalité d'épuisement (5e 2024 : −2 par niveau d'épuisement sur les d20),
 *   2. l'inspiration consommée automatiquement à l'usage (pose advantage et bascule
 *      `inspiration: false` côté Firestore),
 *   3. le toast (`roll` / `crit` / `fumble` selon nat 1 / nat 20).
 *
 * Pure côté lecture du `character` — l'écriture (consommation d'inspiration)
 * passe par `updateInspiration` injecté par l'appelant pour rester découplé du
 * hook React.
 */

export interface RollWithFlagsArgs {
  character: Pick<Character, 'inspiration' | 'exhaustion'>;
  baseMod: number;
  label: string;
  /** Préférence explicite (long-press menu). Inspiration force `'advantage'` quoi qu'il arrive. */
  advantage?: Advantage;
  /** Persist `inspiration: false` quand l'inspiration est consommée. */
  consumeInspiration?: () => Promise<void> | void;
}

export interface RollWithFlagsResult {
  roll: D20Roll;
  /** Modificateur effectif après pénalité d'exhaustion. */
  effectiveMod: number;
  /** Avantage effectivement utilisé (peut différer de `advantage` si inspiration consommée). */
  effectiveAdvantage: Advantage;
  inspirationConsumed: boolean;
}

export async function rollWithFlags(args: RollWithFlagsArgs): Promise<RollWithFlagsResult> {
  const { character, baseMod, label, advantage = 'normal', consumeInspiration } = args;
  const exhaustionPenalty = 2 * character.exhaustion;
  const effectiveMod = baseMod - exhaustionPenalty;
  const effectiveAdvantage: Advantage =
    character.inspiration ? 'advantage' : advantage;

  const roll = rollD20(effectiveMod, effectiveAdvantage);
  const inspirationConsumed = character.inspiration === true;
  if (inspirationConsumed && consumeInspiration) {
    await consumeInspiration();
  }

  const kind = roll.natural === 20 ? 'crit' : roll.natural === 1 ? 'fumble' : 'roll';
  const sign = effectiveMod >= 0 ? `+${effectiveMod}` : `${effectiveMod}`;
  const advNote =
    effectiveAdvantage === 'advantage'
      ? ' (Av.)'
      : effectiveAdvantage === 'disadvantage'
        ? ' (Dés.)'
        : '';

  showToast({
    kind,
    title: label + advNote,
    big: `${roll.total}`,
    sub: `1d20${sign} → ${roll.rolls.join(' / ')} ${sign}`,
  });

  return { roll, effectiveMod, effectiveAdvantage, inspirationConsumed };
}
