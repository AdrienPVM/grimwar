import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

type NativeProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'>;

interface CheckboxProps extends NativeProps {
  /** Libellé affiché à côté de la case. Cliquable (toute la zone). */
  label: ReactNode;
  /** Aide neutre sous le label (optionnelle). */
  helper?: string;
}

/**
 * Checkbox accessible (plan 05 §B.5).
 *
 * Pattern : input natif visuellement masqué (`peer`) + Box stylée + label.
 * Toute la ligne est cliquable → touch target ≥ 44px sans effort.
 * Focus-visible se voit autour de la box quand l'utilisateur tabule.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, helper, className, id: providedId, ...rest },
  ref,
) {
  const reactId = useId();
  const id = providedId ?? `cb-${reactId}`;
  const helperId = helper ? `${id}-helper` : undefined;

  return (
    <label
      htmlFor={id}
      className={cn(
        'flex items-start gap-3 min-h-[44px] py-2 cursor-pointer select-none',
        'group',
        rest.disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <input
        ref={ref}
        id={id}
        type="checkbox"
        aria-describedby={helperId}
        className="peer sr-only"
        {...rest}
      />
      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-card-sm',
          'border border-soft bg-bg-3/40',
          'transition-colors duration-150 ease-base',
          'group-hover:border-glow',
          'peer-checked:bg-gradient-to-b peer-checked:from-gold-bright peer-checked:to-gold peer-checked:border-gold',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-gold-bright/40',
        )}
      >
        <svg
          viewBox="0 0 16 16"
          className="h-4 w-4 fill-none stroke-ink stroke-[3] opacity-0 transition-opacity duration-150 ease-base group-[:has(input:checked)]:opacity-100"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 8.5l3 3 7-7" />
        </svg>
      </span>
      <span className="flex flex-col gap-1">
        <span className="font-serif text-body text-text">{label}</span>
        {helper ? (
          <span id={helperId} className="font-serif text-[13px] text-text-tertiary">
            {helper}
          </span>
        ) : null}
      </span>
    </label>
  );
});
