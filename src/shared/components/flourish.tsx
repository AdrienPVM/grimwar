import { cn } from '../lib/cn';

type FlourishPosition = 'tl' | 'tr' | 'bl' | 'br';

type FlourishProps = {
  position: FlourishPosition;
  className?: string;
};

const positionClasses: Record<FlourishPosition, string> = {
  tl: 'top-[18px] left-[18px]',
  tr: 'top-[18px] right-[18px] -scale-x-100',
  bl: 'bottom-[18px] left-[18px] -scale-y-100',
  br: 'bottom-[18px] right-[18px] -scale-100',
};

/**
 * Ornement SVG aux quatre coins du hero. Même path répété, transformé par
 * scaleX/scaleY/-scale-100 pour les coins droits et bas. Couleur via `stroke="var(--gold)"`
 * — utilise la CSS var pour rester thématisable côté CSS.
 */
export function Flourish({ position, className }: FlourishProps): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute h-16 w-16 opacity-60',
        positionClasses[position],
        className,
      )}
    >
      <svg viewBox="0 0 64 64" fill="none" stroke="var(--gold)" strokeWidth="0.8" strokeLinecap="round">
        <path d="M4 32 Q4 4 32 4" />
        <path d="M4 4 L12 12" />
        <path d="M16 4 L4 16" />
        <path d="M4 24 Q14 14 24 4" />
        <circle cx="4" cy="4" r="1.5" fill="var(--gold)" />
        <circle cx="16" cy="16" r="1" fill="var(--gold)" />
        <path d="M10 10 Q14 10 14 14" />
      </svg>
    </div>
  );
}
