import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RollResult } from '@/shared/lib/dice/types';

import { rollWithFlags } from '../roll-with-flags';

/**
 * Narrow `RollResult | null` (signature mode-aware plan 12.5) → `RollResult`
 * pour les tests digitaux où le mode utilisateur par défaut garantit non-null.
 */
function unwrap(r: RollResult | null): RollResult {
  if (!r) throw new Error('expected RollResult, got null (le store user devrait être en digital par défaut)');
  return r;
}

/**
 * On contrôle l'aléa en mockant `crypto.getRandomValues` : la face roulée est
 * `(buf[0] % sides) + 1`. En posant `buf[0] = face - 1`, tout dé retombe sur
 * `face` (pour `face <= sides`).
 */
function mockDie(face: number): void {
  vi.spyOn(crypto, 'getRandomValues').mockImplementation((buf: ArrayBufferView | null) => {
    if (buf instanceof Uint32Array) buf[0] = face - 1;
    return buf as unknown as Uint8Array;
  });
}

beforeEach(() => mockDie(10));
afterEach(() => vi.restoreAllMocks());

describe('rollWithFlags', () => {
  it('applique la pénalité d\'exhaustion (-2 par niveau)', async () => {
    const r = unwrap(await rollWithFlags({
      character: { id: 'c1', inspiration: false, exhaustion: 2 },
      baseMod: 5,
      label: 'Test',
    }));
    expect(r.modifier).toBe(1); // 5 − 4
    expect(r.total).toBe(11); // d20=10 + 1
    expect(r.advantage).toBe('normal');
    expect(r.crit).toBe(false);
    expect(r.fumble).toBe(false);
    expect(r.dice).toEqual([{ count: 1, sides: 20 }]);
  });

  it('force advantage quand inspiration est true et la consomme', async () => {
    const consume = vi.fn(async () => {});
    const r = unwrap(await rollWithFlags({
      character: { id: 'c1', inspiration: true, exhaustion: 0 },
      baseMod: 3,
      label: 'Test',
      advantage: 'normal',
      consumeInspiration: consume,
    }));
    expect(r.advantage).toBe('advantage');
    expect(r.dice).toEqual([{ count: 2, sides: 20, kh: 1 }]);
    expect(consume).toHaveBeenCalledOnce();
  });

  it('inspiration override désavantage explicite', async () => {
    const r = unwrap(await rollWithFlags({
      character: { id: 'c1', inspiration: true, exhaustion: 0 },
      baseMod: 0,
      label: 'Test',
      advantage: 'disadvantage',
    }));
    expect(r.advantage).toBe('advantage');
  });

  it('respecte désavantage explicite sans inspiration', async () => {
    const r = unwrap(await rollWithFlags({
      character: { id: 'c1', inspiration: false, exhaustion: 0 },
      baseMod: 2,
      label: 'Test',
      advantage: 'disadvantage',
    }));
    expect(r.advantage).toBe('disadvantage');
    expect(r.dice).toEqual([{ count: 2, sides: 20, kl: 1 }]);
  });

  it('ne consomme pas l\'inspiration si elle est false', async () => {
    const consume = vi.fn(async () => {});
    await rollWithFlags({
      character: { id: 'c1', inspiration: false, exhaustion: 0 },
      baseMod: 0,
      label: 'Test',
      consumeInspiration: consume,
    });
    expect(consume).not.toHaveBeenCalled();
  });

  it('flag crit sur naturel 20', async () => {
    mockDie(20);
    const r = unwrap(await rollWithFlags({
      character: { id: 'c1', inspiration: false, exhaustion: 0 },
      baseMod: 0,
      label: 'Test',
    }));
    expect(r.crit).toBe(true);
    expect(r.fumble).toBe(false);
    expect(r.keptFaces).toEqual([20]);
  });

  it('flag fumble sur naturel 1', async () => {
    mockDie(1);
    const r = unwrap(await rollWithFlags({
      character: { id: 'c1', inspiration: false, exhaustion: 0 },
      baseMod: 0,
      label: 'Test',
    }));
    expect(r.fumble).toBe(true);
    expect(r.crit).toBe(false);
    expect(r.keptFaces).toEqual([1]);
  });

  it('mode est "digital" par défaut (store user digital)', async () => {
    const r = unwrap(await rollWithFlags({
      character: { id: 'c1', inspiration: false, exhaustion: 0 },
      baseMod: 0,
      label: 'Test',
    }));
    expect(r.mode).toBe('digital');
  });

  it('characterId est propagé dans le RollResult', async () => {
    const r = unwrap(await rollWithFlags({
      character: { id: 'lyralei', inspiration: false, exhaustion: 0 },
      baseMod: 0,
      label: 'Test',
    }));
    expect(r.characterId).toBe('lyralei');
  });
});
