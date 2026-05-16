import { forwardRef, useCallback, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';
import { inputBaseClasses } from './input-base';

type NativeProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value'>;

interface NumberInputProps extends NativeProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onValueChange: (next: number) => void;
  /** Libellé pour le bouton décrément. FR par défaut, mais l'appelant peut l'i18n-iser. */
  decrementLabel?: string;
  incrementLabel?: string;
}

/**
 * Input numérique avec steppers tactiles. Boutons +/− ≥ 44px, l'input lui-même
 * reste navigable au clavier (flèches haut/bas natives).
 *
 * Le clamp est appliqué côté composant à chaque changement pour éviter les
 * états transitoires hors-bornes — les consommateurs n'ont pas à re-clamper.
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  {
    value,
    min,
    max,
    step = 1,
    onValueChange,
    decrementLabel = 'Diminuer',
    incrementLabel = 'Augmenter',
    className,
    disabled,
    ...rest
  },
  ref,
) {
  const clamp = useCallback(
    (n: number): number => {
      if (Number.isNaN(n)) return min ?? 0;
      let result = n;
      if (typeof min === 'number') result = Math.max(min, result);
      if (typeof max === 'number') result = Math.min(max, result);
      return result;
    },
    [min, max],
  );

  const handleStep = useCallback(
    (delta: number) => {
      onValueChange(clamp(value + delta));
    },
    [value, clamp, onValueChange],
  );

  const buttonClass = cn(
    'min-h-[44px] min-w-[44px] px-3 rounded-card-sm',
    'border border-soft bg-bg-3/40 text-gold-bright',
    'font-title text-base leading-none',
    'transition-colors duration-150 ease-base',
    'hover:border-glow hover:text-gold-bright',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-bright/40',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'active:scale-[0.96]',
  );

  const atMin = typeof min === 'number' && value <= min;
  const atMax = typeof max === 'number' && value >= max;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={decrementLabel}
        className={buttonClass}
        onClick={() => handleStep(-step)}
        disabled={disabled || atMin}
      >
        −
      </button>
      <input
        ref={ref}
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => onValueChange(clamp(Number(e.target.value)))}
        className={cn(
          inputBaseClasses,
          'flex-1 text-center font-title text-body tabular-nums',
          // Cache les spinners natifs (on a nos propres boutons)
          '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
          className,
        )}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        {...rest}
      />
      <button
        type="button"
        aria-label={incrementLabel}
        className={buttonClass}
        onClick={() => handleStep(step)}
        disabled={disabled || atMax}
      >
        +
      </button>
    </div>
  );
});
