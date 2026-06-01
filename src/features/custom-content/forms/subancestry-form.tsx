import { useCallback, useState } from 'react';

import { Button } from '@/shared/components/button';
import { Divider } from '@/shared/components/divider';
import { GlassPanel } from '@/shared/components/glass-panel';
import { useContent } from '@/shared/hooks/use-content';
import { t, type StringKey } from '@/shared/lib/i18n';
import {
  SubancestrySchema,
  type Subancestry,
} from '@/shared/types/content';

import { FieldEnum } from './fields/field-enum';
import { FieldI18n } from './fields/field-i18n';
import { FieldNumber } from './fields/field-number';
import { FieldString } from './fields/field-string';

/**
 * Formulaire de création d'une sous-ascendance custom (JALON 3C.3).
 *
 * Schéma source : `SubancestrySchema`. Surface :
 *   - id (slug), ancestryId (Select alimenté par `useContent('ancestries')`)
 *   - name (i18n FR requis), description (i18n FR requis)
 *   - traits[] : répéteur de { name i18n, description i18n }
 *   - abilityScoreIncrease[] : répéteur de { ability enum, bonus int }
 *
 * ancestryId est résolu par `useContent('ancestries')` qui fusionne déjà
 * SRD ∪ packs custom user ∪ packs custom campagne (cf. content-loader 3B.5).
 * Une subancestry référant une ancestry encore en draft DANS le pack en cours
 * d'édition n'est PAS résolue ici — ce raffinement attendra une passe edit
 * mode (3C.10).
 *
 * `source` est figé à `aidedd-homebrew`.
 */

const ABILITY_KEYS = ['for', 'dex', 'con', 'int', 'sag', 'cha'] as const;
type AbilityKey = (typeof ABILITY_KEYS)[number];

interface AsiDraft {
  ability: AbilityKey | '';
  bonus: number;
}

interface TraitDraft {
  nameFr: string;
  nameEn: string;
  descriptionFr: string;
  descriptionEn: string;
}

export interface SubancestryFormDraft {
  id: string;
  ancestryId: string;
  nameFr: string;
  nameEn: string;
  descriptionFr: string;
  descriptionEn: string;
  asis: AsiDraft[];
  traits: TraitDraft[];
}

export const EMPTY_TRAIT_DRAFT: TraitDraft = {
  nameFr: '',
  nameEn: '',
  descriptionFr: '',
  descriptionEn: '',
};

export const EMPTY_ASI_DRAFT: AsiDraft = {
  ability: '',
  bonus: 1,
};

export const EMPTY_SUBANCESTRY_DRAFT: SubancestryFormDraft = {
  id: '',
  ancestryId: '',
  nameFr: '',
  nameEn: '',
  descriptionFr: '',
  descriptionEn: '',
  asis: [],
  traits: [],
};

export function buildSubancestryFromDraft(
  draft: SubancestryFormDraft,
): Subancestry {
  return {
    id: draft.id.trim(),
    ancestryId: draft.ancestryId.trim(),
    name: {
      fr: draft.nameFr.trim(),
      ...(draft.nameEn.trim() ? { en: draft.nameEn.trim() } : {}),
    },
    description: {
      fr: draft.descriptionFr.trim(),
      ...(draft.descriptionEn.trim() ? { en: draft.descriptionEn.trim() } : {}),
    },
    traits: draft.traits.map((trait) => ({
      name: {
        fr: trait.nameFr.trim(),
        ...(trait.nameEn.trim() ? { en: trait.nameEn.trim() } : {}),
      },
      description: {
        fr: trait.descriptionFr.trim(),
        ...(trait.descriptionEn.trim()
          ? { en: trait.descriptionEn.trim() }
          : {}),
      },
    })),
    abilityScoreIncrease: draft.asis
      .filter((asi) => asi.ability !== '')
      .map((asi) => ({
        ability: asi.ability as AbilityKey,
        bonus: asi.bonus,
      })),
    source: 'aidedd-homebrew',
  };
}

export function draftFromSubancestry(
  sub: Subancestry,
): SubancestryFormDraft {
  return {
    id: sub.id,
    ancestryId: sub.ancestryId,
    nameFr: sub.name.fr,
    nameEn: sub.name.en ?? '',
    descriptionFr: sub.description.fr,
    descriptionEn: sub.description.en ?? '',
    asis: sub.abilityScoreIncrease.map((asi) => ({
      ability: asi.ability,
      bonus: asi.bonus,
    })),
    traits: sub.traits.map((trait) => ({
      nameFr: trait.name.fr,
      nameEn: trait.name.en ?? '',
      descriptionFr: trait.description.fr,
      descriptionEn: trait.description.en ?? '',
    })),
  };
}

export function validateSubancestryDraft(
  draft: SubancestryFormDraft,
):
  | { ok: true; subancestry: Subancestry }
  | {
      ok: false;
      fieldErrors: Partial<Record<keyof SubancestryFormDraft, string>>;
    } {
  const fieldErrors: Partial<Record<keyof SubancestryFormDraft, string>> = {};
  if (!draft.id.trim()) {
    fieldErrors.id = t('customContent.editor.subancestryForm.error.idRequired');
  } else if (!/^[a-z0-9-]+$/.test(draft.id.trim())) {
    fieldErrors.id = t('customContent.editor.subancestryForm.error.idFormat');
  }
  if (!draft.ancestryId.trim()) {
    fieldErrors.ancestryId = t(
      'customContent.editor.subancestryForm.error.ancestryIdRequired',
    );
  }
  if (!draft.nameFr.trim()) {
    fieldErrors.nameFr = t(
      'customContent.editor.subancestryForm.error.nameFrRequired',
    );
  }
  if (!draft.descriptionFr.trim()) {
    fieldErrors.descriptionFr = t(
      'customContent.editor.subancestryForm.error.descriptionFrRequired',
    );
  }
  // ASI partiels (ability vide) seraient silencieusement filtrés par
  // buildSubancestryFromDraft, mais on prévient l'utilisateur que sa ligne
  // ne sera pas conservée — clearer UX.
  if (draft.asis.some((asi) => asi.ability === '')) {
    fieldErrors.asis = t(
      'customContent.editor.subancestryForm.error.asiAbilityRequired',
    );
  }
  // Pas de doublon d'ability dans les ASI (chaque ability au plus une fois).
  const abilitiesSeen = new Set<string>();
  for (const asi of draft.asis) {
    if (asi.ability === '') continue;
    if (abilitiesSeen.has(asi.ability)) {
      fieldErrors.asis = t(
        'customContent.editor.subancestryForm.error.asiDuplicate',
      );
    }
    abilitiesSeen.add(asi.ability);
  }
  // Trait FR name + description requis pour chaque ligne (sinon noise).
  for (const trait of draft.traits) {
    if (!trait.nameFr.trim() || !trait.descriptionFr.trim()) {
      fieldErrors.traits = t(
        'customContent.editor.subancestryForm.error.traitIncomplete',
      );
      break;
    }
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  const candidate = buildSubancestryFromDraft(draft);
  const parsed = SubancestrySchema.safeParse(candidate);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const fieldKey = String(
      issue?.path[0] ?? 'id',
    ) as keyof SubancestryFormDraft;
    fieldErrors[fieldKey] = issue?.message ?? 'invalid';
    return { ok: false, fieldErrors };
  }
  return { ok: true, subancestry: parsed.data };
}

interface SubancestryFormProps {
  draft: SubancestryFormDraft;
  onChange: (draft: SubancestryFormDraft) => void;
  onConfirm: (subancestry: Subancestry) => void;
  onCancel: () => void;
}

export function SubancestryForm({
  draft,
  onChange,
  onConfirm,
  onCancel,
}: SubancestryFormProps): JSX.Element {
  const { data: ancestries, loading: ancestriesLoading } = useContent('ancestries');
  const [errors, setErrors] = useState<
    Partial<Record<keyof SubancestryFormDraft, string>>
  >({});

  const update = useCallback(
    <K extends keyof SubancestryFormDraft>(
      key: K,
      value: SubancestryFormDraft[K],
    ) => {
      onChange({ ...draft, [key]: value });
      if (errors[key]) {
        setErrors((prev) => ({ ...prev, [key]: undefined }));
      }
    },
    [draft, errors, onChange],
  );

  const handleConfirm = useCallback(() => {
    const result = validateSubancestryDraft(draft);
    if (!result.ok) {
      setErrors(result.fieldErrors);
      return;
    }
    setErrors({});
    onConfirm(result.subancestry);
  }, [draft, onConfirm]);

  const ancestryOptions = ancestries.map((a) => ({
    value: a.id,
    label: a.name.fr,
  }));

  const abilityOptions = ABILITY_KEYS.map((key) => ({
    value: key,
    label: t(`ability.${key}` as StringKey),
  }));

  const addAsi = (): void => {
    update('asis', [...draft.asis, EMPTY_ASI_DRAFT]);
  };
  const updateAsi = (idx: number, patch: Partial<AsiDraft>): void => {
    update(
      'asis',
      draft.asis.map((asi, i) => (i === idx ? { ...asi, ...patch } : asi)),
    );
  };
  const removeAsi = (idx: number): void => {
    update(
      'asis',
      draft.asis.filter((_, i) => i !== idx),
    );
  };

  const addTrait = (): void => {
    update('traits', [...draft.traits, EMPTY_TRAIT_DRAFT]);
  };
  const updateTrait = (idx: number, patch: Partial<TraitDraft>): void => {
    update(
      'traits',
      draft.traits.map((trait, i) =>
        i === idx ? { ...trait, ...patch } : trait,
      ),
    );
  };
  const removeTrait = (idx: number): void => {
    update(
      'traits',
      draft.traits.filter((_, i) => i !== idx),
    );
  };

  const atMaxAsi = draft.asis.length >= ABILITY_KEYS.length;

  return (
    <GlassPanel className="px-6 py-6" data-testid="subancestry-form">
      <h3 className="font-title text-body uppercase tracking-[0.18em] text-gold-bright">
        {t('customContent.editor.subancestryForm.title')}
      </h3>
      <Divider className="my-4" />
      <div className="flex flex-col gap-4">
        <FieldString
          label={t('customContent.editor.subancestryForm.id')}
          value={draft.id}
          onChange={(value) => update('id', value)}
          helper={t('customContent.editor.subancestryForm.idHelper')}
          error={errors.id}
          required
          testId="subancestry-form-id"
        />
        <FieldEnum
          label={t('customContent.editor.subancestryForm.ancestryId')}
          value={draft.ancestryId}
          options={ancestryOptions}
          onChange={(value) => update('ancestryId', value)}
          placeholder={
            ancestriesLoading
              ? t('customContent.editor.subancestryForm.ancestryIdLoading')
              : t('customContent.editor.subancestryForm.ancestryIdPlaceholder')
          }
          helper={t('customContent.editor.subancestryForm.ancestryIdHelper')}
          error={errors.ancestryId}
          required
          testId="subancestry-form-ancestry-id"
        />
        <FieldI18n
          labelFr={t('customContent.editor.subancestryForm.nameFr')}
          labelEn={t('customContent.editor.subancestryForm.nameEn')}
          valueFr={draft.nameFr}
          valueEn={draft.nameEn}
          onChangeFr={(value) => update('nameFr', value)}
          onChangeEn={(value) => update('nameEn', value)}
          requiredFr
          errorFr={errors.nameFr}
          testIdFr="subancestry-form-name-fr"
          testIdEn="subancestry-form-name-en"
        />
        <FieldI18n
          labelFr={t('customContent.editor.subancestryForm.descriptionFr')}
          labelEn={t('customContent.editor.subancestryForm.descriptionEn')}
          valueFr={draft.descriptionFr}
          valueEn={draft.descriptionEn}
          onChangeFr={(value) => update('descriptionFr', value)}
          onChangeEn={(value) => update('descriptionEn', value)}
          requiredFr
          errorFr={errors.descriptionFr}
          testIdFr="subancestry-form-description-fr"
          testIdEn="subancestry-form-description-en"
        />

        {/* ASI repeater */}
        <fieldset
          className="rounded-card border border-soft px-4 py-4"
          data-testid="subancestry-form-asis"
        >
          <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('customContent.editor.subancestryForm.asisLegend')}
          </legend>
          <p className="mt-1 font-serif text-[13px] text-text-tertiary">
            {t('customContent.editor.subancestryForm.asisHelper')}
          </p>
          {draft.asis.length === 0 ? (
            <p
              className="mt-3 font-serif text-body-sm italic text-text-secondary"
              data-testid="subancestry-form-asis-empty"
            >
              {t('customContent.editor.subancestryForm.asisEmpty')}
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {draft.asis.map((asi, idx) => (
                <li
                  key={idx}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr,140px,auto]"
                  data-testid="subancestry-form-asi-row"
                  data-asi-index={idx}
                >
                  <FieldEnum
                    label={t(
                      'customContent.editor.subancestryForm.asiAbility',
                    )}
                    value={asi.ability}
                    options={abilityOptions}
                    onChange={(value) =>
                      updateAsi(idx, { ability: value as AbilityKey })
                    }
                    placeholder={t(
                      'customContent.editor.subancestryForm.asiAbilityPlaceholder',
                    )}
                    required
                    testId={`subancestry-form-asi-ability-${idx}`}
                  />
                  <FieldNumber
                    label={t(
                      'customContent.editor.subancestryForm.asiBonus',
                    )}
                    value={asi.bonus}
                    onChange={(value) => updateAsi(idx, { bonus: value })}
                    min={-2}
                    max={3}
                    step={1}
                    required
                    testId={`subancestry-form-asi-bonus-${idx}`}
                  />
                  <div className="flex items-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAsi(idx)}
                      data-testid={`subancestry-form-asi-remove-${idx}`}
                    >
                      {t('customContent.editor.subancestryForm.removeRow')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {errors.asis ? (
            <p
              className="mt-2 font-serif text-[13px] text-crimson"
              role="alert"
            >
              {errors.asis}
            </p>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            onClick={addAsi}
            disabled={atMaxAsi}
            data-testid="subancestry-form-asi-add"
            className="mt-4"
          >
            {t('customContent.editor.subancestryForm.asiAdd')}
          </Button>
        </fieldset>

        {/* Traits repeater */}
        <fieldset
          className="rounded-card border border-soft px-4 py-4"
          data-testid="subancestry-form-traits"
        >
          <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('customContent.editor.subancestryForm.traitsLegend')}
          </legend>
          <p className="mt-1 font-serif text-[13px] text-text-tertiary">
            {t('customContent.editor.subancestryForm.traitsHelper')}
          </p>
          {draft.traits.length === 0 ? (
            <p
              className="mt-3 font-serif text-body-sm italic text-text-secondary"
              data-testid="subancestry-form-traits-empty"
            >
              {t('customContent.editor.subancestryForm.traitsEmpty')}
            </p>
          ) : (
            <ul className="mt-3 space-y-4">
              {draft.traits.map((trait, idx) => (
                <li
                  key={idx}
                  className="rounded-card border border-white-8 bg-glass px-4 py-4 backdrop-blur-xl"
                  data-testid="subancestry-form-trait-row"
                  data-trait-index={idx}
                >
                  <FieldI18n
                    labelFr={t(
                      'customContent.editor.subancestryForm.traitNameFr',
                    )}
                    labelEn={t(
                      'customContent.editor.subancestryForm.traitNameEn',
                    )}
                    valueFr={trait.nameFr}
                    valueEn={trait.nameEn}
                    onChangeFr={(value) => updateTrait(idx, { nameFr: value })}
                    onChangeEn={(value) => updateTrait(idx, { nameEn: value })}
                    requiredFr
                    testIdFr={`subancestry-form-trait-name-fr-${idx}`}
                    testIdEn={`subancestry-form-trait-name-en-${idx}`}
                  />
                  <div className="mt-3">
                    <FieldI18n
                      labelFr={t(
                        'customContent.editor.subancestryForm.traitDescriptionFr',
                      )}
                      labelEn={t(
                        'customContent.editor.subancestryForm.traitDescriptionEn',
                      )}
                      valueFr={trait.descriptionFr}
                      valueEn={trait.descriptionEn}
                      onChangeFr={(value) =>
                        updateTrait(idx, { descriptionFr: value })
                      }
                      onChangeEn={(value) =>
                        updateTrait(idx, { descriptionEn: value })
                      }
                      requiredFr
                      testIdFr={`subancestry-form-trait-description-fr-${idx}`}
                      testIdEn={`subancestry-form-trait-description-en-${idx}`}
                    />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTrait(idx)}
                      data-testid={`subancestry-form-trait-remove-${idx}`}
                    >
                      {t('customContent.editor.subancestryForm.removeRow')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {errors.traits ? (
            <p
              className="mt-2 font-serif text-[13px] text-crimson"
              role="alert"
            >
              {errors.traits}
            </p>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            onClick={addTrait}
            data-testid="subancestry-form-trait-add"
            className="mt-4"
          >
            {t('customContent.editor.subancestryForm.traitAdd')}
          </Button>
        </fieldset>
      </div>
      <div className="mt-7 flex flex-wrap justify-end gap-3">
        <Button
          variant="secondary"
          size="md"
          onClick={onCancel}
          data-testid="subancestry-form-cancel"
        >
          {t('customContent.editor.subancestryForm.cancel')}
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleConfirm}
          data-testid="subancestry-form-confirm"
        >
          {t('customContent.editor.subancestryForm.confirm')}
        </Button>
      </div>
    </GlassPanel>
  );
}
