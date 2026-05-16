import type { JSX } from 'react';

import { t } from '@/shared/lib/i18n';

export function Splash(): JSX.Element {
  return (
    <main
      className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-6 px-6"
      role="status"
      aria-live="polite"
    >
      <h1 className="font-display text-hero text-gold-bright drop-shadow-[0_0_24px_rgba(220,184,108,0.45)]">
        {t('splash.brand')}
      </h1>
      <p className="font-serif text-body-lg text-text-tertiary">{t('splash.loading')}</p>
    </main>
  );
}
