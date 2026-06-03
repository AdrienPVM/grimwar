import { t, type StringKey } from '@/shared/lib/i18n';

import type { SheetMode } from '../use-sheet-mode';

interface ModePlaceholderProps {
  mode: SheetMode;
}

/**
 * Bloc vide unique pour les modes encore non contentés (Âme arrive plan 20 / S2).
 * Rendu en `<section>` pour homogénéité DOM avec les 4 modes contentés (combat /
 * magie / essence / avoir) — le placeholder hérite ainsi du même reset CSS scoped
 * `.sheet-state .sheet-desktop-main > section` à lg+ et reste cohérent visuellement
 * aux 4 viewports. À xl+ il NE bascule PAS en grille 2-col (volontairement absent du
 * sélecteur xl 2-col : un placeholder centré dans une cellule unique aérée est plus
 * lisible qu'éclaté en 2 col vides).
 */
export function ModePlaceholder({ mode }: ModePlaceholderProps): JSX.Element {
  return (
    <section
      role="tabpanel"
      id={`sheet-mode-panel-${mode}`}
      aria-labelledby={`sheet-mode-tab-${mode}`}
      className="mx-auto mt-4 flex w-full max-w-[420px] flex-col items-center px-4 py-8 lg:max-w-[640px] lg:px-0"
    >
      <p className="font-title text-[11px] font-bold uppercase tracking-[0.22em] text-gold-dim">
        {t(`sheet.mode.${mode}` as StringKey)}
      </p>
      <p className="mt-3 text-center font-serif italic text-text-tertiary">
        {t('sheet.placeholder.todo')}
      </p>
    </section>
  );
}
