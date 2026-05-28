import type { JSX } from 'react';

import { useOnlineStatus } from '../hooks/use-online-status';
import { t } from '../lib/i18n';
import { cn } from '../lib/cn';

/**
 * Bannière globale affichée quand `navigator.onLine === false`.
 *
 * Position fixe en haut-centre (au-dessus du splash mais sous les modales),
 * non bloquante. Le SDK Firestore continue de servir les lectures depuis le
 * cache local IndexedDB et de mettre les écritures en file — l'utilisateur
 * peut toujours consulter sa fiche et la modifier ; la sync reprend au
 * retour de la connexion (cf. `enableIndexedDbPersistence` dans
 * `src/shared/lib/firebase.ts`).
 *
 * Transitions tokens (CLAUDE.md « Transitions douces partout ») : fade +
 * slide-down 200ms avec `ease-base`, pas d'apparition brutale.
 *
 * `role="status"` + `aria-live="polite"` : la bannière est annoncée par les
 * lecteurs d'écran sans interrompre l'utilisateur.
 */
export function OfflineBanner(): JSX.Element | null {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="offline-banner"
      className={cn(
        'fixed inset-x-0 top-0 z-[120] flex justify-center px-3 pt-3',
        'pointer-events-none transition-all duration-200 ease-base',
      )}
    >
      <div
        className={cn(
          'pointer-events-auto w-full max-w-[420px] rounded-[18px] px-5 py-3',
          'border border-gold/50 bg-[rgba(28,20,42,0.94)] backdrop-blur-xl',
          'shadow-[0_18px_60px_rgba(0,0,0,0.55)]',
          'transition-all duration-200 ease-base',
        )}
      >
        <p className="font-display text-[14px] font-semibold tracking-[0.04em] text-gold-bright">
          {t('connectivity.offline.title')}
        </p>
        <p className="mt-1 font-ui text-[12px] leading-snug text-text-secondary">
          {t('connectivity.offline.body')}
        </p>
      </div>
    </div>
  );
}
