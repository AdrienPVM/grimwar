import { type JSX } from 'react';

import { cn } from '@/shared/lib/cn';

interface UsageCounterProps {
  current: number;
  max: number;
  /** Cache les boutons (PJ mort / lecture MJ) — n'affiche que `current / max`. */
  readOnly: boolean;
  /** Atténue le compteur pendant une écriture en vol. */
  busy?: boolean;
  /** Texte aria du bouton « Dépenser ». */
  spendLabel: string;
  /** Texte aria du bouton « Récupérer ». */
  restoreLabel: string;
  onSpend: () => void;
  onRestore: () => void;
}

/**
 * Compteur consommable « − current / max + », même UX que
 * `ClassResourcesCard` (le motif se répète sur ≥ 3 cartes : réserves de classe,
 * souffle draconique, ascendance gigante). Présentation pure : l'écriture vit
 * chez l'appelant. Les libellés aria sont injectés pour rester neutre vis-à-vis
 * de la locale et réutilisable.
 */
export function UsageCounter({
  current,
  max,
  readOnly,
  busy = false,
  spendLabel,
  restoreLabel,
  onSpend,
  onRestore,
}: UsageCounterProps): JSX.Element {
  const canSpend = !readOnly && current > 0;
  const canRestore = !readOnly && current < max;
  return (
    <span className="flex shrink-0 items-center gap-2">
      {!readOnly && (
        <button
          type="button"
          onClick={onSpend}
          disabled={!canSpend}
          aria-label={spendLabel}
          className="grid size-8 place-items-center rounded-pill border border-rose/40 bg-rose/10 font-display text-[18px] font-black text-rose transition-all duration-200 ease-base hover:border-rose hover:bg-rose/20 disabled:opacity-30"
        >
          −
        </button>
      )}
      <span
        data-testid="usage-counter-value"
        className={cn(
          'min-w-[3.2rem] text-center font-display text-[20px] font-black tracking-[-0.02em] text-text',
          busy && 'opacity-50',
        )}
      >
        {current}
        <span className="text-text-tertiary"> / {max}</span>
      </span>
      {!readOnly && (
        <button
          type="button"
          onClick={onRestore}
          disabled={!canRestore}
          aria-label={restoreLabel}
          className="grid size-8 place-items-center rounded-pill border border-teal/40 bg-teal/10 font-display text-[18px] font-black text-teal transition-all duration-200 ease-base hover:border-teal hover:bg-teal/20 disabled:opacity-30"
        >
          +
        </button>
      )}
    </span>
  );
}
