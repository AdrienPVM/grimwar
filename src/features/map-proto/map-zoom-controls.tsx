import { type JSX } from 'react';

import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';

import type { UseMapTransformResult } from './use-map-transform';

/**
 * Trio « − · pourcentage · + » plus « Recadrer », partagé par la vue live MJ et
 * la vue présentation/TV (M32). Le pourcentage n'est pas décoratif : c'est le
 * seul repère qui dit qu'on est zoomé, sur un fond de carte qui n'en donne
 * aucun indice.
 *
 * Le panoramique, lui, n'a pas de bouton — il se fait au glisser sur le fond.
 */
export function MapZoomControls({
  view,
  testidPrefix,
  tone = 'panel',
}: {
  readonly view: UseMapTransformResult;
  readonly testidPrefix: string;
  /** `overlay` = posé sur la carte en plein écran (fond noir translucide). */
  readonly tone?: 'panel' | 'overlay';
}): JSX.Element {
  const base = cn(
    'rounded-pill border px-3 py-1 font-title text-[10px] uppercase tracking-[0.16em]',
    'transition-colors duration-200 ease-base disabled:opacity-40',
    tone === 'overlay'
      ? 'border-gold-dim/30 bg-black/50 text-gold-bright/80 hover:text-gold-bright'
      : 'border-gold-dim/40 text-gold-bright hover:bg-gold/10',
  );

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        data-testid={`${testidPrefix}-zoom-out`}
        aria-label={t('map.zoom.outAria')}
        disabled={!view.canZoomOut}
        onClick={view.zoomOut}
        className={base}
      >
        −
      </button>
      <span
        data-testid={`${testidPrefix}-zoom-level`}
        className={cn(
          'font-mono text-[11px]',
          tone === 'overlay' ? 'text-gold-bright/80' : 'text-text-tertiary',
        )}
      >
        {view.percent} %
      </span>
      <button
        type="button"
        data-testid={`${testidPrefix}-zoom-in`}
        aria-label={t('map.zoom.inAria')}
        disabled={!view.canZoomIn}
        onClick={view.zoomIn}
        className={base}
      >
        +
      </button>
      <button
        type="button"
        data-testid={`${testidPrefix}-zoom-reset`}
        disabled={!view.isFramed}
        onClick={view.reset}
        className={base}
      >
        {t('map.zoom.reset')}
      </button>
    </div>
  );
}
