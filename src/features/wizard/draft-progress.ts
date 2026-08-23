import type { StringKey } from '@/shared/lib/i18n';
import {
  WIZARD_STEPS,
  type WizardDraft,
  type WizardStepId,
} from '@/shared/lib/slices/wizard-slice';

/**
 * Lecture d'un brouillon de wizard en cours — E10 de l'audit UX.
 *
 * Le draft est persisté dans `localStorage` (middleware `persist`), donc il
 * survit à une fermeture d'onglet. Mais rien ne le disait : l'accueil affichait
 * « Créer un personnage » à l'identique, et l'utilisateur qui reprenait le
 * lendemain retombait au milieu de son formulaire sans l'avoir demandé.
 *
 * Fonction PURE, sans dépendance React : elle est testable seule et sert aussi
 * bien au bandeau de l'accueil qu'à un futur point d'entrée ailleurs.
 */

export interface WizardDraftProgress {
  /** Nom saisi, ou `null` si l'utilisateur n'a pas encore nommé son héros. */
  characterName: string | null;
  /** Position 1-based dans les 9 étapes — sert à écrire « étape 3 sur 9 ». */
  stepIndex: number;
  stepCount: number;
  /** Clé du titre de l'étape courante, déjà traduit par le wizard. */
  stepLabelKey: StringKey;
}

/**
 * `null` = pas de brouillon à proposer.
 *
 * Le critère est le CONTENU, pas les étapes visitées : cliquer « Suivant » sur
 * un formulaire vide n'est pas un début de personnage, et un bandeau qui
 * apparaîtrait là serait du bruit. Dès qu'un nom, une classe, une ascendance ou
 * un historique est posé, il y a quelque chose à reprendre.
 */
export function describeDraftProgress(
  draft: WizardDraft,
  currentStep: WizardStepId,
): WizardDraftProgress | null {
  const started =
    draft.name.trim().length > 0 ||
    draft.classes.length > 0 ||
    draft.ancestryId !== null ||
    draft.backgroundId !== null;
  if (!started) return null;

  // `indexOf` plutôt qu'une table parallèle : `WIZARD_STEPS` est déjà la source
  // d'ordre du wizard, en dupliquer une seconde inviterait la dérive.
  const index = WIZARD_STEPS.indexOf(currentStep);
  const safeIndex = index === -1 ? 0 : index;

  return {
    characterName: draft.name.trim() || null,
    stepIndex: safeIndex + 1,
    stepCount: WIZARD_STEPS.length,
    stepLabelKey: `wizard.step.${WIZARD_STEPS[safeIndex]!}.title` as StringKey,
  };
}
