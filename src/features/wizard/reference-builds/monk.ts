import type { ReferenceBuild } from './builds';

// DEX primary, SAG secondaire (CA = 10 + DEX + SAG sans armure).
// Standard FOR12 DEX15 CON14 INT8 SAG13 CHA10.
// Point buy FOR12(4) DEX15(9) CON13(5) INT8(0) SAG14(7) CHA10(2) = 27.
export const MONK_BUILD: ReferenceBuild = {
  classId: 'monk',
  standardArray: [12, 15, 14, 8, 13, 10],
  pointBuy: [12, 15, 13, 8, 14, 10],
  preferredSkills: ['acrobatics', 'stealth', 'insight', 'athletics'],
  equipmentOption: 0,
  preferredCantrips: [],
  preferredLevel1Spells: [],
};
