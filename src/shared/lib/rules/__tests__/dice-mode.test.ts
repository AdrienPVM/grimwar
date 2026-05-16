import { describe, expect, it } from 'vitest';

import {
  DEFAULT_USER_DICE_SETTINGS,
  effectiveDiceMode,
} from '../dice-mode';

describe('effectiveDiceMode', () => {
  it('retourne le mode utilisateur si pas de campagne active', () => {
    expect(effectiveDiceMode({ diceMode: 'physical', followCampaignDiceMode: true }, null)).toBe(
      'physical',
    );
    expect(effectiveDiceMode({ diceMode: 'digital', followCampaignDiceMode: true }, null)).toBe(
      'digital',
    );
  });

  it('retourne le mode campagne si followCampaignDiceMode = true', () => {
    expect(
      effectiveDiceMode({ diceMode: 'digital', followCampaignDiceMode: true }, { diceMode: 'physical' }),
    ).toBe('physical');
  });

  it('retourne le mode utilisateur si followCampaignDiceMode = false (décroche)', () => {
    expect(
      effectiveDiceMode(
        { diceMode: 'physical', followCampaignDiceMode: false },
        { diceMode: 'digital' },
      ),
    ).toBe('physical');
  });

  it('défaut utilisateur = digital + follow=true', () => {
    expect(DEFAULT_USER_DICE_SETTINGS).toEqual({ diceMode: 'digital', followCampaignDiceMode: true });
    expect(effectiveDiceMode(DEFAULT_USER_DICE_SETTINGS, null)).toBe('digital');
  });
});
