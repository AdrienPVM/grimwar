import { cn } from '@/shared/lib/cn';

import type { EncumbranceLevel } from './use-inventory-derived';

interface WeightBarProps {
  weightTotal: number;
  carryingCapacity: number;
  level: EncumbranceLevel;
}

const LEVEL_LABEL: Record<EncumbranceLevel, string> = {
  normal: 'Charge normale',
  encumbered: 'Encombré',
  'heavily-encumbered': 'Fortement encombré',
};

const LEVEL_BAR_CLASS: Record<EncumbranceLevel, string> = {
  normal: 'bg-gradient-to-r from-gold-bright to-gold',
  encumbered: 'bg-gradient-to-r from-amber-400 to-amber-600',
  'heavily-encumbered': 'bg-gradient-to-r from-crimson to-[#a83d3d]',
};

const LEVEL_LABEL_CLASS: Record<EncumbranceLevel, string> = {
  normal: 'text-text-tertiary',
  encumbered: 'text-amber-300',
  'heavily-encumbered': 'text-crimson',
};

/**
 * Barre de poids transporté. Affiche `cur / max kg` + barre de remplissage
 * teintée selon le niveau d'encombrement (gold normal, amber encombré, crimson
 * lourd). La barre clamp à 100% visuellement même quand le perso dépasse la
 * capacité — l'info est dans le label.
 *
 * Plan 10 step 3 : variant `grittyRealism` non couvert en S1 (settings vivent
 * sur la campagne en S2). En attendant on applique le calcul standard SRD.
 */
export function WeightBar({
  weightTotal,
  carryingCapacity,
  level,
}: WeightBarProps): JSX.Element {
  const fillPercent =
    carryingCapacity > 0
      ? Math.min(100, Math.round((weightTotal / carryingCapacity) * 100))
      : 0;

  return (
    <div className="rounded-card border border-soft bg-glass px-6 py-4 backdrop-blur-xl">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="font-title text-[10px] font-bold uppercase tracking-[0.22em] text-text-tertiary">
          Poids transporté
        </span>
        <span className="font-display text-[22px] font-bold">
          <span className="text-gold-bright tracking-[-0.02em]">
            {formatWeight(weightTotal)}
          </span>{' '}
          <span className="font-serif italic font-normal text-text-tertiary">
            / {formatWeight(carryingCapacity)} kg
          </span>
        </span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-white-8">
        <div
          className={cn('h-full rounded-full transition-all duration-300', LEVEL_BAR_CLASS[level])}
          style={{ width: `${fillPercent}%` }}
        />
      </div>
      <p
        className={cn(
          'mt-2 text-right font-title text-[9px] font-bold uppercase tracking-[0.2em]',
          LEVEL_LABEL_CLASS[level],
        )}
      >
        {LEVEL_LABEL[level]}
      </p>
    </div>
  );
}

function formatWeight(kg: number): string {
  if (Number.isInteger(kg)) return kg.toString();
  return kg.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
}
