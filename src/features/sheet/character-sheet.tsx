import { useState } from 'react';

import { RollHistoryPanel } from '@/features/dice/roll-history-panel';
import { Icon } from '@/shared/components/icon';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import { computeDisplayedAc } from '@/shared/lib/rules/ac';
import { computeDisplayedSpeed } from '@/shared/lib/rules/active-effects';
import type { Character } from '@/shared/types/character';

import { HeroCard } from './hero/hero-card';
import { hpStateFor } from './hp-state';
import { ModeTabs } from './mode-tabs/mode-tabs';
import { AmeMode } from './modes/ame-mode';
import { AvoirMode } from './modes/avoir-mode';
import { useInventoryDerived } from './modes/avoir/use-inventory-derived';
import { CombatMode } from './modes/combat-mode';
import { EssenceMode } from './modes/essence-mode';
import { MagieMode } from './modes/magie-mode';
import { usePermissionContext, useSheetReadOnly } from './permissions-context';
import { StatusStrip } from './status/status-strip';
import { useSheetMode, type SheetMode } from './use-sheet-mode';

interface ModeProps {
  character: Character;
}

const MODE_COMPONENTS: Record<SheetMode, (props: ModeProps) => JSX.Element> = {
  combat: CombatMode,
  essence: EssenceMode,
  magie: MagieMode,
  avoir: AvoirMode,
  ame: AmeMode,
};

interface CharacterSheetProps {
  character: Character;
  /**
   * Affiche le FAB + panneau d'historique des jets (lecture de la sous-collection
   * de rolls du propriétaire). `false` en lecture MJ (JALON 4A.3) : la rule de
   * lecture cross-owner ne couvre QUE le doc fiche, pas le sous-arbre du joueur —
   * ouvrir l'historique déclencherait un `permission-denied`. Défaut `true`.
   */
  showRollHistory?: boolean;
}

/**
 * Corps de la fiche — partagé entre l'écran propriétaire (`SheetScreen`) et la
 * lecture MJ en lecture seule (`CampaignMemberSheetScreen`, 4A.3). Le mode
 * lecture seule est porté par le `PermissionProvider` parent (`canEdit: false`),
 * que chaque mode lit via `usePermissionContext()`.
 *
 * `character` est passé en prop pour éviter une seconde souscription onSnapshot
 * (le parent détient déjà l'abonnement).
 */
export function CharacterSheet({
  character,
  showRollHistory = true,
}: CharacterSheetProps): JSX.Element {
  const { mode, setMode } = useSheetMode(character.id);
  const hpClass = hpStateFor(character.hp.current, character.hp.max);
  const ActiveMode = MODE_COMPONENTS[mode];
  // `readOnly` ici ne sert qu'au rideau CSS `[data-readonly="true"]` (désactive
  // les pointer-events). Inclut la lecture MJ (`!canEdit`) en plus du décès, en
  // cohérence avec les modes — double rideau côté MJ comme côté PJ mort.
  const readOnly = useSheetReadOnly(character);
  // Omni-edit MJ (plan 26) : barre d'indication dorée en tête de fiche. `isDM`
  // seul (lecture) ne la déclenche pas — uniquement `isDMEdit` (écriture active).
  const { isDMEdit } = usePermissionContext();
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
      {isDMEdit ? <DmEditBanner /> : null}
      {/*
        DESKTOP SHELL — Plan 13.14 (densification v1).
        Mobile / tablet (< lg) : passthrough — les enfants gardent leur
        `mx-auto max-w-[420px]` historique. Aucune régression visuelle.
        lg (≥1024) : shell 2 cols — sidebar sticky 300px (hero + status
        + ModeTabs verticaux) + main aéré ; chaque mode élargit ses cards
        jusqu'à ~640px centrés.
        xl (≥1280) : sidebar 320px + main 2-col grid 16px gap pour les
        modes denses (combat / essence) ; magie / avoir restent monocol
        élargi pour laisser respirer les listes / cercles d'incantation.
      */}
      <div className="lg:mx-auto lg:grid lg:max-w-[1240px] lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8 lg:px-6 lg:pt-2 xl:max-w-[1440px] xl:grid-cols-[320px_minmax(0,1fr)] xl:gap-10">
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
      {showRollHistory ? (
        <>
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
        </>
      ) : null}
    </main>
  );
}

/**
 * Barre d'indication d'omni-edit MJ (plan 26 step 2) — confirme visuellement que
 * le meneur édite la fiche d'un joueur, et rappelle que l'identité (nom +
 * personnalité) reste réservée au propriétaire (cf. `DM_LOCKED_FIELDS`).
 */
function DmEditBanner(): JSX.Element {
  return (
    <div
      role="status"
      className={cn(
        'mx-auto mb-3 mt-1 flex max-w-[420px] items-center gap-3 rounded-card-sm px-4 py-2.5 lg:max-w-[1240px]',
        'border border-gold-bright/45 bg-gold-bright/10',
        'transition-colors duration-200 ease-base',
      )}
    >
      <Icon name="i-shield" className="h-4 w-4 shrink-0 text-gold-bright" />
      <span className="flex min-w-0 flex-col">
        <span className="font-title text-meta uppercase tracking-[0.16em] text-gold-bright">
          {t('sheet.dmEdit.bannerTitle')}
        </span>
        <span className="font-serif text-body-sm text-text-secondary">
          {t('sheet.dmEdit.bannerHint')}
        </span>
      </span>
    </div>
  );
}
