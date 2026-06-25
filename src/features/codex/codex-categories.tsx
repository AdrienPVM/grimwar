import type { JSX } from 'react';

import { Icon } from '@/shared/components/icon';
import type { IconName } from '@/shared/design/icons';
import { cn } from '@/shared/lib/cn';
import { t, type StringKey } from '@/shared/lib/i18n';

/**
 * Catégories du Codex (plan 19). La liste grandit commit par commit : chaque
 * catégorie n'apparaît dans le sélecteur QUE lorsque son navigateur est livré
 * (pas d'onglet « bientôt disponible »). Ordre = ordre d'affichage.
 */
export type CodexCategoryId =
  | 'spells'
  | 'magicItems'
  | 'items'
  | 'ancestries'
  | 'backgrounds'
  | 'classes'
  | 'feats'
  | 'invocations'
  | 'conditions';

interface CodexCategory {
  id: CodexCategoryId;
  labelKey: StringKey;
  icon: IconName;
}

export const CODEX_CATEGORIES: readonly CodexCategory[] = [
  { id: 'spells', labelKey: 'codex.cat.spells', icon: 'i-spell' },
  { id: 'magicItems', labelKey: 'codex.cat.magicItems', icon: 'i-potion' },
  { id: 'items', labelKey: 'codex.cat.items', icon: 'i-bag' },
  { id: 'ancestries', labelKey: 'codex.cat.ancestries', icon: 'i-eye' },
  { id: 'backgrounds', labelKey: 'codex.cat.backgrounds', icon: 'i-book' },
  { id: 'classes', labelKey: 'codex.cat.classes', icon: 'i-staff' },
  { id: 'feats', labelKey: 'codex.cat.feats', icon: 'i-feather' },
  { id: 'invocations', labelKey: 'codex.cat.invocations', icon: 'i-magic' },
  { id: 'conditions', labelKey: 'codex.cat.conditions', icon: 'i-skull' },
];

interface CodexCategoryTabsProps {
  active: CodexCategoryId;
  onChange: (id: CodexCategoryId) => void;
}

/**
 * Sélecteur de catégorie : rangée scrollable d'onglets icône + label, bordure
 * basse dorée sur l'actif. `role=tablist` pour l'accessibilité ; chaque onglet
 * pilote le panneau de la catégorie correspondante.
 */
export function CodexCategoryTabs({
  active,
  onChange,
}: CodexCategoryTabsProps): JSX.Element {
  return (
    <nav
      role="tablist"
      aria-label={t('codex.cat.aria')}
      className="flex gap-1 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden"
    >
      {CODEX_CATEGORIES.map((category) => {
        const isActive = category.id === active;
        return (
          <button
            key={category.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`codex-panel-${category.id}`}
            id={`codex-tab-${category.id}`}
            onClick={() => onChange(category.id)}
            className={cn(
              'flex flex-shrink-0 items-center gap-2 whitespace-nowrap px-3 py-2.5',
              'border-b-2 font-title text-[11px] font-bold uppercase tracking-[0.18em]',
              'transition-colors duration-150 ease-base',
              isActive
                ? 'border-gold text-gold-bright drop-shadow-[0_0_8px_var(--gold-glow)]'
                : 'border-transparent text-text-tertiary hover:text-text-secondary',
            )}
          >
            <Icon name={category.icon} className="h-4 w-4" />
            <span>{t(category.labelKey)}</span>
          </button>
        );
      })}
    </nav>
  );
}
