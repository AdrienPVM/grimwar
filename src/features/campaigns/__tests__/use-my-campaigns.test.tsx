import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Campaign } from '@/shared/types/campaign';

// ─────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────

// useAuth — pivot du test : on contrôle l'uid courant via un holder.
const authHolder: { user: { uid: string } | null } = { user: { uid: 'uid-1' } };
vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => authHolder,
}));

// listMyCampaigns — driver du test : on contrôle la promesse retournée.
const listMock = vi.fn<(uid: string) => Promise<Campaign[]>>();
vi.mock('@/shared/lib/services/campaigns', () => ({
  listMyCampaigns: (uid: string) => listMock(uid),
}));

import { useMyCampaigns } from '../use-my-campaigns';

// ─────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────

function mkCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'c-1',
    name: 'Les Compagnons du Crépuscule',
    description: 'Une longue route…',
    gmIds: ['uid-1'],
    createdBy: 'uid-1',
    inviteCode: 'ABC234',
    settings: {
      language: 'fr',
      diceMode: 'digital',
      variants: {
        featAtLevel1: false,
        flanking: false,
        slowHealing: false,
        grittyRealism: false,
      },
    },
    status: 'active',
    schemaVersion: 1,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  authHolder.user = { uid: 'uid-1' };
  listMock.mockReset();
});

// ─────────────────────────────────────────────────────────────────────
// Suites
// ─────────────────────────────────────────────────────────────────────

describe('useMyCampaigns', () => {
  it('isLoading=true puis charge la liste pour un user connecté', async () => {
    const campaigns = [mkCampaign({ id: 'c-1' }), mkCampaign({ id: 'c-2' })];
    listMock.mockResolvedValueOnce(campaigns);

    const { result } = renderHook(() => useMyCampaigns());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.campaigns).toEqual([]);
    expect(result.current.error).toBeNull();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.campaigns).toHaveLength(2);
    expect(result.current.error).toBeNull();
    expect(listMock).toHaveBeenCalledWith('uid-1');
  });

  it("renvoie une liste vide + isLoading=false quand l'utilisateur n'est pas connecté", () => {
    authHolder.user = null;
    const { result } = renderHook(() => useMyCampaigns());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.campaigns).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(listMock).not.toHaveBeenCalled();
  });

  it("capture l'erreur du service dans le state error", async () => {
    listMock.mockRejectedValueOnce(new Error('permission-denied'));
    const { result } = renderHook(() => useMyCampaigns());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe('permission-denied');
    expect(result.current.campaigns).toEqual([]);
  });

  it("refresh() relance le fetch et met à jour la liste", async () => {
    const v1 = [mkCampaign({ id: 'c-1', name: 'Avant' })];
    const v2 = [
      mkCampaign({ id: 'c-1', name: 'Avant' }),
      mkCampaign({ id: 'c-new', name: 'Tout neuf' }),
    ];
    listMock.mockResolvedValueOnce(v1).mockResolvedValueOnce(v2);

    const { result } = renderHook(() => useMyCampaigns());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.campaigns).toHaveLength(1);

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(result.current.campaigns).toHaveLength(2));
    expect(listMock).toHaveBeenCalledTimes(2);
  });

  it("refresh() après une erreur efface l'erreur si le re-fetch réussit", async () => {
    listMock
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce([mkCampaign({ id: 'c-1' })]);

    const { result } = renderHook(() => useMyCampaigns());
    await waitFor(() => expect(result.current.error).not.toBeNull());

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(result.current.error).toBeNull());
    expect(result.current.campaigns).toHaveLength(1);
  });
});
