/**
 * Mode de dés — résolution effective (plan 12.5).
 *
 * Règle (cf. `docs/DATA-MODEL.md > Dice mode resolution`) :
 *   1. Si pas de campagne active OU `followCampaignDiceMode === false` →
 *      le mode de l'utilisateur l'emporte.
 *   2. Sinon → le mode de la campagne l'emporte.
 *
 * En S1 (avant plan 14 Campaigns), `campaign` est toujours `null` → le mode
 * utilisateur est toujours retenu. Le helper accepte déjà la dimension campagne
 * pour ne pas avoir à retoucher le pivot quand plan 14 livre la sync.
 *
 * Le type `DiceMode` est défini côté `dice/types.ts` (proche du shape de
 * `RollResult`) et re-exporté ici pour la commodité des consommateurs de la
 * règle.
 */
export type { DiceMode } from '@/shared/lib/dice/types';
import type { DiceMode } from '@/shared/lib/dice/types';

export interface DiceModeUserSettings {
  diceMode: DiceMode;
  followCampaignDiceMode: boolean;
}

export interface DiceModeCampaignSettings {
  diceMode: DiceMode;
}

export const DEFAULT_USER_DICE_SETTINGS: DiceModeUserSettings = {
  diceMode: 'digital',
  followCampaignDiceMode: true,
};

export function effectiveDiceMode(
  user: DiceModeUserSettings,
  campaign: DiceModeCampaignSettings | null,
): DiceMode {
  if (!campaign) return user.diceMode;
  if (!user.followCampaignDiceMode) return user.diceMode;
  return campaign.diceMode;
}
