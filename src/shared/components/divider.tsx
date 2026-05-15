import { cn } from '../lib/cn';

type DividerProps = {
  className?: string;
};

/**
 * Séparateur illuminé `✦ ⚜ ✦` encadré de lignes gold qui fondent au transparent.
 * Utilisé entre sections du hero et des cartes verbeuses.
 */
export function Divider({ className }: DividerProps): JSX.Element {
  return (
    <div
      role="presentation"
      className={cn('my-4 flex items-center justify-center gap-4', className)}
    >
      <span aria-hidden="true" className="h-px w-[70px] flex-none bg-gradient-to-r from-transparent via-gold to-transparent" />
      <span className="text-[13px] tracking-[0.5em] text-gold drop-shadow-[0_0_8px_var(--gold-glow)]">
        ✦ ⚜ ✦
      </span>
      <span aria-hidden="true" className="h-px w-[70px] flex-none bg-gradient-to-r from-transparent via-gold to-transparent" />
    </div>
  );
}
