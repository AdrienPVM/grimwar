import {
  getAddClassL1SubChoiceKeys,
  getMissingAddClassL1SubChoiceKeys,
  type AddClassL1SubChoicesShape,
} from '@/shared/lib/rules/class-l1-sub-choices';
import type { ClassEntity } from '@/shared/types/content';

import type { LevelUpStep } from './level-up-choices';
import {
  type AddClassSubChoices,
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

/**
 * Mode du flow — `level-up` pour monter une classe existante, `add-class` pour
 * AJOUTER une nouvelle classe en multiclass (JALON 2D.4b).
 */
export type LevelUpMode = 'level-up' | 'add-class';

export interface LevelUpFlowState {
  /**
   * JALON 2D.4b — Mode du flow. Initialisé à `level-up`. La modale peut basculer
   * sur `add-class` via l'action `set-mode` (déclenchée par le picker d'entrée).
   */
  mode: LevelUpMode;
  stepIdx: number;
  hpRoll: HpRoll | null;
  subclassId: string | null;
  asiOrFeat: AsiOrFeat | null;
  newSpellsKnown: string[];
  newCantrips: string[];
  newInvocations: string[];
  /**
   * JALON 2D.4b — Classe ciblée par l'add-class flow (null tant que l'utilisateur
   * n'a pas choisi dans la step `add-class-pick`).
   */
  addClassTargetId: string | null;
  /**
   * JALON 2D.4b — Bloc partiel des sous-choix L1 de la classe ajoutée. Construit
   * progressivement par la step `add-class-sub-choices` ; transmis tel quel
   * (clean d'undefined) au schéma `addClassSubChoicesSchema` au confirm.
   */
  addClassSubChoices: AddClassL1SubChoicesShape;
}

export const initialLevelUpFlowState: LevelUpFlowState = {
  mode: 'level-up',
  stepIdx: 0,
  hpRoll: null,
  subclassId: null,
  asiOrFeat: null,
  newSpellsKnown: [],
  newCantrips: [],
  newInvocations: [],
  addClassTargetId: null,
  addClassSubChoices: {},
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
  /**
   * JALON 2D.4b — Bascule du mode (level-up classique ↔ add-class multiclass).
   * Réinitialise le pointeur de step et purge les choix add-class si on
   * revient à `level-up` (évite qu'un sub-choice fantôme persiste).
   */
  | { type: 'set-mode'; mode: LevelUpMode }
  /**
   * JALON 2D.4b — Choix de la classe à ajouter. Purge `addClassSubChoices`
   * si la cible change (les sous-choix d'une classe ne se transposent pas
   * sur une autre).
   */
  | { type: 'set-add-class-target'; classId: string }
  /**
   * JALON 2D.4b — Patch incrémental du bloc partiel `addClassSubChoices`.
   * Les choosers de la step `add-class-sub-choices` dispatchent ceci par
   * champ (clericDivineOrder, fighterFightingStyle, weaponMasteries, etc.).
   */
  | { type: 'patch-add-class-sub-choices'; patch: Partial<AddClassL1SubChoicesShape> }
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
    case 'set-mode':
      // Bascule de mode → réinitialise le pointeur + purge des choix de
      // l'autre mode. Sécurité contre les fuites de state cross-mode (un
      // hpRoll posé en level-up ne doit pas survivre à un switch add-class).
      return {
        ...state,
        mode: action.mode,
        stepIdx: 0,
        hpRoll: null,
        subclassId: null,
        asiOrFeat: null,
        newSpellsKnown: [],
        newCantrips: [],
        newInvocations: [],
        addClassTargetId: null,
        addClassSubChoices: {},
      };
    case 'set-add-class-target': {
      // Changement de classe cible → purge les sous-choix précédents (un
      // Fighting Style n'a aucun sens pour un Wizard).
      const sameClass = state.addClassTargetId === action.classId;
      return {
        ...state,
        addClassTargetId: action.classId,
        addClassSubChoices: sameClass ? state.addClassSubChoices : {},
      };
    }
    case 'patch-add-class-sub-choices':
      return {
        ...state,
        addClassSubChoices: { ...state.addClassSubChoices, ...action.patch },
      };
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
/**
 * Vérifie que chaque étape requise par `steps` a son input dans `state`.
 * Le bouton « Confirmer » de la modale ne s'active que quand ce prédicat est
 * vrai. Le composant peut aussi l'utiliser pour vérifier l'activabilité du
 * bouton « Suivant » sur le step courant (en passant un sous-tableau).
 *
 * `classes` est nécessaire pour résoudre les `weaponMasteryCount` des
 * sous-choix L1 d'add-class — peut être omis tant qu'aucun step add-class
 * n'est dans la liste.
 */
export function canSubmitFlow(
  state: LevelUpFlowState,
  steps: readonly LevelUpStep[],
  classes: readonly ClassEntity[] = [],
): boolean {
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
      case 'add-class-pick':
        if (!state.addClassTargetId) return false;
        break;
      case 'add-class-sub-choices': {
        if (!state.addClassTargetId) return false;
        const missing = getMissingAddClassL1SubChoiceKeys(
          state.addClassTargetId,
          state.addClassSubChoices,
          classes,
        );
        if (missing.length > 0) return false;
        break;
      }
    }
  }
  return true;
}

/**
 * JALON 2D.4b — Sous-choix L1 requis pour la classe ajoutée. Wrapper léger
 * autour de `getAddClassL1SubChoiceKeys` qui résout `null` quand le picker
 * n'a pas encore tranché — pour permettre au step `add-class-sub-choices`
 * de masquer ses choosers tant qu'aucune classe n'est ciblée.
 */
export function addClassRequiredSubChoiceKeys(
  state: LevelUpFlowState,
): readonly string[] {
  return getAddClassL1SubChoiceKeys(state.addClassTargetId);
}

interface BuildLevelUpDraftParams {
  state: LevelUpFlowState;
  /**
   * `level-up` mode : classe qui monte de niveau (existante).
   * `add-class` mode : ignoré — le builder lit `state.addClassTargetId`.
   */
  classId: string;
  /**
   * `level-up` mode : niveau atteint dans la classe (≥ 2).
   * `add-class` mode : ignoré — le builder force `1`.
   */
  newClassLevel: number;
}

/**
 * Compose `LevelUpDraft` à partir de l'état accumulé. Le draft produit
 * dépend de `state.mode` :
 *   - `level-up` : `classId` + `newClassLevel` (≥ 2) + `hpRoll` (requis) +
 *     sous-choix optionnels (subclass / ASI / feat / sorts).
 *   - `add-class` (JALON 2D.4b) : `classId = state.addClassTargetId` +
 *     `newClassLevel = 1` + `hpRoll = { kind: 'average' }` forcé +
 *     `addClassSubChoices` = bloc partiel nettoyé.
 *
 * Lève dur sur :
 *   - mode `level-up` sans `hpRoll` ;
 *   - mode `add-class` sans `addClassTargetId` ;
 *   - shape qui ne valide pas le schéma Zod.
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
  if (state.mode === 'add-class') {
    if (!state.addClassTargetId) {
      throw new Error(
        '[buildLevelUpDraft] mode=add-class sans addClassTargetId — utiliser set-add-class-target avant le confirm.',
      );
    }
    // HP forcé à l'average (audit 2D Décision 2 — réservé à la primaryClassId
    // au L1 de prendre le dé max). `applyLevelUp` appliquera HIT_DIE_AVG[die]
    // + CON mod, identique à ce qu'on aurait passé en `rolled: avg`.
    const cleanedSubChoices = cleanAddClassSubChoices(state.addClassSubChoices);
    const draft: Record<string, unknown> = {
      classId: state.addClassTargetId,
      newClassLevel: 1,
      hpRoll: { kind: 'average' },
    };
    if (Object.keys(cleanedSubChoices).length > 0) {
      draft.addClassSubChoices = cleanedSubChoices;
    }
    return levelUpDraftSchema.parse(draft);
  }
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

/**
 * JALON 2D.4b — Nettoie le bloc partiel pour le schéma `addClassSubChoices` :
 *   - tableaux vides → omis (le schéma traite undefined === absent === pas
 *     applicable, mais un `[]` validera et stockera un tableau vide explicite
 *     qui pollue l'audit) ;
 *   - clés undefined → omises ;
 *   - on copie en `string[]` standard les `readonly string[]` (le schéma Zod
 *     accepte les deux, mais l'objet retourné par Zod est mutable).
 */
function cleanAddClassSubChoices(
  partial: AddClassL1SubChoicesShape,
): AddClassSubChoices {
  const out: AddClassSubChoices = {};
  if (partial.clericDivineOrder !== undefined)
    out.clericDivineOrder = partial.clericDivineOrder;
  if (partial.druidPrimalOrder !== undefined)
    out.druidPrimalOrder = partial.druidPrimalOrder;
  if (partial.fighterFightingStyle !== undefined)
    out.fighterFightingStyle = partial.fighterFightingStyle;
  if (partial.weaponMasteries && partial.weaponMasteries.length > 0)
    out.weaponMasteries = [...partial.weaponMasteries];
  if (partial.expertiseSkills && partial.expertiseSkills.length > 0)
    out.expertiseSkills = [...partial.expertiseSkills];
  if (partial.eldritchInvocations && partial.eldritchInvocations.length > 0)
    out.eldritchInvocations = [...partial.eldritchInvocations];
  if (partial.wizardSpellbookL1 && partial.wizardSpellbookL1.length > 0)
    out.wizardSpellbookL1 = [...partial.wizardSpellbookL1];
  if (partial.pactTomeCantrips && partial.pactTomeCantrips.length > 0)
    out.pactTomeCantrips = [...partial.pactTomeCantrips];
  if (partial.pactTomeRituals && partial.pactTomeRituals.length > 0)
    out.pactTomeRituals = [...partial.pactTomeRituals];
  if (partial.pactBladeWeapon !== undefined)
    out.pactBladeWeapon = partial.pactBladeWeapon;
  return out;
}
