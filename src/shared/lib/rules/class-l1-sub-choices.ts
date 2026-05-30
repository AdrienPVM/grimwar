import type {
  DivineOrder,
  FightingStyle,
  PrimalOrder,
} from '@/shared/types/character';
import type { ClassEntity } from '@/shared/types/content';

/**
 * Sous-choix de classe niveau 1 SRD 5.2.1 (plan 13.9).
 *
 * Source unique de vérité runtime pour :
 * - quels sous-choix sont REQUIS par classId
 * - combien d'éléments doivent être sélectionnés (cas multi-select)
 *
 * Lu par les chooser components du wizard ET par `wizard-validation.ts`
 * (plan 13.9 commits 1+3), et par le moteur de level-up multi-class
 * (JALON 2D.4a) — `getAddClassL1SubChoiceKeys` + `getMissingAddClassL1SubChoiceKeys`
 * exposent les mêmes données pour le path « ajouter une classe en multiclass ».
 *
 * Relocalisé `src/features/wizard/steps/class/use-class-sub-choices.ts` →
 * `src/shared/lib/rules/class-l1-sub-choices.ts` au JALON 2D.4a — l'ancien
 * emplacement empêchait `src/features/level-up/` et `apply-level-up.ts` de
 * consommer ces données. Pas de changement de signature pour les consommateurs
 * existants (`getClassSubChoiceKeys`, `getRequiredCount`,
 * `getMissingClassSubChoiceKeys`, `areAllClassSubChoicesCompleted`,
 * `areAllClassStepSubChoicesCompleted`).
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
  | 'wizardSpellbookL1'
  | 'pactTomeCantrips'
  | 'pactTomeRituals'
  | 'pactBladeWeapon';

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
/** Warlock D13e — 3 sorts mineurs au choix de toute classe (Pact of the Tome). */
export const WARLOCK_PACT_TOME_CANTRIPS_COUNT = 3;
/** Warlock D13e — 2 sorts L1 marqués Rituel au choix de toute classe (Pact of the Tome). */
export const WARLOCK_PACT_TOME_RITUALS_COUNT = 2;

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
  // Warlock D13c+e — `pactBladeWeapon`, `pactTomeCantrips`, `pactTomeRituals`
  // ne s'appliquent que si `eldritchInvocations` contient l'invocation
  // correspondante. La validation conditionnelle est portée par
  // `isSubChoiceMet` (return true si le pact n'est pas choisi). Les clés sont
  // déclarées ici parce que le hook ne connaît pas le contenu de l'entrée —
  // il agit par classId.
  warlock: [
    'eldritchInvocations',
    'pactBladeWeapon',
    'pactTomeCantrips',
    'pactTomeRituals',
  ],
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
    case 'pactTomeCantrips':
      return WARLOCK_PACT_TOME_CANTRIPS_COUNT;
    case 'pactTomeRituals':
      return WARLOCK_PACT_TOME_RITUALS_COUNT;
    case 'pactBladeWeapon':
      // Single-value (radio), convention 1.
      return 1;
    default: {
      const _never: never = key;
      void _never;
      return 0;
    }
  }
}

/**
 * Forme structurelle commune aux entrées de classe consommées par les
 * validateurs ci-dessous. Satisfaite par `WizardClassEntry`
 * (`@/shared/lib/slices/wizard-slice`) ET par `CharacterClassEntry`
 * (`@/shared/types/character`) — pas d'import croisé features/, pas de
 * dépendance sur Zod. Permet à `getMissingClassSubChoiceKeys` d'être
 * réutilisé par le moteur de level-up (JALON 2D.4a) qui manipule des
 * `CharacterClassEntry` plutôt que des drafts wizard.
 */
export interface ClassEntryL1Shape {
  classId: string;
  clericDivineOrder: DivineOrder | null;
  druidPrimalOrder: PrimalOrder | null;
  fighterFightingStyle: FightingStyle | null;
  weaponMasteries: readonly string[];
  expertiseSkills: readonly string[];
  eldritchInvocations: readonly string[];
  wizardSpellbookL1: readonly string[];
  pactTomeCantrips?: readonly string[];
  pactTomeRituals?: readonly string[];
  pactBladeWeapon?: string | null;
}

/**
 * Sous-choix posé ? Pour les single-value (cleric/druid/fighter style), on
 * vérifie `!== null`. Pour les multi-select, on vérifie `length === count`
 * (pas moins, pas plus — Roublard avec 1 Expertise est invalide).
 */
function isSubChoiceMet(
  entry: ClassEntryL1Shape,
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
    case 'pactTomeCantrips':
      // Tolérant : si Pact of the Tome n'est pas choisi, le chooser ne s'affiche
      // pas et le sous-choix n'est pas applicable → marqué satisfait.
      if (!entry.eldritchInvocations.includes('pact-of-the-tome')) return true;
      return (entry.pactTomeCantrips?.length ?? 0) === required;
    case 'pactTomeRituals':
      if (!entry.eldritchInvocations.includes('pact-of-the-tome')) return true;
      return (entry.pactTomeRituals?.length ?? 0) === required;
    case 'pactBladeWeapon':
      // Tolérant : si Pact of the Blade n'est pas choisi, le chooser ne s'affiche
      // pas → marqué satisfait.
      if (!entry.eldritchInvocations.includes('pact-of-the-blade')) return true;
      return entry.pactBladeWeapon != null;
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
  entry: ClassEntryL1Shape,
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
  entries: readonly ClassEntryL1Shape[],
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
  // D13c+e Pact of the Blade/Tome — les 3 sous-choix conditionnels sont
  // rendus dans la même section que `eldritchInvocations` (= step Classe)
  // parce que l'invocation est posée là. Si l'invocation correspondante n'est
  // pas sélectionnée, la clé est auto-satisfaite (cf. `isSubChoiceMet`
  // ci-dessus) — pas de blocage sur les autres Warlocks.
  'pactTomeCantrips',
  'pactTomeRituals',
  'pactBladeWeapon',
]);

/**
 * Variante de `areAllClassSubChoicesCompleted` qui filtre les sous-choix
 * rendus en dehors de la step Classe (cf. `CLASS_STEP_SUB_CHOICE_KEYS`).
 * Consommée par `isClassValid` pour décider si « Suivant » s'active à la
 * step Classe — sans bloquer le Roublard sur Expertise (qui sera validée
 * par `isSkillsValid` à la step suivante).
 */
export function areAllClassStepSubChoicesCompleted(
  entries: readonly ClassEntryL1Shape[],
  classes: readonly ClassEntity[],
): boolean {
  return entries.every((entry) => {
    const missing = getMissingClassSubChoiceKeys(entry, classes);
    return missing.every((key) => !CLASS_STEP_SUB_CHOICE_KEYS.has(key));
  });
}

/* ----------------------------------------------------------------------------
 * JALON 2D.4a — Sous-choix L1 quand on AJOUTE une classe en multiclass.
 *
 * Le moteur `applyLevelUp` (`@/shared/lib/level-up/apply-level-up.ts`) accepte
 * un `addClassSubChoices?: AddClassSubChoices` sur le `LevelUpDraft` (cf.
 * `level-up-types.ts:105` — schéma livré JALON 2D.3). Ce bloc partiel surcharge
 * les sentinelles `createEmptyClassSubChoices()` quand `newClassLevel === 1`.
 *
 * Pour piloter l'UI `LevelUpModal` du path add-class (JALON 2D.4b), on a
 * besoin de :
 *   1. savoir QUELS sous-choix L1 doivent être collectés pour la nouvelle
 *      classe (Divine Order pour Clerc, Fighting Style pour Guerrier, etc.) ;
 *   2. savoir si les sous-choix collectés JUSQU'ICI sont COMPLETS — pour
 *      activer/désactiver le bouton « Valider » de la modale.
 *
 * Interprétation SRD 2024 LOCKED par l'audit
 * (`plans/2D-MULTICLASS-AUDIT.md > Gap 5`) : les caractéristiques de L1 d'une
 * classe ajoutée en multiclass sont IDENTIQUES à celles d'un perso primaire L1
 * de cette classe (Divine Order, Fighting Style, Eldritch Invocations, etc.).
 * La SEULE différence SRD entre multiclass et primary L1 porte sur les
 * PROFICIENCIES — gérée séparément par `multiclassProficiencies` sur
 * `ClassEntity` (peuplé JALON 2D.2) et appliquée par `applyLevelUp` (JALON 2D.3).
 *
 * En conséquence les helpers ci-dessous délèguent à
 * `getClassSubChoiceKeys` / `getMissingClassSubChoiceKeys`. L'indirection
 * existe pour :
 *   - documenter la décision LOCKED (toute divergence future devra modifier
 *     CETTE section, pas le contrat wizard) ;
 *   - donner un point d'entrée typé qui consomme `AddClassSubChoices`
 *     (forme du level-up draft) plutôt qu'un `ClassEntryL1Shape` complet —
 *     l'UI 2D.4b construit progressivement le bloc partiel, pas une entrée
 *     pleine.
 * -------------------------------------------------------------------------- */

/**
 * Forme « bloc partiel des sous-choix L1 d'une classe ajoutée ». Mirror
 * structurel de `AddClassSubChoices` de `level-up-types.ts` — re-déclaré
 * localement pour éviter une dépendance circulaire `rules/` → `level-up/`
 * (les rules ne doivent pas dépendre du level-up).
 */
export interface AddClassL1SubChoicesShape {
  clericDivineOrder?: DivineOrder;
  druidPrimalOrder?: PrimalOrder;
  fighterFightingStyle?: FightingStyle;
  weaponMasteries?: readonly string[];
  expertiseSkills?: readonly string[];
  eldritchInvocations?: readonly string[];
  wizardSpellbookL1?: readonly string[];
  pactTomeCantrips?: readonly string[];
  pactTomeRituals?: readonly string[];
  pactBladeWeapon?: string;
}

/**
 * Sous-choix L1 à collecter pour une classe ajoutée en multiclass. MVP V1 :
 * délègue à `getClassSubChoiceKeys` (interprétation SRD 2024 LOCKED par
 * l'audit 2D — voir bloc commentaire ci-dessus).
 */
export function getAddClassL1SubChoiceKeys(
  classId: string | null,
): readonly ClassSubChoiceKey[] {
  return getClassSubChoiceKeys(classId);
}

/**
 * Sous-choix L1 encore manquants pour un bloc `addClassSubChoices` partiel.
 * Mappe le bloc partiel sur la forme `ClassEntryL1Shape` (sentinelles `null`
 * / `[]` quand un champ n'est pas encore fourni) et réutilise la même règle
 * de complétude que le wizard.
 *
 * Le caller (UI 2D.4b ou validateur d'`applyLevelUp`) garantit que `classId`
 * est bien la classe ajoutée — pas de cross-check ici.
 */
export function getMissingAddClassL1SubChoiceKeys(
  classId: string,
  addClassSubChoices: AddClassL1SubChoicesShape | undefined,
  classes: readonly ClassEntity[],
): readonly ClassSubChoiceKey[] {
  const overrides = addClassSubChoices ?? {};
  const shape: ClassEntryL1Shape = {
    classId,
    clericDivineOrder: overrides.clericDivineOrder ?? null,
    druidPrimalOrder: overrides.druidPrimalOrder ?? null,
    fighterFightingStyle: overrides.fighterFightingStyle ?? null,
    weaponMasteries: overrides.weaponMasteries ?? [],
    expertiseSkills: overrides.expertiseSkills ?? [],
    eldritchInvocations: overrides.eldritchInvocations ?? [],
    wizardSpellbookL1: overrides.wizardSpellbookL1 ?? [],
    pactTomeCantrips: overrides.pactTomeCantrips,
    pactTomeRituals: overrides.pactTomeRituals,
    pactBladeWeapon: overrides.pactBladeWeapon ?? null,
  };
  return getMissingClassSubChoiceKeys(shape, classes);
}
