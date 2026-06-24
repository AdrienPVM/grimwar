import { beforeEach, describe, expect, it } from 'vitest';

import { useActiveCampaignStore } from '../active-campaign-slice';

describe('useActiveCampaignStore', () => {
  beforeEach(() => {
    useActiveCampaignStore.getState().clearActiveCampaign();
  });

  it('démarre vide', () => {
    expect(useActiveCampaignStore.getState().activeCampaignId).toBeNull();
    expect(useActiveCampaignStore.getState().activeSessionId).toBeNull();
    expect(useActiveCampaignStore.getState().activeEncounterId).toBeNull();
  });

  it('setActiveEncounter pose/retire le pointeur de rencontre sans toucher la campagne', () => {
    useActiveCampaignStore.getState().setActiveCampaign('camp-1', 'sess-2');
    useActiveCampaignStore.getState().setActiveEncounter('enc-9');
    expect(useActiveCampaignStore.getState().activeEncounterId).toBe('enc-9');
    expect(useActiveCampaignStore.getState().activeCampaignId).toBe('camp-1');
    expect(useActiveCampaignStore.getState().activeSessionId).toBe('sess-2');
    useActiveCampaignStore.getState().setActiveEncounter(null);
    expect(useActiveCampaignStore.getState().activeEncounterId).toBeNull();
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

  it('clearActiveCampaign remet tout à null (campagne, session, rencontre)', () => {
    useActiveCampaignStore.getState().setActiveCampaign('camp-1', 'sess-2');
    useActiveCampaignStore.getState().setActiveEncounter('enc-9');
    useActiveCampaignStore.getState().clearActiveCampaign();
    expect(useActiveCampaignStore.getState().activeCampaignId).toBeNull();
    expect(useActiveCampaignStore.getState().activeSessionId).toBeNull();
    expect(useActiveCampaignStore.getState().activeEncounterId).toBeNull();
  });
});
