import { create } from 'zustand';

/**
 * Toast minimaliste utilisé par les actions de combat (rolls, damage/heal,
 * death saves). Une seule pile FIFO globale ; chaque toast vit sa durée propre
 * puis est retiré automatiquement.
 *
 * On reste sur un store Zustand plutôt qu'un context React pour pouvoir
 * déclencher des toasts depuis du code non-réact (hooks utilitaires, plus tard
 * event-logger plan 22).
 */

export type ToastKind = 'roll' | 'crit' | 'fumble' | 'heal' | 'damage' | 'info' | 'grim';

export interface ToastEntry {
  id: string;
  kind: ToastKind;
  title: string;
  /** Grand chiffre / valeur dominante (ex: "23"). */
  big?: string;
  /** Sous-ligne discrète (ex: "1d20+5 → 18 + 5"). */
  sub?: string;
  /** Durée avant disparition (ms). Défaut 2300, aligné avec l'anim CSS. */
  durationMs?: number;
}

interface ToastState {
  toasts: ToastEntry[];
  show: (entry: Omit<ToastEntry, 'id'>) => string;
  dismiss: (id: string) => void;
}

let _id = 0;
function nextId(): string {
  _id += 1;
  return `t${_id}`;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (entry) => {
    const id = nextId();
    const durationMs = entry.durationMs ?? 2300;
    set((state) => ({ toasts: [...state.toasts, { ...entry, id, durationMs }] }));
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      }, durationMs);
    }
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

/** Helper d'usage : on évite que les composants importent le store entier. */
export function showToast(entry: Omit<ToastEntry, 'id'>): string {
  return useToastStore.getState().show(entry);
}
