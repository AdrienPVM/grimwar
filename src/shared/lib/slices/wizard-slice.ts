import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  EMPTY_ANCESTRY_SUB_CHOICES,
  createEmptyClassSubChoices,
  type AbilityCode,
  type AncestrySubChoices,
  type DivineOrder,
  type FightingStyle,
  type PrimalOrder,
} from '@/shared/types/character';

/**
 * Slice du wizard de création de personnage (plan 05 v2).
 *
 * Refonte vs v1 :
 *   - `classes: WizardClassEntry[]` (multi-class natif, le niveau total est
 *     déduit de la somme des niveaux par classe).
 *   - Sélections par classe pour les sorts (chaque classe lanceuse a sa
 *     propre liste de cantrips + sorts de niveau 1).
 *   - `currentStep` + `visitedSteps` pour la navigation guidée.
 *   - Personnalité éditable (trait/ideal/bond/flaw + backstory libre).
 *   - Persistance bumpée à v2 → invalide les drafts v1 du formulaire monopage.
 *
 * Volontairement strict côté types (zéro `any`). Toute extension future passe
 * par `migrate` du middleware persist (cf. version: 2 ci-dessous).
 */

export type AbilityMethod = 'standard-array' | 'point-buy' | 'manual';

/**
 * Sous-choix de classe niveau 1 SRD 5.2.1 portés par chaque entrée du tableau
 * `classes[]` (décision 13.7 §0.1). Mirror typé du `characterClassEntrySchema`
 * côté `character.ts` — le wizard porte les mêmes sentinelles avant submit,
 * `submit-from-wizard` les recopie dans `characterClasses[i]` 1:1.
 */
export interface WizardClassEntry {
  classId: string;
  level: number;
  clericDivineOrder: DivineOrder | null;
  druidPrimalOrder: PrimalOrder | null;
  fighterFightingStyle: FightingStyle | null;
  /** Ids d'armes (items.json) choisies pour Weapon Mastery. */
  weaponMasteries: string[];
  /** Ids de compétences (skill-resolver) choisies pour Expertise (Roublard). */
  expertiseSkills: string[];
  /** Ids d'invocations (invocations.json) choisies pour Warlock. */
  eldritchInvocations: string[];
  /** Ids de sorts (spells.json) inscrits dans le grimoire L1 (Magicien). */
  wizardSpellbookL1: string[];
}

export type ClassSubChoiceKey =
  | 'clericDivineOrder'
  | 'druidPrimalOrder'
  | 'fighterFightingStyle'
  | 'weaponMasteries'
  | 'expertiseSkills'
  | 'eldritchInvocations'
  | 'wizardSpellbookL1';

export type ClassSubChoiceValue =
  | DivineOrder
  | PrimalOrder
  | FightingStyle
  | string[]
  | null;

export interface WizardEquipmentChoice {
  /** classId concerné — chaque classe choisie pose sa propre option. */
  classId: string;
  /** Index de l'option dans `class.startingEquipment.options` (0 = A, 1 = B, …). */
  optionIndex: number;
}

export interface WizardSpellsForClass {
  classId: string;
  cantrips: string[];
  level1: string[];
}

export interface WizardDraft {
  // Étape 1 — Identité
  name: string;
  level: number;
  alignment: string;

  // Étape 2 — Classe (multi-class)
  classes: WizardClassEntry[];
  primaryClassId: string | null;

  // Étape 3 — Ascendance
  ancestryId: string | null;
  /**
   * Sous-choix d'ascendance niveau 1 SRD (plan 13.7). Sentinelles (`null`) ici ;
   * peuplées par les sous-étapes 13.8 (chooser par ascendance). Le wizard refuse
   * de soumettre si un sous-choix requis pour l'ascendance choisie reste `null`.
   */
  ancestrySubChoices: AncestrySubChoices;

  // Étape 4 — Caractéristiques
  method: AbilityMethod;
  abilities: Record<AbilityCode, number>;

  // Étape 5 — Historique
  backgroundId: string | null;
  personality: {
    trait: string;
    ideal: string;
    bond: string;
    flaw: string;
    backstory: string;
  };

  // Étape 6 — Compétences
  pickedSkills: string[];

  /**
   * Langues supplémentaires racine (Roublard +1, Background, Origin Feat...) —
   * décision 13.7 §0.1 : `extraLanguages` reste à la racine du perso parce qu'il
   * agrège plusieurs sources. Les sous-choix de classe (Fighting Style, etc.)
   * vivent dans `classes[].*`, pas ici.
   */
  extraLanguages: string[];

  // Étape 7 — Équipement
  equipmentChoices: WizardEquipmentChoice[];

  // Étape 8 — Sorts (conditionnel)
  spellsByClass: WizardSpellsForClass[];
}

const DEFAULT_ABILITIES: Record<AbilityCode, number> = {
  for: 10,
  dex: 10,
  con: 10,
  int: 10,
  sag: 10,
  cha: 10,
};

export const EMPTY_DRAFT: WizardDraft = {
  name: '',
  level: 1,
  alignment: 'NB',
  classes: [],
  primaryClassId: null,
  ancestryId: null,
  ancestrySubChoices: { ...EMPTY_ANCESTRY_SUB_CHOICES },
  method: 'standard-array',
  abilities: { ...DEFAULT_ABILITIES },
  backgroundId: null,
  personality: { trait: '', ideal: '', bond: '', flaw: '', backstory: '' },
  pickedSkills: [],
  extraLanguages: [],
  equipmentChoices: [],
  spellsByClass: [],
};

/** Identifiants stables des 9 étapes. Servent à `currentStep` + sommaire desktop. */
export const WIZARD_STEPS = [
  'identity',
  'class',
  'ancestry',
  'abilities',
  'background',
  'skills',
  'equipment',
  'spells',
  'recap',
] as const;
export type WizardStepId = (typeof WIZARD_STEPS)[number];

interface WizardStore {
  draft: WizardDraft;
  currentStep: WizardStepId;
  visitedSteps: WizardStepId[];

  // Mutations granulaires — chaque étape utilise celles dont elle a besoin.
  setField: <K extends keyof WizardDraft>(key: K, value: WizardDraft[K]) => void;
  setAbility: (code: AbilityCode, value: number) => void;
  setPersonality: (
    patch: Partial<WizardDraft['personality']>,
  ) => void;

  // Multi-class helpers
  addClass: (classId: string, level: number) => void;
  updateClassLevel: (classId: string, level: number) => void;
  removeClass: (classId: string) => void;
  setPrimaryClass: (classId: string) => void;

  /**
   * Setter unique pour les sous-choix de classe (plan 13.9). Cible une entrée
   * de `classes[]` par `classId` + une clé typée (`fighterFightingStyle`,
   * `weaponMasteries`, etc.). Refus silencieux si l'entrée n'existe pas — c'est
   * acceptable parce que le wizard 13.9 ne rend les choosers que pour la classe
   * primaire mono-class à L1.
   */
  setClassSubChoice: <K extends ClassSubChoiceKey>(
    classId: string,
    key: K,
    value: WizardClassEntry[K],
  ) => void;

  // Équipement multi-class
  setEquipmentChoice: (classId: string, optionIndex: number) => void;

  // Sorts par classe lanceuse
  setSpellsForClass: (classId: string, cantrips: string[], level1: string[]) => void;

  // Navigation
  goToStep: (step: WizardStepId) => void;
  markVisited: (step: WizardStepId) => void;

  reset: () => void;
}

function cloneDraft(): WizardDraft {
  return {
    ...EMPTY_DRAFT,
    abilities: { ...DEFAULT_ABILITIES },
    classes: [],
    equipmentChoices: [],
    spellsByClass: [],
    pickedSkills: [],
    extraLanguages: [],
    personality: { ...EMPTY_DRAFT.personality },
    ancestrySubChoices: { ...EMPTY_ANCESTRY_SUB_CHOICES },
  };
}

export const useWizardStore = create<WizardStore>()(
  persist(
    (set) => ({
      draft: cloneDraft(),
      currentStep: 'identity',
      visitedSteps: ['identity'],

      setField: (key, value): void => {
        set((state) => ({ draft: { ...state.draft, [key]: value } }));
      },

      setAbility: (code, value): void => {
        set((state) => ({
          draft: {
            ...state.draft,
            abilities: { ...state.draft.abilities, [code]: value },
          },
        }));
      },

      setPersonality: (patch): void => {
        set((state) => ({
          draft: {
            ...state.draft,
            personality: { ...state.draft.personality, ...patch },
          },
        }));
      },

      addClass: (classId, level): void => {
        set((state) => {
          if (state.draft.classes.some((c) => c.classId === classId)) return state;
          // Chaque nouvelle entrée porte ses propres sentinelles de sous-choix
          // (factory `createEmptyClassSubChoices` — pas de partage d'arrays
          // entre entrées, cf. character.ts).
          const nextClasses: WizardClassEntry[] = [
            ...state.draft.classes,
            { classId, level, ...createEmptyClassSubChoices() },
          ];
          // Le premier ajout devient la classe primaire par défaut.
          const primary = state.draft.primaryClassId ?? nextClasses[0]?.classId ?? null;
          return {
            draft: {
              ...state.draft,
              classes: nextClasses,
              primaryClassId: primary,
            },
          };
        });
      },

      updateClassLevel: (classId, level): void => {
        set((state) => ({
          draft: {
            ...state.draft,
            classes: state.draft.classes.map((c) =>
              c.classId === classId ? { ...c, level } : c,
            ),
          },
        }));
      },

      removeClass: (classId): void => {
        set((state) => {
          const nextClasses = state.draft.classes.filter((c) => c.classId !== classId);
          let primary = state.draft.primaryClassId;
          if (primary === classId) primary = nextClasses[0]?.classId ?? null;
          return {
            draft: {
              ...state.draft,
              classes: nextClasses,
              primaryClassId: primary,
              // Nettoie aussi équipement + sorts liés à la classe retirée.
              equipmentChoices: state.draft.equipmentChoices.filter(
                (c) => c.classId !== classId,
              ),
              spellsByClass: state.draft.spellsByClass.filter(
                (s) => s.classId !== classId,
              ),
            },
          };
        });
      },

      setPrimaryClass: (classId): void => {
        set((state) => ({
          draft: { ...state.draft, primaryClassId: classId },
        }));
      },

      setClassSubChoice: (classId, key, value): void => {
        set((state) => ({
          draft: {
            ...state.draft,
            classes: state.draft.classes.map((c) =>
              c.classId === classId ? { ...c, [key]: value } : c,
            ),
          },
        }));
      },

      setEquipmentChoice: (classId, optionIndex): void => {
        set((state) => {
          const without = state.draft.equipmentChoices.filter((c) => c.classId !== classId);
          return {
            draft: {
              ...state.draft,
              equipmentChoices: [...without, { classId, optionIndex }],
            },
          };
        });
      },

      setSpellsForClass: (classId, cantrips, level1): void => {
        set((state) => {
          const without = state.draft.spellsByClass.filter((s) => s.classId !== classId);
          return {
            draft: {
              ...state.draft,
              spellsByClass: [...without, { classId, cantrips, level1 }],
            },
          };
        });
      },

      goToStep: (step): void => {
        set((state) => {
          const visited = state.visitedSteps.includes(step)
            ? state.visitedSteps
            : [...state.visitedSteps, step];
          return { currentStep: step, visitedSteps: visited };
        });
      },

      markVisited: (step): void => {
        set((state) => {
          if (state.visitedSteps.includes(step)) return state;
          return { visitedSteps: [...state.visitedSteps, step] };
        });
      },

      reset: (): void => {
        set(() => ({
          draft: cloneDraft(),
          currentStep: 'identity',
          visitedSteps: ['identity'],
        }));
      },
    }),
    {
      // Clé bumpée v3→v4 (plan 13.9) — les anciens drafts v3 n'avaient pas les
      // sous-choix de classe sur `WizardClassEntry` ni `extraLanguages` racine.
      // Un draft v3 incomplet pourrait crasher le wizard à l'hydratation ; on
      // préfère jeter et repartir vide (workflow de création courte → faible
      // coût utilisateur, gros gain en robustesse).
      name: 'grimwar-wizard-draft-v4',
      version: 4,
    },
  ),
);
