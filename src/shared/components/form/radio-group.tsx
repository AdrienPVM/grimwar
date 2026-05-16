import { useId, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface RadioOption<T extends string> {
  value: T;
  label: ReactNode;
  helper?: string;
  disabled?: boolean;
}

interface RadioGroupProps<T extends string> {
  /** Label visuel du groupe. Caché visuellement si `visualLegend === false`. */
  legend: string;
  /** Si false, la legend est lue par AT mais non rendue visuellement (sr-only). */
  visualLegend?: boolean;
  name: string;
  value: T;
  onValueChange: (next: T) => void;
  options: RadioOption<T>[];
  /** Layout vertical par défaut, horizontal possible pour les méthodes ASI. */
  layout?: 'vertical' | 'horizontal';
  className?: string;
}

/**
 * Groupe de radios accessible (plan 05 §B.6).
 *
 * - `<fieldset>` + `<legend>` lus en bloc par les lecteurs d'écran
 *   (la legend peut être visuellement masquée via `visualLegend={false}`).
 * - Navigation flèches haut/bas/gauche/droite : native HTML (les `<input>` radio
 *   d'un même `name` la fournissent gratuitement).
 * - Tap target ≥ 44px par option (label complet cliquable).
 */
export function RadioGroup<T extends string>({
  legend,
  visualLegend = true,
  name,
  value,
  onValueChange,
  options,
  layout = 'vertical',
  className,
}: RadioGroupProps<T>): JSX.Element {
  const reactId = useId();
  return (
    <fieldset className={cn('border-0 p-0 m-0', className)}>
      <legend
        className={cn(
          'font-title text-meta text-text-secondary uppercase tracking-[0.16em] mb-2',
          !visualLegend && 'sr-only',
        )}
      >
        {legend}
      </legend>
      <div
        role="radiogroup"
        aria-label={legend}
        className={cn(
          'flex gap-2',
          layout === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
        )}
      >
        {options.map((opt) => {
          const id = `radio-${reactId}-${opt.value}`;
          const checked = value === opt.value;
          return (
            <RadioOptionRow
              key={opt.value}
              id={id}
              name={name}
              option={opt}
              checked={checked}
              onSelect={() => !opt.disabled && onValueChange(opt.value)}
            />
          );
        })}
      </div>
    </fieldset>
  );
}

function RadioOptionRow<T extends string>({
  id,
  name,
  option,
  checked,
  onSelect,
}: {
  id: string;
  name: string;
  option: RadioOption<T>;
  checked: boolean;
  onSelect: () => void;
}): JSX.Element {
  const helperId = option.helper ? `${id}-helper` : undefined;
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex items-start gap-3 min-h-[44px] py-2 px-3 rounded-card-sm cursor-pointer select-none',
        'border transition-colors duration-150 ease-base',
        checked
          ? 'border-gold-bright bg-gold-bright/[0.08]'
          : 'border-soft bg-bg-3/30 hover:border-glow',
        option.disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <input
        id={id}
        name={name}
        type="radio"
        value={option.value}
        checked={checked}
        disabled={option.disabled}
        onChange={onSelect}
        aria-describedby={helperId}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          'mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
          'border border-soft bg-bg-3/40',
          'transition-colors duration-150 ease-base',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-gold-bright/40',
          checked && 'border-gold',
        )}
      >
        <span
          className={cn(
            'h-2.5 w-2.5 rounded-full bg-gradient-to-b from-gold-bright to-gold',
            'transition-opacity duration-150 ease-base',
            checked ? 'opacity-100' : 'opacity-0',
          )}
        />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="font-serif text-body text-text">{option.label}</span>
        {option.helper ? (
          <span id={helperId} className="font-serif text-[13px] text-text-tertiary">
            {option.helper}
          </span>
        ) : null}
      </span>
    </label>
  );
}
