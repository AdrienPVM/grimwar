import type { JSX } from 'react';
import { Link } from 'react-router-dom';

import { Icon } from '@/shared/components/icon';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import type { Character } from '@/shared/types/character';

import { usePermissionContext } from './permissions-context';

interface CampaignLinkProps {
  character: Character;
  className?: string;
}

/**
 * Raccourci « ma campagne » depuis la fiche.
 *
 * POURQUOI : la fiche était un cul-de-sac. Elle CONNAÎT sa campagne d'attache —
 * `sheet-screen.tsx` lit `character.homeCampaignId` pour en faire la campagne
 * active du pivot de dés — mais ses seuls liens pointaient vers l'accueil, et
 * seulement dans les états d'erreur. Rejoindre sa table depuis sa fiche
 * coûtait donc quatre gestes (Retour → accueil → Campagnes → la campagne) pour
 * le déplacement le plus fréquent d'une soirée de jeu : consulter un document,
 * suivre le combat, relire les notes.
 * Cf. `docs/plans/UX-AUDIT-2026-08.md > J5`.
 *
 * Deux gardes :
 *  - fiche non liée (`homeCampaignId` nul) → rien à proposer ;
 *  - lecture MJ (`isDM`) → l'écran parent porte déjà son propre retour vers la
 *    campagne ; un second lien ferait doublon.
 */
export function CampaignLink({ character, className }: CampaignLinkProps): JSX.Element | null {
  const { isDM } = usePermissionContext();

  if (isDM) return null;
  const campaignId = character.homeCampaignId;
  if (!campaignId) return null;

  return (
    <Link
      to={`/campaigns/${campaignId}`}
      className={cn(
        'group flex w-full items-center gap-2 rounded-card-sm border border-white-8 bg-white/[0.03] px-3 py-2',
        'transition-all duration-200 ease-base hover:border-gold-dim/60 hover:bg-gold-bright/[0.06]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-bright/40',
        className,
      )}
    >
      <Icon name="i-shield" className="h-4 w-4 shrink-0 text-gold-bright" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate font-title text-meta uppercase tracking-[0.16em] text-text-secondary transition-colors duration-200 ease-base group-hover:text-gold-bright">
        {t('sheet.campaignLink')}
      </span>
      <span
        aria-hidden="true"
        className="font-title text-meta text-text-tertiary transition-transform duration-200 ease-base group-hover:translate-x-0.5 group-hover:text-gold-bright"
      >
        →
      </span>
    </Link>
  );
}
