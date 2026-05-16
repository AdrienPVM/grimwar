import type { ReferenceBuild } from './builds';

// FOR primary (build mêlée par défaut), CON secondaire.
// Standard FOR15 DEX13 CON14 INT8 SAG12 CHA10.
// Point buy FOR15(9) DEX13(5) CON14(7) INT8(0) SAG12(4) CHA10(2) = 27.
export const FIGHTER_BUILD: ReferenceBuild = {
  classId: 'fighter',
  standardArray: [15, 13, 14, 8, 12, 10],
  pointBuy: [15, 13, 14, 8, 12, 10],
  preferredSkills: ['athletics', 'perception', 'intimidation', 'survival'],
  equipmentOption: 0,
  preferredCantrips: [],
  preferredLevel1Spells: [],
};
