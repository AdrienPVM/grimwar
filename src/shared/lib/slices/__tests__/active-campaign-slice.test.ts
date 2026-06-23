import { beforeEach, describe, expect, it } from 'vitest';

import { useActiveCampaignStore } from '../active-campaign-slice';

describe('useActiveCampaignStore', () => {
  beforeEach(() => {
    useActiveCampaignStore.getState().clearActiveCampaign();
  });

  it('démarre vide', () => {
    expect(useActiveCampaignStore.getState().activeCampaignId).toBeNull();
    expect(useActiveCampaignStore.getState().activeSessionId).toBeNull();
  });

  it('setActiveCampaign pose la campagne (session null par défaut)', () => {
    useActiveCampaignStore.getState().setActiveCampaign('camp-1');
    expect(useActiveCampaignStore.getState().activeCampaignId).toBe('camp-1');
    expect(useActiveCampaignStore.getState().activeSessionId).toBeNull();
  });

  it('setActiveCampaign accepte une session explicite', () => {
    useActiveCampaignStore.getState().setActiveCampaign('camp-1', 'sess-2');
    expect(useActiveCampaignStore.getState().activeSessionId).toBe('sess-2');
  });

  it('clearActiveCampaign remet tout à null', () => {
    useActiveCampaignStore.getState().setActiveCampaign('camp-1', 'sess-2');
    useActiveCampaignStore.getState().clearActiveCampaign();
    expect(useActiveCampaignStore.getState().activeCampaignId).toBeNull();
    expect(useActiveCampaignStore.getState().activeSessionId).toBeNull();
  });
});
