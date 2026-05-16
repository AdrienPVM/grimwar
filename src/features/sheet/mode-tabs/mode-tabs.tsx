import { useCallback, useRef } from 'react';

import { Icon } from '@/shared/components/icon';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import type { IconName } from '@/shared/design/icons';

import { SHEET_MODES, type SheetMode } from '../use-sheet-mode';

interface ModeTabsProps {
  active: SheetMode;
  onChange: (mode: SheetMode) => void;
}

const ICON_BY_MODE: Record<SheetMode, IconName> = {
  combat: 'i-sword',
  essence: 'i-spell',
  magie: 'i-magic',
  avoir: 'i-bag',
  ame: 'i-heart',
};

/**
 * Onglets des 5 modes de fiche. Mobile-first : icône + label, label masqué en
 * <420px pour rester confortable au pouce (5 cibles tap ≥ 56px chacune).
 * Bordure inférieure dorée sur l'actif.
 *
 * Swipe horizontal : géré ici via touchstart/touchend (delta X). Évite l'ajout
 * d'une dep externe comme react-swipeable pour 30 lignes de logique simple.
 * Au-delà de 50px de swipe horizontal et <30px vertical, navigue au mode
 * voisin. Verticalement pur (scroll), on ne fait rien.
 */
export function ModeTabs({ active, onChange }: ModeTabsProps): JSX.Element {
  const start = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    start.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!start.current) return;
      const touch = e.changedTouches[0];
      if (!touch) {
        start.current = null;
        return;
      }
      const dx = touch.clientX - start.current.x;
      const dy = touch.clientY - start.current.y;
      start.current = null;
      if (Math.abs(dy) > 30) return; // scroll vertical, on ignore
      if (Math.abs(dx) < 50) return; // trop court pour un swipe intentionnel
      const currentIdx = SHEET_MODES.indexOf(active);
      const nextIdx =
        dx < 0
          ? Math.min(SHEET_MODES.length - 1, currentIdx + 1)
          : Math.max(0, currentIdx - 1);
      const next = SHEET_MODES[nextIdx];
      if (next && next !== active) onChange(next);
    },
    [active, onChange],
  );

  return (
    <nav
      role="tablist"
      aria-label={t('sheet.modeTabs.aria')}
      className="mx-auto mt-6 flex w-full max-w-[420px] gap-1 px-3"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {SHEET_MODES.map((mode) => {
        const isActive = mode === active;
        return (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`sheet-mode-panel-${mode}`}
            id={`sheet-mode-tab-${mode}`}
            onClick={() => onChange(mode)}
            className={cn(
              'flex flex-1 flex-col items-center justify-end gap-1 py-3',
              'border-b-2 transition-colors duration-150',
              isActive
                ? 'border-gold text-gold-bright drop-shadow-[0_0_8px_var(--gold-glow)]'
                : 'border-transparent text-text-tertiary hover:text-text-secondary',
            )}
          >
            <Icon name={ICON_BY_MODE[mode]} className="h-6 w-6" />
            <span className="font-title text-[10px] font-bold uppercase tracking-[0.18em]">
              {t(`sheet.mode.${mode}`)}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
