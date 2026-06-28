import { useMemo, useState } from 'react';

import { RollHistoryPanel } from '@/features/dice/roll-history-panel';
import { usePermissionContext } from '@/features/sheet/permissions-context';
import { type SheetMode } from '@/features/sheet/use-sheet-mode';
import { Icon } from '@/shared/components/icon';
import { Tooltip } from '@/shared/components/tooltip';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import type { Character } from '@/shared/types/character';

import { DockedMenu } from './docked-menu';
import { useFabActions } from './use-fab-actions';
import { buildWedges, type Wedge } from './wedge-config';

interface RadialFabProps {
  character: Character;
  /** Bascule de mode, détenue par `CharacterSheet` (évite une 2e souscription au store). */
  setMode: (mode: SheetMode) => void;
  /** L'historique des jets est-il lisible ? Conditionne le wedge « Historique ». */
  showHistory: boolean;
}

/**
 * Radial FAB — cœur déterministe du plan 11.
 *
 * Cette livraison fournit le **menu tactile docké** (step 15, l'« accessibility
 * fallback » du plan) câblé à toutes les actions des 5 wedges, toutes déjà
 * éprouvées sur la fiche. Le **geste press-hold-drag** (steps 1-14 : `atan2`,
 * arc de wedges, highlight, haptique) — « l'âme de l'app », à caler en main —
 * est volontairement DIFFÉRÉ à une session avec Adrien ; il enveloppera la même
 * `wedge-config` sans rien jeter de ce qui est livré ici (`angle-to-wedge.ts`
 * lui sert déjà de socle géométrique testé).
 *
 * Monté par `CharacterSheet` au même emplacement (et sous la même garde
 * `showRollHistory`) que l'ancien bouton d'historique, qu'il remplace comme
 * unique contrôle du coin inférieur droit (l'historique devient un wedge).
 */
export function RadialFab({ character, setMode, showHistory }: RadialFabProps): JSX.Element {
  const { canEdit } = usePermissionContext();
  const [open, setOpen] = useState<boolean>(false);
  const [submenuId, setSubmenuId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);

  const wedges = useMemo(
    () => buildWedges({ canEdit, showHistory }),
    [canEdit, showHistory],
  );

  const { run } = useFabActions(character, {
    setMode,
    openHistory: () => setHistoryOpen(true),
  });

  const submenu = submenuId
    ? wedges.find((w) => w.id === submenuId) ?? null
    : null;
  const currentItems: readonly Wedge[] = submenu?.children ?? wedges;
  const title = submenu ? t(submenu.labelKey) : t('sheet.fab.menuAria');

  function close(): void {
    setOpen(false);
    setSubmenuId(null);
  }

  async function pick(wedge: Wedge): Promise<void> {
    if (wedge.action.kind === 'submenu') {
      setSubmenuId(wedge.id);
      return;
    }
    // `open-history` ouvre un panneau au-dessus ; les autres ferment le menu.
    await run(wedge.action);
    close();
  }

  return (
    <>
      <Tooltip label={t('radialMenu.tip.fab')} placement="left" decorative className="fixed bottom-7 right-5 z-[60] md:bottom-8 md:right-8">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={t('sheet.fab.openLabel')}
          className={cn(
            'inline-flex h-16 w-16 items-center justify-center rounded-full',
            'border-2 border-white/25 text-ink',
            'bg-[radial-gradient(circle_at_30%_30%,var(--gold-bright),var(--gold)_60%,var(--gold-dim))]',
            'shadow-[0_8px_32px_rgba(220,184,108,0.5),0_0_0_6px_rgba(220,184,108,0.08)]',
            'transition-transform duration-200 ease-spring active:scale-90',
            open && 'rotate-[135deg] scale-95',
          )}
        >
          <Icon name="i-magic" className="h-7 w-7" />
        </button>
      </Tooltip>

      {open ? (
        <DockedMenu
          title={title}
          items={currentItems}
          showBack={submenu !== null}
          onPick={(w) => void pick(w)}
          onBack={() => setSubmenuId(null)}
          onClose={close}
        />
      ) : null}

      <RollHistoryPanel
        open={historyOpen}
        characterId={character.id}
        onClose={() => setHistoryOpen(false)}
      />
    </>
  );
}
