import { useId, useState, type FormEvent, type JSX } from 'react';

import { Button } from '@/shared/components/button';
import { DetailModal } from '@/shared/components/detail-modal';
import { Divider } from '@/shared/components/divider';
import { FormField } from '@/shared/components/form/form-field';
import { TextInput } from '@/shared/components/form/text-input';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import {
  createSession,
  type CreateSessionResult,
} from '@/shared/lib/services/sessions';

interface Props {
  campaignId: string;
  open: boolean;
  onClose: () => void;
  /**
   * Appelé après une création réussie — le parent rafraîchit la liste
   * (`useSessions().refresh`) et peut afficher un feedback.
   */
  onCreated: (result: CreateSessionResult) => void;
}

// Limite alignée sur `SessionSchema.title` (1..120, cf. session.ts).
const TITLE_MAX = 120;

/**
 * Modale « Planifier une session » (step 2 du plan 23). Demande un titre
 * (obligatoire) et une date prévue (optionnelle). Le numéro de séance est
 * auto-attribué côté service (`createSession`, max+1) — l'utilisateur ne le
 * saisit pas.
 *
 * « Description optionnelle » du step 2 : NON modélisée comme champ dédié (le
 * schéma Firestore documenté n'en a pas — décision 23.1). Les notes Markdown de
 * la séance (onglet Notes, 23.3) couvrent ce besoin une fois la séance ouverte.
 *
 * Date : `<input type="date">` natif → chaîne `YYYY-MM-DD`. On la convertit en
 * `Date` locale (`T00:00:00`) pour éviter le décalage UTC d'un `new Date(str)`
 * brut. Vide ⇒ `null` (séance planifiée sans date — autorisé par le schéma).
 */
export function SessionCreateModal({
  campaignId,
  open,
  onClose,
  onCreated,
}: Props): JSX.Element {
  const titleId = useId();
  const [title, setTitle] = useState<string>('');
  const [plannedDate, setPlannedDate] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  function resetAndClose(): void {
    setTitle('');
    setPlannedDate('');
    setSubmitError(null);
    setFieldError(null);
    setSubmitting(false);
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting) return;
    const trimmed = title.trim();
    if (trimmed.length === 0) {
      setFieldError(t('sessions.create.error.titleRequired'));
      return;
    }
    if (trimmed.length > TITLE_MAX) {
      setFieldError(t('sessions.create.error.titleTooLong'));
      return;
    }
    setFieldError(null);
    setSubmitError(null);
    setSubmitting(true);
    try {
      const result = await createSession(campaignId, {
        title: trimmed,
        plannedDate: plannedDate ? new Date(`${plannedDate}T00:00:00`) : null,
      });
      onCreated(result);
      resetAndClose();
    } catch {
      // Toutes les erreurs create (réseau, permission-denied) tombent sur le
      // message générique — aucun `SessionServiceError.kind` n'est levé sur le
      // chemin create (le garde-fou « une seule active » est sur startSession).
      setSubmitError(t('sessions.create.error.generic'));
      setSubmitting(false);
    }
  }

  return (
    <DetailModal
      open={open}
      onClose={resetAndClose}
      titleId={titleId}
      closeLabel={t('sessions.create.close')}
      className="max-w-[480px]"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6">
        <header className="text-center">
          <h2
            id={titleId}
            className="font-display text-xl uppercase tracking-[0.18em] text-gold-bright"
          >
            {t('sessions.create.title')}
          </h2>
          <Divider className="my-3" />
          <p className="mx-auto max-w-[36ch] font-serif text-body-sm italic text-text-secondary">
            {t('sessions.create.intro')}
          </p>
        </header>

        <FormField
          label={t('sessions.create.titleField.label')}
          helper={t('sessions.create.titleField.helper')}
          error={fieldError ?? undefined}
          required
        >
          {(field) => (
            <TextInput
              {...field}
              value={title}
              maxLength={TITLE_MAX}
              autoFocus
              placeholder={t('sessions.create.titleField.placeholder')}
              onChange={(e) => {
                setTitle(e.target.value);
                if (fieldError) setFieldError(null);
              }}
              disabled={submitting}
            />
          )}
        </FormField>

        <FormField
          label={t('sessions.create.date.label')}
          helper={t('sessions.create.date.helper')}
        >
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
                'placeholder:text-text-tertiary',
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
            onClick={resetAndClose}
            disabled={submitting}
          >
            {t('sessions.create.cancel')}
          </Button>
          <Button type="submit" variant="primary" size="md" disabled={submitting}>
            {submitting
              ? t('sessions.create.submitting')
              : t('sessions.create.submit')}
          </Button>
        </div>
      </form>
    </DetailModal>
  );
}
