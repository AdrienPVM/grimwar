import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DiceHistoryRow } from '@/shared/lib/dexie-db';
import { useUserSettingsStore } from '@/shared/lib/slices/user-settings-slice';

/**
 * M49 — « Relancer mon attaque avec les mêmes bonus ».
 *
 * L'historique était en lecture stricte : le tap était un no-op documenté comme
 * différé. Le résultat portait pourtant déjà sa formule et son modificateur
 * effectif — seule la persistance les jetait.
 */

const rows: DiceHistoryRow[] = [
  {
    id: 'r1',
    characterId: 'c1',
    label: 'Épée longue',
    total: 17,
    rolls: [12],
    rawFaces: [12],
    keptFaces: [12],
    mode: 'digital',
    crit: false,
    fumble: false,
    kind: 'attack',
    timestamp: 1_000,
    dice: [{ count: 1, sides: 20 }],
    modifier: 5,
  },
  {
    // Ligne écrite AVANT M49 : pas de formule, donc pas de bouton.
    id: 'r0',
    characterId: 'c1',
    label: 'Vieux jet',
    total: 9,
    rolls: [9],
    rawFaces: [9],
    keptFaces: [9],
    mode: 'digital',
    crit: false,
    fumble: false,
    kind: 'check',
    timestamp: 900,
  },
];

vi.mock('@/features/auth/use-auth', () => ({ useAuth: () => ({ user: { uid: 'u1' } }) }));
vi.mock('@/shared/lib/slices/user-settings-slice', async (importActual) => {
  const actual =
    await importActual<typeof import('@/shared/lib/slices/user-settings-slice')>();
  return { ...actual, setDiceMode: vi.fn() };
});
vi.mock('@/features/dice/persist-history', () => ({
  readRollHistory: vi.fn(async () => rows),
  persistRollHistory: vi.fn(async () => undefined),
}));

const rollExpressionMock = vi.fn((..._args: unknown[]) => Promise.resolve(null));
vi.mock('@/features/dice/use-dice', () => ({
  rollExpression: (...args: unknown[]) => rollExpressionMock(...args),
}));

import { RollHistoryPanel } from '../roll-history-panel';

describe('Historique — relancer un jet', () => {
  beforeEach(() => {
    useUserSettingsStore.setState({ diceMode: 'digital', hydrated: true });
    rollExpressionMock.mockClear();
  });
  afterEach(() => cleanup());

  it('rejoue la formule exacte, modificateur compris', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<RollHistoryPanel open characterId="c1" onClose={onClose} />);

    const button = await screen.findByRole('button', { name: 'Relancer : Épée longue' });
    await user.click(button);

    await waitFor(() => expect(rollExpressionMock).toHaveBeenCalledTimes(1));
    expect(rollExpressionMock).toHaveBeenCalledWith('1d20+5', {
      label: 'Épée longue',
      characterId: 'c1',
      kind: 'attack',
    });
    // Le panneau se referme : un jet rejoué se regarde sur le plateau.
    expect(onClose).toHaveBeenCalled();
  });

  it('n’offre pas « Relancer » sur une ligne sans formule (jet d’avant M49)', async () => {
    render(<RollHistoryPanel open characterId="c1" onClose={() => undefined} />);
    await screen.findByText('Vieux jet');
    expect(screen.queryByRole('button', { name: 'Relancer : Vieux jet' })).toBeNull();
  });
});
