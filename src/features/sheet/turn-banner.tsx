import type { JSX } from 'react';
import { Link } from 'react-router-dom';

import { Icon } from '@/shared/components/icon';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import { useActiveTurnStore } from '@/shared/lib/slices/active-turn-slice';

import { usePermissionContext } from './permissions-context';

interface TurnBannerProps {
  className?: string;
}

/**
 * Bandeau « c'est à vous de jouer » sur la fiche, tant que le tour dure.
 *
 * POURQUOI en plus du toast : un toast dure six secondes. Un joueur qui repose
 * son téléphone pendant le tour du monstre d'à côté rate le sien, et on revient
 * au MJ qui annonce à voix haute — c'est-à-dire au problème qu'on voulait
 * résoudre. Le toast dit qu'il se passe QUELQUE CHOSE ; le bandeau dit ce qui
 * EST. Les deux lisent le même `active-turn-slice`, alimenté par l'unique
 * listener de `use-encounter-notifications.ts`.
 *
 * Il est aussi le raccourci le plus court vers le combat : sans lui, rejoindre
 * le tracker depuis sa fiche demande de passer par sa campagne.
 *
 * Deux gardes, les mêmes que `CampaignLink` : rien en lecture MJ (le meneur
 * pilote les tours, il n'a pas de tour à lui), rien quand ce n'est pas le tour
 * du joueur — un bandeau permanent qui ne dirait « pas votre tour » ajouterait
 * du bruit sans rien apporter.
 */
export function TurnBanner({ className }: TurnBannerProps): JSX.Element | null {
  const { isDM } = usePermissionContext();
  const turn = useActiveTurnStore((s) => s.turn);

  if (isDM) return null;
  if (!turn?.isMyTurn) return null;

  return (
    <Link
      to={`/campaigns/${turn.campaignId}/encounters/${turn.encounterId}`}
      aria-label={t('sheet.turnBanner.aria')}
      className={cn(
        'group flex w-full items-center gap-2 rounded-card-sm border border-gold-dim/70 bg-gold-bright/[0.12] px-3 py-2',
        // `runeBreath` est le souffle doré déjà utilisé par le design system —
        // pas une animation inventée pour l'occasion. Coupé en reduced-motion.
        'motion-safe:animate-runeBreath',
        'transition-all duration-200 ease-base hover:border-gold-bright hover:bg-gold-bright/[0.18]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-bright/40',
        className,
      )}
    >
      <Icon name="i-sword" className="h-4 w-4 shrink-0 text-gold-bright" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        {/* Le message est une PHRASE, pas une étiquette : il porte donc la
            taille de corps, et non le petit capitale-espacé réservé aux libellés
            de carte. Sans ça le round s'affichait plus gros que « c'est à vous
            de jouer » — hiérarchie exactement inversée. */}
        <span className="block truncate font-title text-body-lg leading-tight text-gold-bright">
          {t('sheet.turnBanner.label')}
        </span>
        <span className="block truncate text-caption text-text-secondary">
          {t('sheet.turnBanner.sub')
            .replace('{n}', String(turn.round))
            .replace('{name}', turn.encounterName)}
        </span>
      </span>
      <span
        aria-hidden="true"
        className="font-title text-meta text-gold-bright transition-transform duration-200 ease-base group-hover:translate-x-0.5"
      >
        →
      </span>
    </Link>
  );
}
