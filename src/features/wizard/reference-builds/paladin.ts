import type { ReferenceBuild } from './builds';

// FOR primary, CHA secondaire (auras + sorts).
// Standard FOR15 DEX10 CON14 INT8 SAG12 CHA13.
// Point buy FOR15(9) DEX10(2) CON13(5) INT8(0) SAG12(4) CHA14(7) = 27.
export const PALADIN_BUILD: ReferenceBuild = {
  classId: 'paladin',
  standardArray: [15, 10, 14, 8, 12, 13],
  pointBuy: [15, 10, 13, 8, 12, 14],
  preferredSkills: ['persuasion', 'religion', 'athletics', 'intimidation'],
  equipmentOption: 0,
  preferredCantrips: [],
  preferredLevel1Spells: ['benediction', 'bouclier-de-la-foi', 'soins', 'faveur-divine'],
};
