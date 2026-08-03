import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/shared/components/button';
import { PageContainer } from '@/shared/components/page-container';
import { Divider } from '@/shared/components/divider';
import { GlassPanel } from '@/shared/components/glass-panel';
import { Splash } from '@/shared/components/splash';
import { t } from '@/shared/lib/i18n';

import { OngoingPlayCard } from '@/features/campaigns/ongoing-play-card';
import { useOngoingPlay } from '@/features/campaigns/use-ongoing-play';

import { CharacterCard } from './character-card';
import { NavHub } from './nav-hub';
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
  // Sondé ici et non dans <OngoingPlayCard> : l'accueil a deux rendus (peuplé
  // et vide) qui affichent tous les deux le bandeau, et on ne veut pas deux
  // sondages. Un joueur sans personnage PEUT être attendu à une table.
  const { ongoing } = useOngoingPlay();

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
      <main className="relative z-10 mx-auto flex min-h-[60vh] w-full max-w-[680px] flex-col items-center justify-center px-6 py-12">
        <OngoingPlayCard ongoing={ongoing} className="mb-8 max-w-[480px]" />
        <GlassPanel className="w-full max-w-[480px] px-7 py-10 text-center">
          <h1 className="font-display text-2xl uppercase tracking-[0.18em] text-gold-bright">
            {t('library.empty.title')}
          </h1>
          <Divider className="my-5" />
          <p className="mx-auto max-w-[36ch] font-serif text-body italic text-text-secondary">
            {t('library.empty.body')}
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:items-center">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/create')}
            >
              {t('library.cta.create')}
            </Button>
            {/* Un nouveau venu invité à une table n'a pas forcément de perso à
                créer d'abord : il peut rejoindre la campagne, puis y créer sa
                fiche (le flux guidé la liera automatiquement). */}
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate('/campaigns/join')}
            >
              {t('library.cta.join')}
            </Button>
          </div>
        </GlassPanel>
        <NavHub className="mt-8" />
      </main>
    );
  }

  return (
    <PageContainer width="wide">
      {/*
        Au-dessus du titre, et non dans le hub du bas : quand une partie est en
        cours, « reprendre » est la seule chose que l'utilisateur vient faire.
      */}
      <OngoingPlayCard ongoing={ongoing} className="mx-auto mb-6 max-w-[720px]" />
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

      <div className="mt-10 flex flex-col items-center gap-6">
        <Button variant="primary" size="lg" onClick={() => navigate('/create')}>
          {t('library.cta.create')}
        </Button>
        <NavHub className="max-w-[720px]" />
      </div>
    </PageContainer>
  );
}
