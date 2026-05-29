import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { CampaignContentProvider } from '../../lib/campaign-content-context';
import * as ResolveMulti from '../../lib/resolve-content-multi';
import { useAuthStore } from '../../lib/slices/auth-slice';
import type { ContentTypeKey } from '../../types/content';
import { useContentResolver } from '../use-content-resolver';

/**
 * Le hook délègue à `resolveContentMulti` avec le campaignId du Context et
 * l'uid lu du store auth. On vérifie le passage des paramètres + la
 * réactivité aux changements (Provider remount, store auth update).
 */

function fakeItem(id: string, tag: string) {
  return {
    id,
    name: { fr: tag, en: tag },
    type: 'gear',
    weight: 0,
    cost: { quantity: 0, unit: 'sp' },
    description: { fr: tag, en: tag },
    properties: [],
    source: 'srd-5.2.1',
  } as unknown;
}

describe('useContentResolver', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isAnonymous: false, isReady: false });
  });

  it('appelle resolveContentMulti avec campaignId=null + userId=null hors Provider et hors auth', async () => {
    const spy = vi
      .spyOn(ResolveMulti, 'resolveContentMulti')
      .mockResolvedValue({ entity: fakeItem('sword', 'pub') as never, source: 'public' });

    const { result } = renderHook(() => useContentResolver());
    await act(async () => {
      await result.current<ContentTypeKey>('items', 'sword');
    });
    expect(spy).toHaveBeenCalledWith('items', 'sword', {
      campaignId: null,
      userId: null,
    });
    spy.mockRestore();
  });

  it('propage campaignId du Provider', async () => {
    const spy = vi
      .spyOn(ResolveMulti, 'resolveContentMulti')
      .mockResolvedValue(null);

    const { result } = renderHook(() => useContentResolver(), {
      wrapper: ({ children }) => (
        <CampaignContentProvider campaignId="camp-x">{children}</CampaignContentProvider>
      ),
    });
    await act(async () => {
      await result.current('items', 'sword');
    });
    expect(spy).toHaveBeenCalledWith('items', 'sword', {
      campaignId: 'camp-x',
      userId: null,
    });
    spy.mockRestore();
  });

  it("propage userId du store d'auth", async () => {
    useAuthStore.setState({
      user: {
        uid: 'user-9',
        displayName: null,
        email: null,
        emailVerified: false,
        photoURL: null,
        isAnonymous: true,
      },
      isAnonymous: true,
      isReady: true,
    });
    const spy = vi
      .spyOn(ResolveMulti, 'resolveContentMulti')
      .mockResolvedValue(null);

    const { result } = renderHook(() => useContentResolver());
    await act(async () => {
      await result.current('items', 'sword');
    });
    expect(spy).toHaveBeenCalledWith('items', 'sword', {
      campaignId: null,
      userId: 'user-9',
    });
    spy.mockRestore();
  });

  it('combine Provider + auth pour campaignId + userId', async () => {
    useAuthStore.setState({
      user: {
        uid: 'user-9',
        displayName: null,
        email: null,
        emailVerified: false,
        photoURL: null,
        isAnonymous: true,
      },
      isAnonymous: true,
      isReady: true,
    });
    const spy = vi
      .spyOn(ResolveMulti, 'resolveContentMulti')
      .mockResolvedValue(null);
    const { result } = renderHook(() => useContentResolver(), {
      wrapper: ({ children }) => (
        <CampaignContentProvider campaignId="camp-2">{children}</CampaignContentProvider>
      ),
    });
    await act(async () => {
      await result.current('items', 'sword');
    });
    expect(spy).toHaveBeenCalledWith('items', 'sword', {
      campaignId: 'camp-2',
      userId: 'user-9',
    });
    spy.mockRestore();
  });
});
