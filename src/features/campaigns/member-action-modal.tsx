import { useId, useState, type JSX } from 'react';

import { Button } from '@/shared/components/button';
import { DetailModal } from '@/shared/components/detail-modal';
import { Divider } from '@/shared/components/divider';
import { t, type StringKey } from '@/shared/lib/i18n';
import {
  CampaignServiceError,
  demoteGm,
  kickMember,
} from '@/shared/lib/services/campaigns';

/** Les deux gestes d'autorité destructifs du roster. */
export type MemberAction = 'demote' | 'kick';

interface Props {
  /** Geste demandé — `null` ferme la modale (état idle). */
  action: MemberAction | null;
  campaignId: string | null;
  targetUid: string | null;
  /** Libellé lisible du membre (nom d'affichage, ou UID tronqué en repli). */
  targetLabel: string | null;
  onClose: () => void;
  onDone: () => void;
}

/**
 * Confirmation des deux gestes d'autorité que le roster ne proposait pas —
 * rétrograder un co-meneur, exclure un membre. Même squelette que
 * `PromoteToGmModal` (header + Divider + corps + actions) : ce sont les trois
 * faces d'une même décision, elles doivent se ressembler.
 *
 * Pourquoi UNE modale pour deux gestes plutôt que deux composants : seuls le
 * titre, l'avertissement et le service diffèrent — la mécanique (confirmation,
 * `submitting`, erreurs typées) est identique. Deux fichiers jumeaux auraient
 * divergé au premier correctif.
 *
 * Les deux actions sont DESTRUCTIVES et asymétriques de la promotion, d'où le
 * bouton `danger` et un avertissement qui dit ce qui est perdu ET ce qui reste
 * (la fiche du joueur lui appartient : elle survit à l'exclusion).
 */
export function MemberActionModal({
  action,
  campaignId,
  targetUid,
  targetLabel,
  onClose,
  onDone,
}: Props): JSX.Element {
  const titleId = useId();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Rendu en idle quand aucune action n'est demandée — mais on garde la modale
  // montée (comme PromoteToGmModal) pour que l'animation de fermeture joue.
  const kind: MemberAction = action ?? 'demote';

  function resetAndClose(): void {
    setSubmitting(false);
    setError(null);
    onClose();
  }

  async function handleConfirm(): Promise<void> {
    if (!campaignId || !targetUid || !action || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      if (action === 'demote') {
        await demoteGm(campaignId, targetUid);
      } else {
        await kickMember(campaignId, targetUid);
      }
      onDone();
      resetAndClose();
    } catch (err: unknown) {
      if (err instanceof CampaignServiceError) {
        if (err.kind === 'campaign-not-found') {
          setError(t('campaigns.memberAction.error.notFound'));
        } else if (err.kind === 'last-gm-cannot-demote') {
          setError(t('campaigns.memberAction.error.lastGm'));
        } else {
          setError(t('campaigns.memberAction.error.generic'));
        }
      } else {
        setError(t('campaigns.memberAction.error.generic'));
      }
      setSubmitting(false);
    }
  }

  const titleKey = `campaigns.memberAction.${kind}.title` as StringKey;
  const prefixKey = `campaigns.memberAction.${kind}.confirmPrefix` as StringKey;
  const suffixKey = `campaigns.memberAction.${kind}.confirmSuffix` as StringKey;
  const noticeKey = `campaigns.memberAction.${kind}.notice` as StringKey;
  const confirmKey = `campaigns.memberAction.${kind}.confirm` as StringKey;
  const submittingKey = `campaigns.memberAction.${kind}.submitting` as StringKey;

  return (
    <DetailModal
      open={action !== null}
      onClose={resetAndClose}
      titleId={titleId}
      closeLabel={t('campaigns.memberAction.close')}
      size="sm"
    >
      <div className="flex flex-col gap-5 p-6">
        <header className="text-center">
          <h2
            id={titleId}
            className="font-display text-xl uppercase tracking-[0.18em] text-crimson"
          >
            {t(titleKey)}
          </h2>
          <Divider className="my-3" />
          {targetLabel ? (
            <p className="mx-auto max-w-[36ch] font-serif text-body italic text-text-secondary">
              {t(prefixKey)}{' '}
              <strong className="not-italic font-mono text-body-sm tracking-[0.18em] text-gold-bright">
                {targetLabel}
              </strong>
              {t(suffixKey)}
            </p>
          ) : null}
          <p className="mx-auto mt-3 max-w-[38ch] font-serif text-body-sm text-text-tertiary">
            {t(noticeKey)}
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
            {t('campaigns.memberAction.cancel')}
          </Button>
          <Button
            type="button"
            variant="danger"
            size="md"
            onClick={() => {
              void handleConfirm();
            }}
            disabled={submitting || !targetUid || !campaignId}
          >
            {submitting ? t(submittingKey) : t(confirmKey)}
          </Button>
        </div>
      </div>
    </DetailModal>
  );
}
