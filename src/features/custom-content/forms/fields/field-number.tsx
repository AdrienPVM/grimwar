import { FormField, NumberInput } from '@/shared/components/form';

/**
 * Champ numérique avec steppers (label + NumberInput + helper/error) —
 * primitive partagée des formulaires d'entité custom-content (JALON 3C).
 *
 * Mode contrôlé strict : la valeur est toujours un `number`. Pour modéliser un
 * champ optionnel (Zod `.nullable()`), le parent rend le `FieldNumber` derrière
 * un toggle dédié — c'est plus clair UX qu'un input qui « peut être vide ».
 */
interface FieldNumberProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  helper?: string;
  error?: string;
  required?: boolean;
  decrementLabel?: string;
  incrementLabel?: string;
  /** Identifie le champ dans le DOM pour les tests e2e (data-testid). */
  testId?: string;
}

export function FieldNumber({
  label,
  value,
  onChange,
  min,
  max,
  step,
  helper,
  error,
  required,
  decrementLabel,
  incrementLabel,
  testId,
}: FieldNumberProps): JSX.Element {
  return (
    <FormField
      label={label}
      helper={helper}
      error={error}
      required={required}
    >
      {(fieldProps) => (
        <NumberInput
          {...fieldProps}
          value={value}
          min={min}
          max={max}
          step={step}
          onValueChange={onChange}
          decrementLabel={decrementLabel}
          incrementLabel={incrementLabel}
          data-testid={testId}
        />
      )}
    </FormField>
  );
}
