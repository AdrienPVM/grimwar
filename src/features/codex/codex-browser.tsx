import { useState, type JSX } from 'react';

import { GlassPanel } from '@/shared/components/glass-panel';

import { CodexCategoryTabs, type CodexCategoryId } from './codex-categories';
import {
  AncestryBrowser,
  BackgroundBrowser,
  ClassBrowser,
} from './browsers/codex-build-browsers';
import {
  ConditionBrowser,
  FeatBrowser,
  InvocationBrowser,
} from './browsers/codex-text-browsers';
import { GlobalSearchBrowser } from './browsers/global-search-browser';
import { ItemBrowser } from './browsers/item-browser';
import { MagicItemBrowser } from './browsers/magic-item-browser';
import { MonsterBrowser } from './browsers/monster-browser';
import { SpellBrowser } from './browsers/spell-browser';

/**
 * Corps du Codex : sélecteur de catégorie + navigateur de la catégorie active.
 *
 * Extrait de `codex-screen.tsx` (audit UX, E6) pour servir DEUX présentations
 * sans duplication :
 *  - la page `/codex`, entrée depuis la bibliothèque, pour la consultation posée ;
 *  - `CodexOverlay`, la superposition ouverte depuis la fiche ou la rencontre,
 *    pour la consultation en pleine partie.
 *
 * Le composant ne pose ni titre ni conteneur : chaque présentation apporte le
 * sien (en-tête de page d'un côté, en-tête de modale de l'autre).
 */

interface CodexBrowserProps {
  /**
   * Catégorie ouverte au montage. Permet à un appelant d'entrer directement là
   * où il sait que la question se pose — la rencontre ouvre sur les monstres,
   * la fiche sur les états.
   */
  initialCategory?: CodexCategoryId;
  /**
   * Habillage du panneau de contenu. `glass` pour la page `/codex` (le panneau
   * de verre est son fond) ; `plain` dans une modale, qui apporte déjà le sien —
   * deux panneaux de verre l'un dans l'autre empilent deux flous.
   */
  surface?: 'glass' | 'plain';
}

export function CodexBrowser({
  initialCategory = 'spells',
  surface = 'plain',
}: CodexBrowserProps): JSX.Element {
  const [active, setActive] = useState<CodexCategoryId>(initialCategory);

  const panelProps = {
    role: 'tabpanel',
    id: `codex-panel-${active}`,
    'aria-labelledby': `codex-tab-${active}`,
  } as const;

  return (
    <>
      <CodexCategoryTabs active={active} onChange={setActive} />
      {surface === 'glass' ? (
        <GlassPanel {...panelProps} className="mt-4 p-4 sm:p-6">
          <CodexActiveBrowser category={active} />
        </GlassPanel>
      ) : (
        <div {...panelProps} className="mt-4">
          <CodexActiveBrowser category={active} />
        </div>
      )}
    </>
  );
}

function CodexActiveBrowser({
  category,
}: {
  category: CodexCategoryId;
}): JSX.Element {
  switch (category) {
    case 'search':
      return <GlobalSearchBrowser />;
    case 'spells':
      return <SpellBrowser />;
    case 'magicItems':
      return <MagicItemBrowser />;
    case 'items':
      return <ItemBrowser />;
    case 'monsters':
      return <MonsterBrowser />;
    case 'ancestries':
      return <AncestryBrowser />;
    case 'backgrounds':
      return <BackgroundBrowser />;
    case 'classes':
      return <ClassBrowser />;
    case 'feats':
      return <FeatBrowser />;
    case 'invocations':
      return <InvocationBrowser />;
    case 'conditions':
      return <ConditionBrowser />;
  }
}
