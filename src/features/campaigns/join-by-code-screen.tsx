import { useId, useState, type FormEvent, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/features/auth/use-auth';
import { Button } from '@/shared/components/button';
import { Divider } from '@/shared/components/divider';
import { FormField } from '@/shared/components/form/form-field';
import { TextInput } from '@/shared/components/form/text-input';
import { GlassPanel } from '@/shared/components/glass-panel';
import { t } from '@/shared/lib/i18n';
import {
  CampaignServiceError,
  joinByCode,
} from '@/shared/lib/services/campaigns';
import { INVITE_CODE_REGEX } from '@/shared/types/campaign';

const CODE_LENGTH = 6;

/**
 * Route `/campaigns/join` — saisie d'un code d'invitation pour rejoindre une
 * campagne existante. Submit → `joinByCode` (4.0.3) → redirect vers
 * `/campaigns/:cid` en succès.
 *
 * Conventions de validation :
 *  - Le formulaire normalise l'input (uppercase + strip espaces) avant le
 *    submit pour qu'un code dicté à voix haute (« A — B — C — deux — trois —
 *    quatre ») saisi avec hésitation passe sans demander à l'utilisateur
 *    d'effacer les espaces. Acté plan 4.0.5.
 *  - La regex `INVITE_CODE_REGEX` est REUTILISÉE depuis `@/shared/types/
 *    campaign` (source de vérité Zod 4.0.1) — pas de duplication.
 *
 * Gestion erreur typed :
 *  - `invite-code-not-found` → message dédié (code inconnu).
 *  - `campaign-not-found` → message dédié (code orphelin — campagne supprimée
 *    après émission du code, race rare).
 *  - autres (permission-denied, réseau) → message générique.
 */
export function JoinByCodeScreen(): JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();
  const titleId = useId();
  const [rawCode, setRawCode] = useState<string>('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  function normalize(input: string): string {
    return input.toUpperCase().replace(/\s+/g, '');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting) return;
    const code = normalize(rawCode);
    if (code.length !== CODE_LENGTH) {
      setFieldError(t('campaigns.join.error.lengthInvalid'));
      return;
    }
    if (!INVITE_CODE_REGEX.test(code)) {
      setFieldError(t('campaigns.join.error.formatInvalid'));
      return;
    }
    if (!user) {
      setSubmitError(t('campaigns.join.error.notSignedIn'));
      return;
    }
    setFieldError(null);
    setSubmitError(null);
    setSubmitting(true);
    try {
      const { campaignId } = await joinByCode(code, user.uid);
      navigate(`/campaigns/${campaignId}`);
    } catch (err: unknown) {
      if (err instanceof CampaignServiceError) {
        if (err.kind === 'invite-code-not-found') {
          setSubmitError(t('campaigns.join.error.codeNotFound'));
        } else if (err.kind === 'campaign-not-found') {
          setSubmitError(t('campaigns.join.error.campaignNotFound'));
        } else {
          setSubmitError(t('campaigns.join.error.generic'));
        }
      } else {
        setSubmitError(t('campaigns.join.error.generic'));
      }
      setSubmitting(false);
    }
  }

  return (
    <main className="relative z-10 mx-auto flex min-h-[60vh] max-w-[460px] flex-col items-center justify-center px-6 py-12">
      <GlassPanel className="w-full px-7 py-9">
        <header className="text-center">
          <h1
            id={titleId}
            className="font-display text-2xl uppercase tracking-[0.18em] text-gold-bright"
          >
            {t('campaigns.join.title')}
          </h1>
          <Divider className="my-5" />
          <p className="mx-auto max-w-[36ch] font-serif text-body italic text-text-secondary">
            {t('campaigns.join.intro')}
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="mt-7 flex flex-col gap-5"
          aria-labelledby={titleId}
        >
          <FormField
            label={t('campaigns.join.code.label')}
            helper={t('campaigns.join.code.helper')}
            error={fieldError ?? undefined}
            required
          >
            {(field) => (
              <TextInput
                {...field}
                value={rawCode}
                maxLength={12}
                autoFocus
                autoComplete="off"
                inputMode="text"
                placeholder={t('campaigns.join.code.placeholder')}
                onChange={(e) => {
                  setRawCode(e.target.value);
                  if (fieldError) setFieldError(null);
                }}
                disabled={submitting}
                className="text-center font-mono text-xl tracking-[0.32em] uppercase"
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
              onClick={() => navigate('/campaigns')}
              disabled={submitting}
            >
              {t('campaigns.join.cancel')}
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={submitting}>
              {submitting
                ? t('campaigns.join.submitting')
                : t('campaigns.join.submit')}
            </Button>
          </div>
        </form>
      </GlassPanel>
    </main>
  );
}
