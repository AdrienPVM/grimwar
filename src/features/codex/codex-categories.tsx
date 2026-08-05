import { useEffect, useRef, type JSX } from 'react';

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
  | 'search'
  | 'spells'
  | 'magicItems'
  | 'items'
  | 'monsters'
  | 'ancestries'
  | 'backgrounds'
  | 'classes'
  | 'feats'
  | 'invocations'
  | 'conditions';

export interface CodexCategory {
  id: CodexCategoryId;
  labelKey: StringKey;
  icon: IconName;
}

export const CODEX_CATEGORIES: readonly CodexCategory[] = [
  // En tête : c'est l'onglet de celui qui ne sait pas dans quelle catégorie
  // chercher — le faire précéder des dix autres serait lui demander de deviner
  // d'abord ce qu'il cherche.
  { id: 'search', labelKey: 'codex.cat.search', icon: 'i-search' },
  { id: 'spells', labelKey: 'codex.cat.spells', icon: 'i-spell' },
  { id: 'magicItems', labelKey: 'codex.cat.magicItems', icon: 'i-potion' },
  { id: 'items', labelKey: 'codex.cat.items', icon: 'i-bag' },
  { id: 'monsters', labelKey: 'codex.cat.monsters', icon: 'i-skull' },
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
 * Sélecteur de catégorie : rangée d'onglets icône + label, bordure basse dorée
 * sur l'actif. `role=tablist` pour l'accessibilité ; chaque onglet pilote le
 * panneau de la catégorie correspondante.
 *
 * DEUX comportements de débordement, pour onze onglets :
 *  - **mobile** : défilement horizontal (idiome d'une barre d'onglets tactile),
 *    avec recentrage automatique de l'onglet actif — indispensable depuis que
 *    le Codex peut s'ouvrir directement sur une catégorie éloignée (les États
 *    sont le 10ᵉ onglet sur 10) : sans ça, on arrivait sur la liste des états
 *    avec « Sorts · Objets magiques · Équi… » à l'écran et aucun moyen de
 *    savoir quelle catégorie était active.
 *  - **à partir de `sm`** : passage à la ligne. Dans la superposition, la
 *    largeur du panneau est plus étroite que la page, et le défilement
 *    horizontal y tronquait le dernier onglet en plein mot contre le bord.
 */
export function CodexCategoryTabs({
  active,
  onChange,
}: CodexCategoryTabsProps): JSX.Element {
  const navRef = useRef<HTMLElement | null>(null);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  // Recentre l'onglet actif DANS la rangée. On écrit `scrollLeft` sur le
  // conteneur plutôt que d'appeler `scrollIntoView`, qui remonterait la chaîne
  // des ancêtres scrollables et déplacerait la page (ou la modale) derrière.
  useEffect(() => {
    const nav = navRef.current;
    const btn = activeRef.current;
    if (!nav || !btn) return;
    const centered = btn.offsetLeft - (nav.clientWidth - btn.clientWidth) / 2;
    nav.scrollLeft = Math.max(0, centered);
  }, [active]);

  return (
    <nav
      ref={navRef}
      role="tablist"
      aria-label={t('codex.cat.aria')}
      // `-my-2 py-2` : `overflow-x: auto` force la spec à recalculer `overflow-y`
      // en `auto`, ce qui rognait le halo `drop-shadow` de 8 px de l'onglet actif
      // en haut et en bas. Le rembourrage lui laisse la place, la marge négative
      // annule le décalage. Même correctif que `<ScrollRow>` (cf. sa doc).
      className="-my-2 flex gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-x-visible"
    >
      {CODEX_CATEGORIES.map((category) => {
        const isActive = category.id === active;
        return (
          <button
            key={category.id}
            ref={isActive ? activeRef : undefined}
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
