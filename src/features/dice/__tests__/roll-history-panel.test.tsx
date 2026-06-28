import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useUserSettingsStore } from '@/shared/lib/slices/user-settings-slice';

import { RollHistoryPanel } from '../roll-history-panel';

const mockAuth: { user: { uid: string } | null } = { user: { uid: 'u1' } };

vi.mock('@/features/auth/use-auth', () => ({ useAuth: () => mockAuth }));
vi.mock('@/shared/lib/slices/user-settings-slice', async (importActual) => {
  const actual =
    await importActual<typeof import('@/shared/lib/slices/user-settings-slice')>();
  return { ...actual, setDiceMode: vi.fn() };
});
// Évite Dexie en jsdom : l'historique n'est pas le sujet de ce test.
vi.mock('@/features/dice/persist-history', () => ({
  readRollHistory: vi.fn(async () => []),
  persistRollHistory: vi.fn(async () => undefined),
}));

describe('RollHistoryPanel — i18n du panneau d’historique', () => {
  beforeEach(() => {
    useUserSettingsStore.setState({ diceMode: 'digital', hydrated: true });
  });
  afterEach(() => cleanup());

  it('rend le titre via i18n et le toggle en terminologie officielle FR (Numérique / Physique, jamais « Digital »)', () => {
    render(<RollHistoryPanel open characterId={undefined} onClose={() => undefined} />);

    // Titre i18n (la regex du test radial-fab dépend de ce libellé exact).
    expect(
      screen.getByRole('heading', { name: 'Historique des jets' }),
    ).toBeInTheDocument();

    // Le toggle réutilise les chaînes canoniques account.dice.* (source unique) :
    // « Numérique », jamais l'anglicisme « Digital » bloqué par les règles FR.
    expect(screen.getByRole('radio', { name: 'Numérique' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Physique' })).toBeInTheDocument();
    expect(screen.queryByText('Digital')).not.toBeInTheDocument();
  });
});
