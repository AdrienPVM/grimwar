import type { LevelUpStep } from './level-up-choices';
import {
  type AsiOrFeat,
  type HpRoll,
  type LevelUpDraft,
  levelUpDraftSchema,
} from './level-up-types';

/**
 * JALON 2B.4b — Reducer pur + builder pour la modale de level-up.
 *
 * Rôle : agréger les inputs utilisateur saisis pas à pas dans la modale
 * (HP roll, sous-classe, ASI/feat, sorts, cantrips, invocations) et produire
 * un `LevelUpDraft` validé Zod prêt pour `applyLevelUp`.
 *
 * Pure et déterministe — pas de React, pas de hook, pas d'IO. Le composant
 * `LevelUpModal` (jalon 2B.5 à venir) utilise `useReducer(levelUpFlowReducer)`,
 * affiche le sous-écran courant en fonction de `steps[state.stepIdx]` (où
 * `steps` vient de `levelUpChoices`), et déclenche `buildLevelUpDraft` au
 * dernier step pour persister via le hook `useUpdateCharacter`.
 *
 * Le reducer ignore les `steps` : c'est le composant qui borne la navigation,
 * pas le reducer. Cette séparation simplifie les tests (pas besoin de
 * fabriquer des `LevelUpStep[]` pour vérifier qu'une action mute l'état).
 *
 * `canSubmitFlow(state, steps)` répond « est-ce que tous les inputs requis
 * par les étapes sont remplis ? ». Prédicat pur — le composant l'utilise
 * pour activer/désactiver le bouton « Confirmer ».
 *
 * `buildLevelUpDraft({state, classId, newClassLevel})` parse le draft via
 * `levelUpDraftSchema` — d'où une garantie forte au moment du submit que la
 * payload passée à `applyLevelUp` est conforme au schéma SRD.
 */

export interface LevelUpFlowState {
  stepIdx: number;
  hpRoll: HpRoll | null;
  subclassId: string | null;
  asiOrFeat: AsiOrFeat | null;
  newSpellsKnown: string[];
  newCantrips: string[];
  newInvocations: string[];
}

export const initialLevelUpFlowState: LevelUpFlowState = {
  stepIdx: 0,
  hpRoll: null,
  subclassId: null,
  asiOrFeat: null,
  newSpellsKnown: [],
  newCantrips: [],
  newInvocations: [],
};

export type LevelUpFlowAction =
  | { type: 'go-next' }
  | { type: 'go-prev' }
  | { type: 'set-hp-roll'; value: HpRoll }
  | { type: 'set-subclass'; id: string }
  | { type: 'set-asi-or-feat'; value: AsiOrFeat }
  | { type: 'set-spells'; ids: string[] }
  | { type: 'set-cantrips'; ids: string[] }
  | { type: 'set-invocations'; ids: string[] }
  | { type: 'reset' };

export function levelUpFlowReducer(
  state: LevelUpFlowState,
  action: LevelUpFlowAction,
): LevelUpFlowState {
  switch (action.type) {
    case 'go-next':
      return { ...state, stepIdx: state.stepIdx + 1 };
    case 'go-prev':
      return { ...state, stepIdx: Math.max(0, state.stepIdx - 1) };
    case 'set-hp-roll':
      return { ...state, hpRoll: action.value };
    case 'set-subclass':
      return { ...state, subclassId: action.id };
    case 'set-asi-or-feat':
      return { ...state, asiOrFeat: action.value };
    case 'set-spells':
      return { ...state, newSpellsKnown: action.ids };
    case 'set-cantrips':
      return { ...state, newCantrips: action.ids };
    case 'set-invocations':
      return { ...state, newInvocations: action.ids };
    case 'reset':
      return initialLevelUpFlowState;
  }
}

/**
 * Vérifie que chaque étape requise par `steps` a son input dans `state`.
 * Le bouton « Confirmer » de la modale ne s'active que quand ce prédicat est
 * vrai. Le composant peut aussi l'utiliser pour vérifier l'activabilité du
 * bouton « Suivant » sur le step courant (en passant un sous-tableau).
 */
export function canSubmitFlow(state: LevelUpFlowState, steps: readonly LevelUpStep[]): boolean {
  for (const step of steps) {
    switch (step.kind) {
      case 'hp-roll':
        if (state.hpRoll == null) return false;
        break;
      case 'subclass':
        if (!state.subclassId) return false;
        break;
      case 'asi-or-feat':
        if (state.asiOrFeat == null) return false;
        break;
      case 'cantrips':
        if (state.newCantrips.length !== step.count) return false;
        break;
      case 'spells':
        if (state.newSpellsKnown.length !== step.count) return false;
        break;
      case 'invocations':
        if (state.newInvocations.length !== step.count) return false;
        break;
    }
  }
  return true;
}

interface BuildLevelUpDraftParams {
  state: LevelUpFlowState;
  classId: string;
  newClassLevel: number;
}

/**
 * Compose `LevelUpDraft` à partir de l'état accumulé. Lève si `hpRoll` est
 * absent (toujours requis) ou si la shape ne valide pas le schéma Zod (slug
 * non kebab-case, niveau hors bornes, etc.).
 *
 * Les champs vides (`null`, tableaux vides) sont OMIS de la sortie pour
 * matcher la shape « optionnel » du schéma — `applyLevelUp` peut alors faire
 * des contrôles d'existence sans piégeage sur tableau vide vs absent.
 */
export function buildLevelUpDraft({
  state,
  classId,
  newClassLevel,
}: BuildLevelUpDraftParams): LevelUpDraft {
  if (state.hpRoll == null) {
    throw new Error('[buildLevelUpDraft] hpRoll manquant — toujours requis.');
  }
  const draft: Record<string, unknown> = {
    classId,
    newClassLevel,
    hpRoll: state.hpRoll,
  };
  if (state.subclassId) draft.subclassId = state.subclassId;
  if (state.asiOrFeat) draft.asiOrFeat = state.asiOrFeat;
  if (state.newSpellsKnown.length > 0) draft.newSpellsKnown = state.newSpellsKnown;
  if (state.newCantrips.length > 0) draft.newCantrips = state.newCantrips;
  if (state.newInvocations.length > 0) draft.newInvocations = state.newInvocations;
  return levelUpDraftSchema.parse(draft);
}
