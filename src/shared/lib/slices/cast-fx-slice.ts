import { create } from 'zustand';

import { generateSigil, type SigilInput, type SpellSigil } from '@/features/dice/sigils';

/**
 * Plan 38 — Store global déclencheur des sceaux de sort.
 *
 * Singleton Zustand (même logique que `toast-slice`) : on déclenche le sceau
 * depuis le flux d'incantation (`handleCast`, code non-réact côté handler) et un
 * unique `<SpellSigilOverlay />` monté à la racine de l'app s'abonne. Le `nonce`
 * force le remount de l'overlay même si l'on relance le même sort deux fois de
 * suite (sinon React verrait des props identiques et ne rejouerait pas l'anim).
 */

interface CastFxState {
  sigil: SpellSigil | null;
  /** Incrémenté à chaque déclenchement — clé de remount de l'overlay. */
  nonce: number;
  trigger: (input: SigilInput) => void;
  clear: () => void;
}

export const useCastFxStore = create<CastFxState>((set) => ({
  sigil: null,
  nonce: 0,
  trigger: (input) =>
    set((state) => ({ sigil: generateSigil(input), nonce: state.nonce + 1 })),
  clear: () => set({ sigil: null }),
}));

/**
 * Helper d'usage : déclenche l'animation de sceau pour un sort. Best-effort,
 * purement visuel — ne jette jamais et ne doit jamais bloquer l'incantation.
 */
export function triggerCastSigil(input: SigilInput): void {
  useCastFxStore.getState().trigger(input);
}
