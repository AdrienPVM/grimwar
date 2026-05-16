/**
 * Slice ui-modals (plan 12.5).
 *
 * Centralise les modales **résolues par promesse** : le caller (le pivot, ou
 * `rollAttackDamage`) déclenche `requestPhysicalRoll(...)` ou
 * `requestHitMissGate(...)`, attend la résolution, puis continue son flow.
 *
 * Pourquoi un store Zustand plutôt qu'un event bus :
 *   - Une seule modale à la fois suffit en S1 (pas de concurrence). On verrouille
 *     `pending*` à `non-null` jusqu'à résolution.
 *   - Le store est lisible depuis du code non-React (le pivot async vit hors
 *     composant) — pas besoin de monter un Provider à part.
 *   - Si une 2ᵉ requête arrive alors qu'une est en cours, on auto-passe la
 *     précédente (résolution `null`) pour éviter le deadlock. Documenté pour
 *     que les call sites traitent `null` comme « le joueur a passé ».
 */
import { create } from 'zustand';

import type { Advantage, DiceTerm } from '@/shared/lib/dice/types';

/** Spécification d'un prompt physique. */
export interface PhysicalRollSpec {
  /** Termes de dés à lancer (post-doublage pour le crit en dégâts). */
  dice: DiceTerm[];
  /** Modificateur plat (info uniquement — pas saisi par le joueur). */
  modifier: number;
  /** Label affiché en gros ("Lance 1d20 — Attaque épée longue"). */
  label: string;
  /** Indique au joueur s'il roule avec avantage/désavantage (UI seul). */
  advantage: Advantage;
}

export type PhysicalRollResolution = { rawFaces: number[] } | null;

interface PendingPhysicalRoll {
  spec: PhysicalRollSpec;
  resolve: (resolution: PhysicalRollResolution) => void;
}

export interface HitMissGateSpec {
  label: string;
  /** Indication contextuelle ("Face 13 — choix manuel"). */
  hint?: string;
}

export type HitMissGateResolution = 'hit' | 'miss' | null;

interface PendingHitMissGate {
  spec: HitMissGateSpec;
  resolve: (resolution: HitMissGateResolution) => void;
}

interface UiModalsState {
  pendingPhysicalRoll: PendingPhysicalRoll | null;
  pendingHitMissGate: PendingHitMissGate | null;
  _setPhysicalRoll: (next: PendingPhysicalRoll | null) => void;
  _setHitMissGate: (next: PendingHitMissGate | null) => void;
}

export const useUiModalsStore = create<UiModalsState>((set) => ({
  pendingPhysicalRoll: null,
  pendingHitMissGate: null,
  _setPhysicalRoll: (next) => set({ pendingPhysicalRoll: next }),
  _setHitMissGate: (next) => set({ pendingHitMissGate: next }),
}));

/**
 * Ouvre `<PhysicalRollModal />` et attend la résolution.
 * Retourne `null` si le joueur appuie sur « Passer ».
 *
 * Auto-passe une requête précédente non résolue (cas dégénéré, pour éviter le
 * deadlock si deux call sites partent en parallèle).
 */
export function requestPhysicalRoll(spec: PhysicalRollSpec): Promise<PhysicalRollResolution> {
  return new Promise((resolve) => {
    const store = useUiModalsStore.getState();
    if (store.pendingPhysicalRoll) {
      store.pendingPhysicalRoll.resolve(null);
    }
    store._setPhysicalRoll({ spec, resolve });
  });
}

/** Résolution depuis le composant modal — usage interne. */
export function resolvePhysicalRoll(resolution: PhysicalRollResolution): void {
  const { pendingPhysicalRoll, _setPhysicalRoll } = useUiModalsStore.getState();
  if (!pendingPhysicalRoll) return;
  pendingPhysicalRoll.resolve(resolution);
  _setPhysicalRoll(null);
}

/**
 * Ouvre un gate Touché/Raté manuel (séquence attaque physique sur face neutre).
 * Retourne `'hit' | 'miss' | null` (null = Passer / Esc).
 */
export function requestHitMissGate(spec: HitMissGateSpec): Promise<HitMissGateResolution> {
  return new Promise((resolve) => {
    const store = useUiModalsStore.getState();
    if (store.pendingHitMissGate) {
      store.pendingHitMissGate.resolve(null);
    }
    store._setHitMissGate({ spec, resolve });
  });
}

export function resolveHitMissGate(resolution: HitMissGateResolution): void {
  const { pendingHitMissGate, _setHitMissGate } = useUiModalsStore.getState();
  if (!pendingHitMissGate) return;
  pendingHitMissGate.resolve(resolution);
  _setHitMissGate(null);
}
