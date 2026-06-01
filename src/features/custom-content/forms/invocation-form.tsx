import { useCallback, useState } from 'react';

import { Button } from '@/shared/components/button';
import { Divider } from '@/shared/components/divider';
import { Checkbox } from '@/shared/components/form';
import { GlassPanel } from '@/shared/components/glass-panel';
import { t } from '@/shared/lib/i18n';
import { InvocationSchema, type Invocation } from '@/shared/types/content';

import { FieldI18n } from './fields/field-i18n';
import { FieldNumber } from './fields/field-number';
import { FieldString } from './fields/field-string';

/**
 * Formulaire de création d'une Invocation occultiste custom (JALON 3C.2).
 *
 * Surface validée par `InvocationSchema` : id (slug), name (i18n, FR requis),
 * summary (i18n, FR requis — c'est ce qui distingue Invocation de Feat),
 * prerequisiteWarlockLevel (1-20 OU null), prerequisiteOther (i18n nullable).
 *
 * UX nullable : un checkbox dédié contrôle l'existence du pré-requis de
 * niveau ; quand décoché, le pré-requis est `null` (utilisable dès L1) ; quand
 * coché, le `FieldNumber` apparaît. Plus clair qu'un input « éventuellement
 * vide » pour un champ qui sera relu plus tard.
 *
 * `prerequisiteOther` suit le pattern Feat : FR vide → `null` automatique
 * (pas de toggle dédié, c'est suffisamment auto-explicatif pour un champ
 * libre).
 *
 * `source` est figé à `aidedd-homebrew` — convention partagée avec FeatForm.
 */

export interface InvocationFormDraft {
  id: string;
  nameFr: string;
  nameEn: string;
  summaryFr: string;
  summaryEn: string;
  hasLevelPrereq: boolean;
  prerequisiteWarlockLevel: number;
  prerequisiteOtherFr: string;
  prerequisiteOtherEn: string;
}

export const EMPTY_INVOCATION_DRAFT: InvocationFormDraft = {
  id: '',
  nameFr: '',
  nameEn: '',
  summaryFr: '',
  summaryEn: '',
  hasLevelPrereq: false,
  prerequisiteWarlockLevel: 2,
  prerequisiteOtherFr: '',
  prerequisiteOtherEn: '',
};

export function buildInvocationFromDraft(draft: InvocationFormDraft): Invocation {
  const prerequisiteOtherFr = draft.prerequisiteOtherFr.trim();
  return {
    id: draft.id.trim(),
    name: {
      fr: draft.nameFr.trim(),
      ...(draft.nameEn.trim() ? { en: draft.nameEn.trim() } : {}),
    },
    summary: {
      fr: draft.summaryFr.trim(),
      ...(draft.summaryEn.trim() ? { en: draft.summaryEn.trim() } : {}),
    },
    prerequisiteWarlockLevel: draft.hasLevelPrereq
      ? draft.prerequisiteWarlockLevel
      : null,
    prerequisiteOther: prerequisiteOtherFr
      ? {
          fr: prerequisiteOtherFr,
          ...(draft.prerequisiteOtherEn.trim()
            ? { en: draft.prerequisiteOtherEn.trim() }
            : {}),
        }
      : null,
    source: 'aidedd-homebrew',
  };
}

export function draftFromInvocation(inv: Invocation): InvocationFormDraft {
  return {
    id: inv.id,
    nameFr: inv.name.fr,
    nameEn: inv.name.en ?? '',
    summaryFr: inv.summary.fr,
    summaryEn: inv.summary.en ?? '',
    hasLevelPrereq: inv.prerequisiteWarlockLevel !== null,
    prerequisiteWarlockLevel: inv.prerequisiteWarlockLevel ?? 2,
    prerequisiteOtherFr: inv.prerequisiteOther?.fr ?? '',
    prerequisiteOtherEn: inv.prerequisiteOther?.en ?? '',
  };
}

export function validateInvocationDraft(
  draft: InvocationFormDraft,
):
  | { ok: true; invocation: Invocation }
  | {
      ok: false;
      fieldErrors: Partial<Record<keyof InvocationFormDraft, string>>;
    } {
  const fieldErrors: Partial<Record<keyof InvocationFormDraft, string>> = {};
  if (!draft.id.trim()) {
    fieldErrors.id = t(
      'customContent.editor.invocationForm.error.idRequired',
    );
  } else if (!/^[a-z0-9-]+$/.test(draft.id.trim())) {
    fieldErrors.id = t('customContent.editor.invocationForm.error.idFormat');
  }
  if (!draft.nameFr.trim()) {
    fieldErrors.nameFr = t(
      'customContent.editor.invocationForm.error.nameFrRequired',
    );
  }
  if (!draft.summaryFr.trim()) {
    fieldErrors.summaryFr = t(
      'customContent.editor.invocationForm.error.summaryFrRequired',
    );
  }
  if (
    draft.hasLevelPrereq &&
    (draft.prerequisiteWarlockLevel < 1 || draft.prerequisiteWarlockLevel > 20)
  ) {
    fieldErrors.prerequisiteWarlockLevel = t(
      'customContent.editor.invocationForm.error.levelRange',
    );
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  const candidate = buildInvocationFromDraft(draft);
  const parsed = InvocationSchema.safeParse(candidate);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const fieldKey = String(
      issue?.path[0] ?? 'id',
    ) as keyof InvocationFormDraft;
    fieldErrors[fieldKey] = issue?.message ?? 'invalid';
    return { ok: false, fieldErrors };
  }
  return { ok: true, invocation: parsed.data };
}

interface InvocationFormProps {
  draft: InvocationFormDraft;
  onChange: (draft: InvocationFormDraft) => void;
  onConfirm: (invocation: Invocation) => void;
  onCancel: () => void;
}

export function InvocationForm({
  draft,
  onChange,
  onConfirm,
  onCancel,
}: InvocationFormProps): JSX.Element {
  const [errors, setErrors] = useState<
    Partial<Record<keyof InvocationFormDraft, string>>
  >({});

  const update = useCallback(
    <K extends keyof InvocationFormDraft>(
      key: K,
      value: InvocationFormDraft[K],
    ) => {
      onChange({ ...draft, [key]: value });
      if (errors[key]) {
        setErrors((prev) => ({ ...prev, [key]: undefined }));
      }
    },
    [draft, errors, onChange],
  );

  const handleConfirm = useCallback(() => {
    const result = validateInvocationDraft(draft);
    if (!result.ok) {
      setErrors(result.fieldErrors);
      return;
    }
    setErrors({});
    onConfirm(result.invocation);
  }, [draft, onConfirm]);

  return (
    <GlassPanel className="px-6 py-6" data-testid="invocation-form">
      <h3 className="font-title text-body uppercase tracking-[0.18em] text-gold-bright">
        {t('customContent.editor.invocationForm.title')}
      </h3>
      <Divider className="my-4" />
      <div className="flex flex-col gap-4">
        <FieldString
          label={t('customContent.editor.invocationForm.id')}
          value={draft.id}
          onChange={(value) => update('id', value)}
          helper={t('customContent.editor.invocationForm.idHelper')}
          error={errors.id}
          required
          testId="invocation-form-id"
        />
        <FieldI18n
          labelFr={t('customContent.editor.invocationForm.nameFr')}
          labelEn={t('customContent.editor.invocationForm.nameEn')}
          valueFr={draft.nameFr}
          valueEn={draft.nameEn}
          onChangeFr={(value) => update('nameFr', value)}
          onChangeEn={(value) => update('nameEn', value)}
          requiredFr
          errorFr={errors.nameFr}
          errorEn={errors.nameEn}
          testIdFr="invocation-form-name-fr"
          testIdEn="invocation-form-name-en"
        />
        <FieldI18n
          labelFr={t('customContent.editor.invocationForm.summaryFr')}
          labelEn={t('customContent.editor.invocationForm.summaryEn')}
          valueFr={draft.summaryFr}
          valueEn={draft.summaryEn}
          onChangeFr={(value) => update('summaryFr', value)}
          onChangeEn={(value) => update('summaryEn', value)}
          requiredFr
          errorFr={errors.summaryFr}
          errorEn={errors.summaryEn}
          helperFr={t('customContent.editor.invocationForm.summaryHelper')}
          testIdFr="invocation-form-summary-fr"
          testIdEn="invocation-form-summary-en"
        />
        <Checkbox
          label={t('customContent.editor.invocationForm.hasLevelPrereq')}
          helper={t(
            'customContent.editor.invocationForm.hasLevelPrereqHelper',
          )}
          checked={draft.hasLevelPrereq}
          onChange={(event) => update('hasLevelPrereq', event.target.checked)}
          data-testid="invocation-form-has-level-prereq"
        />
        {draft.hasLevelPrereq ? (
          <FieldNumber
            label={t('customContent.editor.invocationForm.warlockLevel')}
            value={draft.prerequisiteWarlockLevel}
            onChange={(value) => update('prerequisiteWarlockLevel', value)}
            min={1}
            max={20}
            step={1}
            error={errors.prerequisiteWarlockLevel}
            required
            testId="invocation-form-warlock-level"
          />
        ) : null}
        <FieldI18n
          labelFr={t('customContent.editor.invocationForm.prerequisiteOtherFr')}
          labelEn={t('customContent.editor.invocationForm.prerequisiteOtherEn')}
          valueFr={draft.prerequisiteOtherFr}
          valueEn={draft.prerequisiteOtherEn}
          onChangeFr={(value) => update('prerequisiteOtherFr', value)}
          onChangeEn={(value) => update('prerequisiteOtherEn', value)}
          helperFr={t(
            'customContent.editor.invocationForm.prerequisiteOtherHelper',
          )}
          testIdFr="invocation-form-prerequisite-other-fr"
          testIdEn="invocation-form-prerequisite-other-en"
        />
      </div>
      <div className="mt-7 flex flex-wrap justify-end gap-3">
        <Button
          variant="secondary"
          size="md"
          onClick={onCancel}
          data-testid="invocation-form-cancel"
        >
          {t('customContent.editor.invocationForm.cancel')}
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleConfirm}
          data-testid="invocation-form-confirm"
        >
          {t('customContent.editor.invocationForm.confirm')}
        </Button>
      </div>
    </GlassPanel>
  );
}
