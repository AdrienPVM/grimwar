import { useState } from 'react';

import { useDice } from '@/features/dice/use-dice';
import { Tooltip } from '@/shared/components/tooltip';
import { cn } from '@/shared/lib/cn';
import { t, type StringKey } from '@/shared/lib/i18n';
import { showToast } from '@/shared/lib/slices/toast-slice';
import type { Character } from '@/shared/types/character';

import { useUpdateCharacter } from '../../use-update-character';

interface BattleHudProps {
  character: Character;
  readOnly: boolean;
}

type EconKind = 'action' | 'bonus' | 'reaction';

const ECON_LABELS: Record<EconKind, string> = {
  action: 'Action',
  bonus: 'Bonus',
  reaction: 'Réaction',
};

const ECON_TIP_KEYS: Record<EconKind, StringKey> = {
  action: 'combat.hud.tip.action',
  bonus: 'combat.hud.tip.bonus',
  reaction: 'combat.hud.tip.reaction',
};

/**
 * Battle HUD : économie d'action (Action/Bonus/Réaction) + bouton Fin de tour
 * + chip Initiative avec lance-dé. L'état d'économie est purement local en S1
 * (pas persisté Firestore) — un tour de combat se réinitialise au tap "Fin
 * de tour", pas d'enjeu cross-session. La persistance arrive avec le combat
 * tracker DM plan 23.
 */
export function BattleHud({ character, readOnly }: BattleHudProps): JSX.Element {
  const [used, setUsed] = useState<Set<EconKind>>(new Set());
  const dice = useDice();
  const { updateCharacter } = useUpdateCharacter(character);

  function toggle(kind: EconKind): void {
    if (readOnly) return;
    setUsed((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  function endTurn(): void {
    if (readOnly) return;
    setUsed(new Set());
    showToast({ kind: 'info', title: 'Fin du tour', sub: 'Économie d\'action réinitialisée' });
  }

  /**
   * Bascule l'Inspiration héroïque (SRD 5.2.1) — drapeau binaire octroyé par le
   * MJ, dépensé par le joueur pour relancer un test. Jusqu'ici le drapeau était
   * CONSOMMÉ par `rollWithFlags` mais jamais OCTROYÉ depuis l'UI : impossible de
   * la donner. Ce toggle comble le trou (octroi MJ ou auto-octroi de table).
   */
  async function toggleInspiration(): Promise<void> {
    if (readOnly) return;
    const next = !character.inspiration;
    await updateCharacter({ inspiration: next });
    showToast({
      kind: next ? 'crit' : 'info',
      title: 'Inspiration héroïque',
      sub: next ? 'Octroyée — relancez un test au choix.' : 'Retirée.',
    });
  }

  async function rollInitiative(): Promise<void> {
    if (readOnly) return;
    // Le pivot rollWithFlags émet déjà le toast avec crit/fumble/advantage.
    // Plan 12.5 : en mode physique, `result` peut être `null` (joueur a Passé).
    // Aucune action à entreprendre dans ce cas — le pivot n'a rien loggé.
    const result = await dice.rollD20Plus(character.initiative, {
      character,
      label: 'Initiative',
      kind: 'init',
      consumeInspiration: async () => {
        await updateCharacter({ inspiration: false });
      },
    });
    if (!result) return;
  }

  return (
    <section
      aria-label={t('combat.hud.label')}
      className="mx-auto mt-3 grid w-full max-w-[420px] grid-cols-[1fr_auto] items-center gap-3 rounded-card border border-white-8 bg-glass px-5 py-4 backdrop-blur-2xl lg:mt-0 lg:max-w-none"
    >
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(ECON_LABELS) as EconKind[]).map((kind) => {
          const isUsed = used.has(kind);
          return (
            <Tooltip key={kind} label={t(ECON_TIP_KEYS[kind])}>
              <button
                type="button"
                disabled={readOnly}
                onClick={() => toggle(kind)}
                aria-pressed={isUsed}
                className={cn(
                  'inline-flex items-center gap-2 rounded-pill border px-3 py-1.5 font-title text-[9px] font-bold uppercase tracking-[0.16em] transition-colors',
                  isUsed
                    ? 'border-gold bg-gold/20 text-gold-bright line-through decoration-gold/55'
                    : 'border-white-8 bg-white/[0.04] text-text-secondary hover:border-soft hover:text-text',
                  'disabled:cursor-not-allowed disabled:opacity-40',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'inline-block h-2 w-2 rounded-full transition-colors',
                    isUsed
                      ? 'bg-gold shadow-[0_0_8px_var(--gold-glow)]'
                      : 'bg-text-faint',
                  )}
                />
                {ECON_LABELS[kind]}
              </button>
            </Tooltip>
          );
        })}
        <Tooltip label={t('combat.hud.tip.initiative')} className="ml-1">
          <button
            type="button"
            disabled={readOnly}
            onClick={() => void rollInitiative()}
            aria-label={t('combat.hud.rollInitiative')}
            className="inline-flex items-center gap-1.5 rounded-pill border border-soft bg-gold/10 px-3 py-1.5 font-title text-[9px] font-bold uppercase tracking-[0.16em] text-gold-bright transition-all hover:bg-gold/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span aria-hidden="true">🎲</span> Init.&nbsp;
            <span className="font-display text-[12px] tracking-[-0.02em]">
              {character.initiative >= 0 ? '+' : ''}
              {character.initiative}
            </span>
          </button>
        </Tooltip>
        <Tooltip
          label={t(
            character.inspiration
              ? 'combat.hud.tip.inspirationRemove'
              : 'combat.hud.tip.inspirationGrant',
          )}
          className="ml-1"
        >
          <button
            type="button"
            disabled={readOnly}
            onClick={() => void toggleInspiration()}
            aria-pressed={character.inspiration}
            aria-label={
              character.inspiration
                ? 'Retirer l’Inspiration héroïque'
                : 'Octroyer l’Inspiration héroïque'
            }
            className={cn(
              'inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 font-title text-[9px] font-bold uppercase tracking-[0.16em] transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40',
              character.inspiration
                ? 'border-gold bg-gradient-to-b from-gold-bright to-gold text-ink shadow-[0_2px_10px_rgba(220,184,108,0.4)]'
                : 'border-white-8 bg-white/[0.03] text-text-tertiary hover:border-soft hover:text-gold-bright',
            )}
          >
            <span aria-hidden="true">✦</span> Inspiration
          </button>
        </Tooltip>
      </div>
      <Tooltip label={t('combat.hud.tip.endTurn')}>
        <button
          type="button"
          disabled={readOnly}
          onClick={endTurn}
          className="rounded-card-sm bg-gradient-to-b from-gold-bright to-gold px-4 py-2.5 font-title text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink shadow-[0_4px_14px_rgba(220,184,108,0.35)] transition-all hover:-translate-y-px hover:shadow-[0_6px_18px_rgba(220,184,108,0.45)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Fin du tour ⟳
        </button>
      </Tooltip>
    </section>
  );
}
