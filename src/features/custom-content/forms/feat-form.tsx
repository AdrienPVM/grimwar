import { useCallback, useState } from 'react';

import { Button } from '@/shared/components/button';
import { Divider } from '@/shared/components/divider';
import { GlassPanel } from '@/shared/components/glass-panel';
import { t } from '@/shared/lib/i18n';
import { FeatSchema, type Feat } from '@/shared/types/content';

import { FieldI18n } from './fields/field-i18n';
import { FieldString } from './fields/field-string';

/**
 * Formulaire de création d'un Feat custom (JALON 3C.1).
 *
 * Surface minimale validée par `FeatSchema` : id (slug), name (i18n), summary
 * (i18n nullable), prerequisite (i18n nullable). Pas de `prerequisites[]`
 * structurés dans cette première itération — ils ont leur propre UX
 * (discriminated union) et arriveront en passe ultérieure.
 *
 * `source` est fixé à `aidedd-homebrew` — c'est le tag "non-SRD" déjà utilisé
 * par `custom-item-form.tsx` (cf. modes/avoir/) ; on garde la convention.
 *
 * Le formulaire est piloté par sa valeur (`feat` + `onChange`) pour rester
 * récursif-friendly : un parent peut le rendre dans une liste éditable. La
 * validation Zod est faite côté parent au moment du save final — ici on rend
 * simplement les champs avec les erreurs reçues.
 */

export interface FeatFormDraft {
  id: string;
  nameFr: string;
  nameEn: string;
  summaryFr: string;
  summaryEn: string;
  prerequisiteFr: string;
  prerequisiteEn: string;
}

export const EMPTY_FEAT_DRAFT: FeatFormDraft = {
  id: '',
  nameFr: '',
  nameEn: '',
  summaryFr: '',
  summaryEn: '',
  prerequisiteFr: '',
  prerequisiteEn: '',
};

/**
 * Construit un objet `Feat` à partir d'un brouillon, normalisant les champs
 * i18n optionnels en `null` quand vides — c'est ce que `FeatSchema` attend.
 */
export function buildFeatFromDraft(draft: FeatFormDraft): Feat {
  const summaryFr = draft.summaryFr.trim();
  const prerequisiteFr = draft.prerequisiteFr.trim();
  return {
    id: draft.id.trim(),
    name: {
      fr: draft.nameFr.trim(),
      ...(draft.nameEn.trim() ? { en: draft.nameEn.trim() } : {}),
    },
    summary: summaryFr
      ? {
          fr: summaryFr,
          ...(draft.summaryEn.trim() ? { en: draft.summaryEn.trim() } : {}),
        }
      : null,
    prerequisite: prerequisiteFr
      ? {
          fr: prerequisiteFr,
          ...(draft.prerequisiteEn.trim() ? { en: draft.prerequisiteEn.trim() } : {}),
        }
      : null,
    source: 'aidedd-homebrew',
  };
}

/**
 * Lit un `Feat` complet vers le format draft du formulaire — utilisé en mode
 * édition (3C.10) ; en 3C.1 seul le mode création est câblé mais on garde la
 * symétrie.
 */
export function draftFromFeat(feat: Feat): FeatFormDraft {
  return {
    id: feat.id,
    nameFr: feat.name.fr,
    nameEn: feat.name.en ?? '',
    summaryFr: feat.summary?.fr ?? '',
    summaryEn: feat.summary?.en ?? '',
    prerequisiteFr: feat.prerequisite?.fr ?? '',
    prerequisiteEn: feat.prerequisite?.en ?? '',
  };
}

/**
 * Valide un brouillon en construisant un `Feat` et en passant `FeatSchema`.
 * Retourne `{ ok: true, feat }` ou `{ ok: false, fieldErrors }`.
 */
export function validateFeatDraft(
  draft: FeatFormDraft,
):
  | { ok: true; feat: Feat }
  | { ok: false; fieldErrors: Partial<Record<keyof FeatFormDraft, string>> } {
  const fieldErrors: Partial<Record<keyof FeatFormDraft, string>> = {};
  if (!draft.id.trim()) {
    fieldErrors.id = t('customContent.editor.featForm.error.idRequired');
  } else if (!/^[a-z0-9-]+$/.test(draft.id.trim())) {
    fieldErrors.id = t('customContent.editor.featForm.error.idFormat');
  }
  if (!draft.nameFr.trim()) {
    fieldErrors.nameFr = t('customContent.editor.featForm.error.nameFrRequired');
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  const candidate = buildFeatFromDraft(draft);
  const parsed = FeatSchema.safeParse(candidate);
  if (!parsed.success) {
    // Fallback générique — les pré-checks ci-dessus capturent les cas connus,
    // celui-ci ne devrait jamais déclencher en pratique.
    const issue = parsed.error.issues[0];
    const fieldKey = String(issue?.path[0] ?? 'id') as keyof FeatFormDraft;
    fieldErrors[fieldKey] = issue?.message ?? 'invalid';
    return { ok: false, fieldErrors };
  }
  return { ok: true, feat: parsed.data };
}

interface FeatFormProps {
  draft: FeatFormDraft;
  onChange: (draft: FeatFormDraft) => void;
  onConfirm: (feat: Feat) => void;
  onCancel: () => void;
}

export function FeatForm({
  draft,
  onChange,
  onConfirm,
  onCancel,
}: FeatFormProps): JSX.Element {
  const [errors, setErrors] = useState<
    Partial<Record<keyof FeatFormDraft, string>>
  >({});

  const update = useCallback(
    <K extends keyof FeatFormDraft>(key: K, value: FeatFormDraft[K]) => {
      onChange({ ...draft, [key]: value });
      if (errors[key]) {
        setErrors((prev) => ({ ...prev, [key]: undefined }));
      }
    },
    [draft, errors, onChange],
  );

  const handleConfirm = useCallback(() => {
    const result = validateFeatDraft(draft);
    if (!result.ok) {
      setErrors(result.fieldErrors);
      return;
    }
    setErrors({});
    onConfirm(result.feat);
  }, [draft, onConfirm]);

  return (
    <GlassPanel className="px-6 py-6" data-testid="feat-form">
      <h3 className="font-title text-body uppercase tracking-[0.18em] text-gold-bright">
        {t('customContent.editor.featForm.title')}
      </h3>
      <Divider className="my-4" />
      <div className="flex flex-col gap-4">
        <FieldString
          label={t('customContent.editor.featForm.id')}
          value={draft.id}
          onChange={(value) => update('id', value)}
          helper={t('customContent.editor.featForm.idHelper')}
          error={errors.id}
          required
          testId="feat-form-id"
        />
        <FieldI18n
          labelFr={t('customContent.editor.featForm.nameFr')}
          labelEn={t('customContent.editor.featForm.nameEn')}
          valueFr={draft.nameFr}
          valueEn={draft.nameEn}
          onChangeFr={(value) => update('nameFr', value)}
          onChangeEn={(value) => update('nameEn', value)}
          requiredFr
          errorFr={errors.nameFr}
          errorEn={errors.nameEn}
          testIdFr="feat-form-name-fr"
          testIdEn="feat-form-name-en"
        />
        <FieldI18n
          labelFr={t('customContent.editor.featForm.summaryFr')}
          labelEn={t('customContent.editor.featForm.summaryEn')}
          valueFr={draft.summaryFr}
          valueEn={draft.summaryEn}
          onChangeFr={(value) => update('summaryFr', value)}
          onChangeEn={(value) => update('summaryEn', value)}
          helperFr={t('customContent.editor.featForm.summaryHelper')}
          testIdFr="feat-form-summary-fr"
          testIdEn="feat-form-summary-en"
        />
        <FieldI18n
          labelFr={t('customContent.editor.featForm.prerequisiteFr')}
          labelEn={t('customContent.editor.featForm.prerequisiteEn')}
          valueFr={draft.prerequisiteFr}
          valueEn={draft.prerequisiteEn}
          onChangeFr={(value) => update('prerequisiteFr', value)}
          onChangeEn={(value) => update('prerequisiteEn', value)}
          helperFr={t('customContent.editor.featForm.prerequisiteHelper')}
          testIdFr="feat-form-prerequisite-fr"
          testIdEn="feat-form-prerequisite-en"
        />
      </div>
      <div className="mt-7 flex flex-wrap justify-end gap-3">
        <Button
          variant="secondary"
          size="md"
          onClick={onCancel}
          data-testid="feat-form-cancel"
        >
          {t('customContent.editor.featForm.cancel')}
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleConfirm}
          data-testid="feat-form-confirm"
        >
          {t('customContent.editor.featForm.confirm')}
        </Button>
      </div>
    </GlassPanel>
  );
}
