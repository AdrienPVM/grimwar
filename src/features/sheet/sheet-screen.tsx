import { Link, useParams } from 'react-router-dom';

import { Button } from '@/shared/components/button';
import { GlassPanel } from '@/shared/components/glass-panel';
import { Splash } from '@/shared/components/splash';
import { t } from '@/shared/lib/i18n';

import { CharacterSheet } from './character-sheet';
import { PermissionProvider, usePermissions } from './permissions-context';
import { useCharacter } from './use-character';

/** Écran principal de fiche : route /character/:id. */
export function SheetScreen(): JSX.Element {
  const { id: characterId } = useParams<{ id: string }>();
  const { character, isLoading, error } = useCharacter(characterId);
  const permission = usePermissions(character);

  if (isLoading) return <Splash />;

  if (error) {
    return (
      <main className="relative z-10 mx-auto flex min-h-[60vh] max-w-[420px] flex-col items-center justify-center gap-4 px-6 py-12">
        <GlassPanel className="w-full px-6 py-8 text-center">
          <h1 className="font-title text-body uppercase tracking-[0.18em] text-crimson">
            {t('sheet.error.title')}
          </h1>
          <p className="mt-3 font-serif text-body-sm text-text-secondary">{error.message}</p>
          {/* CTA secondaire conservé en + du nav shell pour ne pas obliger
              à viser le bouton ← du header depuis un état d'erreur centré. */}
          <Link to="/" className="mt-6 inline-block">
            <Button variant="secondary" size="sm">
              {t('sheet.backHome')}
            </Button>
          </Link>
        </GlassPanel>
      </main>
    );
  }

  if (!character) {
    return (
      <main className="relative z-10 mx-auto flex min-h-[60vh] max-w-[420px] flex-col items-center justify-center gap-4 px-6 py-12">
        <GlassPanel className="w-full px-6 py-8 text-center">
          <h1 className="font-display text-xl uppercase tracking-[0.18em] text-gold-bright">
            {t('sheet.notFound')}
          </h1>
          <p className="mt-3 font-serif text-body-sm italic text-text-tertiary">
            {t('sheet.notFound.hint')}
          </p>
          <Link to="/" className="mt-6 inline-block">
            <Button variant="secondary" size="sm">
              {t('sheet.backHome')}
            </Button>
          </Link>
        </GlassPanel>
      </main>
    );
  }

  return (
    <PermissionProvider value={permission}>
      <CharacterSheet character={character} />
    </PermissionProvider>
  );
}
