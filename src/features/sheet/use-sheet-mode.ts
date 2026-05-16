import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const SHEET_MODES = ['combat', 'essence', 'magie', 'avoir', 'ame'] as const;
export type SheetMode = (typeof SHEET_MODES)[number];

/**
 * Mode actif de la fiche par personnage (clé = characterId). Persisté en
 * localStorage pour que rouvrir une fiche restaure le dernier onglet vu.
 *
 * Note : la préférence globale `user.settings.sheetDefaultMode` (S2) prendra
 * le pas comme défaut quand un personnage n'a pas encore d'entrée ici.
 */
interface SheetModeStore {
  modeByCharacter: Record<string, SheetMode>;
  setMode: (characterId: string, mode: SheetMode) => void;
}

export const useSheetModeStore = create<SheetModeStore>()(
  persist(
    (set) => ({
      modeByCharacter: {},
      setMode: (characterId, mode): void => {
        set((state) => ({
          modeByCharacter: { ...state.modeByCharacter, [characterId]: mode },
        }));
      },
    }),
    {
      name: 'grimwar-sheet-mode',
      version: 1,
    },
  ),
);

export function useSheetMode(characterId: string, fallback: SheetMode = 'combat'): {
  mode: SheetMode;
  setMode: (mode: SheetMode) => void;
} {
  const mode = useSheetModeStore((s) => s.modeByCharacter[characterId] ?? fallback);
  const setModeRaw = useSheetModeStore((s) => s.setMode);
  return {
    mode,
    setMode: (m) => setModeRaw(characterId, m),
  };
}
