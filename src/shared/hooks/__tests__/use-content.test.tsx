import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CampaignContentProvider } from '../../lib/campaign-content-context';
import * as LoadContentMulti from '../../lib/load-content-multi';
import { useAuthStore } from '../../lib/slices/auth-slice';
import type { Item } from '../../types/content';
import { useContent } from '../use-content';

function fakeItem(id: string, label: string): Item {
  return {
    id,
    name: { fr: label, en: label },
    category: 'gear',
    weight: 0,
    cost: { quantity: 0, unit: 'sp' },
    description: { fr: label, en: label },
    properties: [],
    source: 'srd-5.2.1',
  } as unknown as Item;
}

/**
 * Le hook délègue à `loadContentMulti` avec le campaignId du Context et l'uid
 * lu du store auth. On vérifie le passage des paramètres + la réactivité aux
 * changements d'auth/Provider — symétrique à `useContentResolver`.
 */
describe('useContent', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isAnonymous: false, isReady: false });
    vi.restoreAllMocks();
  });

  it('appelle loadContentMulti avec userId=null et campaignId=null hors Provider et hors auth', async () => {
    const spy = vi
      .spyOn(LoadContentMulti, 'loadContentMulti')
      .mockResolvedValue([fakeItem('sword', 'épée')] as never);

    const { result } = renderHook(() => useContent('items'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(spy).toHaveBeenCalledWith('items', { userId: null, campaignId: null });
    expect(result.current.data).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('propage userId du store auth', async () => {
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
      .spyOn(LoadContentMulti, 'loadContentMulti')
      .mockResolvedValue([] as never);

    const { result } = renderHook(() => useContent('items'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(spy).toHaveBeenCalledWith('items', {
      userId: 'user-9',
      campaignId: null,
    });
  });

  it('propage campaignId du Provider', async () => {
    const spy = vi
      .spyOn(LoadContentMulti, 'loadContentMulti')
      .mockResolvedValue([] as never);

    const { result } = renderHook(() => useContent('items'), {
      wrapper: ({ children }) => (
        <CampaignContentProvider campaignId="camp-x">{children}</CampaignContentProvider>
      ),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(spy).toHaveBeenCalledWith('items', {
      userId: null,
      campaignId: 'camp-x',
    });
  });

  it('reload sur changement de userId', async () => {
    const spy = vi
      .spyOn(LoadContentMulti, 'loadContentMulti')
      .mockResolvedValue([] as never);

    const { result } = renderHook(() => useContent('items'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(spy).toHaveBeenCalledTimes(1);

    await act(async () => {
      useAuthStore.setState({
        user: {
          uid: 'user-new',
          displayName: null,
          email: null,
          emailVerified: false,
          photoURL: null,
          isAnonymous: true,
        },
        isAnonymous: true,
        isReady: true,
      });
    });

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
    expect(spy).toHaveBeenLastCalledWith('items', {
      userId: 'user-new',
      campaignId: null,
    });
  });

  it('propage error si loadContentMulti rejette', async () => {
    vi.spyOn(LoadContentMulti, 'loadContentMulti').mockRejectedValue(
      new Error('boom'),
    );

    const { result } = renderHook(() => useContent('items'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe('boom');
    expect(result.current.data).toEqual([]);
  });
});
