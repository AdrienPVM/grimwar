import { useMemo, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/features/auth/use-auth';
import { Button } from '@/shared/components/button';
import { Chip } from '@/shared/components/chip';
import { GlassPanel } from '@/shared/components/glass-panel';
import { t } from '@/shared/lib/i18n';
import type { Campaign } from '@/shared/types/campaign';

interface CampaignCardProps {
  campaign: Campaign;
  onLeaveClick: (campaign: Campaign) => void;
}

/**
 * Card d'une campagne dans la grille « Mes campagnes ».
 *
 * Affiche :
 *  - nom de la campagne (gold-bright, font-display),
 *  - description courte (font-serif italic, troncage 3 lignes au CSS),
 *  - chip rôle (Meneur / Joueur) selon `gmIds.includes(uid)`,
 *  - nombre de MJ + code d'invitation + date de dernière maj,
 *  - bouton « Ouvrir » (disabled V1, plein 4.0.5),
 *  - bouton « Quitter » → ouvre confirm modal côté parent.
 */
export function CampaignCard({ campaign, onLeaveClick }: CampaignCardProps): JSX.Element {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isGm = user ? campaign.gmIds.includes(user.uid) : false;

  const updatedAtLabel = useMemo(() => formatTimestamp(campaign.updatedAt), [campaign.updatedAt]);

  return (
    <GlassPanel
      as="article"
      aria-label={campaign.name}
      className="flex h-full flex-col gap-3 p-5"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-lg font-bold uppercase tracking-[0.14em] text-gold-bright">
            {campaign.name}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {isGm ? (
              <Chip variant="gold">{t('campaigns.card.roleGm')}</Chip>
            ) : (
              <Chip variant="magic">{t('campaigns.card.roleMember')}</Chip>
            )}
          </div>
        </div>
      </header>

      {campaign.description ? (
        <p className="line-clamp-3 font-serif text-body-sm italic text-text-secondary">
          {campaign.description}
        </p>
      ) : null}

      <dl className="mt-1 grid grid-cols-3 gap-2 font-title text-meta uppercase tracking-[0.14em] text-text-tertiary">
        <div>
          <dt className="text-[10px]">{t('campaigns.card.membersLabel')}</dt>
          <dd className="mt-0.5 font-serif text-body normal-case tracking-normal text-text-secondary">
            {campaign.gmIds.length}
          </dd>
        </div>
        <div>
          <dt className="text-[10px]">{t('campaigns.card.inviteCodeLabel')}</dt>
          <dd className="mt-0.5 font-mono text-body normal-case tracking-[0.16em] text-gold">
            {campaign.inviteCode}
          </dd>
        </div>
        <div>
          <dt className="text-[10px]">{t('campaigns.card.dateLabel')}</dt>
          <dd className="mt-0.5 font-serif text-body-sm normal-case tracking-normal text-text-secondary">
            {updatedAtLabel}
          </dd>
        </div>
      </dl>

      <div className="mt-auto flex flex-col-reverse gap-2 pt-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onLeaveClick(campaign)}
        >
          {t('campaigns.card.leave')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => navigate(`/campaigns/${campaign.id}`)}
          aria-label={`${t('campaigns.card.open')} — ${campaign.name}`}
        >
          {t('campaigns.card.open')}
        </Button>
      </div>
    </GlassPanel>
  );
}

/**
 * Formate un Firestore `Timestamp` (ou null) en label FR court (ex. « 10 juin »).
 * Volontairement tolérant : Firestore renvoie `Timestamp.toDate()`, mais en
 * test/seed on peut avoir `null`, un Date direct, ou un objet `{ seconds }`.
 */
function formatTimestamp(ts: unknown): string {
  if (!ts) return '—';
  let date: Date | null = null;
  if (typeof ts === 'object' && ts !== null) {
    const candidate = ts as { toDate?: () => Date; seconds?: number };
    if (typeof candidate.toDate === 'function') {
      date = candidate.toDate();
    } else if (typeof candidate.seconds === 'number') {
      date = new Date(candidate.seconds * 1000);
    }
  }
  if (ts instanceof Date) date = ts;
  if (!date || Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date);
}
