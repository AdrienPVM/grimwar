import type { HTMLAttributes, ReactNode } from 'react';
import { GlassPanel } from './glass-panel';
import { cn } from '../lib/cn';

type CardProps = HTMLAttributes<HTMLElement> & {
  children?: ReactNode;
};

/**
 * Carte glass standard avec padding. Pattern type :
 *
 *   <Card>
 *     <CardHeader>
 *       Titre
 *       <CardAction onClick={...}>Action</CardAction>
 *     </CardHeader>
 *     ...
 *   </Card>
 */
export function Card({ className, children, ...rest }: CardProps): JSX.Element {
  return (
    <GlassPanel className={cn('p-6 md:p-7', className)} {...rest}>
      {children}
    </GlassPanel>
  );
}

type CardHeaderProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
};

/**
 * En-tête de carte avec décoration `✦ Titre ✦` en gold (Cinzel Decorative).
 * Place toute action à droite via <CardAction>.
 */
export function CardHeader({ className, children, ...rest }: CardHeaderProps): JSX.Element {
  return (
    <div
      className={cn(
        'mb-5 flex items-center justify-between',
        // ✦ avant et après le titre — sélectionne le premier enfant texte
        '[&>:first-child]:flex [&>:first-child]:items-center [&>:first-child]:gap-3',
        '[&>:first-child]:font-display [&>:first-child]:text-meta [&>:first-child]:uppercase',
        '[&>:first-child]:tracking-[0.3em] [&>:first-child]:text-gold-bright [&>:first-child]:font-bold',
        '[&>:first-child]:[text-shadow:0_0_16px_rgba(220,184,108,0.3)]',
        "[&>:first-child]:before:content-['✦'] [&>:first-child]:before:text-gold [&>:first-child]:before:text-[10px]",
        '[&>:first-child]:before:drop-shadow-[0_0_4px_var(--gold-glow)]',
        "[&>:first-child]:after:content-['✦'] [&>:first-child]:after:text-gold [&>:first-child]:after:text-[10px]",
        '[&>:first-child]:after:drop-shadow-[0_0_4px_var(--gold-glow)]',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

type CardActionProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: ReactNode;
};

/**
 * Bouton secondaire dans <CardHeader>. Petit pill glass qui s'allume gold au hover.
 */
export function CardAction({ className, children, ...rest }: CardActionProps): JSX.Element {
  return (
    <button
      type="button"
      className={cn(
        'rounded-pill border border-white-8 bg-white/[0.04]',
        'px-4 py-1.5 backdrop-blur-md',
        'font-title text-meta uppercase tracking-[0.2em] font-bold text-text-secondary',
        'transition-all duration-200 ease-base',
        'hover:bg-gradient-to-b hover:from-gold-bright hover:to-gold hover:text-ink hover:border-gold',
        'hover:shadow-[0_4px_14px_rgba(220,184,108,0.35)]',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
