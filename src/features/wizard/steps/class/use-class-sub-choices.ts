import type { WizardClassEntry } from '@/shared/lib/slices/wizard-slice';
import type { ClassEntity } from '@/shared/types/content';

/**
 * Sous-choix de classe niveau 1 SRD 5.2.1 (plan 13.9).
 *
 * Source unique de vérité runtime pour :
 * - quels sous-choix sont REQUIS par classId
 * - combien d'éléments doivent être sélectionnés (cas multi-select)
 *
 * Lu par les chooser components (commit 1) ET par `wizard-validation.ts`
 * (commit 3). Aucune duplication ailleurs dans le code.
 *
 * Pour les sous-choix multi-select (weaponMasteries, expertiseSkills,
 * eldritchInvocations, wizardSpellbookL1), le `count` exact vient soit du
 * bundle (`weaponMasteryCount`), soit d'une constante SRD (Expertise = 2,
 * Warlock L1 = 1 invocation, Wizard L1 = 6 inscrits, etc.).
 */

export type ClassSubChoiceKey =
  | 'clericDivineOrder'
  | 'druidPrimalOrder'
  | 'fighterFightingStyle'
  | 'weaponMasteries'
  | 'expertiseSkills'
  | 'eldritchInvocations'
  | 'wizardSpellbookL1';

/** Roublard L1 — 2 compétences en Expertise (SRD 5.2.1 §Rogue Features L1). */
export const ROGUE_EXPERTISE_COUNT_L1 = 2;
/** Roublard L1 — 1 langue supplémentaire racine (SRD 5.2.1 §Thieves' Cant). */
export const ROGUE_EXTRA_LANGUAGES_COUNT_L1 = 1;
/** Warlock L1 — 1 invocation (SRD 5.2.1 §Eldritch Invocations à L1). */
export const WARLOCK_INVOCATIONS_COUNT_L1 = 1;
/** Magicien L1 — 6 sorts inscrits dans le grimoire (SRD 5.2.1 §Spellbook). */
export const WIZARD_SPELLBOOK_INSCRIBED_COUNT_L1 = 6;
/** Magicien L1 — 4 sorts préparés (= INT mod + niveau, clamp à L1). */
export const WIZARD_SPELLBOOK_PREPARED_COUNT_L1 = 4;

/**
 * Sous-choix L1 par classId. Source : `docs/AUDIT-SRD-COMPLETUDE.md > B`.
 *
 * Note Monk : SRD 5.2.1 NE donne PAS Weapon Mastery au Moine (cf. plan 13.9
 * Notes). `weaponMasteryCount` du bundle vaut 0 pour le moine → pas d'entrée
 * `weaponMasteries` ici.
 */
const REQUIREMENTS_BY_CLASS: Record<string, readonly ClassSubChoiceKey[]> = {
  cleric: ['clericDivineOrder'],
  druid: ['druidPrimalOrder'],
  fighter: ['fighterFightingStyle', 'weaponMasteries'],
  barbarian: ['weaponMasteries'],
  paladin: ['weaponMasteries'],
  ranger: ['weaponMasteries'],
  rogue: ['weaponMasteries', 'expertiseSkills'],
  warlock: ['eldritchInvocations'],
  wizard: ['wizardSpellbookL1'],
  // Sorcerer / Bard / Monk : aucun sous-choix L1 SRD imposé.
  sorcerer: [],
  bard: [],
  monk: [],
};

export function getClassSubChoiceKeys(
  classId: string | null,
): readonly ClassSubChoiceKey[] {
  if (!classId) return [];
  return REQUIREMENTS_BY_CLASS[classId] ?? [];
}

/**
 * Combien d'éléments pour un sous-choix multi-select donné. Le `count` exact
 * est requis pour valider que le wizard ne laisse pas passer un perso
 * incomplet (Roublard avec 1 Expertise, Magicien avec 5 sorts inscrits...).
 */
export function getRequiredCount(
  classId: string,
  key: ClassSubChoiceKey,
  classes: readonly ClassEntity[],
): number {
  switch (key) {
    case 'clericDivineOrder':
    case 'druidPrimalOrder':
    case 'fighterFightingStyle':
      // Sous-choix single-value (radio) — pas un count, on retourne 1 par
      // convention (présent ou absent).
      return 1;
    case 'weaponMasteries': {
      const cls = classes.find((c) => c.id === classId);
      return cls?.weaponMasteryCount ?? 0;
    }
    case 'expertiseSkills':
      return ROGUE_EXPERTISE_COUNT_L1;
    case 'eldritchInvocations':
      return WARLOCK_INVOCATIONS_COUNT_L1;
    case 'wizardSpellbookL1':
      return WIZARD_SPELLBOOK_INSCRIBED_COUNT_L1;
    default: {
      const _never: never = key;
      void _never;
      return 0;
    }
  }
}

/**
 * Sous-choix posé ? Pour les single-value (cleric/druid/fighter style), on
 * vérifie `!== null`. Pour les multi-select, on vérifie `length === count`
 * (pas moins, pas plus — Roublard avec 1 Expertise est invalide).
 */
function isSubChoiceMet(
  entry: WizardClassEntry,
  key: ClassSubChoiceKey,
  required: number,
): boolean {
  switch (key) {
    case 'clericDivineOrder':
      return entry.clericDivineOrder !== null;
    case 'druidPrimalOrder':
      return entry.druidPrimalOrder !== null;
    case 'fighterFightingStyle':
      return entry.fighterFightingStyle !== null;
    case 'weaponMasteries':
      return entry.weaponMasteries.length === required;
    case 'expertiseSkills':
      return entry.expertiseSkills.length === required;
    case 'eldritchInvocations':
      return entry.eldritchInvocations.length === required;
    case 'wizardSpellbookL1':
      return entry.wizardSpellbookL1.length === required;
    default: {
      const _never: never = key;
      void _never;
      return true;
    }
  }
}

/**
 * Liste des sous-choix encore manquants pour une entrée `classes[]` donnée.
 * Utile pour `wizard-validation.ts` (commit 3) et pour la garde de submit.
 */
export function getMissingClassSubChoiceKeys(
  entry: WizardClassEntry,
  classes: readonly ClassEntity[],
): readonly ClassSubChoiceKey[] {
  const keys = getClassSubChoiceKeys(entry.classId);
  return keys.filter((key) => {
    const required = getRequiredCount(entry.classId, key, classes);
    return !isSubChoiceMet(entry, key, required);
  });
}

/**
 * Test pur : toutes les entrées `classes[]` ont-elles leurs sous-choix posés ?
 * (Cas multi-class : chacune doit être valide indépendamment.)
 */
export function areAllClassSubChoicesCompleted(
  entries: readonly WizardClassEntry[],
  classes: readonly ClassEntity[],
): boolean {
  return entries.every((e) => getMissingClassSubChoiceKeys(e, classes).length === 0);
}

/**
 * Clés portées par la **step Classe** du wizard. `expertiseSkills` (Roublard)
 * est rendue à la **step Compétences** (Option B, UAT 2026-05-18) — son pool
 * dépend des picks de classe choisis là-bas, donc le chooser ne peut pas vivre
 * à la step Classe. Conséquence pour la garde « Suivant » de la step Classe :
 * on n'exige pas Expertise ici (sinon le Roublard serait bloqué sur Classe
 * alors que l'UI ne lui propose pas encore le chooser).
 */
export const CLASS_STEP_SUB_CHOICE_KEYS: ReadonlySet<ClassSubChoiceKey> = new Set<ClassSubChoiceKey>([
  'clericDivineOrder',
  'druidPrimalOrder',
  'fighterFightingStyle',
  'weaponMasteries',
  'eldritchInvocations',
  'wizardSpellbookL1',
]);

/**
 * Variante de `areAllClassSubChoicesCompleted` qui filtre les sous-choix
 * rendus en dehors de la step Classe (cf. `CLASS_STEP_SUB_CHOICE_KEYS`).
 * Consommée par `isClassValid` pour décider si « Suivant » s'active à la
 * step Classe — sans bloquer le Roublard sur Expertise (qui sera validée
 * par `isSkillsValid` à la step suivante).
 */
export function areAllClassStepSubChoicesCompleted(
  entries: readonly WizardClassEntry[],
  classes: readonly ClassEntity[],
): boolean {
  return entries.every((entry) => {
    const missing = getMissingClassSubChoiceKeys(entry, classes);
    return missing.every((key) => !CLASS_STEP_SUB_CHOICE_KEYS.has(key));
  });
}
