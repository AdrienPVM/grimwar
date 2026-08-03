import type { IconName } from '@/shared/design/icons';
import type { StringKey } from '@/shared/lib/i18n';

import { SHEET_MODES, type SheetMode } from '@/features/sheet/use-sheet-mode';

/**
 * Modèle **data-driven** des wedges du radial FAB (plan 11, Notes : « Keep the
 * wedge config data-driven, not hard-coded »).
 *
 * Cette config est la SOURCE UNIQUE consommée par :
 *  - le menu tactile docké (`docked-menu.tsx`, step 15) livré maintenant ;
 *  - la future couche gestuelle press-hold-drag (steps 1-14), qui réutilisera
 *    la même liste sans réécriture — d'où la séparation stricte config ↔ rendu.
 *
 * Aucune action n'est exécutée ici : un wedge porte une `WedgeAction`
 * déclarative que `use-fab-actions.ts` route vers l'implémentation réelle
 * (déjà éprouvée : bascule de mode, repos, inspiration, jet d20, historique).
 */

export type WedgeAction =
  | { kind: 'submenu' }
  | { kind: 'switch-mode'; mode: SheetMode }
  | { kind: 'quick-d20' }
  | { kind: 'short-rest' }
  | { kind: 'long-rest' }
  | { kind: 'toggle-inspiration' }
  | { kind: 'open-history' }
  | { kind: 'open-codex' };

export interface Wedge {
  /** Identifiant stable (clés React, sélecteurs de test). */
  id: string;
  /** Clé i18n du label visible. */
  labelKey: StringKey;
  icon: IconName;
  action: WedgeAction;
  /** Sous-wedges (présents ssi `action.kind === 'submenu'`). */
  children?: Wedge[];
}

export interface WedgeContext {
  /** Le viewer peut-il muter la fiche ? Gate les wedges mutateurs (repos, inspiration). */
  canEdit: boolean;
  /** L'historique des jets est-il lisible ? (faux en lecture MJ cross-owner). */
  showHistory: boolean;
}

/** Métadonnées d'affichage des 5 modes de fiche, réutilisées par le wedge « Aller à ». */
const MODE_META: Record<SheetMode, { labelKey: StringKey; icon: IconName }> = {
  combat: { labelKey: 'sheet.mode.combat', icon: 'i-sword' },
  essence: { labelKey: 'sheet.mode.essence', icon: 'i-spell' },
  magie: { labelKey: 'sheet.mode.magie', icon: 'i-magic' },
  avoir: { labelKey: 'sheet.mode.avoir', icon: 'i-bag' },
  ame: { labelKey: 'sheet.mode.ame', icon: 'i-heart' },
};

/**
 * Construit la liste des wedges pour le contexte courant.
 *
 * Invariants (verrouillés par `wedge-config.test.ts`) :
 *  - « Aller à » et « Lancer » : toujours présents.
 *  - « Sorts » : toujours présent (raccourci vers le grimoire ; cohérent avec
 *    l'onglet Magie toujours visible). Le quick-cast top-5 direct depuis le FAB
 *    est différé à la session gestuelle (dérivation des classes lanceuses +
 *    ressenti du cast = périmètre Adrien).
 *  - « Repos » : ssi `canEdit` (mute la fiche).
 *  - « Codex » : toujours présent, et au PREMIER niveau (audit UX, E6). Pas
 *    rangé sous « Outils » pour deux raisons : « Outils » disparaît quand ni
 *    `canEdit` ni `showHistory` ne tiennent, alors que le Codex est du contenu
 *    SRD que personne n'a besoin d'être autorisé à lire ; et chercher la règle
 *    d'un état en plein combat doit rester à un seul geste.
 *  - « Outils » : présent ssi au moins un enfant l'est — Inspiration (ssi
 *    `canEdit`) et/ou Historique (ssi `showHistory`).
 */
export function buildWedges(ctx: WedgeContext): Wedge[] {
  const wedges: Wedge[] = [];

  wedges.push({
    id: 'go',
    labelKey: 'sheet.fab.allerA',
    icon: 'i-book',
    action: { kind: 'submenu' },
    children: SHEET_MODES.map((mode) => ({
      id: `go-${mode}`,
      labelKey: MODE_META[mode].labelKey,
      icon: MODE_META[mode].icon,
      action: { kind: 'switch-mode', mode } as const,
    })),
  });

  wedges.push({
    id: 'spells',
    labelKey: 'sheet.fab.sorts',
    icon: 'i-spell',
    action: { kind: 'switch-mode', mode: 'magie' },
  });

  if (ctx.canEdit) {
    wedges.push({
      id: 'rest',
      labelKey: 'sheet.fab.repos',
      icon: 'i-heart',
      action: { kind: 'submenu' },
      children: [
        {
          id: 'rest-short',
          labelKey: 'sheet.combat.shortRest.button',
          icon: 'i-heart',
          action: { kind: 'short-rest' },
        },
        {
          id: 'rest-long',
          labelKey: 'sheet.combat.longRest.button',
          icon: 'i-potion',
          action: { kind: 'long-rest' },
        },
      ],
    });
  }

  wedges.push({
    id: 'roll',
    labelKey: 'sheet.fab.lancer',
    icon: 'i-dice',
    action: { kind: 'quick-d20' },
  });

  wedges.push({
    id: 'codex',
    labelKey: 'sheet.fab.codex',
    icon: 'i-book',
    action: { kind: 'open-codex' },
  });

  const tools: Wedge[] = [];
  if (ctx.canEdit) {
    tools.push({
      id: 'tool-inspiration',
      labelKey: 'sheet.fab.inspiration',
      icon: 'i-feather',
      action: { kind: 'toggle-inspiration' },
    });
  }
  if (ctx.showHistory) {
    tools.push({
      id: 'tool-history',
      labelKey: 'sheet.fab.historique',
      icon: 'i-search',
      action: { kind: 'open-history' },
    });
  }
  if (tools.length > 0) {
    wedges.push({
      id: 'tools',
      labelKey: 'sheet.fab.outils',
      icon: 'i-staff',
      action: { kind: 'submenu' },
      children: tools,
    });
  }

  return wedges;
}
