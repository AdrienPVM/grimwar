import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';

/**
 * M43 — la visibilité d'un événement se décide À L'ÉMISSION.
 *
 * Elle était codée en dur dans tous les loggers (`'all'` partout sauf le jet
 * secret MJ). La valeur `'self'` était déclarée au schéma, gérée en lecture,
 * filtrée par les rules déjà déployées — et jamais écrite par personne.
 */

const logRollMock = vi.fn((..._args: unknown[]) => Promise.resolve());
vi.mock('@/shared/lib/event-logger', () => ({
  logRollIfCampaign: (...args: unknown[]) => logRollMock(...args),
}));

vi.mock('@/shared/lib/slices/dice-tray-slice', () => ({
  presentRollOnTray: vi.fn(),
}));
vi.mock('@/shared/lib/slices/toast-slice', () => ({ showToast: vi.fn() }));
vi.mock('../persist-history', () => ({
  persistRollHistory: vi.fn(),
  readRollHistory: vi.fn(async () => []),
}));

import { rollWithFlags } from '../roll-with-flags';

const CHARACTER = {
  id: 'c1',
  inspiration: false,
  exhaustion: 0,
} as unknown as Character;

beforeEach(() => {
  logRollMock.mockClear();
});

describe('Jet discret', () => {
  it('journalise en visibilité « self » quand le jet est discret', async () => {
    await rollWithFlags({
      character: CHARACTER,
      baseMod: 3,
      label: 'Discrétion',
      discreet: true,
    });
    expect(logRollMock).toHaveBeenCalledTimes(1);
    expect(logRollMock.mock.calls[0]?.[1]).toBe('self');
  });

  it('reste en « all » par défaut — aucun appelant existant ne change', async () => {
    await rollWithFlags({
      character: CHARACTER,
      baseMod: 3,
      label: 'Discrétion',
    });
    expect(logRollMock.mock.calls[0]?.[1]).toBe('all');
  });
});
