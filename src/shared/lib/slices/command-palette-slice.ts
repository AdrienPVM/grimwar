import { create } from 'zustand';

/**
 * Ouverture de la palette de commandes (⌘K).
 *
 * Un store plutôt qu'un état local : la palette est un singleton monté au
 * sommet de l'app, et trois sources indépendantes l'ouvrent — le raccourci
 * clavier global, le bouton du bandeau, et à terme n'importe quel écran qui
 * voudrait dire « cherche ça ». Aucune d'elles n'est parente des autres.
 *
 * Rien à persister : une palette rouverte doit repartir d'un champ vide. La
 * question d'il y a deux heures n'est pas celle de maintenant.
 */
interface CommandPaletteState {
  open: boolean;
  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>((set) => ({
  open: false,
  openPalette: () => set({ open: true }),
  closePalette: () => set({ open: false }),
  togglePalette: () => set((s) => ({ open: !s.open })),
}));

/** Ouverture depuis du code hors React. */
export function openCommandPalette(): void {
  useCommandPaletteStore.getState().openPalette();
}
