import { t, type StringKey } from '@/shared/lib/i18n';

import type { SheetMode } from '../use-sheet-mode';

interface ModePlaceholderProps {
  mode: SheetMode;
}

/**
 * Bloc vide unique pour les 5 modes en S1 — le contenu réel arrive plans 07-10 + 20.
 * Centré, glass-light, message "À venir" + clé localisée du mode. On ne crée
 * pas 5 fichiers identiques de 5 lignes — le mode change quand le contenu réel
 * existe.
 */
export function ModePlaceholder({ mode }: ModePlaceholderProps): JSX.Element {
  return (
    <div
      role="tabpanel"
      id={`sheet-mode-panel-${mode}`}
      aria-labelledby={`sheet-mode-tab-${mode}`}
      className="mx-auto mt-4 flex w-full max-w-[420px] flex-col items-center px-4 py-8"
    >
      <p className="font-title text-[11px] font-bold uppercase tracking-[0.22em] text-gold-dim">
        {t(`sheet.mode.${mode}` as StringKey)}
      </p>
      <p className="mt-3 text-center font-serif italic text-text-tertiary">
        {t('sheet.placeholder.todo')}
      </p>
    </div>
  );
}
