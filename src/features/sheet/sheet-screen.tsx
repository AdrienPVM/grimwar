import { Link, useParams } from 'react-router-dom';

import { GlassPanel } from '@/shared/components/glass-panel';
import { Splash } from '@/shared/components/splash';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';

import { HeroCard } from './hero/hero-card';
import { hpStateFor } from './hp-state';
import { ModeTabs } from './mode-tabs/mode-tabs';
import { AmeMode } from './modes/ame-mode';
import { AvoirMode } from './modes/avoir-mode';
import { CombatMode } from './modes/combat-mode';
import { isSheetReadOnly } from './modes/combat/hp-combat';
import { EssenceMode } from './modes/essence-mode';
import { MagieMode } from './modes/magie-mode';
import { PermissionProvider, usePermissions } from './permissions-context';
import { StatusStrip } from './status/status-strip';
import { useCharacter } from './use-character';
import { useSheetMode, type SheetMode } from './use-sheet-mode';
import type { Character } from '@/shared/types/character';

interface ModeProps {
  character: Character;
}

const MODE_COMPONENTS: Record<SheetMode, (props: ModeProps) => JSX.Element> = {
  combat: CombatMode,
  essence: EssenceMode,
  magie: MagieMode,
  avoir: () => <AvoirMode />,
  ame: () => <AmeMode />,
};

/** Écran principal de fiche : route /character/:id. */
export function SheetScreen(): JSX.Element {
  const { id: characterId } = useParams<{ id: string }>();
  const { character, isLoading, error } = useCharacter(characterId);
  const permission = usePermissions(character);

  if (isLoading) return <Splash />;

  if (error) {
    return (
      <main className="relative z-10 mx-auto flex min-h-screen max-w-[420px] flex-col items-center justify-center gap-4 px-6 py-12">
        <GlassPanel className="w-full px-6 py-8 text-center">
          <h1 className="font-title text-body uppercase tracking-[0.18em] text-crimson">
            {t('sheet.error.title')}
          </h1>
          <p className="mt-3 font-serif text-body-sm text-text-secondary">{error.message}</p>
          <Link
            to="/"
            className="mt-6 inline-block font-title text-[10px] uppercase tracking-[0.18em] text-gold-bright hover:text-gold-lite"
          >
            {t('sheet.backHome')}
          </Link>
        </GlassPanel>
      </main>
    );
  }

  if (!character) {
    return (
      <main className="relative z-10 mx-auto flex min-h-screen max-w-[420px] flex-col items-center justify-center gap-4 px-6 py-12">
        <GlassPanel className="w-full px-6 py-8 text-center">
          <h1 className="font-display text-xl uppercase tracking-[0.18em] text-gold-bright">
            {t('sheet.notFound')}
          </h1>
          <p className="mt-3 font-serif text-body-sm italic text-text-tertiary">
            {t('sheet.notFound.hint')}
          </p>
          <Link
            to="/"
            className="mt-6 inline-block font-title text-[10px] uppercase tracking-[0.18em] text-gold-bright hover:text-gold-lite"
          >
            {t('sheet.backHome')}
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

/**
 * Bloc interne séparé pour que useSheetMode (avec characterId) soit appelé
 * seulement quand on a un personnage chargé — pas pendant splash/erreur.
 * `character` est passé en prop pour éviter une seconde souscription onSnapshot.
 */
function CharacterSheet({ character }: { character: Character }): JSX.Element {
  const { mode, setMode } = useSheetMode(character.id);
  const hpClass = hpStateFor(character.hp.current, character.hp.max);
  const ActiveMode = MODE_COMPONENTS[mode];
  const readOnly = isSheetReadOnly(character);

  return (
    <main
      className={cn('sheet-state relative min-h-screen pb-32', hpClass)}
      data-readonly={readOnly ? 'true' : 'false'}
    >
      <HeroCard character={character} />
      <StatusStrip character={character} />
      <ModeTabs active={mode} onChange={setMode} />
      <ActiveMode character={character} />
    </main>
  );
}
