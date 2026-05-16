import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  resolvePhysicalRoll,
  useUiModalsStore,
  type PhysicalRollSpec,
} from '@/shared/lib/slices/ui-modals-slice';
import { useUserSettingsStore } from '@/shared/lib/slices/user-settings-slice';

import { rollWithFlags } from '../roll-with-flags';

/**
 * Tests du pivot mode-aware en mode physique — plan 12.5 step 19.
 *
 * Stratégie : on force le store user en `diceMode: 'physical'`, puis on observe
 * que `rollWithFlags` appelle `requestPhysicalRoll` (la modale `<PhysicalRollModal />`
 * n'est pas montée ici — on résout la promesse manuellement via
 * `resolvePhysicalRoll`).
 *
 * Le flow normal côté UI : modale ouverte → joueur saisit → bouton Valider →
 * `resolvePhysicalRoll({ rawFaces })`. Ici on simule ce parcours avec un
 * helper.
 */

function setPhysicalMode(): void {
  useUserSettingsStore.setState({ diceMode: 'physical', followCampaignDiceMode: true });
}

function resetMode(): void {
  useUserSettingsStore.setState({ diceMode: 'digital', followCampaignDiceMode: true });
}

/**
 * Helper : attend qu'une requête physique soit posée par le pivot, puis la
 * résout avec `resolution`. Utilisé pour piloter les tests sans monter le
 * composant `<PhysicalRollModal />`.
 */
async function answerNextPrompt(
  resolution: { rawFaces: number[] } | null,
): Promise<PhysicalRollSpec> {
  return new Promise((resolveOuter) => {
    const stop = useUiModalsStore.subscribe((state) => {
      if (state.pendingPhysicalRoll) {
        const spec = state.pendingPhysicalRoll.spec;
        stop();
        // Laisse le micro-task ouvrir avant de résoudre.
        queueMicrotask(() => {
          resolvePhysicalRoll(resolution);
          resolveOuter(spec);
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

describe('rollWithFlags — mode physique', () => {
  it('ouvre une prompt physique avec spec 1d20+mod (advantage normal)', async () => {
    const answer = answerNextPrompt({ rawFaces: [13] });
    const rPromise = rollWithFlags({
      character: { id: 'c1', inspiration: false, exhaustion: 0 },
      baseMod: 4,
      label: 'Test FOR',
    });
    const spec = await answer;
    expect(spec.dice).toEqual([{ count: 1, sides: 20 }]);
    expect(spec.modifier).toBe(4);
    expect(spec.advantage).toBe('normal');

    const r = await rPromise;
    expect(r).not.toBeNull();
    expect(r!.mode).toBe('physical');
    expect(r!.rawFaces).toEqual([13]);
    expect(r!.keptFaces).toEqual([13]);
    expect(r!.total).toBe(17);
    expect(r!.crit).toBe(false);
    expect(r!.fumble).toBe(false);
  });

  it('détecte le crit sur face 20', async () => {
    const answer = answerNextPrompt({ rawFaces: [20] });
    const rPromise = rollWithFlags({
      character: { id: 'c1', inspiration: false, exhaustion: 0 },
      baseMod: 0,
      label: 'Test',
    });
    await answer;
    const r = await rPromise;
    expect(r!.crit).toBe(true);
    expect(r!.total).toBe(20);
  });

  it('détecte le fumble sur face 1', async () => {
    const answer = answerNextPrompt({ rawFaces: [1] });
    const rPromise = rollWithFlags({
      character: { id: 'c1', inspiration: false, exhaustion: 0 },
      baseMod: 5,
      label: 'Test',
    });
    await answer;
    const r = await rPromise;
    expect(r!.fumble).toBe(true);
    expect(r!.total).toBe(6); // 1 + 5
  });

  it('avantage : 2 saisies, garde la max', async () => {
    const answer = answerNextPrompt({ rawFaces: [9, 15] });
    const rPromise = rollWithFlags({
      character: { id: 'c1', inspiration: false, exhaustion: 0 },
      baseMod: 2,
      label: 'Test',
      advantage: 'advantage',
    });
    const spec = await answer;
    expect(spec.dice).toEqual([{ count: 2, sides: 20, kh: 1 }]);
    expect(spec.advantage).toBe('advantage');

    const r = await rPromise;
    expect(r!.rawFaces).toEqual([9, 15]);
    expect(r!.keptFaces).toEqual([15]);
    expect(r!.total).toBe(17); // 15 + 2
  });

  it('désavantage : 2 saisies, garde la min', async () => {
    const answer = answerNextPrompt({ rawFaces: [9, 15] });
    const rPromise = rollWithFlags({
      character: { id: 'c1', inspiration: false, exhaustion: 0 },
      baseMod: 0,
      label: 'Test',
      advantage: 'disadvantage',
    });
    await answer;
    const r = await rPromise;
    expect(r!.keptFaces).toEqual([9]);
    expect(r!.total).toBe(9);
  });

  it('« Passer » → retourne null, aucune inspiration consommée', async () => {
    const consume = vi.fn(async () => {});
    const answer = answerNextPrompt(null);
    const rPromise = rollWithFlags({
      character: { id: 'c1', inspiration: true, exhaustion: 0 },
      baseMod: 0,
      label: 'Test',
      consumeInspiration: consume,
    });
    await answer;
    const r = await rPromise;
    expect(r).toBeNull();
    expect(consume).not.toHaveBeenCalled();
  });

  it('inspiration consommée seulement après validation', async () => {
    const consume = vi.fn(async () => {});
    const answer = answerNextPrompt({ rawFaces: [10, 18] });
    const rPromise = rollWithFlags({
      character: { id: 'c1', inspiration: true, exhaustion: 0 },
      baseMod: 0,
      label: 'Test',
      consumeInspiration: consume,
    });
    await answer;
    await rPromise;
    expect(consume).toHaveBeenCalledOnce();
  });

  it('exhaustion appliquée au modificateur (−2 par niveau)', async () => {
    const answer = answerNextPrompt({ rawFaces: [10] });
    const rPromise = rollWithFlags({
      character: { id: 'c1', inspiration: false, exhaustion: 3 },
      baseMod: 5,
      label: 'Test',
    });
    const spec = await answer;
    expect(spec.modifier).toBe(-1); // 5 − 6
    const r = await rPromise;
    expect(r!.modifier).toBe(-1);
    expect(r!.total).toBe(9); // 10 − 1
  });
});
