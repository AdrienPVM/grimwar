import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { RollHistoryPanel } from '@/features/dice/roll-history-panel';
import { GlassPanel } from '@/shared/components/glass-panel';
import { Icon } from '@/shared/components/icon';
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
  avoir: AvoirMode,
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
  // Entry point S1 du RollHistoryPanel — autonome de plan 11 (le radial FAB
  // ajoutera le wedge dédié plus tard, mais le panel doit être ouvrable
  // dès maintenant pour héberger le toggle Digital/Physique (plan 12.5).
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);

  return (
    <main
      className={cn('sheet-state relative min-h-screen pb-32', hpClass)}
      data-readonly={readOnly ? 'true' : 'false'}
    >
      <HeroCard character={character} />
      <StatusStrip character={character} />
      <ModeTabs active={mode} onChange={setMode} />
      <ActiveMode character={character} />
      <button
        type="button"
        onClick={() => setHistoryOpen(true)}
        aria-label="Ouvrir l'historique des jets"
        className="fixed bottom-6 right-6 z-[60] inline-flex h-12 w-12 items-center justify-center rounded-full border border-soft bg-glass-2 shadow-card backdrop-blur-2xl transition-all hover:border-gold-bright hover:bg-gold-bright/10 active:scale-95"
      >
        <Icon name="i-dice" className="h-5 w-5 text-gold-bright" />
      </button>
      <RollHistoryPanel
        open={historyOpen}
        characterId={character.id}
        onClose={() => setHistoryOpen(false)}
      />
    </main>
  );
}
