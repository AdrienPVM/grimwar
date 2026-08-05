import { useEffect, useId, useState, type FormEvent, type JSX } from 'react';

import { Button } from '@/shared/components/button';
import { DetailModal } from '@/shared/components/detail-modal';
import { Divider } from '@/shared/components/divider';
import { FormField } from '@/shared/components/form/form-field';
import { TextInput } from '@/shared/components/form/text-input';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import { updateSessionMeta } from '@/shared/lib/services/sessions';
import type { Session } from '@/shared/types/session';

interface Props {
  campaignId: string;
  session: Session | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// Limite alignée sur `SessionSchema.title` (1..120, cf. session.ts).
const TITLE_MAX = 120;

/**
 * Modale « Modifier la séance » (M13 de l'audit de malléabilité). Le service ne
 * patchait que notes / présence / journal : un titre mal tapé était définitif et
 * le numéro, auto-attribué (max + 1), non surchargeable.
 *
 * Le NUMÉRO est éditable pour deux raisons concrètes : une campagne reprise
 * d'une autre table démarre « à la séance 42 », et la numérotation read-then-
 * write peut produire deux « Séance 3 » quand deux meneurs créent en même temps
 * (caveat documenté dans `createSession`).
 *
 * Formatage de la date : `plannedDate` arrive en `Timestamp` Firestore, `Date`
 * ou `{ seconds }` selon la provenance — on normalise vers `YYYY-MM-DD` pour
 * l'input natif, comme `formatPlannedDate` le fait pour l'affichage.
 */
export function SessionMetaModal({
  campaignId,
  session,
  open,
  onClose,
  onSaved,
}: Props): JSX.Element {
  const titleId = useId();
  const [title, setTitle] = useState<string>('');
  const [number, setNumber] = useState<string>('');
  const [plannedDate, setPlannedDate] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  // Préremplissage à l'ouverture (synchronisation sur une prop, pas un état
  // dérivé : les champs restent librement éditables ensuite).
  useEffect(() => {
    if (!open || !session) return;
    setTitle(session.title);
    setNumber(String(session.number));
    setPlannedDate(toDateInputValue(session.plannedDate));
    setFieldError(null);
    setSubmitError(null);
  }, [open, session]);

  function close(): void {
    setSubmitting(false);
    setFieldError(null);
    setSubmitError(null);
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting || !session) return;
    const trimmed = title.trim();
    if (trimmed.length === 0) {
      setFieldError(t('sessions.create.error.titleRequired'));
      return;
    }
    if (trimmed.length > TITLE_MAX) {
      setFieldError(t('sessions.create.error.titleTooLong'));
      return;
    }
    const parsedNumber = Number.parseInt(number, 10);
    if (!Number.isFinite(parsedNumber) || parsedNumber < 1) {
      setFieldError(t('sessions.edit.error.number'));
      return;
    }
    setFieldError(null);
    setSubmitError(null);
    setSubmitting(true);
    try {
      await updateSessionMeta(campaignId, session.id, {
        title: trimmed,
        number: parsedNumber,
        plannedDate: plannedDate ? new Date(`${plannedDate}T00:00:00`) : null,
      });
      onSaved();
      close();
    } catch {
      setSubmitError(t('sessions.edit.error.generic'));
      setSubmitting(false);
    }
  }

  return (
    <DetailModal
      open={open}
      onClose={close}
      titleId={titleId}
      closeLabel={t('sessions.edit.close')}
      size="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6">
        <header className="text-center">
          <h2
            id={titleId}
            className="font-display text-xl uppercase tracking-[0.18em] text-gold-bright"
          >
            {t('sessions.edit.title')}
          </h2>
          <Divider className="my-3" />
        </header>

        <FormField
          label={t('sessions.create.titleField.label')}
          error={fieldError ?? undefined}
          required
        >
          {(field) => (
            <TextInput
              {...field}
              value={title}
              maxLength={TITLE_MAX}
              onChange={(e) => {
                setTitle(e.target.value);
                if (fieldError) setFieldError(null);
              }}
              disabled={submitting}
            />
          )}
        </FormField>

        <FormField
          label={t('sessions.edit.number.label')}
          helper={t('sessions.edit.number.helper')}
        >
          {(field) => (
            <TextInput
              {...field}
              inputMode="numeric"
              value={number}
              onChange={(e) => {
                setNumber(e.target.value);
                if (fieldError) setFieldError(null);
              }}
              disabled={submitting}
            />
          )}
        </FormField>

        <FormField label={t('sessions.create.date.label')}>
          {(field) => (
            <input
              id={field.id}
              aria-describedby={field['aria-describedby']}
              type="date"
              value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)}
              disabled={submitting}
              className={cn(
                'w-full rounded-card-sm border border-white-8 bg-bg-3/40',
                'px-3 py-2 font-serif text-body text-text',
                'focus:border-gold-bright focus:outline-none focus:ring-1 focus:ring-gold-bright/40',
                'transition-colors duration-200 ease-base',
                'disabled:opacity-50',
                '[color-scheme:dark]',
              )}
            />
          )}
        </FormField>

        {submitError ? (
          <p
            role="alert"
            className="rounded-card-sm border border-crimson/40 bg-crimson/[0.08] px-3 py-2 font-serif text-body-sm text-crimson"
          >
            {submitError}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={close}
            disabled={submitting}
          >
            {t('sessions.create.cancel')}
          </Button>
          <Button type="submit" variant="primary" size="md" disabled={submitting}>
            {submitting ? t('sessions.edit.saving') : t('sessions.edit.save')}
          </Button>
        </div>
      </form>
    </DetailModal>
  );
}

/**
 * Normalise une date planifiée (Firestore `Timestamp`, `Date`, `{ seconds }` ou
 * `null`) vers la valeur `YYYY-MM-DD` attendue par `<input type="date">`.
 * Exporté pour test — la tolérance de forme est le vrai piège ici.
 */
export function toDateInputValue(ts: unknown): string {
  if (!ts) return '';
  let date: Date | null = null;
  if (ts instanceof Date) {
    date = ts;
  } else if (typeof ts === 'object') {
    const candidate = ts as { toDate?: () => Date; seconds?: number };
    if (typeof candidate.toDate === 'function') date = candidate.toDate();
    else if (typeof candidate.seconds === 'number')
      date = new Date(candidate.seconds * 1000);
  }
  if (!date || Number.isNaN(date.getTime())) return '';
  // Composantes LOCALES : `toISOString()` bascule en UTC et décalerait d'un jour
  // toute date du soir en Europe/Brussels.
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
