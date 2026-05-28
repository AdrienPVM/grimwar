import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { RollHistoryPanel } from '@/features/dice/roll-history-panel';
import { Button } from '@/shared/components/button';
import { GlassPanel } from '@/shared/components/glass-panel';
import { Icon } from '@/shared/components/icon';
import { Splash } from '@/shared/components/splash';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';

import { computeDisplayedAc } from '@/shared/lib/rules/ac';
import { computeDisplayedSpeed } from '@/shared/lib/rules/active-effects';

import { HeroCard } from './hero/hero-card';
import { hpStateFor } from './hp-state';
import { ModeTabs } from './mode-tabs/mode-tabs';
import { AmeMode } from './modes/ame-mode';
import { AvoirMode } from './modes/avoir-mode';
import { useInventoryDerived } from './modes/avoir/use-inventory-derived';
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

  // CA affichée : dérivée d'inventaire + Defense +1 conditionnel (D19/D20) +
  // bonus magic items (JALON 1B.2). L'appel est dupliqué dans AvoirMode (qui en
  // a besoin pour weight/derived) — les useMemo internes au hook rendent ce
  // doublon stable côté charge.
  const derived = useInventoryDerived(character);
  const displayedAc = computeDisplayedAc({
    character,
    acFromArmor: derived.acFromArmor,
    hasEquippedBodyArmor: derived.hasEquippedBodyArmor,
    magicItemsAcBonus: derived.magicItemsAcBonus,
  });
  const displayedSpeed = computeDisplayedSpeed(
    character.speed,
    derived.activeMagicEffects,
  );

  return (
    <main
      className={cn('sheet-state relative min-h-screen pb-32', hpClass)}
      data-readonly={readOnly ? 'true' : 'false'}
    >
      {/*
        PROTOTYPE DESKTOP — Plan 13.14 prototype v0.
        Mobile / tablet (< lg) : passthrough — les enfants gardent leur
        `mx-auto max-w-[420px]` historique. Aucune régression visuelle.
        lg+ : shell 2 colonnes — sidebar 280px sticky (hero + status + tabs
        verticaux) + main area aérée (max-w-[860px], les modes restent en
        cards 420px centrées dans la colonne large). La densification multi-col
        des cards est différée à l'arbitrage v1.
      */}
      <div className="lg:mx-auto lg:grid lg:max-w-[1200px] lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8 lg:px-6 lg:pt-2">
        <aside className="sheet-desktop-aside lg:sticky lg:top-2 lg:self-start lg:max-h-[calc(100vh-1rem)] lg:overflow-y-auto lg:py-2">
          <HeroCard character={character} />
          <StatusStrip
            character={character}
            displayedAc={displayedAc}
            displayedSpeed={displayedSpeed}
          />
          <ModeTabs active={mode} onChange={setMode} />
        </aside>
        <div className="sheet-desktop-main lg:min-w-0 lg:pt-2">
          <ActiveMode character={character} />
        </div>
      </div>
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
