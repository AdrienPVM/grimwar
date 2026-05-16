import type { ClassEntity } from '@/shared/types/content';
import {
  isValidPointBuy,
  POINT_BUY_MAX,
  POINT_BUY_MIN,
  STANDARD_ARRAY,
} from '@/shared/lib/rules/abilities';
import type { WizardDraft, WizardStepId } from '@/shared/lib/slices/wizard-slice';

/**
 * Validation per-step (plan 05 §C.3.c).
 *
 * Chaque étape doit retourner true pour que le bouton « Suivant » s'active.
 * On ne renvoie pas de messages détaillés ici : chaque step composant gère
 * son propre affichage d'erreurs inline via les composants form, on a juste
 * besoin d'un boolean pour la nav.
 *
 * Les `ClassEntity[]` du contenu sont passées en arg car certaines validations
 * dépendent de métadonnées de classe (skillChoices, spellcasting, starting
 * equipment) qui ne sont pas dans le draft.
 */

export interface ValidationContext {
  draft: WizardDraft;
  classes: ClassEntity[];
}

const ALIGNMENTS = new Set(['LB', 'NB', 'CB', 'LN', 'N', 'CN', 'LM', 'NM', 'CM']);

export function isIdentityValid({ draft }: ValidationContext): boolean {
  if (draft.name.trim().length < 1) return false;
  if (draft.level < 1 || draft.level > 20) return false;
  if (!ALIGNMENTS.has(draft.alignment)) return false;
  return true;
}

export function isClassValid({ draft }: ValidationContext): boolean {
  if (draft.classes.length < 1) return false;
  const sum = draft.classes.reduce((acc, c) => acc + c.level, 0);
  if (sum !== draft.level) return false;
  if (!draft.primaryClassId) return false;
  if (!draft.classes.some((c) => c.classId === draft.primaryClassId)) return false;
  return true;
}

export function isAncestryValid({ draft }: ValidationContext): boolean {
  return Boolean(draft.ancestryId);
}

export function isAbilitiesValid({ draft }: ValidationContext): boolean {
  const all = Object.values(draft.abilities);
  if (all.some((v) => v < 1 || v > 30)) return false;
  if (draft.method === 'point-buy') {
    return isValidPointBuy(draft.abilities);
  }
  if (draft.method === 'standard-array') {
    // Doit consommer exactement les 6 valeurs du tableau standard.
    const sorted = [...all].sort((a, b) => b - a);
    const std = [...STANDARD_ARRAY].sort((a, b) => b - a);
    return sorted.length === std.length && sorted.every((v, i) => v === std[i]);
  }
  // Manuel : on fait confiance au MJ, juste bornes basses
  return all.every((v) => v >= POINT_BUY_MIN - 5 && v <= POINT_BUY_MAX + 15);
}

export function isBackgroundValid({ draft }: ValidationContext): boolean {
  return Boolean(draft.backgroundId);
}

export function isSkillsValid({ draft, classes }: ValidationContext): boolean {
  if (!draft.primaryClassId) return false;
  const primary = classes.find((c) => c.id === draft.primaryClassId);
  if (!primary) return false;
  return draft.pickedSkills.length === primary.skillChoices.count;
}

export function isEquipmentValid({ draft }: ValidationContext): boolean {
  // Chaque classe choisie doit avoir résolu son groupe d'options.
  return draft.classes.every((c) =>
    draft.equipmentChoices.some((eq) => eq.classId === c.classId),
  );
}

export function isSpellsValid({ draft, classes }: ValidationContext): boolean {
  const casterClasses = draft.classes.filter((c) =>
    Boolean(classes.find((cc) => cc.id === c.classId)?.spellcasting),
  );
  if (casterClasses.length === 0) return true; // Pas de lanceur → étape ignorée
  return casterClasses.every((cc) => {
    const picks = draft.spellsByClass.find((s) => s.classId === cc.classId);
    return Boolean(picks && (picks.cantrips.length > 0 || picks.level1.length > 0));
  });
}

/** Toujours valide — l'étape Récap est en lecture seule, le submit a sa propre Zod gate. */
export function isRecapValid(_ctx: ValidationContext): boolean {
  return true;
}

export const STEP_VALIDATORS: Record<WizardStepId, (ctx: ValidationContext) => boolean> = {
  identity: isIdentityValid,
  class: isClassValid,
  ancestry: isAncestryValid,
  abilities: isAbilitiesValid,
  background: isBackgroundValid,
  skills: isSkillsValid,
  equipment: isEquipmentValid,
  spells: isSpellsValid,
  recap: isRecapValid,
};

export function isStepValid(step: WizardStepId, ctx: ValidationContext): boolean {
  return STEP_VALIDATORS[step](ctx);
}

/**
 * Décide si l'étape "Sorts" doit être visible. Si aucune classe choisie n'est
 * lanceuse, on saute simplement l'étape (skip transparent — le composant shell
 * la rend invisible dans la nav et passe directement de "Équipement" à "Récap").
 */
export function shouldShowSpellsStep(ctx: ValidationContext): boolean {
  return ctx.draft.classes.some((c) =>
    Boolean(ctx.classes.find((cc) => cc.id === c.classId)?.spellcasting),
  );
}
