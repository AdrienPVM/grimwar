import { useEffect, useRef } from 'react';

import { Icon } from '@/shared/components/icon';
import { Tooltip } from '@/shared/components/tooltip';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';

import type { Wedge } from './wedge-config';

interface DockedMenuProps {
  /** Titre affiché (menu racine ou label du sous-menu courant). */
  title: string;
  /** Wedges du niveau courant. */
  items: readonly Wedge[];
  /** Affiche le bouton « Retour » (vrai dans un sous-menu). */
  showBack: boolean;
  onPick: (wedge: Wedge) => void;
  onBack: () => void;
  onClose: () => void;
}

/**
 * Menu tactile docké du radial FAB (plan 11, step 15 — « accessibility
 * fallback »). Bottom-sheet doré cohérent avec les autres overlays de l'app
 * (ancrage `items-end` mobile, backdrop flouté, transitions via tokens DS).
 *
 * **Présentational pur** : reçoit la liste de wedges du niveau courant + les
 * handlers ; ne décide rien (la navigation main↔sous-menu vit dans `RadialFab`).
 * C'est la variante déterministe ; le geste press-hold-drag (steps 1-14) viendra
 * envelopper la MÊME `wedge-config` lors de la session de calage avec Adrien.
 */
export function DockedMenu({
  title,
  items,
  showBack,
  onPick,
  onBack,
  onClose,
}: DockedMenuProps): JSX.Element {
  const firstItemRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    // Échap ferme le menu (a11y, plan step 18 — la nav clavier complète des
    // wedges arrive avec le geste). Focus initial sur le 1er item.
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener('keydown', onKey);
    firstItemRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('sheet.fab.menuAria')}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/70 backdrop-blur-xl"
      onClick={onClose}
    >
      <div
        className={cn(
          'flex w-full max-w-[460px] flex-col gap-1 rounded-t-card border-x border-t border-soft bg-glass px-4 pb-5 pt-3 shadow-card-lg',
          'duration-200 ease-spring',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-1 flex items-center justify-between gap-3 border-b border-white-8 px-1 pb-3">
          <div className="flex min-w-0 items-center gap-2">
            {showBack ? (
              <Tooltip label={t('radialMenu.tip.back')} decorative>
                <button
                  type="button"
                  onClick={onBack}
                  aria-label={t('sheet.fab.back')}
                  className="-ml-1 rounded-full border border-white-8 px-2.5 py-1 font-title text-[12px] text-text-tertiary transition-colors duration-150 ease-base hover:border-soft hover:text-gold-bright"
                >
                  ‹
                </button>
              </Tooltip>
            ) : (
              <Icon name="i-magic" className="h-4 w-4 shrink-0 text-gold-bright" />
            )}
            <h2 className="truncate font-title text-[11px] font-bold uppercase tracking-[0.2em] text-text">
              {title}
            </h2>
          </div>
          <Tooltip label={t('radialMenu.tip.close')} placement="left" decorative>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('sheet.fab.closeLabel')}
              className="rounded-full border border-white-8 px-3 py-1 font-title text-[10px] uppercase tracking-[0.18em] text-text-tertiary transition-colors duration-150 ease-base hover:border-soft hover:text-gold-bright"
            >
              ✕
            </button>
          </Tooltip>
        </header>

        <ul className="flex flex-col gap-1.5">
          {items.map((wedge, idx) => {
            const isSub = wedge.action.kind === 'submenu';
            return (
              <li key={wedge.id}>
                <button
                  ref={idx === 0 ? firstItemRef : undefined}
                  type="button"
                  data-wedge={wedge.id}
                  onClick={() => onPick(wedge)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-card-sm border border-white-8 bg-white/[0.02] px-4 py-3',
                    'transition-colors duration-150 ease-base hover:border-gold-bright/40 hover:bg-gold-bright/[0.06]',
                  )}
                >
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold-dim/60 bg-gold-bright/[0.08]">
                    <Icon name={wedge.icon} className="h-4 w-4 text-gold-bright" />
                  </span>
                  <span className="flex-1 text-left font-serif text-body text-text">
                    {t(wedge.labelKey)}
                  </span>
                  {isSub ? (
                    <span aria-hidden="true" className="font-display text-[18px] text-gold-bright/70">
                      ›
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
