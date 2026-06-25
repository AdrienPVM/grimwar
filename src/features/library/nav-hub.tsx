import type { JSX } from 'react';
import { useNavigate } from 'react-router-dom';

import { Icon } from '@/shared/components/icon';
import type { IconName } from '@/shared/design/icons';
import { cn } from '@/shared/lib/cn';
import { t, type StringKey } from '@/shared/lib/i18n';

/**
 * Hub de navigation de l'accueil : cartes glass vers les grands espaces de
 * l'app (Codex, Campagnes, Vue MJ). Remplace les anciens liens texte discrets
 * par des cibles tap généreuses + iconographie, sans voler la vedette au CTA
 * primaire « Créer un personnage » (qui reste un Button au-dessus).
 *
 * Rendu sur l'accueil peuplé ET l'empty state — un nouveau venu voit donc le
 * Codex (consultable sans personnage) dès le premier écran.
 */

interface HubEntry {
  to: string;
  icon: IconName;
  titleKey: StringKey;
  subKey: StringKey;
}

const ENTRIES: readonly HubEntry[] = [
  { to: '/codex', icon: 'i-book', titleKey: 'codex.nav.cta', subKey: 'home.hub.codex.sub' },
  { to: '/campaigns', icon: 'i-shield', titleKey: 'campaigns.title', subKey: 'home.hub.campaigns.sub' },
  { to: '/dm', icon: 'i-eye', titleKey: 'dm.title', subKey: 'home.hub.dm.sub' },
];

export function NavHub({ className }: { className?: string }): JSX.Element {
  const navigate = useNavigate();
  return (
    <nav aria-label={t('home.hub.title')} className={cn('w-full', className)}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {ENTRIES.map((entry) => (
          <button
            key={entry.to}
            type="button"
            onClick={() => navigate(entry.to)}
            className={cn(
              'group flex items-center gap-3 rounded-card border border-soft bg-glass p-4 text-left',
              'transition-all duration-200 ease-base hover:-translate-y-px hover:border-gold-dim/60',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-bright/40',
            )}
          >
            <span
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-card-sm border border-white-8 bg-white/[0.04] text-gold-bright transition-colors duration-200 ease-base group-hover:border-gold-dim/60"
              aria-hidden="true"
            >
              <Icon name={entry.icon} className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-body font-bold uppercase tracking-[0.14em] text-gold-bright">
                {t(entry.titleKey)}
              </span>
              <span className="mt-0.5 block font-serif text-[12px] text-text-tertiary">
                {t(entry.subKey)}
              </span>
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
