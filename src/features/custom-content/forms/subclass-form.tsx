import { useCallback, useState } from 'react';

import { Button } from '@/shared/components/button';
import { Divider } from '@/shared/components/divider';
import { GlassPanel } from '@/shared/components/glass-panel';
import { useContent } from '@/shared/hooks/use-content';
import { t } from '@/shared/lib/i18n';
import { SubclassSchema, type Subclass } from '@/shared/types/content';

import { FieldEnum } from './fields/field-enum';
import { FieldI18n } from './fields/field-i18n';
import { FieldNumber } from './fields/field-number';
import { FieldString } from './fields/field-string';

/**
 * Formulaire de création d'une Sous-classe custom (JALON 3C.5).
 *
 * Schéma source : `SubclassSchema`. Surface :
 *   - id (slug), classId (Select alimenté par `useContent('classes')`)
 *   - name (i18n FR requis), description (i18n FR requis)
 *   - features[] : répéteur de { level int 1-20, name i18n, description i18n }
 *
 * Heterogeneité SRD : Champion / Beast Master / Battle Master n'ont pas la
 * même forme de features (Maneuvers, Companion, etc.). Pour V1 on offre un
 * répéteur libre `features[]` typé par level — l'utilisateur encode sa
 * sous-classe comme une suite de features par niveau. C'est suffisamment
 * expressif pour 80 % des sous-classes custom ; les 20 % restantes
 * (sous-classes avec sous-systèmes propres : maneuvers, infusions…) restent
 * passables par import fichier JSON.
 *
 * classId est résolu par `useContent('classes')` qui fusionne déjà SRD ∪
 * packs custom user ∪ packs custom campagne (cf. content-loader 3B.5). Une
 * sous-classe référant une classe encore en draft DANS le pack en cours
 * d'édition n'est PAS résolue ici — ce raffinement attendra une passe edit
 * mode (3C.10).
 *
 * `source` est figé à `aidedd-homebrew` — convention partagée 3C.
 */

interface SubclassFeatureDraft {
  level: number;
  nameFr: string;
  nameEn: string;
  descriptionFr: string;
  descriptionEn: string;
}

export interface SubclassFormDraft {
  id: string;
  classId: string;
  nameFr: string;
  nameEn: string;
  descriptionFr: string;
  descriptionEn: string;
  features: SubclassFeatureDraft[];
}

export const EMPTY_SUBCLASS_FEATURE_DRAFT: SubclassFeatureDraft = {
  level: 3,
  nameFr: '',
  nameEn: '',
  descriptionFr: '',
  descriptionEn: '',
};

export const EMPTY_SUBCLASS_DRAFT: SubclassFormDraft = {
  id: '',
  classId: '',
  nameFr: '',
  nameEn: '',
  descriptionFr: '',
  descriptionEn: '',
  features: [],
};

export function buildSubclassFromDraft(draft: SubclassFormDraft): Subclass {
  return {
    id: draft.id.trim(),
    classId: draft.classId.trim(),
    name: {
      fr: draft.nameFr.trim(),
      ...(draft.nameEn.trim() ? { en: draft.nameEn.trim() } : {}),
    },
    description: {
      fr: draft.descriptionFr.trim(),
      ...(draft.descriptionEn.trim() ? { en: draft.descriptionEn.trim() } : {}),
    },
    features: draft.features.map((feature) => ({
      level: feature.level,
      name: {
        fr: feature.nameFr.trim(),
        ...(feature.nameEn.trim() ? { en: feature.nameEn.trim() } : {}),
      },
      description: {
        fr: feature.descriptionFr.trim(),
        ...(feature.descriptionEn.trim()
          ? { en: feature.descriptionEn.trim() }
          : {}),
      },
    })),
    source: 'aidedd-homebrew',
  };
}

export function draftFromSubclass(sub: Subclass): SubclassFormDraft {
  return {
    id: sub.id,
    classId: sub.classId,
    nameFr: sub.name.fr,
    nameEn: sub.name.en ?? '',
    descriptionFr: sub.description.fr,
    descriptionEn: sub.description.en ?? '',
    features: sub.features.map((feature) => ({
      level: feature.level,
      nameFr: feature.name.fr,
      nameEn: feature.name.en ?? '',
      descriptionFr: feature.description.fr,
      descriptionEn: feature.description.en ?? '',
    })),
  };
}

export function validateSubclassDraft(
  draft: SubclassFormDraft,
):
  | { ok: true; subclass: Subclass }
  | {
      ok: false;
      fieldErrors: Partial<Record<keyof SubclassFormDraft, string>>;
    } {
  const fieldErrors: Partial<Record<keyof SubclassFormDraft, string>> = {};
  if (!draft.id.trim()) {
    fieldErrors.id = t('customContent.editor.subclassForm.error.idRequired');
  } else if (!/^[a-z0-9-]+$/.test(draft.id.trim())) {
    fieldErrors.id = t('customContent.editor.subclassForm.error.idFormat');
  }
  if (!draft.classId.trim()) {
    fieldErrors.classId = t(
      'customContent.editor.subclassForm.error.classIdRequired',
    );
  }
  if (!draft.nameFr.trim()) {
    fieldErrors.nameFr = t(
      'customContent.editor.subclassForm.error.nameFrRequired',
    );
  }
  if (!draft.descriptionFr.trim()) {
    fieldErrors.descriptionFr = t(
      'customContent.editor.subclassForm.error.descriptionFrRequired',
    );
  }
  // Une feature sans nom FR ou sans description FR rendrait la sous-classe
  // ininterprétable côté joueur — on bloque AVANT le safeParse pour donner un
  // message plus actionnable que celui que Zod produirait.
  for (const feature of draft.features) {
    if (!feature.nameFr.trim() || !feature.descriptionFr.trim()) {
      fieldErrors.features = t(
        'customContent.editor.subclassForm.error.featureIncomplete',
      );
      break;
    }
  }
  // Doublon de level admis (une sous-classe peut avoir 2 features au même
  // niveau), mais on alerte si l'utilisateur a accidentellement mis 2 fois la
  // même paire (level, nameFr).
  const seenFeatures = new Set<string>();
  for (const feature of draft.features) {
    const key = `${feature.level}:${feature.nameFr.trim().toLowerCase()}`;
    if (feature.nameFr.trim() && seenFeatures.has(key)) {
      fieldErrors.features = t(
        'customContent.editor.subclassForm.error.featureDuplicate',
      );
      break;
    }
    seenFeatures.add(key);
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  const candidate = buildSubclassFromDraft(draft);
  const parsed = SubclassSchema.safeParse(candidate);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const fieldKey = String(issue?.path[0] ?? 'id') as keyof SubclassFormDraft;
    fieldErrors[fieldKey] = issue?.message ?? 'invalid';
    return { ok: false, fieldErrors };
  }
  return { ok: true, subclass: parsed.data };
}

interface SubclassFormProps {
  draft: SubclassFormDraft;
  onChange: (draft: SubclassFormDraft) => void;
  onConfirm: (subclass: Subclass) => void;
  onCancel: () => void;
}

export function SubclassForm({
  draft,
  onChange,
  onConfirm,
  onCancel,
}: SubclassFormProps): JSX.Element {
  const { data: classes, loading: classesLoading } = useContent('classes');
  const [errors, setErrors] = useState<
    Partial<Record<keyof SubclassFormDraft, string>>
  >({});

  const update = useCallback(
    <K extends keyof SubclassFormDraft>(
      key: K,
      value: SubclassFormDraft[K],
    ) => {
      onChange({ ...draft, [key]: value });
      if (errors[key]) {
        setErrors((prev) => ({ ...prev, [key]: undefined }));
      }
    },
    [draft, errors, onChange],
  );

  const handleConfirm = useCallback(() => {
    const result = validateSubclassDraft(draft);
    if (!result.ok) {
      setErrors(result.fieldErrors);
      return;
    }
    setErrors({});
    onConfirm(result.subclass);
  }, [draft, onConfirm]);

  const classOptions = classes.map((c) => ({
    value: c.id,
    label: c.name.fr,
  }));

  const addFeature = (): void => {
    update('features', [...draft.features, EMPTY_SUBCLASS_FEATURE_DRAFT]);
  };
  const updateFeature = (
    idx: number,
    patch: Partial<SubclassFeatureDraft>,
  ): void => {
    update(
      'features',
      draft.features.map((feature, i) =>
        i === idx ? { ...feature, ...patch } : feature,
      ),
    );
  };
  const removeFeature = (idx: number): void => {
    update(
      'features',
      draft.features.filter((_, i) => i !== idx),
    );
  };

  return (
    <GlassPanel className="px-6 py-6" data-testid="subclass-form">
      <h3 className="font-title text-body uppercase tracking-[0.18em] text-gold-bright">
        {t('customContent.editor.subclassForm.title')}
      </h3>
      <Divider className="my-4" />
      <div className="flex flex-col gap-4">
        <FieldString
          label={t('customContent.editor.subclassForm.id')}
          value={draft.id}
          onChange={(value) => update('id', value)}
          helper={t('customContent.editor.subclassForm.idHelper')}
          error={errors.id}
          required
          testId="subclass-form-id"
        />
        <FieldEnum
          label={t('customContent.editor.subclassForm.classId')}
          value={draft.classId}
          options={classOptions}
          onChange={(value) => update('classId', value)}
          placeholder={
            classesLoading
              ? t('customContent.editor.subclassForm.classIdLoading')
              : t('customContent.editor.subclassForm.classIdPlaceholder')
          }
          helper={t('customContent.editor.subclassForm.classIdHelper')}
          error={errors.classId}
          required
          testId="subclass-form-class-id"
        />
        <FieldI18n
          labelFr={t('customContent.editor.subclassForm.nameFr')}
          labelEn={t('customContent.editor.subclassForm.nameEn')}
          valueFr={draft.nameFr}
          valueEn={draft.nameEn}
          onChangeFr={(value) => update('nameFr', value)}
          onChangeEn={(value) => update('nameEn', value)}
          requiredFr
          errorFr={errors.nameFr}
          testIdFr="subclass-form-name-fr"
          testIdEn="subclass-form-name-en"
        />
        <FieldI18n
          labelFr={t('customContent.editor.subclassForm.descriptionFr')}
          labelEn={t('customContent.editor.subclassForm.descriptionEn')}
          valueFr={draft.descriptionFr}
          valueEn={draft.descriptionEn}
          onChangeFr={(value) => update('descriptionFr', value)}
          onChangeEn={(value) => update('descriptionEn', value)}
          requiredFr
          errorFr={errors.descriptionFr}
          testIdFr="subclass-form-description-fr"
          testIdEn="subclass-form-description-en"
        />

        {/* Features repeater */}
        <fieldset
          className="rounded-card border border-soft px-4 py-4"
          data-testid="subclass-form-features"
        >
          <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('customContent.editor.subclassForm.featuresLegend')}
          </legend>
          <p className="mt-1 font-serif text-[13px] text-text-tertiary">
            {t('customContent.editor.subclassForm.featuresHelper')}
          </p>
          {draft.features.length === 0 ? (
            <p
              className="mt-3 font-serif text-body-sm italic text-text-secondary"
              data-testid="subclass-form-features-empty"
            >
              {t('customContent.editor.subclassForm.featuresEmpty')}
            </p>
          ) : (
            <ul className="mt-3 space-y-4">
              {draft.features.map((feature, idx) => (
                <li
                  key={idx}
                  className="rounded-card border border-white-8 bg-glass px-4 py-4 backdrop-blur-xl"
                  data-testid="subclass-form-feature-row"
                  data-feature-index={idx}
                >
                  <FieldNumber
                    label={t(
                      'customContent.editor.subclassForm.featureLevel',
                    )}
                    value={feature.level}
                    onChange={(value) => updateFeature(idx, { level: value })}
                    min={1}
                    max={20}
                    step={1}
                    required
                    testId={`subclass-form-feature-level-${idx}`}
                  />
                  <div className="mt-3">
                    <FieldI18n
                      labelFr={t(
                        'customContent.editor.subclassForm.featureNameFr',
                      )}
                      labelEn={t(
                        'customContent.editor.subclassForm.featureNameEn',
                      )}
                      valueFr={feature.nameFr}
                      valueEn={feature.nameEn}
                      onChangeFr={(value) =>
                        updateFeature(idx, { nameFr: value })
                      }
                      onChangeEn={(value) =>
                        updateFeature(idx, { nameEn: value })
                      }
                      requiredFr
                      testIdFr={`subclass-form-feature-name-fr-${idx}`}
                      testIdEn={`subclass-form-feature-name-en-${idx}`}
                    />
                  </div>
                  <div className="mt-3">
                    <FieldI18n
                      labelFr={t(
                        'customContent.editor.subclassForm.featureDescriptionFr',
                      )}
                      labelEn={t(
                        'customContent.editor.subclassForm.featureDescriptionEn',
                      )}
                      valueFr={feature.descriptionFr}
                      valueEn={feature.descriptionEn}
                      onChangeFr={(value) =>
                        updateFeature(idx, { descriptionFr: value })
                      }
                      onChangeEn={(value) =>
                        updateFeature(idx, { descriptionEn: value })
                      }
                      requiredFr
                      testIdFr={`subclass-form-feature-description-fr-${idx}`}
                      testIdEn={`subclass-form-feature-description-en-${idx}`}
                    />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFeature(idx)}
                      data-testid={`subclass-form-feature-remove-${idx}`}
                    >
                      {t('customContent.editor.subclassForm.removeRow')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {errors.features ? (
            <p
              className="mt-2 font-serif text-[13px] text-crimson"
              role="alert"
            >
              {errors.features}
            </p>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            onClick={addFeature}
            data-testid="subclass-form-feature-add"
            className="mt-4"
          >
            {t('customContent.editor.subclassForm.featureAdd')}
          </Button>
        </fieldset>
      </div>
      <div className="mt-7 flex flex-wrap justify-end gap-3">
        <Button
          variant="secondary"
          size="md"
          onClick={onCancel}
          data-testid="subclass-form-cancel"
        >
          {t('customContent.editor.subclassForm.cancel')}
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleConfirm}
          data-testid="subclass-form-confirm"
        >
          {t('customContent.editor.subclassForm.confirm')}
        </Button>
      </div>
    </GlassPanel>
  );
}
