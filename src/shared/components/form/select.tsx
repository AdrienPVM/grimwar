import { forwardRef, type ReactNode, type SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';
import { inputBaseClasses } from './input-base';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

type NativeProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'>;

interface SelectProps extends NativeProps {
  options: SelectOption[];
  /** Option de placeholder, affichée si `value === ''`. Désactivée à la sélection. */
  placeholder?: string;
}

/**
 * Wrapper autour de `<select>` natif. Choix tactique (plan 05 §B.4) :
 * on délègue à la plateforme l'a11y mobile (sheet picker iOS, dropdown Android).
 * Une combobox custom serait plus jolie mais introduirait un risque a11y évitable.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, placeholder, className, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        inputBaseClasses,
        'font-serif text-body appearance-none',
        // Chevron custom via background-image (pas d'icon component imbriqué dans un select natif)
        'bg-[url("data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2020%2020%27%20fill%3D%27%23f0d28a%27%3E%3Cpath%20d%3D%27M5.5%208L10%2012.5L14.5%208z%27%2F%3E%3C%2Fsvg%3E")] bg-no-repeat bg-[length:20px_20px] bg-[right_0.75rem_center] pr-10',
        className,
      )}
      {...rest}
    >
      {placeholder ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
  );
});

/**
 * Variant de `<Select />` qui accepte des `<option>` enfants quand l'appelant
 * a besoin de regrouper via `<optgroup>` ou de styliser les options.
 */
export function SelectWithChildren({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>): JSX.Element {
  return (
    <select
      className={cn(
        inputBaseClasses,
        'font-serif text-body appearance-none',
        'bg-[url("data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2020%2020%27%20fill%3D%27%23f0d28a%27%3E%3Cpath%20d%3D%27M5.5%208L10%2012.5L14.5%208z%27%2F%3E%3C%2Fsvg%3E")] bg-no-repeat bg-[length:20px_20px] bg-[right_0.75rem_center] pr-10',
        className,
      )}
      {...rest}
    >
      {children as ReactNode}
    </select>
  );
}
