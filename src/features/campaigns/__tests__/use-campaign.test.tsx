import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Campaign, Membership } from '@/shared/types/campaign';

// ─────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────

const authHolder: { user: { uid: string } | null } = { user: { uid: 'uid-1' } };
vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => authHolder,
}));

const getCampaignMock = vi.fn<(cid: string) => Promise<Campaign>>();
const listMembersMock = vi.fn<(cid: string) => Promise<Membership[]>>();
vi.mock('@/shared/lib/services/campaigns', () => {
  class FakeError extends Error {
    readonly kind: string;
    constructor(kind: string, message?: string) {
      super(message ?? kind);
      this.name = 'CampaignServiceError';
      this.kind = kind;
    }
  }
  return {
    getCampaign: (cid: string) => getCampaignMock(cid),
    listCampaignMembers: (cid: string) => listMembersMock(cid),
    CampaignServiceError: FakeError,
  };
});

import { useCampaign } from '../use-campaign';
import { CampaignServiceError as FakeError } from '@/shared/lib/services/campaigns';

// ─────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────

function mkCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'c-1',
    name: 'Test campagne',
    description: '',
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

function mkMember(overrides: Partial<Membership> = {}): Membership {
  return {
    userId: 'uid-2',
    role: 'member',
    characterId: null,
    joinedAt: null,
    schemaVersion: 1,
    ...overrides,
  };
}

beforeEach(() => {
  authHolder.user = { uid: 'uid-1' };
  getCampaignMock.mockReset();
  listMembersMock.mockReset();
});

// ─────────────────────────────────────────────────────────────────────
// Suites
// ─────────────────────────────────────────────────────────────────────

describe('useCampaign', () => {
  it('isLoading=true puis charge campaign + members en parallèle', async () => {
    const camp = mkCampaign({ id: 'c-42' });
    const members = [mkMember({ userId: 'uid-2' }), mkMember({ userId: 'uid-3' })];
    getCampaignMock.mockResolvedValueOnce(camp);
    listMembersMock.mockResolvedValueOnce(members);

    const { result } = renderHook(() => useCampaign('c-42'));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.campaign).toBeNull();
    expect(result.current.members).toEqual([]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.campaign).toEqual(camp);
    expect(result.current.members).toHaveLength(2);
    expect(result.current.error).toBeNull();
    expect(getCampaignMock).toHaveBeenCalledWith('c-42');
    expect(listMembersMock).toHaveBeenCalledWith('c-42');
  });

  it("ne lance aucun fetch quand l'utilisateur n'est pas connecté", () => {
    authHolder.user = null;
    const { result } = renderHook(() => useCampaign('c-42'));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.campaign).toBeNull();
    expect(getCampaignMock).not.toHaveBeenCalled();
  });

  it('ne lance aucun fetch quand campaignId est undefined', () => {
    const { result } = renderHook(() => useCampaign(undefined));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.campaign).toBeNull();
    expect(getCampaignMock).not.toHaveBeenCalled();
  });

  it("expose une CampaignServiceError 'campaign-not-found' dans error", async () => {
    getCampaignMock.mockRejectedValueOnce(
      new FakeError('campaign-not-found', 'gone'),
    );
    listMembersMock.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useCampaign('c-missing'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.name).toBe('CampaignServiceError');
    expect((result.current.error as { kind?: string }).kind).toBe(
      'campaign-not-found',
    );
    expect(result.current.campaign).toBeNull();
    expect(result.current.members).toEqual([]);
  });

  it('propage une Error générique sur permission-denied', async () => {
    getCampaignMock.mockRejectedValueOnce(new Error('permission-denied'));
    listMembersMock.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useCampaign('c-private'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error?.message).toBe('permission-denied');
  });

  it('refresh() relance les deux fetchs', async () => {
    getCampaignMock
      .mockResolvedValueOnce(mkCampaign({ name: 'V1' }))
      .mockResolvedValueOnce(mkCampaign({ name: 'V2' }));
    listMembersMock.mockResolvedValueOnce([]).mockResolvedValueOnce([
      mkMember({ userId: 'uid-2' }),
    ]);

    const { result } = renderHook(() => useCampaign('c-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.campaign?.name).toBe('V1');

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(result.current.campaign?.name).toBe('V2'));
    expect(result.current.members).toHaveLength(1);
    expect(getCampaignMock).toHaveBeenCalledTimes(2);
    expect(listMembersMock).toHaveBeenCalledTimes(2);
  });
});
