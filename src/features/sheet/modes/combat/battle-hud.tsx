import { useState } from 'react';

import { cn } from '@/shared/lib/cn';
import { rollD20 } from '@/shared/lib/dice';
import { showToast } from '@/shared/lib/slices/toast-slice';
import type { Character } from '@/shared/types/character';

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

/**
 * Battle HUD : économie d'action (Action/Bonus/Réaction) + bouton Fin de tour
 * + chip Initiative avec lance-dé. L'état d'économie est purement local en S1
 * (pas persisté Firestore) — un tour de combat se réinitialise au tap "Fin
 * de tour", pas d'enjeu cross-session. La persistance arrive avec le combat
 * tracker DM plan 23.
 */
export function BattleHud({ character, readOnly }: BattleHudProps): JSX.Element {
  const [used, setUsed] = useState<Set<EconKind>>(new Set());

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

  function rollInitiative(): void {
    if (readOnly) return;
    const result = rollD20(character.initiative);
    const sign = character.initiative >= 0 ? '+' : '';
    showToast({
      kind: result.natural === 20 ? 'crit' : result.natural === 1 ? 'fumble' : 'roll',
      title: 'Initiative',
      big: `${result.total}`,
      sub: `1d20 (${result.natural}) ${sign}${character.initiative}`,
    });
  }

  return (
    <section
      aria-label="Tableau de bord de combat"
      className="mx-auto mt-3 grid w-full max-w-[420px] grid-cols-[1fr_auto] items-center gap-3 rounded-card border border-white-8 bg-glass px-5 py-4 backdrop-blur-2xl"
    >
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(ECON_LABELS) as EconKind[]).map((kind) => {
          const isUsed = used.has(kind);
          return (
            <button
              key={kind}
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
          );
        })}
        <button
          type="button"
          disabled={readOnly}
          onClick={rollInitiative}
          aria-label="Lancer l'initiative"
          className="ml-1 inline-flex items-center gap-1.5 rounded-pill border border-soft bg-gold/10 px-3 py-1.5 font-title text-[9px] font-bold uppercase tracking-[0.16em] text-gold-bright transition-all hover:bg-gold/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span aria-hidden="true">🎲</span> Init.&nbsp;
          <span className="font-display text-[12px] tracking-[-0.02em]">
            {character.initiative >= 0 ? '+' : ''}
            {character.initiative}
          </span>
        </button>
      </div>
      <button
        type="button"
        disabled={readOnly}
        onClick={endTurn}
        className="rounded-card-sm bg-gradient-to-b from-gold-bright to-gold px-4 py-2.5 font-title text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink shadow-[0_4px_14px_rgba(220,184,108,0.35)] transition-all hover:-translate-y-px hover:shadow-[0_6px_18px_rgba(220,184,108,0.45)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Fin du tour ⟳
      </button>
    </section>
  );
}
