import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * Variantes définies via `cva` pour rester déclaratives et typées.
 * Choix tactique documenté plan 02 step 9 : `cva` plutôt que `switch` manuel
 * — déjà installé en plan 01, scale mieux pour <Chip> qui partage l'idiome.
 */
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 font-title font-bold uppercase',
    'tracking-[0.16em] transition-all ease-base duration-250',
    'disabled:cursor-not-allowed disabled:opacity-40',
    'focus-visible:outline-none',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-gradient-to-b from-gold-bright to-gold text-ink rounded-pill',
          'border border-gold shadow-gold-glow',
          'hover:shadow-[0_0_32px_rgba(220,184,108,0.55)] hover:-translate-y-px',
          'active:translate-y-0 active:scale-[0.98]',
        ],
        secondary: [
          'bg-glass backdrop-blur-xl border border-white-8 text-text rounded-pill',
          'hover:border-soft hover:text-gold-bright',
          'active:scale-[0.98]',
        ],
        ghost: [
          'bg-transparent text-text-secondary',
          'hover:text-gold-bright hover:bg-white/[0.04] rounded-pill',
        ],
        danger: [
          'bg-gradient-to-b from-crimson to-[#a83d3d] text-text rounded-pill',
          'border border-crimson shadow-[0_0_24px_rgba(232,90,90,0.4)]',
          'hover:shadow-[0_0_32px_rgba(232,90,90,0.6)] hover:-translate-y-px',
          'active:translate-y-0 active:scale-[0.98]',
        ],
        icon: [
          'bg-glass backdrop-blur-xl border border-white-8 text-gold-bright',
          'aspect-square rounded-card-sm',
          'hover:border-soft hover:text-gold-bright',
          'active:scale-[0.95]',
        ],
      },
      size: {
        sm: 'text-meta px-3 py-1.5',
        md: 'text-meta px-5 py-2.5',
        lg: 'text-[12px] tracking-[0.2em] px-7 py-3.5',
      },
    },
    compoundVariants: [
      // Icon size overrides text padding — square format
      { variant: 'icon', size: 'sm', class: 'p-1.5 text-base' },
      { variant: 'icon', size: 'md', class: 'p-2.5 text-lg' },
      { variant: 'icon', size: 'lg', class: 'p-3 text-xl' },
    ],
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    children?: ReactNode;
  };

export function Button({
  variant,
  size,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps): JSX.Element {
  return (
    <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...rest}>
      {children}
    </button>
  );
}

export { buttonVariants };
