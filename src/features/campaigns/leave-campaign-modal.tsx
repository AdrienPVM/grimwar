import { useId, useState, type JSX } from 'react';

import { useAuth } from '@/features/auth/use-auth';
import { Button } from '@/shared/components/button';
import { DetailModal } from '@/shared/components/detail-modal';
import { Divider } from '@/shared/components/divider';
import { t } from '@/shared/lib/i18n';
import {
  CampaignServiceError,
  leaveCampaign,
} from '@/shared/lib/services/campaigns';
import type { Campaign } from '@/shared/types/campaign';

interface Props {
  open: boolean;
  campaign: Campaign | null;
  onClose: () => void;
  onLeft: (campaignId: string) => void;
}

/**
 * Modale de confirmation « Quitter la campagne ». Affiche le nom de la
 * campagne ciblée + un rappel que les données associées (perso lié) restent
 * intactes.
 *
 * Gestion erreur typed :
 *   - `last-gm-cannot-leave` → message dédié invitant à promouvoir un autre
 *     MJ d'abord (route /campaigns/{cid}/members en 4.0.5).
 *   - `campaign-not-found` → message dédié (campagne supprimée entre-temps
 *     côté serveur, race rare).
 *   - autres → message générique.
 *
 * Quand `campaign` est null, la modale rend l'overlay vide (en pratique le
 * parent ne devrait pas l'ouvrir sans cible).
 */
export function LeaveCampaignModal({
  open,
  campaign,
  onClose,
  onLeft,
}: Props): JSX.Element {
  const { user } = useAuth();
  const titleId = useId();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  function resetAndClose(): void {
    setSubmitting(false);
    setError(null);
    onClose();
  }

  async function handleConfirm(): Promise<void> {
    if (!campaign || !user || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await leaveCampaign(campaign.id, user.uid);
      onLeft(campaign.id);
      resetAndClose();
    } catch (err: unknown) {
      if (err instanceof CampaignServiceError) {
        if (err.kind === 'last-gm-cannot-leave') {
          setError(t('campaigns.leave.error.lastGm'));
        } else if (err.kind === 'campaign-not-found') {
          setError(t('campaigns.leave.error.notFound'));
        } else {
          setError(t('campaigns.leave.error.generic'));
        }
      } else {
        setError(t('campaigns.leave.error.generic'));
      }
      setSubmitting(false);
    }
  }

  return (
    <DetailModal
      open={open}
      onClose={resetAndClose}
      titleId={titleId}
      closeLabel={t('campaigns.leave.close')}
      className="max-w-[440px]"
    >
      <div className="flex flex-col gap-5 p-6">
        <header className="text-center">
          <h2
            id={titleId}
            className="font-display text-xl uppercase tracking-[0.18em] text-gold-bright"
          >
            {t('campaigns.leave.title')}
          </h2>
          <Divider className="my-3" />
          {campaign ? (
            <p className="mx-auto max-w-[36ch] font-serif text-body italic text-text-secondary">
              {t('campaigns.leave.confirmPrefix')}{' '}
              <strong className="not-italic font-semibold text-gold-bright">
                {campaign.name}
              </strong>{' '}
              {t('campaigns.leave.confirmSuffix')}
            </p>
          ) : null}
          <p className="mx-auto mt-3 max-w-[36ch] font-serif text-body-sm text-text-tertiary">
            {t('campaigns.leave.dataNotice')}
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
            {t('campaigns.leave.cancel')}
          </Button>
          <Button
            type="button"
            variant="danger"
            size="md"
            onClick={() => {
              void handleConfirm();
            }}
            disabled={submitting || !campaign}
          >
            {submitting
              ? t('campaigns.leave.submitting')
              : t('campaigns.leave.confirm')}
          </Button>
        </div>
      </div>
    </DetailModal>
  );
}
