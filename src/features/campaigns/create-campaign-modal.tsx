import { useId, useState, type FormEvent, type JSX } from 'react';

import { useAuth } from '@/features/auth/use-auth';
import { Button } from '@/shared/components/button';
import { DetailModal } from '@/shared/components/detail-modal';
import { Divider } from '@/shared/components/divider';
import { FormField } from '@/shared/components/form/form-field';
import { TextInput } from '@/shared/components/form/text-input';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import {
  CampaignServiceError,
  createCampaign,
  type CreateCampaignResult,
} from '@/shared/lib/services/campaigns';

interface Props {
  open: boolean;
  onClose: () => void;
  /**
   * Appelé après une création réussie — le parent met à jour la liste
   * (refresh hook) et peut afficher un toast de confirmation.
   */
  onCreated: (result: CreateCampaignResult) => void;
}

const NAME_MAX = 80;
const DESCRIPTION_MAX = 500;

/**
 * Modale de création d'une nouvelle campagne. Le créateur devient l'unique MJ
 * (`gmIds: [uid]`) et reçoit un `inviteCode` 6-char généré côté service.
 *
 * Validation côté UI : nom non-vide + tronqué à 80 chars (limite du schema
 * Zod 4.0.1) ; description optionnelle, tronquée à 500 (plus restrictif que
 * la limite 2000 du schema — V1 on privilégie une description courte et
 * lisible sur card). Le service 4.0.3 reposera les défauts (`status: 'active'`,
 * `settings` complets) — la modale ne demande que les 2 champs minimaux.
 *
 * Gestion erreur typed : `CampaignServiceError` est branché sur i18n par
 * `kind` ; seule `invite-code-collision-exhausted` est consommable ici (les
 * autres erreurs `kind` n'arrivent pas sur le chemin create). Autres erreurs
 * (réseau, permission-denied) fallback sur un message générique.
 */
export function CreateCampaignModal({ open, onClose, onCreated }: Props): JSX.Element {
  const { user } = useAuth();
  const titleId = useId();
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  function resetAndClose(): void {
    setName('');
    setDescription('');
    setSubmitError(null);
    setFieldError(null);
    setSubmitting(false);
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting) return;
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setFieldError(t('campaigns.create.error.nameRequired'));
      return;
    }
    if (trimmed.length > NAME_MAX) {
      setFieldError(t('campaigns.create.error.nameTooLong'));
      return;
    }
    if (!user) {
      // Garde-fou : la modale ne devrait pas être atteignable sans auth, mais
      // si elle l'était, on affiche un message générique plutôt que de crasher.
      setSubmitError(t('campaigns.create.error.notSignedIn'));
      return;
    }
    setFieldError(null);
    setSubmitError(null);
    setSubmitting(true);
    try {
      const result = await createCampaign(
        {
          name: trimmed,
          description: description.trim(),
        },
        user.uid,
      );
      onCreated(result);
      resetAndClose();
    } catch (err: unknown) {
      if (
        err instanceof CampaignServiceError &&
        err.kind === 'invite-code-collision-exhausted'
      ) {
        setSubmitError(t('campaigns.create.error.inviteCollision'));
      } else {
        setSubmitError(t('campaigns.create.error.generic'));
      }
      setSubmitting(false);
    }
  }

  return (
    <DetailModal
      open={open}
      onClose={resetAndClose}
      titleId={titleId}
      closeLabel={t('campaigns.create.close')}
      className="max-w-[480px]"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6">
        <header className="text-center">
          <h2
            id={titleId}
            className="font-display text-xl uppercase tracking-[0.18em] text-gold-bright"
          >
            {t('campaigns.create.title')}
          </h2>
          <Divider className="my-3" />
          <p className="mx-auto max-w-[36ch] font-serif text-body-sm italic text-text-secondary">
            {t('campaigns.create.intro')}
          </p>
        </header>

        <FormField
          label={t('campaigns.create.name.label')}
          helper={t('campaigns.create.name.helper')}
          error={fieldError ?? undefined}
          required
        >
          {(field) => (
            <TextInput
              {...field}
              value={name}
              maxLength={NAME_MAX}
              autoFocus
              placeholder={t('campaigns.create.name.placeholder')}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldError) setFieldError(null);
              }}
              disabled={submitting}
            />
          )}
        </FormField>

        <FormField
          label={t('campaigns.create.description.label')}
          helper={t('campaigns.create.description.helper')}
        >
          {(field) => (
            <textarea
              id={field.id}
              aria-describedby={field['aria-describedby']}
              value={description}
              maxLength={DESCRIPTION_MAX}
              rows={3}
              placeholder={t('campaigns.create.description.placeholder')}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              className={cn(
                'w-full resize-y rounded-card-sm border border-white-8 bg-bg-3/40',
                'px-3 py-2 font-serif text-body text-text',
                'placeholder:text-text-tertiary',
                'focus:border-gold-bright focus:outline-none focus:ring-1 focus:ring-gold-bright/40',
                'transition-colors duration-200 ease-base',
                'disabled:opacity-50',
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
            {t('campaigns.create.cancel')}
          </Button>
          <Button type="submit" variant="primary" size="md" disabled={submitting}>
            {submitting
              ? t('campaigns.create.submitting')
              : t('campaigns.create.submit')}
          </Button>
        </div>
      </form>
    </DetailModal>
  );
}
