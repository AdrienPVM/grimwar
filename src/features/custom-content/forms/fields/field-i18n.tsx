import { FieldString } from './field-string';

/**
 * Doublet i18n {fr, en} — primitive partagée par tous les formulaires d'entité
 * (JALON 3C). FR est requis (validé par `I18nSchema`) ; EN est optionnel.
 *
 * On rend deux `FieldString` côte à côte pour rester économe en clics : sur
 * mobile ils empilent, sur desktop ils tiennent sur une ligne (grid 2 cols).
 */
interface FieldI18nProps {
  labelFr: string;
  labelEn: string;
  valueFr: string;
  valueEn: string;
  onChangeFr: (value: string) => void;
  onChangeEn: (value: string) => void;
  helperFr?: string;
  errorFr?: string;
  errorEn?: string;
  requiredFr?: boolean;
  testIdFr?: string;
  testIdEn?: string;
}

export function FieldI18n({
  labelFr,
  labelEn,
  valueFr,
  valueEn,
  onChangeFr,
  onChangeEn,
  helperFr,
  errorFr,
  errorEn,
  requiredFr,
  testIdFr,
  testIdEn,
}: FieldI18nProps): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FieldString
        label={labelFr}
        value={valueFr}
        onChange={onChangeFr}
        helper={helperFr}
        error={errorFr}
        required={requiredFr}
        testId={testIdFr}
      />
      <FieldString
        label={labelEn}
        value={valueEn}
        onChange={onChangeEn}
        error={errorEn}
        testId={testIdEn}
      />
    </div>
  );
}
