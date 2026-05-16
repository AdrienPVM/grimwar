import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHook } from '@testing-library/react';

import type { RollResult } from '@/shared/lib/dice/types';

import { useDice } from '../use-dice';

/** Narrow pour les tests digitaux (plan 12.5 widening). */
function unwrap(r: RollResult | null): RollResult {
  if (!r) throw new Error('expected RollResult, got null (mode digital par défaut)');
  return r;
}

function mockDie(face: number): void {
  vi.spyOn(crypto, 'getRandomValues').mockImplementation((buf: ArrayBufferView | null) => {
    if (buf instanceof Uint32Array) buf[0] = face - 1;
    return buf as unknown as Uint8Array;
  });
}

beforeEach(() => mockDie(4));
afterEach(() => vi.restoreAllMocks());

describe('useDice — rollDamageWithMode', () => {
  it('clamp le total à 0 minimum', async () => {
    const { result } = renderHook(() => useDice());
    const r = unwrap(
      await result.current.rollDamageWithMode('1d4-10', {
        label: 'test',
        characterId: 'c1',
      }),
    );
    expect(r.total).toBe(0);
  });

  it('double le nombre de dés sur crit (modificateur non doublé)', async () => {
    const { result } = renderHook(() => useDice());
    // 1d8+3 normal avec face mockée=4 → keep 4 + 3 = 7
    const normal = unwrap(
      await result.current.rollDamageWithMode('1d8+3', {
        label: 'épée',
        characterId: 'c1',
      }),
    );
    expect(normal.rawFaces).toHaveLength(1);
    expect(normal.total).toBe(7);

    // crit → 2d8+3 → 4+4+3 = 11 (modificateur NON doublé)
    const crit = unwrap(
      await result.current.rollDamageWithMode('1d8+3', {
        label: 'épée',
        characterId: 'c1',
        crit: true,
      }),
    );
    expect(crit.rawFaces).toHaveLength(2);
    expect(crit.total).toBe(11);
    expect(crit.modifier).toBe(3); // pas doublé
  });
});

describe('useDice — rollAttackDamage', () => {
  it('séquence normale : attaque + dégâts, damage non-null', async () => {
    const { result } = renderHook(() => useDice());
    mockDie(5); // d20=5 (non-crit), d8=5
    const r = await result.current.rollAttackDamage(3, '1d8+3', {
      character: { id: 'c1', inspiration: false, exhaustion: 0 },
      label: 'Épée',
    });
    if (!r.attack) throw new Error('attack non-null attendu en mode digital');
    expect(r.attack.crit).toBe(false);
    expect(r.attack.fumble).toBe(false);
    expect(r.damage).not.toBeNull();
    expect(r.damage!.total).toBe(8); // 1d8=5 + 3
  });

  it('crit naturel : double les dés de dégâts', async () => {
    const { result } = renderHook(() => useDice());
    mockDie(20); // d20 nat 20 → crit; d8 mock=20 → buf[0]=19 → 19 % 8 = 3 → face 4.
    const r = await result.current.rollAttackDamage(3, '1d8+3', {
      character: { id: 'c1', inspiration: false, exhaustion: 0 },
      label: 'Épée',
    });
    if (!r.attack) throw new Error('attack non-null attendu en mode digital');
    expect(r.attack.crit).toBe(true);
    expect(r.damage).not.toBeNull();
    expect(r.damage!.total).toBe(11);
    expect(r.damage!.rawFaces).toHaveLength(2);
  });

  it('fumble : damage est null', async () => {
    const { result } = renderHook(() => useDice());
    mockDie(1); // d20 nat 1 → fumble
    const r = await result.current.rollAttackDamage(3, '1d8+3', {
      character: { id: 'c1', inspiration: false, exhaustion: 0 },
      label: 'Épée',
    });
    if (!r.attack) throw new Error('attack non-null attendu en mode digital');
    expect(r.attack.fumble).toBe(true);
    expect(r.damage).toBeNull();
  });

  it('forceCrit override le jet d\'attaque', async () => {
    const { result } = renderHook(() => useDice());
    mockDie(5); // d20=5 (ni crit ni fumble), d8=5
    const r = await result.current.rollAttackDamage(3, '1d8+3', {
      character: { id: 'c1', inspiration: false, exhaustion: 0 },
      label: 'Épée',
      forceCrit: true,
    });
    if (!r.attack) throw new Error('attack non-null attendu en mode digital');
    expect(r.attack.crit).toBe(false); // le jet d'attaque lui-même n'est pas crit
    expect(r.damage).not.toBeNull();
    expect(r.damage!.rawFaces).toHaveLength(2);
  });
});

describe('useDice — rollD20Plus', () => {
  it('roule un d20 + modifier', async () => {
    const { result } = renderHook(() => useDice());
    mockDie(10);
    const r = unwrap(
      await result.current.rollD20Plus(5, {
        character: { id: 'c1', inspiration: false, exhaustion: 0 },
        label: 'Initiative',
        kind: 'init',
      }),
    );
    expect(r.total).toBe(15);
    expect(r.kind).toBe('init');
    expect(r.dice).toEqual([{ count: 1, sides: 20 }]);
  });
});
