import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  EMPTY_ANCESTRY_SUB_CHOICES,
  type AbilityCode,
  type AncestrySubChoices,
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

export interface WizardClassEntry {
  classId: string;
  level: number;
}

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
          const nextClasses = [...state.draft.classes, { classId, level }];
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
      // Clé bumpée vs v2 (`grimwar-wizard-draft-v2`) → invalide les drafts qui
      // contenaient encore `subancestryId` (retiré au plan 13.7). Pas de
      // migration locale nécessaire : un draft incomplet est jetable.
      name: 'grimwar-wizard-draft-v3',
      version: 3,
    },
  ),
);
