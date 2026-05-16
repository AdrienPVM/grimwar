import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  setDiceMode,
  useUserSettingsStore,
} from '../user-settings-slice';

vi.mock('@/shared/lib/firebase', () => ({
  getDb: () => ({}),
}));

vi.mock('firebase/firestore', async () => {
  return {
    doc: (..._args: unknown[]) => ({ _args }),
    setDoc: vi.fn(async () => undefined),
    onSnapshot: vi.fn(() => () => {}),
  };
});

beforeEach(() => {
  useUserSettingsStore.getState().reset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('user-settings slice', () => {
  it('défaut digital + follow=true non hydraté', () => {
    const state = useUserSettingsStore.getState();
    expect(state.diceMode).toBe('digital');
    expect(state.followCampaignDiceMode).toBe(true);
    expect(state.hydrated).toBe(false);
  });

  it('setDiceMode patch le store en optimistic puis appelle setDoc', async () => {
    const firestore = await import('firebase/firestore');
    const setDocMock = vi.mocked(firestore.setDoc);

    await setDiceMode('uid-1', 'physical');

    expect(useUserSettingsStore.getState().diceMode).toBe('physical');
    expect(setDocMock).toHaveBeenCalledOnce();
    const args = setDocMock.mock.calls[0]!;
    expect(args[1]).toEqual({ settings: { diceMode: 'physical' } });
    expect(args[2]).toEqual({ merge: true });
  });

  it('setFromFirestore applique les defaults sur les champs absents', () => {
    useUserSettingsStore.getState().setFromFirestore({});
    expect(useUserSettingsStore.getState()).toMatchObject({
      diceMode: 'digital',
      followCampaignDiceMode: true,
    });

    useUserSettingsStore.getState().setFromFirestore({ diceMode: 'physical' });
    expect(useUserSettingsStore.getState()).toMatchObject({
      diceMode: 'physical',
      followCampaignDiceMode: true,
    });
  });
});
