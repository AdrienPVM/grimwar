import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/shared/components/button';
import { Divider } from '@/shared/components/divider';
import { GlassPanel } from '@/shared/components/glass-panel';
import { Splash } from '@/shared/components/splash';
import { t } from '@/shared/lib/i18n';

import { CharacterCard } from './character-card';
import { useCharactersList } from './use-characters-list';

/**
 * Écran d'accueil : liste les personnages du user (lecture temps réel),
 * propose un CTA Créer, gère empty state + loading + error.
 *
 * C'est le PREMIER écran qu'un utilisateur voit en ouvrant GrimWar — il doit
 * donner le ton aesthetic illuminated-manuscript (aurora bg déjà global,
 * glass panels, Cinzel Decorative, divider à flourish, accents or).
 *
 * La clé `remountKey` du hook est utilisée par le bouton « Réessayer » de
 * l'état d'erreur : un setState force le `useEffect` interne à se rejouer.
 */
export function LibraryScreen(): JSX.Element {
  const [remountKey, setRemountKey] = useState<number>(0);
  return <LibraryScreenInner key={remountKey} onRetry={() => setRemountKey((k) => k + 1)} />;
}

interface InnerProps {
  onRetry: () => void;
}

function LibraryScreenInner({ onRetry }: InnerProps): JSX.Element {
  const navigate = useNavigate();
  const { characters, isLoading, error } = useCharactersList();

  if (isLoading) return <Splash />;

  if (error) {
    return (
      <main className="relative z-10 mx-auto flex min-h-[60vh] max-w-[420px] flex-col items-center justify-center px-6 py-12">
        <GlassPanel className="w-full px-6 py-8 text-center">
          <h1 className="font-title text-body uppercase tracking-[0.18em] text-crimson">
            {t('library.error.title')}
          </h1>
          <p className="mt-3 font-serif text-body-sm text-text-secondary">
            {t('library.error.body')}
          </p>
          <Button variant="secondary" size="sm" onClick={onRetry} className="mt-6">
            {t('library.error.retry')}
          </Button>
        </GlassPanel>
      </main>
    );
  }

  if (characters.length === 0) {
    return (
      <main className="relative z-10 mx-auto flex min-h-[60vh] max-w-[480px] flex-col items-center justify-center px-6 py-12">
        <GlassPanel className="w-full px-7 py-10 text-center">
          <h1 className="font-display text-2xl uppercase tracking-[0.18em] text-gold-bright">
            {t('library.empty.title')}
          </h1>
          <Divider className="my-5" />
          <p className="mx-auto max-w-[36ch] font-serif text-body italic text-text-secondary">
            {t('library.empty.body')}
          </p>
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate('/create')}
            className="mt-7"
          >
            {t('library.cta.create')}
          </Button>
        </GlassPanel>
      </main>
    );
  }

  return (
    <main className="relative z-10 mx-auto w-full max-w-[960px] px-4 py-8 sm:px-6">
      <header className="text-center">
        <Divider className="mb-4" />
        <h1 className="font-display text-3xl font-bold uppercase tracking-[0.18em] text-gold-bright">
          {t('library.title')}
        </h1>
        <p className="mt-2 font-serif text-body italic text-text-secondary">
          {t('library.subtitle')}
        </p>
      </header>

      <section
        aria-label={t('library.list.aria')}
        className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        {characters.map((character) => (
          <CharacterCard key={character.id} character={character} />
        ))}
      </section>

      <div className="mt-10 flex flex-col items-center gap-4">
        <Button variant="primary" size="lg" onClick={() => navigate('/create')}>
          {t('library.cta.create')}
        </Button>
        {/*
          Raccourcis discrets vers Campagnes (S2 plan 4.0.4) + vue MJ. Style
          minimal pour ne pas voler la vedette au CTA Créer ; un vrai nav-shell
          arrivera quand la séquence 4.0.x sera terminée.
        */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <button
            type="button"
            onClick={() => navigate('/campaigns')}
            className="font-title text-meta uppercase tracking-[0.22em] text-text-tertiary transition-colors duration-200 ease-base hover:text-gold-bright"
          >
            {t('campaigns.title')} →
          </button>
          <button
            type="button"
            onClick={() => navigate('/dm')}
            className="font-title text-meta uppercase tracking-[0.22em] text-text-tertiary transition-colors duration-200 ease-base hover:text-gold-bright"
          >
            {t('dm.title')} →
          </button>
        </div>
      </div>
    </main>
  );
}
