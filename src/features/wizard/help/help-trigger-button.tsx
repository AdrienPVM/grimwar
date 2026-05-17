import type { JSX } from 'react';

import { cn } from '@/shared/lib/cn';

/**
 * Petit bouton « ? » qui ouvre la `<DetailModal>` mobile d'une ligne de choix
 * (UAT post-plan 05 — ajustement 2). Le hover n'existant pas sur tactile, on
 * a besoin d'un déclencheur explicite pour consulter la description sans
 * cocher/sélectionner la ligne.
 *
 * Position recommandée par le caller : `absolute top-2 right-2`. Le bouton
 * est `md:hidden` car le desktop a déjà le panneau latéral persistant.
 *
 * Anatomie (UAT post-plan 05 bug n°2 — ajustement visuel) :
 *   - Empreinte visible : pastille circulaire **28×28** avec un « ? » discret.
 *   - Zone tactile : 44×44 garantis via padding transparent (`p-2` → 16px
 *     autour de la pastille). Même pattern que les bulles de la nav mobile.
 *   - Le focus-ring porte sur la pastille (rounded-full), pas le hit-area.
 *
 * `stopPropagation` est posé sur click ET mousedown : certains containers
 * (label de Checkbox) déclenchent leur action en mousedown plutôt qu'en
 * click — sans ça, tapper le « ? » cocherait aussi la ligne.
 */
interface Props {
  /** Libellé a11y, doit identifier QUEL item le `?` détaille (lecteurs d'écran). */
  ariaLabel: string;
  onClick: () => void;
  className?: string;
}

export function HelpTriggerButton({
  ariaLabel,
  onClick,
  className,
}: Props): JSX.Element {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={(e) => {
        // Empêche l'événement de remonter au container (li ou button parent)
        // — on consulte, on ne sélectionne pas.
        e.stopPropagation();
        onClick();
      }}
      // mousedown stoppé aussi : certains containers (label de Checkbox)
      // déclenchent leur action via mousedown plutôt que click.
      onMouseDown={(e) => e.stopPropagation()}
      className={cn(
        // Hit-area 44×44 transparente. La pastille visible vit dans le span
        // enfant. `inline-flex` + centrage → le span 28×28 occupe le centre.
        'group inline-flex h-11 w-11 items-center justify-center p-0',
        'bg-transparent border-0',
        'focus:outline-none',
        // Mobile-only : le desktop a déjà le panneau latéral persistant.
        'md:hidden',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          // Pastille visible 28×28, sobre, dorée au hover/focus.
          'inline-flex h-7 w-7 items-center justify-center rounded-full',
          'border border-soft bg-glass-2 text-text-tertiary',
          'font-title text-[12px] leading-none',
          'transition-colors duration-200 ease-base',
          'group-hover:border-glow group-hover:text-gold-bright',
          'group-focus-visible:ring-2 group-focus-visible:ring-gold-bright/40',
        )}
      >
        ?
      </span>
    </button>
  );
}
