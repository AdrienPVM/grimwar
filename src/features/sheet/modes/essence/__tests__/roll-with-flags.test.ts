import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { rollWithFlags } from '../roll-with-flags';

// On bypasse l'aléa du d20 pour les tests : on ne vérifie pas l'UI ou le naturel,
// juste la math (modifier effectif, advantage, consommation d'inspiration).
let randomSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
});
afterEach(() => {
  randomSpy.mockRestore();
});

describe('rollWithFlags', () => {
  it('applies exhaustion penalty (-2 per level)', async () => {
    const result = await rollWithFlags({
      character: { inspiration: false, exhaustion: 2 },
      baseMod: 5,
      label: 'Test',
    });
    expect(result.effectiveMod).toBe(5 - 4);
    expect(result.effectiveAdvantage).toBe('normal');
    expect(result.inspirationConsumed).toBe(false);
  });

  it('forces advantage when inspiration is true and consumes it', async () => {
    const consume = vi.fn(async () => {});
    const result = await rollWithFlags({
      character: { inspiration: true, exhaustion: 0 },
      baseMod: 3,
      label: 'Test',
      advantage: 'normal',
      consumeInspiration: consume,
    });
    expect(result.effectiveAdvantage).toBe('advantage');
    expect(result.inspirationConsumed).toBe(true);
    expect(consume).toHaveBeenCalledOnce();
  });

  it('inspiration overrides explicit disadvantage', async () => {
    const result = await rollWithFlags({
      character: { inspiration: true, exhaustion: 0 },
      baseMod: 0,
      label: 'Test',
      advantage: 'disadvantage',
    });
    expect(result.effectiveAdvantage).toBe('advantage');
  });

  it('respects explicit disadvantage when no inspiration', async () => {
    const result = await rollWithFlags({
      character: { inspiration: false, exhaustion: 0 },
      baseMod: 2,
      label: 'Test',
      advantage: 'disadvantage',
    });
    expect(result.effectiveAdvantage).toBe('disadvantage');
  });

  it('does not call consumeInspiration when inspiration is false', async () => {
    const consume = vi.fn(async () => {});
    await rollWithFlags({
      character: { inspiration: false, exhaustion: 0 },
      baseMod: 0,
      label: 'Test',
      consumeInspiration: consume,
    });
    expect(consume).not.toHaveBeenCalled();
  });
});
