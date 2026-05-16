import { useId, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface FormFieldChildProps {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: 'true' | 'false';
}

interface FormFieldProps {
  /** Label visible et lu par AT. Pas de label caché par défaut — on rejette le pattern. */
  label: string;
  /** Aide neutre sous le champ. Pas affichée si error présent. */
  helper?: string;
  /** Message d'erreur. Quand présent → aria-invalid=true sur le child. */
  error?: string;
  /** Optionnel : rendu de l'erreur masqué visuellement (utile pour validation live). */
  required?: boolean;
  /**
   * Render-prop : reçoit `id`, `aria-describedby`, `aria-invalid` à appliquer
   * sur l'input natif. Pattern volontairement explicite : pas de `cloneElement`
   * (perd le typage), pas de Context (couplage trop fort), pas d'auto-wiring
   * caché. Le composant enfant garde le contrôle complet de ses props.
   */
  children: (fieldProps: FormFieldChildProps) => ReactNode;
  className?: string;
}

/**
 * Wrapper accessible label + slot + helper + error.
 *
 * Garanties a11y (plan 05 §B.1) :
 * - `label` lié à l'input via `htmlFor`/`id` (cliquer le label focus l'input).
 * - `error` lié à l'input via `aria-describedby` (lu par lecteur d'écran à la perte de focus).
 * - `aria-invalid="true"` sur l'input quand error présent.
 * - Helper et error empilent leurs IDs dans `aria-describedby` quand les deux existent.
 */
export function FormField({
  label,
  helper,
  error,
  required,
  children,
  className,
}: FormFieldProps): JSX.Element {
  const reactId = useId();
  const inputId = `field-${reactId}`;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  const describedBy =
    [error ? errorId : null, helper ? helperId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={inputId}
        className="font-title text-meta text-text-secondary uppercase tracking-[0.16em]"
      >
        {label}
        {required ? <span className="ml-1 text-crimson">*</span> : null}
      </label>
      {children({
        id: inputId,
        'aria-describedby': describedBy,
        'aria-invalid': error ? 'true' : 'false',
      })}
      {helper && !error ? (
        <p id={helperId} className="font-serif text-[13px] text-text-tertiary">
          {helper}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="font-serif text-[13px] text-crimson">
          {error}
        </p>
      ) : null}
    </div>
  );
}
