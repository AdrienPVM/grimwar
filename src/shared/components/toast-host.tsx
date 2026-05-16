import { cn } from '../lib/cn';
import { useToastStore, type ToastEntry } from '../lib/slices/toast-slice';

/**
 * Couche de rendu globale des toasts — montée une fois dans <App />.
 * Position fixe en bas-centre, n'intercepte aucun clic. L'anim CSS est
 * pilotée par la classe `toast-anim` définie dans globals.css.
 */
export function ToastHost(): JSX.Element {
  const toasts = useToastStore((state) => state.toasts);
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 bottom-32 z-[100] flex flex-col items-center gap-3 px-4"
    >
      {toasts.map((toast) => (
        <ToastBubble key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

interface ToastBubbleProps {
  toast: ToastEntry;
}

function ToastBubble({ toast }: ToastBubbleProps): JSX.Element {
  return (
    <div
      role={toast.kind === 'grim' ? 'alert' : 'status'}
      className={cn(
        'toast-anim pointer-events-none w-full max-w-[340px] rounded-[22px] px-8 py-5 text-center backdrop-blur-2xl',
        'border bg-[rgba(34,24,48,0.85)] shadow-[0_28px_80px_rgba(0,0,0,0.7)]',
        toast.kind === 'crit' && 'border-teal/60 shadow-[0_28px_80px_rgba(125,220,192,0.35)]',
        toast.kind === 'fumble' && 'border-crimson/70 shadow-[0_28px_80px_rgba(232,90,90,0.4)]',
        toast.kind === 'heal' && 'border-teal/50 shadow-[0_28px_80px_rgba(125,220,192,0.3)]',
        toast.kind === 'damage' && 'border-crimson/60 shadow-[0_28px_80px_rgba(232,90,90,0.3)]',
        toast.kind === 'grim' && 'border-crimson bg-[rgba(40,8,8,0.92)] text-text shadow-[0_28px_80px_rgba(232,90,90,0.5)]',
        (toast.kind === 'roll' || toast.kind === 'info') && 'border-gold shadow-[0_28px_80px_var(--gold-glow)]',
      )}
    >
      <p className="font-serif text-body italic text-text-secondary">{toast.title}</p>
      {toast.big && (
        <strong
          className={cn(
            'mt-2 block font-display text-[42px] font-black leading-none tracking-[-0.03em]',
            toast.kind === 'crit' && 'text-teal',
            toast.kind === 'fumble' && 'text-crimson',
            toast.kind === 'heal' && 'text-teal',
            toast.kind === 'damage' && 'text-crimson',
            toast.kind === 'grim' && 'text-crimson',
            (toast.kind === 'roll' || toast.kind === 'info') && 'text-gold-bright [text-shadow:0_0_24px_var(--gold-glow)]',
          )}
        >
          {toast.big}
        </strong>
      )}
      {toast.sub && (
        <span className="mt-2 block font-ui text-[12px] tracking-[0.04em] text-text-tertiary">
          {toast.sub}
        </span>
      )}
    </div>
  );
}
