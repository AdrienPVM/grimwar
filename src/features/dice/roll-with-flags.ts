import { buildD20Ast, rollAst, applyKeep } from '@/shared/lib/dice/roller';
import type { Advantage, DiceAst, RollKind, RollResult } from '@/shared/lib/dice/types';
import { logRollIfCampaign } from '@/shared/lib/event-logger-stub';
import { effectiveDiceMode } from '@/shared/lib/rules/dice-mode';
import { showToast } from '@/shared/lib/slices/toast-slice';
import {
  requestPhysicalRoll,
  type PhysicalRollSpec,
} from '@/shared/lib/slices/ui-modals-slice';
import { useUserSettingsStore } from '@/shared/lib/slices/user-settings-slice';
import type { Character } from '@/shared/types/character';

import { persistRollHistory } from './persist-history';

/**
 * Pivot d20 — migré de `src/features/sheet/modes/essence/roll-with-flags.ts`
 * vers `src/features/dice/` (plan 12 step 7). Plan 12.5 le rend mode-aware.
 *
 * Mode digital (plan 12) :
 *   1. Pénalité d'exhaustion (5e 2024 : −2 par niveau d'épuisement).
 *   2. Inspiration → force `advantage` et consomme la flag.
 *   3. Construit l'AST d20 (1d20, 2d20kh1 ou 2d20kl1) et roule via `rollAst`.
 *   4. Émet le toast (`roll` / `crit` / `fumble`) — sauf si `silent: true`.
 *   5. Appelle `logRollIfCampaign` (stub no-op en S1, plan 22 le câblera).
 *   6. Persiste dans Dexie `diceHistory`.
 *
 * Mode physique (plan 12.5) :
 *   1. Calcule l'AST cible (1d20/2d20kh1/2d20kl1 + modificateur) **après**
 *      application de l'exhaustion et de l'inspiration → même règle que digital.
 *   2. Ouvre `<PhysicalRollModal />` via `requestPhysicalRoll` avec le spec
 *      (dice à lancer + label + advantage).
 *   3. Si le joueur « Passe » → retourne `null`. **Aucun toast, aucun log,
 *      aucun patch.** L'inspiration N'EST PAS consommée (cf. décision plan 12.5
 *      step 8 : le joueur peut Passer sans pénaliser sa ressource).
 *   4. Sinon, construit `RollResult` à partir des `rawFaces` saisies (en
 *      respectant `kh`/`kl` pour l'avantage), émet le toast (sauf `silent`),
 *      log, persiste, et **consomme l'inspiration** seulement maintenant.
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

export async function rollWithFlags(args: RollWithFlagsArgs): Promise<RollResult | null> {
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
  const mode = resolveMode();

  if (mode === 'digital') {
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

  // Physique : on prompt l'utilisateur.
  const spec: PhysicalRollSpec = {
    dice: ast.terms,
    modifier: ast.modifier,
    label,
    advantage: effectiveAdvantage,
  };
  const resolution = await requestPhysicalRoll(spec);
  if (!resolution) return null;

  const result = buildPhysicalResult({
    ast,
    rawFaces: resolution.rawFaces,
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

function resolveMode(): 'digital' | 'physical' {
  // S1 : pas de campagne active — `effectiveDiceMode` retourne directement le
  // mode utilisateur. Plan 14 câblera la campagne via `useActiveCampaign()`.
  const { diceMode, followCampaignDiceMode } = useUserSettingsStore.getState();
  return effectiveDiceMode({ diceMode, followCampaignDiceMode }, null);
}

interface BuildPhysicalArgs {
  ast: DiceAst;
  rawFaces: number[];
  kind: RollKind;
  label: string;
  characterId: string;
  advantage: Advantage;
}

/** Construit `RollResult` à partir des faces saisies. Exporté pour les tests
 * et `rollDamageWithMode` qui partage la même logique mode physique. */
export function buildPhysicalResult(args: BuildPhysicalArgs): RollResult {
  const { ast, rawFaces, kind, label, characterId, advantage } = args;

  // Distribue les `rawFaces` saisies à chaque terme dans l'ordre.
  let cursor = 0;
  const keptFaces: number[] = [];
  let crit = false;
  let fumble = false;
  for (const term of ast.terms) {
    const slice = rawFaces.slice(cursor, cursor + term.count);
    cursor += term.count;
    const kept = applyKeep(slice, term);
    keptFaces.push(...kept);
    if (term.sides === 20 && kept.length === 1) {
      const face = kept[0]!;
      if (face === 20) crit = true;
      else if (face === 1) fumble = true;
    }
  }
  const sum = keptFaces.reduce((a, b) => a + b, 0);
  const total = sum + ast.modifier;

  return {
    kind,
    label,
    mode: 'physical',
    dice: ast.terms,
    rawFaces,
    keptFaces,
    modifier: ast.modifier,
    total,
    crit,
    fumble,
    advantage,
    characterId,
    timestamp: Date.now(),
  };
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
