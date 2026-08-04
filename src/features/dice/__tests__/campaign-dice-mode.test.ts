import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useActiveCampaignStore } from '@/shared/lib/slices/active-campaign-slice';
import {
  resolvePhysicalRoll,
  useUiModalsStore,
} from '@/shared/lib/slices/ui-modals-slice';
import { useUserSettingsStore } from '@/shared/lib/slices/user-settings-slice';
import { DEFAULT_CAMPAIGN_SETTINGS, type CampaignSettings } from '@/shared/types/campaign';

import { rollWithFlags } from '../roll-with-flags';

/**
 * M1 — le mode de dés de la TABLE atteint enfin le pivot.
 *
 * Avant ce plumbing, les deux résolveurs passaient `null` en dur à
 * `effectiveDiceMode` : régler la campagne en dés physiques n'avait aucun effet,
 * seul le réglage personnel comptait. Ces tests observent le comportement
 * OBSERVABLE (une prompt physique est-elle ouverte ?), pas l'appel interne.
 */

// Le pivot journalise dès qu'une campagne est active — hors scope ici.
vi.mock('@/shared/lib/event-logger', () => ({
  logRollIfCampaign: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../persist-history', () => ({
  persistRollHistory: vi.fn(),
}));

function seatAtTable(settings: Partial<CampaignSettings>): void {
  const store = useActiveCampaignStore.getState();
  store.setActiveCampaign('camp-1');
  store.setActiveCampaignSettings({ ...DEFAULT_CAMPAIGN_SETTINGS, ...settings });
}

/** Résout la prochaine prompt physique ; `null` si aucune n'est ouverte. */
async function nextPromptOpened(): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 0));
  const pending = useUiModalsStore.getState().pendingPhysicalRoll;
  if (!pending) return false;
  resolvePhysicalRoll({ rawFaces: [11] });
  return true;
}

beforeEach(() => {
  useUserSettingsStore.setState({ diceMode: 'digital', followCampaignDiceMode: true });
  useActiveCampaignStore.getState().clearActiveCampaign();
});
afterEach(() => {
  useUserSettingsStore.setState({ diceMode: 'digital', followCampaignDiceMode: true });
  useActiveCampaignStore.getState().clearActiveCampaign();
  vi.restoreAllMocks();
});

describe('mode de dés — la table décide (M1)', () => {
  it('une table en dés physiques impose la prompt à un joueur réglé en numérique', async () => {
    seatAtTable({ diceMode: 'physical' });
    const rolling = rollWithFlags({
      character: { id: 'c1', inspiration: false, exhaustion: 0 },
      baseMod: 3,
      label: 'Perception',
      silent: true,
    });
    expect(await nextPromptOpened()).toBe(true);
    await rolling;
  });

  it('le joueur qui a décoché « suivre la campagne » garde son mode', async () => {
    useUserSettingsStore.setState({ diceMode: 'digital', followCampaignDiceMode: false });
    seatAtTable({ diceMode: 'physical' });
    const result = await rollWithFlags({
      character: { id: 'c1', inspiration: false, exhaustion: 0 },
      baseMod: 3,
      label: 'Perception',
      silent: true,
    });
    expect(await nextPromptOpened()).toBe(false);
    expect(result).not.toBeNull();
  });

  it('hors campagne, le mode personnel reste seul maître', async () => {
    useUserSettingsStore.setState({ diceMode: 'physical', followCampaignDiceMode: true });
    const rolling = rollWithFlags({
      character: { id: 'c1', inspiration: false, exhaustion: 0 },
      baseMod: 0,
      label: 'Discrétion',
      silent: true,
    });
    expect(await nextPromptOpened()).toBe(true);
    await rolling;
  });

  it('une table en numérique ne prompte pas un joueur réglé en numérique', async () => {
    seatAtTable({ diceMode: 'digital' });
    const result = await rollWithFlags({
      character: { id: 'c1', inspiration: false, exhaustion: 0 },
      baseMod: 1,
      label: 'Athlétisme',
      silent: true,
    });
    expect(await nextPromptOpened()).toBe(false);
    expect(result).not.toBeNull();
  });
});
