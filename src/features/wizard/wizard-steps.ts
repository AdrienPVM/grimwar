import type { WizardStepId } from '@/shared/lib/slices/wizard-slice';

/**
 * Métadonnées de chaque étape du wizard. Sert :
 *   - au sommaire desktop (clé i18n du titre)
 *   - à la barre de progression mobile (label court)
 *   - à la logique de visibilité (`spells` est conditionnelle, géré au render)
 *
 * Ordre validé Adrien (plan 05 §C.1) : Identité → Classe → Ascendance →
 * Caractéristiques → Historique → Compétences → Équipement → Sorts → Récap.
 */

export interface WizardStepMeta {
  id: WizardStepId;
  /** Numéro d'affichage 1-based. */
  order: number;
}

export const WIZARD_STEP_META: readonly WizardStepMeta[] = [
  { id: 'identity', order: 1 },
  { id: 'class', order: 2 },
  { id: 'ancestry', order: 3 },
  { id: 'abilities', order: 4 },
  { id: 'background', order: 5 },
  { id: 'skills', order: 6 },
  { id: 'equipment', order: 7 },
  { id: 'spells', order: 8 },
  { id: 'recap', order: 9 },
];

export function getStepMeta(id: WizardStepId): WizardStepMeta {
  const found = WIZARD_STEP_META.find((s) => s.id === id);
  if (!found) {
    // Garde-fou typecheck : `id` est typé WizardStepId, donc ce throw est mort.
    // On le garde par cohérence avec le reste du code de l'app.
    throw new Error(`[wizard] meta inconnue pour étape "${id}"`);
  }
  return found;
}

export function nextStep(id: WizardStepId): WizardStepId | null {
  const idx = WIZARD_STEP_META.findIndex((s) => s.id === id);
  return WIZARD_STEP_META[idx + 1]?.id ?? null;
}

export function previousStep(id: WizardStepId): WizardStepId | null {
  const idx = WIZARD_STEP_META.findIndex((s) => s.id === id);
  return WIZARD_STEP_META[idx - 1]?.id ?? null;
}
