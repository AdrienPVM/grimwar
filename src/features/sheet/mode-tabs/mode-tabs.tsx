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
        dx < 0 ? Math.min(SHEET_MODES.length - 1, currentIdx + 1) : Math.max(0, currentIdx - 1);
      const next = SHEET_MODES[nextIdx];
      if (next && next !== active) onChange(next);
    },
    [active, onChange],
  );

  return (
    <div
      // Mobile (<lg) : barre d'onglets ÉPINGLÉE en haut de l'écran — on change de
      // mode sans remonter au-dessus de ~500px de chrome (emblème + nom + status).
      // L'épinglage porte sur cette barre pleine largeur (fond + flou) ; le
      // `<aside>` parent passe en `display:contents` à <lg (cf. character-sheet)
      // pour que le conteneur d'épinglage soit la grille pleine hauteur — sinon
      // la portée d'épinglage serait quasi nulle (les onglets sont le dernier
      // enfant de l'aside).
      // Desktop (lg+) : réintégré tel quel dans la sidebar déjà sticky — pas de
      // fond ni d'épinglage propres.
      className={cn(
        // `top` aligné SOUS le NavShell sticky (h-56px <sm / 60px ≥sm) pour
        // qu'ils ne se chevauchent pas (le NavShell est `sticky top-0 z-50`).
        // z-30 : au-dessus du contenu du mode qui défile, sous le NavShell.
        'sticky top-[56px] z-30 mt-6 border-b border-white-8 bg-bg/85 px-3 py-1.5 backdrop-blur-md sm:top-[60px]',
        'transition-colors duration-150 ease-base',
        // `lg:shrink-0` : dans la colonne flex de la sidebar, les onglets sont
        // épinglés sous la zone de défilement — sans cette garde, une sidebar
        // trop courte les comprimerait au lieu de faire défiler l'identité.
        'lg:static lg:z-auto lg:mt-6 lg:shrink-0 lg:border-b-0 lg:bg-transparent lg:px-2 lg:py-0 lg:backdrop-blur-none',
      )}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <nav
        role="tablist"
        aria-label={t('sheet.modeTabs.aria')}
        className="mx-auto flex w-full max-w-[420px] gap-1 lg:max-w-none lg:flex-col lg:gap-2"
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
                // Mobile : 5 tabs horizontaux, icône au-dessus du label, bordure
                // dorée bas pour l'actif.
                'flex flex-1 flex-col items-center justify-end gap-1 py-3',
                'border-b-2 transition-colors duration-150',
                // Desktop (lg+) : tab vertical pleine largeur — icône + label
                // sur une rangée, bordure gauche dorée, fond doré subtil sur
                // l'actif pour signaler la sélection sans dépendre d'une
                // border-bottom (illisible verticalement).
                'lg:flex-row lg:items-center lg:justify-start lg:gap-3 lg:rounded-card-sm lg:px-3 lg:py-2.5 lg:border-b-0 lg:border-l-2',
                isActive
                  ? 'border-gold text-gold-bright drop-shadow-[0_0_8px_var(--gold-glow)] lg:bg-gold/10'
                  : 'border-transparent text-text-tertiary hover:text-text-secondary lg:hover:bg-white/[0.03] lg:hover:border-white-8',
              )}
            >
              <Icon name={ICON_BY_MODE[mode]} className="h-6 w-6 lg:h-5 lg:w-5" />
              <span className="font-title text-[10px] font-bold uppercase tracking-[0.18em] lg:text-[11px]">
                {t(`sheet.mode.${mode}`)}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
