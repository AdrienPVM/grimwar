import { type JSX } from 'react';

import { Chip } from '@/shared/components/chip';
import { t } from '@/shared/lib/i18n';
import type { CampaignStatus } from '@/shared/types/campaign';

interface Props {
  status: CampaignStatus;
}

/**
 * Puce d'état de campagne. Rend `null` pour une campagne `active` (l'état
 * nominal ne mérite pas de badge — on évite le bruit visuel) et une puce
 * discrète pour `paused` / `archived`, afin que la table voie d'un coup d'œil
 * qu'une campagne n'est plus en cours (sur la carte de liste et l'en-tête de
 * détail).
 */
export function CampaignStatusChip({ status }: Props): JSX.Element | null {
  if (status === 'active') return null;
  const label =
    status === 'paused'
      ? t('campaigns.status.paused')
      : t('campaigns.status.archived');
  return <Chip variant="default">{label}</Chip>;
}
