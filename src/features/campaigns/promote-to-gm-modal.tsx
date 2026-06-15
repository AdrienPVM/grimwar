import { useId, useState, type JSX } from 'react';

import { Button } from '@/shared/components/button';
import { DetailModal } from '@/shared/components/detail-modal';
import { Divider } from '@/shared/components/divider';
import { t } from '@/shared/lib/i18n';
import {
  CampaignServiceError,
  promoteToGm,
} from '@/shared/lib/services/campaigns';

interface Props {
  open: boolean;
  /** ID de la campagne ciblée — quand `null`, la modale rend en idle. */
  campaignId: string | null;
  /** UID du membre à promouvoir. Utilisé pour l'identifier dans le label. */
  targetUid: string | null;
  /** Label lisible du membre (souvent l'UID tronqué ; pas de username V1). */
  targetLabel: string | null;
  onClose: () => void;
  onPromoted: () => void;
}

/**
 * Modale de confirmation « Promouvoir en MJ ». Strictement le même squelette
 * que `LeaveCampaignModal` — header titre + Divider + corps + actions. La
 * promotion est idempotente côté service (no-op si le user est déjà MJ), donc
 * la modale ne tente pas de prévenir un double-clic au-delà du flag `submitting`.
 *
 * Gestion erreur typed : `campaign-not-found` est le seul `kind` qui peut
 * apparaître sur ce flow ; tout le reste fallback sur générique.
 */
export function PromoteToGmModal({
  open,
  campaignId,
  targetUid,
  targetLabel,
  onClose,
  onPromoted,
}: Props): JSX.Element {
  const titleId = useId();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  function resetAndClose(): void {
    setSubmitting(false);
    setError(null);
    onClose();
  }

  async function handleConfirm(): Promise<void> {
    if (!campaignId || !targetUid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await promoteToGm(campaignId, targetUid);
      onPromoted();
      resetAndClose();
    } catch (err: unknown) {
      if (err instanceof CampaignServiceError && err.kind === 'campaign-not-found') {
        setError(t('campaigns.promote.error.notFound'));
      } else {
        setError(t('campaigns.promote.error.generic'));
      }
      setSubmitting(false);
    }
  }

  return (
    <DetailModal
      open={open}
      onClose={resetAndClose}
      titleId={titleId}
      closeLabel={t('campaigns.promote.close')}
      className="max-w-[440px]"
    >
      <div className="flex flex-col gap-5 p-6">
        <header className="text-center">
          <h2
            id={titleId}
            className="font-display text-xl uppercase tracking-[0.18em] text-gold-bright"
          >
            {t('campaigns.promote.title')}
          </h2>
          <Divider className="my-3" />
          {targetLabel ? (
            <p className="mx-auto max-w-[36ch] font-serif text-body italic text-text-secondary">
              {t('campaigns.promote.confirmPrefix')}{' '}
              <strong className="not-italic font-mono text-body-sm tracking-[0.18em] text-gold-bright">
                {targetLabel}
              </strong>{' '}
              {t('campaigns.promote.confirmSuffix')}
            </p>
          ) : null}
          <p className="mx-auto mt-3 max-w-[36ch] font-serif text-body-sm text-text-tertiary">
            {t('campaigns.promote.notice')}
          </p>
        </header>

        {error ? (
          <p
            role="alert"
            className="rounded-card-sm border border-crimson/40 bg-crimson/[0.08] px-3 py-2 font-serif text-body-sm text-crimson"
          >
            {error}
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
            {t('campaigns.promote.cancel')}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => {
              void handleConfirm();
            }}
            disabled={submitting || !targetUid || !campaignId}
          >
            {submitting
              ? t('campaigns.promote.submitting')
              : t('campaigns.promote.confirm')}
          </Button>
        </div>
      </div>
    </DetailModal>
  );
}
