import { type ChangeEvent } from 'react';

import { FormField, TextInput } from '@/shared/components/form';

/**
 * Champ texte simple (label + input + helper/error) — primitive partagée par
 * tous les formulaires d'entité custom-content (JALON 3C).
 *
 * Wrap `<TextInput>` (form-kit du projet) dans un `<FormField>` qui pose le
 * label visible, l'aria-describedby et l'aria-invalid. La valeur est gérée
 * en mode contrôlé ; le parent décide quand valider.
 */
interface FieldStringProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
  error?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  /**
   * Lecture seule — l'utilisateur voit le contenu mais ne peut pas le
   * modifier. Pratique pour bloquer l'`id` de pack en mode édition (3C.10)
   * où changer l'id équivaut à créer un autre document Firestore.
   */
  readOnly?: boolean;
  /** Identifie le champ dans le DOM pour les tests e2e (data-testid). */
  testId?: string;
}

export function FieldString({
  label,
  value,
  onChange,
  helper,
  error,
  required,
  placeholder,
  className,
  readOnly,
  testId,
}: FieldStringProps): JSX.Element {
  return (
    <FormField
      label={label}
      helper={helper}
      error={error}
      required={required}
      className={className}
    >
      {(fieldProps) => (
        <TextInput
          {...fieldProps}
          value={value}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onChange(event.target.value)
          }
          placeholder={placeholder}
          readOnly={readOnly}
          data-testid={testId}
        />
      )}
    </FormField>
  );
}
