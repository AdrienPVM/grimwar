import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHook } from '@testing-library/react';

import {
  resolveHitMissGate,
  resolvePhysicalRoll,
  useUiModalsStore,
} from '@/shared/lib/slices/ui-modals-slice';
import { useUserSettingsStore } from '@/shared/lib/slices/user-settings-slice';

import { useDice } from '../use-dice';

/**
 * Tests de la séquence `rollAttackDamage` + `rollDamageWithMode` en mode
 * physique — plan 12.5 step 20-21.
 *
 * Sans monter les modales, on pilote via `resolvePhysicalRoll` /
 * `resolveHitMissGate` après que le pivot a posé `pendingPhysicalRoll` ou
 * `pendingHitMissGate`.
 */

function setPhysicalMode(): void {
  useUserSettingsStore.setState({ diceMode: 'physical', followCampaignDiceMode: true });
}

function resetMode(): void {
  useUserSettingsStore.setState({ diceMode: 'digital', followCampaignDiceMode: true });
}

/** Comme `answerPhysical`, mais retourne le spec capturé pour assertions. */
function capturePhysical(res: { rawFaces: number[] } | null): Promise<{
  dice: { count: number; sides: number }[];
  modifier: number;
}> {
  return new Promise((resolveOuter) => {
    function tryAnswer(): boolean {
      const pending = useUiModalsStore.getState().pendingPhysicalRoll;
      if (pending) {
        const spec = {
          dice: pending.spec.dice.map((t) => ({ count: t.count, sides: t.sides })),
          modifier: pending.spec.modifier,
        };
        queueMicrotask(() => {
          resolvePhysicalRoll(res);
          resolveOuter(spec);
        });
        return true;
      }
      return false;
    }
    if (tryAnswer()) return;
    const stop = useUiModalsStore.subscribe((state) => {
      if (state.pendingPhysicalRoll) {
        const spec = {
          dice: state.pendingPhysicalRoll.spec.dice.map((t) => ({
            count: t.count,
            sides: t.sides,
          })),
          modifier: state.pendingPhysicalRoll.spec.modifier,
        };
        stop();
        queueMicrotask(() => {
          resolvePhysicalRoll(res);
          resolveOuter(spec);
        });
      }
    });
  });
}

/** Résout le PROCHAIN prompt physique avec `res`. Robust si le prompt est déjà posé. */
function answerPhysical(res: { rawFaces: number[] } | null): Promise<void> {
  return new Promise((resolveOuter) => {
    function tryAnswer(): boolean {
      if (useUiModalsStore.getState().pendingPhysicalRoll) {
        queueMicrotask(() => {
          resolvePhysicalRoll(res);
          resolveOuter();
        });
        return true;
      }
      return false;
    }
    if (tryAnswer()) return;
    const stop = useUiModalsStore.subscribe((state) => {
      if (state.pendingPhysicalRoll) {
        stop();
        queueMicrotask(() => {
          resolvePhysicalRoll(res);
          resolveOuter();
        });
      }
    });
  });
}

/** Résout le PROCHAIN gate Touché/Raté. Robust si le gate est déjà posé. */
function answerGate(res: 'hit' | 'miss' | null): Promise<void> {
  return new Promise((resolveOuter) => {
    function tryAnswer(): boolean {
      if (useUiModalsStore.getState().pendingHitMissGate) {
        queueMicrotask(() => {
          resolveHitMissGate(res);
          resolveOuter();
        });
        return true;
      }
      return false;
    }
    if (tryAnswer()) return;
    const stop = useUiModalsStore.subscribe((state) => {
      if (state.pendingHitMissGate) {
        stop();
        queueMicrotask(() => {
          resolveHitMissGate(res);
          resolveOuter();
        });
      }
    });
  });
}

beforeEach(() => setPhysicalMode());
afterEach(() => {
  resetMode();
  vi.restoreAllMocks();
});

describe('useDice — rollDamageWithMode physique', () => {
  it('prompt damage + validation calcule le total et clamp à 0', async () => {
    const { result } = renderHook(() => useDice());
    const promptDone = answerPhysical({ rawFaces: [2] });
    const r = await result.current.rollDamageWithMode('1d8-10', {
      label: 'Acide',
      characterId: 'c1',
    });
    await promptDone;
    expect(r).not.toBeNull();
    expect(r!.total).toBe(0); // 2 − 10 → clamp à 0
    expect(r!.mode).toBe('physical');
  });

  it('« Passer » damage → retourne null', async () => {
    const { result } = renderHook(() => useDice());
    const promptDone = answerPhysical(null);
    const r = await result.current.rollDamageWithMode('2d6+1', {
      label: 'Boule de feu',
      characterId: 'c1',
    });
    await promptDone;
    expect(r).toBeNull();
  });

  it('crit double le nombre de dés au prompt', async () => {
    const { result } = renderHook(() => useDice());
    const promise = capturePhysical({ rawFaces: [3, 5] });
    const r = await result.current.rollDamageWithMode('1d8+3', {
      label: 'Critique',
      characterId: 'c1',
      crit: true,
    });
    const spec = await promise;
    expect(spec.dice).toEqual([{ count: 2, sides: 8 }]);
    expect(r!.total).toBe(11); // 3 + 5 + 3 (modifier non doublé)
    expect(r!.modifier).toBe(3);
  });
});

describe('useDice — rollAttackDamage physique', () => {
  it('face 20 → auto-Touché, crit, prompt dégâts dés doublés', async () => {
    const { result } = renderHook(() => useDice());
    let damageSpecCount = 0;
    const promptDone = (async () => {
      await answerPhysical({ rawFaces: [20] });
      const dmgSpec = await capturePhysical({ rawFaces: [4, 5] });
      damageSpecCount = dmgSpec.dice[0]!.count;
    })();

    const r = await result.current.rollAttackDamage(3, '1d8+3', {
      character: { id: 'c1', inspiration: false, exhaustion: 0 },
      label: 'Épée',
    });
    await promptDone;
    expect(damageSpecCount).toBe(2); // 1d8 doublé
    expect(r.attack).not.toBeNull();
    expect(r.attack!.crit).toBe(true);
    expect(r.damage).not.toBeNull();
    expect(r.damage!.total).toBe(12); // 4 + 5 + 3
  });

  it('face 1 → auto-Raté, fumble, pas de prompt dégâts', async () => {
    const { result } = renderHook(() => useDice());
    let damagePrompted = false;
    const promptDone = (async () => {
      await answerPhysical({ rawFaces: [1] });
      // Si un second prompt arrive après la résolution, on note l'erreur.
      const stop = useUiModalsStore.subscribe((state) => {
        if (state.pendingPhysicalRoll) damagePrompted = true;
      });
      await new Promise((r) => setTimeout(r, 30));
      stop();
    })();
    const r = await result.current.rollAttackDamage(3, '1d8+3', {
      character: { id: 'c1', inspiration: false, exhaustion: 0 },
      label: 'Épée',
    });
    await promptDone;
    expect(r.attack!.fumble).toBe(true);
    expect(r.damage).toBeNull();
    expect(damagePrompted).toBe(false);
  });

  it('face neutre → gate Touché/Raté présenté ; Touché → prompt dégâts non doublés', async () => {
    const { result } = renderHook(() => useDice());
    let damageSpecCount = 0;
    const promptDone = (async () => {
      await answerPhysical({ rawFaces: [12] }); // attaque face neutre
      await answerGate('hit'); // joueur choisit Touché
      const dmgSpec = await capturePhysical({ rawFaces: [5] });
      damageSpecCount = dmgSpec.dice[0]!.count;
    })();
    const r = await result.current.rollAttackDamage(3, '1d8+3', {
      character: { id: 'c1', inspiration: false, exhaustion: 0 },
      label: 'Épée',
    });
    await promptDone;
    expect(damageSpecCount).toBe(1); // pas doublé
    expect(r.damage!.total).toBe(8); // 5 + 3
  });

  it('face neutre → gate Raté → pas de dégâts', async () => {
    const { result } = renderHook(() => useDice());
    const promptDone = (async () => {
      await answerPhysical({ rawFaces: [8] });
      await answerGate('miss');
    })();
    const r = await result.current.rollAttackDamage(3, '1d8+3', {
      character: { id: 'c1', inspiration: false, exhaustion: 0 },
      label: 'Épée',
    });
    await promptDone;
    expect(r.attack!.fumble).toBe(false);
    expect(r.damage).toBeNull();
  });

  it('Passer le prompt d\'attaque → ni attack ni damage', async () => {
    const { result } = renderHook(() => useDice());
    const promptDone = answerPhysical(null);
    const r = await result.current.rollAttackDamage(3, '1d8+3', {
      character: { id: 'c1', inspiration: false, exhaustion: 0 },
      label: 'Épée',
    });
    await promptDone;
    expect(r.attack).toBeNull();
    expect(r.damage).toBeNull();
  });
});
