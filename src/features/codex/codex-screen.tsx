import { type JSX } from 'react';

import { Divider } from '@/shared/components/divider';
import { PageContainer } from '@/shared/components/page-container';
import { t } from '@/shared/lib/i18n';

import { CodexBrowser } from './codex-browser';

/**
 * Le Codex (plan 19) — navigateur du contenu SRD 5.2.1 bundlé. Lecture seule,
 * dérivé de `public/data/*.json`, sans `character` ni écriture Firestore. Un
 * sélecteur de catégorie commute le navigateur affiché ; chaque navigateur gère
 * sa propre recherche / ses filtres / sa modale.
 *
 * Point d'entrée : carte « Le Codex » de la bibliothèque (`/`). Route `/codex`.
 * Le corps est partagé avec `CodexOverlay` (`codex-browser.tsx`), qui sert la
 * même consultation sans quitter la fiche ni la rencontre (audit UX, E6).
 */
export function CodexScreen(): JSX.Element {
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
        <CodexBrowser surface="glass" />
      </div>
    </PageContainer>
  );
}
