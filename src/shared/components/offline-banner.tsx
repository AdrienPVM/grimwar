import type { JSX } from 'react';

import { useOnlineStatus } from '../hooks/use-online-status';
import { useSyncStore } from '../lib/slices/sync-slice';
import { t } from '../lib/i18n';
import { cn } from '../lib/cn';

/**
 * Bannière globale d'état de connectivité / synchronisation.
 *
 * Deux états mutuellement exclusifs (l'offline gagne) :
 *  - OFFLINE (`navigator.onLine === false`) : titre « Tu es hors ligne »,
 *    sous-titre rappelant que la lecture marche et que les modifs syncront.
 *  - SYNCING (`pendingWrites > 0` et online) : titre « Synchronisation en
 *    cours… », sous-titre rappelant que les modifications partent au backend.
 *  - Rien à afficher sinon (état stable nominal).
 *
 * L'infrastructure offline est déjà fonctionnelle (cf. JALON 1D.1) : ce
 * composant rend simplement l'état VISIBLE à l'utilisateur.
 *
 * Transitions tokens (CLAUDE.md « Transitions douces partout ») : fade +
 * slide-down 200ms avec `ease-base`.
 *
 * `role="status"` + `aria-live="polite"` : annonce non-interruptive.
 */
export function OfflineBanner(): JSX.Element | null {
  const isOnline = useOnlineStatus();
  const pendingWrites = useSyncStore((state) => state.pendingWrites);

  const variant: 'offline' | 'syncing' | null = !isOnline
    ? 'offline'
    : pendingWrites > 0
      ? 'syncing'
      : null;

  if (variant === null) return null;

  const title =
    variant === 'offline'
      ? t('connectivity.offline.title')
      : t('connectivity.syncing.title');
  const body =
    variant === 'offline'
      ? t('connectivity.offline.body')
      : t('connectivity.syncing.body');

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="offline-banner"
      data-variant={variant}
      className={cn(
        'fixed inset-x-0 top-0 z-[120] flex justify-center px-3 pt-3',
        'pointer-events-none transition-all duration-200 ease-base',
      )}
    >
      <div
        className={cn(
          'pointer-events-auto w-full max-w-[420px] rounded-[18px] px-5 py-3',
          'border bg-[rgba(28,20,42,0.94)] backdrop-blur-xl',
          'shadow-[0_18px_60px_rgba(0,0,0,0.55)]',
          'transition-all duration-200 ease-base',
          variant === 'offline' && 'border-gold/50',
          variant === 'syncing' && 'border-teal/50',
        )}
      >
        <p
          className={cn(
            'font-display text-[14px] font-semibold tracking-[0.04em]',
            variant === 'offline' && 'text-gold-bright',
            variant === 'syncing' && 'text-teal',
          )}
        >
          {title}
        </p>
        <p className="mt-1 font-ui text-[12px] leading-snug text-text-secondary">
          {body}
        </p>
      </div>
    </div>
  );
}
