import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

const chipVariants = cva(
  [
    'inline-flex items-center gap-1.5 rounded-pill border',
    'px-3 py-1 font-title text-[10px] font-bold uppercase tracking-[0.14em]',
    'transition-all ease-base duration-150',
    // En mode bouton, légère réponse au tap
    '[&[role=button]]:cursor-pointer [&[role=button]]:active:scale-[0.96]',
  ],
  {
    variants: {
      variant: {
        default: 'border-white-8 bg-white/[0.04] text-text-secondary',
        magic: 'border-amethyst/35 bg-amethyst/[0.12] text-amethyst',
        damage: 'border-crimson/35 bg-crimson/[0.12] text-crimson',
        heal: 'border-teal/35 bg-teal/[0.12] text-teal',
        gold: 'border-soft bg-gold/[0.12] text-gold-bright',
        inspiration: [
          'border-gold bg-gradient-to-b from-gold-bright to-gold text-ink',
          'shadow-[0_2px_10px_rgba(220,184,108,0.4)]',
        ],
      },
      active: {
        true: 'ring-1 ring-gold-bright',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      active: false,
    },
  },
);

type ChipProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> &
  VariantProps<typeof chipVariants> & {
    children?: ReactNode;
    /** Si présent, le chip se comporte en bouton accessible. */
    onToggle?: () => void;
  };

/**
 * Pastille d'état pour buffs, débuffs, états de combat, dégâts/heal, inspiration.
 * Cf. <Icon /> pour l'icône optionnelle à composer dans `children`.
 */
export function Chip({
  variant,
  active,
  onToggle,
  className,
  children,
  ...rest
}: ChipProps): JSX.Element {
  const interactiveProps = onToggle
    ? {
        role: 'button' as const,
        tabIndex: 0,
        onClick: onToggle,
        onKeyDown: (event: React.KeyboardEvent<HTMLSpanElement>) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggle();
          }
        },
      }
    : {};
  return (
    <span
      className={cn(chipVariants({ variant, active }), className)}
      {...interactiveProps}
      {...rest}
    >
      {children}
    </span>
  );
}

export { chipVariants };
