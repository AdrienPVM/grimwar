import { create } from 'zustand';

/**
 * Store global de l'état de synchronisation Firestore.
 *
 * `pendingWrites` est incrémenté à chaque écriture lancée via `trackPendingWrite`
 * et décrémenté quand `waitForPendingWrites()` résout (ack backend) ou échoue.
 *
 * Pourquoi un store séparé : la bannière offline + de futurs indicateurs
 * (badge sync sur l'avatar, p.ex.) ont besoin du même signal sans coupler
 * l'UI à `useUpdateCharacter` ou aux autres writers spécifiques.
 *
 * `updateDoc` (Firestore SDK avec `enableIndexedDbPersistence`) résout
 * LOCALEMENT immédiatement, même hors ligne — la promesse `updateDoc` ne
 * reflète donc PAS l'état de sync backend. C'est `waitForPendingWrites` qui
 * matérialise l'ack. D'où le wrapper non-bloquant qui consulte les deux.
 */
interface SyncState {
  pendingWrites: number;
  beginWrite: () => void;
  endWrite: () => void;
  /** Test-only : reset du compteur entre cas. */
  __reset: () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  pendingWrites: 0,
  beginWrite: () => set((state) => ({ pendingWrites: state.pendingWrites + 1 })),
  endWrite: () =>
    set((state) => ({ pendingWrites: Math.max(0, state.pendingWrites - 1) })),
  __reset: () => set({ pendingWrites: 0 }),
}));
