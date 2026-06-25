import { useState, type JSX } from 'react';

import { Divider } from '@/shared/components/divider';
import { GlassPanel } from '@/shared/components/glass-panel';
import { PageContainer } from '@/shared/components/page-container';
import { t } from '@/shared/lib/i18n';

import {
  CodexCategoryTabs,
  type CodexCategoryId,
} from './codex-categories';
import {
  ConditionBrowser,
  FeatBrowser,
  InvocationBrowser,
} from './browsers/codex-text-browsers';
import { ItemBrowser } from './browsers/item-browser';
import { MagicItemBrowser } from './browsers/magic-item-browser';
import { SpellBrowser } from './browsers/spell-browser';

/**
 * Le Codex (plan 19) — navigateur du contenu SRD 5.2.1 bundlé. Lecture seule,
 * dérivé de `public/data/*.json`, sans `character` ni écriture Firestore. Un
 * sélecteur de catégorie commute le navigateur affiché ; chaque navigateur gère
 * sa propre recherche / ses filtres / sa modale.
 *
 * Point d'entrée : carte « Le Codex » de la bibliothèque (`/`). Route `/codex`.
 */
export function CodexScreen(): JSX.Element {
  const [active, setActive] = useState<CodexCategoryId>('spells');

  return (
    <PageContainer width="wide">
      <header className="text-center">
        <Divider className="mb-4" />
        <h1 className="font-display text-3xl font-bold uppercase tracking-[0.18em] text-gold-bright">
          {t('codex.title')}
        </h1>
        <p className="mt-2 font-serif text-body italic text-text-secondary">
          {t('codex.subtitle')}
        </p>
      </header>

      <div className="mt-8">
        <CodexCategoryTabs active={active} onChange={setActive} />
      </div>

      <GlassPanel
        role="tabpanel"
        id={`codex-panel-${active}`}
        aria-labelledby={`codex-tab-${active}`}
        className="mt-4 p-4 sm:p-6"
      >
        <CodexActiveBrowser category={active} />
      </GlassPanel>
    </PageContainer>
  );
}

function CodexActiveBrowser({
  category,
}: {
  category: CodexCategoryId;
}): JSX.Element {
  switch (category) {
    case 'spells':
      return <SpellBrowser />;
    case 'magicItems':
      return <MagicItemBrowser />;
    case 'items':
      return <ItemBrowser />;
    case 'feats':
      return <FeatBrowser />;
    case 'invocations':
      return <InvocationBrowser />;
    case 'conditions':
      return <ConditionBrowser />;
  }
}
