import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { AbilityCode } from '@/shared/types/character';

/**
 * Brouillon du formulaire de création manuelle. Persiste dans localStorage
 * via zustand/middleware/persist pour qu'un onglet fermé ne perde pas le travail.
 */

export type AbilityMethod = 'standard-array' | 'point-buy' | 'manual';

export interface WizardDraftItem {
  contentId: string;
  qty: number;
  /** Source dont vient l'item dans le brouillon (class option, background…). */
  origin: 'class' | 'background';
}

export interface WizardDraft {
  // Identité
  name: string;
  level: number;
  alignment: string;
  // Lignée
  ancestryId: string | null;
  subancestryId: string | null;
  // Classe
  classId: string | null;
  subclassId: string | null;
  // Historique
  backgroundId: string | null;
  // Abilities
  method: AbilityMethod;
  abilities: Record<AbilityCode, number>;
  // Combat
  hpOverride: number | null;
  acOverride: number | null;
  // Skills
  pickedSkills: string[];
  // Sorts (clé = "cantrip" | "level1" → array d'IDs)
  pickedCantrips: string[];
  pickedSpellsLevel1: string[];
  // Équipement
  classOptionIndex: number; // 0 = A, 1 = B, 2 = C
  inventoryDraft: WizardDraftItem[];
  startingCoinsGp: number;
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
  ancestryId: null,
  subancestryId: null,
  classId: null,
  subclassId: null,
  backgroundId: null,
  method: 'point-buy',
  abilities: { ...DEFAULT_ABILITIES },
  hpOverride: null,
  acOverride: null,
  pickedSkills: [],
  pickedCantrips: [],
  pickedSpellsLevel1: [],
  classOptionIndex: 0,
  inventoryDraft: [],
  startingCoinsGp: 0,
};

interface WizardStore {
  draft: WizardDraft;
  setField: <K extends keyof WizardDraft>(key: K, value: WizardDraft[K]) => void;
  setAbility: (code: AbilityCode, value: number) => void;
  reset: () => void;
}

export const useWizardStore = create<WizardStore>()(
  persist(
    (set) => ({
      draft: { ...EMPTY_DRAFT, abilities: { ...DEFAULT_ABILITIES } },
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
      reset: (): void => {
        set(() => ({
          draft: { ...EMPTY_DRAFT, abilities: { ...DEFAULT_ABILITIES } },
        }));
      },
    }),
    {
      name: 'grimwar-wizard-draft',
      version: 1,
    },
  ),
);
