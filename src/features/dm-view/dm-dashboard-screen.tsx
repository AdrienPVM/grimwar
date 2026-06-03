import { useNavigate } from 'react-router-dom';

import { Button } from '@/shared/components/button';
import { Divider } from '@/shared/components/divider';
import { GlassPanel } from '@/shared/components/glass-panel';
import { Splash } from '@/shared/components/splash';
import { t } from '@/shared/lib/i18n';

import { useCharactersList } from '@/features/library/use-characters-list';

import { PartyCard } from './party-card';
import { QuickNotes } from './quick-notes';
import { SecretRollButton } from './secret-roll-button';

/**
 * Vue MJ — Tableau de bord du meneur.
 *
 * V1 S1 : pas encore de modèle Campagne (S2). En attendant, le dashboard
 * affiche TOUS les personnages du user connecté comme s'ils étaient « la
 * compagnie ». Quand S2 livrera `campaigns/`/`memberships/`, ce screen sera
 * recâblé sur les memberships actifs ; la coquille (layout / cartes party /
 * scratchpad / secret-roll) reste valide.
 *
 * Pas listée au menu — accessible par URL directe `/dm` en V1. Un raccourci
 * NavShell viendra avec la livraison campaigns (S2 plan 14).
 */
export function DmDashboardScreen(): JSX.Element {
  const navigate = useNavigate();
  const { characters, isLoading, error } = useCharactersList();

  if (isLoading) return <Splash />;

  if (error) {
    return (
      <main className="relative z-10 mx-auto flex min-h-[60vh] max-w-[480px] flex-col items-center justify-center px-6 py-12">
        <GlassPanel className="w-full px-6 py-8 text-center">
          <h1 className="font-title text-body uppercase tracking-[0.18em] text-crimson">
            {t('library.error.title')}
          </h1>
          <p className="mt-3 font-serif text-body-sm text-text-secondary">
            {error.message}
          </p>
        </GlassPanel>
      </main>
    );
  }

  if (characters.length === 0) {
    return (
      <main className="relative z-10 mx-auto flex min-h-[60vh] max-w-[480px] flex-col items-center justify-center px-6 py-12">
        <GlassPanel className="w-full px-7 py-10 text-center">
          <h1 className="font-display text-2xl uppercase tracking-[0.18em] text-gold-bright">
            {t('dm.empty.title')}
          </h1>
          <Divider className="my-5" />
          <p className="mx-auto max-w-[36ch] font-serif text-body italic text-text-secondary">
            {t('dm.empty.body')}
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
    <main className="relative z-10 mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="text-center">
        <Divider className="mb-4" />
        <h1 className="font-display text-3xl font-bold uppercase tracking-[0.18em] text-gold-bright">
          {t('dm.title')}
        </h1>
        <p className="mt-2 font-serif text-body italic text-text-secondary">
          {t('dm.subtitle')}
        </p>
      </header>

      {/*
        Layout :
        - Mobile (< lg) : tout empilé verticalement.
        - Desktop (lg+) : 2-col — la party à gauche (2/3), les outils MJ
          (notes + secret-roll) à droite (1/3) en sticky.
      */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-8">
        <section aria-label={t('dm.party.ariaList')}>
          <h2 className="mb-4 font-title text-meta uppercase tracking-[0.22em] text-gold-bright">
            {t('dm.party.title')} · {characters.length}
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {characters.map((character) => (
              <li key={character.id}>
                <PartyCard character={character} />
              </li>
            ))}
          </ul>
        </section>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-20 lg:self-start">
          <SecretRollButton />
          <QuickNotes />
        </aside>
      </div>
    </main>
  );
}
