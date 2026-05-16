import type { ReferenceBuild } from './builds';

// DEX primary, INT pour Investigation/Arcana, CON pour rester debout.
// Standard FOR8 DEX15 CON14 INT10 SAG13 CHA12.
// Point buy FOR8(0) DEX15(9) CON14(7) INT10(2) SAG13(5) CHA12(4) = 27.
export const ROGUE_BUILD: ReferenceBuild = {
  classId: 'rogue',
  standardArray: [8, 15, 14, 10, 13, 12],
  pointBuy: [8, 15, 14, 10, 13, 12],
  preferredSkills: ['stealth', 'sleight-of-hand', 'perception', 'acrobatics', 'investigation'],
  equipmentOption: 0,
  preferredCantrips: [],
  preferredLevel1Spells: [],
};
