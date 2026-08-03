import { useCallback } from 'react';

import { useDice } from '@/features/dice/use-dice';
import { useUpdateCharacter } from '@/features/sheet/use-update-character';
import { type SheetMode } from '@/features/sheet/use-sheet-mode';
import { useContent } from '@/shared/hooks/use-content';
import { t } from '@/shared/lib/i18n';
import { deriveClassResourcePools } from '@/shared/lib/rules/class-resources';
import { applyLongRest, NO_VARIANTS } from '@/shared/lib/rules/long-rest';
import { applyShortRest } from '@/shared/lib/rules/short-rest';
import { showToast } from '@/shared/lib/slices/toast-slice';
import type { Character } from '@/shared/types/character';

import type { WedgeAction } from './wedge-config';

interface FabActionDeps {
  /** Bascule de mode de fiche (déjà détenue par `CharacterSheet`). */
  setMode: (mode: SheetMode) => void;
  /** Ouvre le panneau d'historique des jets. */
  openHistory: () => void;
  /** Ouvre le Codex en superposition, sans quitter la fiche (audit UX, E6). */
  openCodex: () => void;
}

/**
 * Route une `WedgeAction` déclarative vers l'implémentation RÉELLE — toutes
 * déjà éprouvées ailleurs sur la fiche :
 *  - `switch-mode` → `setMode` (store `useSheetMode`).
 *  - `quick-d20` → `useDice().rollD20Plus(0, …)` (mode-aware, plan 12/12.5).
 *  - `short-rest` / `long-rest` → règles pures + `updateCharacter` (miroir des
 *    boutons Repos de Combat, toasts compris).
 *  - `toggle-inspiration` → `updateCharacter({ inspiration })` (miroir Battle HUD).
 *  - `open-history` → ouvre `RollHistoryPanel`.
 *
 * Aucune logique de règles n'est dupliquée : on rappelle les mêmes helpers purs
 * (`applyShortRest`, `applyLongRest`, `deriveClassResourcePools`).
 */
export function useFabActions(
  character: Character,
  { setMode, openHistory, openCodex }: FabActionDeps,
): { run: (action: WedgeAction) => Promise<void> } {
  const { updateCharacter } = useUpdateCharacter(character);
  const dice = useDice();
  const { data: classes } = useContent('classes');

  const run = useCallback(
    async (action: WedgeAction): Promise<void> => {
      switch (action.kind) {
        case 'submenu':
          // Navigation interne au menu — géré par le composant, pas une action.
          return;

        case 'switch-mode':
          setMode(action.mode);
          return;

        case 'quick-d20':
          await dice.rollD20Plus(0, {
            character: {
              id: character.id,
              inspiration: character.inspiration,
              exhaustion: character.exhaustion,
            },
            label: t('sheet.fab.d20Label'),
            kind: 'check',
          });
          return;

        case 'short-rest': {
          const { patch, summary } = applyShortRest(character);
          if (summary.resourcesReset === 0) {
            showToast({
              kind: 'info',
              title: t('sheet.combat.shortRest.toastTitle'),
              sub: t('sheet.combat.shortRest.toastNone'),
            });
            return;
          }
          await updateCharacter(patch);
          const parts: string[] = [`${summary.resourcesReset} réserves`];
          if (summary.pactSlotsRestored) parts.push(t('sheet.combat.shortRest.pactNote'));
          showToast({
            kind: 'heal',
            title: t('sheet.combat.shortRest.toastTitle'),
            sub: parts.join(' · '),
          });
          return;
        }

        case 'long-rest': {
          const pools = deriveClassResourcePools(character, classes);
          const { patch, summary } = applyLongRest(character, pools, NO_VARIANTS);
          await updateCharacter(patch);
          const parts: string[] = [];
          if (summary.hpHealed > 0) parts.push(`+${summary.hpHealed} PV`);
          if (summary.hitDiceRegained > 0) parts.push(`+${summary.hitDiceRegained} dés`);
          if (summary.resourcesReset > 0) parts.push(`${summary.resourcesReset} réserves`);
          if (summary.exhaustionRemoved > 0) parts.push('−1 épuisement');
          showToast({
            kind: 'heal',
            title: t('sheet.combat.longRest.toastTitle'),
            sub: parts.length > 0 ? parts.join(' · ') : undefined,
          });
          return;
        }

        case 'toggle-inspiration': {
          const next = !character.inspiration;
          await updateCharacter({ inspiration: next });
          showToast({
            kind: next ? 'crit' : 'info',
            title: t('sheet.fab.inspiration'),
            sub: next ? t('sheet.fab.inspirationOn') : t('sheet.fab.inspirationOff'),
          });
          return;
        }

        case 'open-history':
          openHistory();
          return;

        case 'open-codex':
          openCodex();
          return;
      }
    },
    [character, classes, dice, updateCharacter, setMode, openHistory, openCodex],
  );

  return { run };
}
