import type { ReferenceBuild } from './builds';

// FOR primary, CON secondary. Pas de mage, pas d'options magiques.
export const BARBARIAN_BUILD: ReferenceBuild = {
  classId: 'barbarian',
  standardArray: [15, 13, 14, 8, 12, 10], // FOR DEX CON INT SAG CHA
  pointBuy: [15, 13, 15, 8, 12, 8], // 9+5+9+0+4+0 = 27
  preferredSkills: ['athletics', 'intimidation', 'perception', 'survival'],
  equipmentOption: 0,
  preferredCantrips: [],
  preferredLevel1Spells: [],
};
