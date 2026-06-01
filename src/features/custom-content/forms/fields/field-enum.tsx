import { FormField, Select, type SelectOption } from '@/shared/components/form';

/**
 * Champ d'énumération (label + Select + helper/error) — primitive partagée des
 * formulaires d'entité custom-content (JALON 3C).
 *
 * Wrap le `Select` WAI-ARIA APG du form-kit projet (cf. plan 05 §0.3 — pas de
 * `<select>` natif, conflit chrome système / palette). Le parent passe la
 * liste d'options et la valeur courante en mode contrôlé.
 */
interface FieldEnumProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  helper?: string;
  error?: string;
  required?: boolean;
  /** Identifie le champ dans le DOM pour les tests e2e (data-testid). */
  testId?: string;
}

export function FieldEnum({
  label,
  value,
  options,
  onChange,
  placeholder,
  helper,
  error,
  required,
  testId,
}: FieldEnumProps): JSX.Element {
  return (
    <FormField
      label={label}
      helper={helper}
      error={error}
      required={required}
    >
      {(fieldProps) => (
        <div data-testid={testId}>
          <Select
            {...fieldProps}
            options={options}
            value={value}
            onValueChange={onChange}
            placeholder={placeholder}
          />
        </div>
      )}
    </FormField>
  );
}
