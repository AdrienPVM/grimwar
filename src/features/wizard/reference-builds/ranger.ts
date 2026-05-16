import type { ReferenceBuild } from './builds';

// DEX primary, SAG secondaire (sorts), CON pour rester debout.
// Standard FOR10 DEX15 CON14 INT8 SAG13 CHA12.
// Point buy FOR8(0) DEX15(9) CON14(7) INT10(2) SAG14(7) CHA10(2) = 27.
export const RANGER_BUILD: ReferenceBuild = {
  classId: 'ranger',
  standardArray: [10, 15, 14, 8, 13, 12],
  pointBuy: [8, 15, 14, 10, 14, 10],
  preferredSkills: ['perception', 'survival', 'stealth', 'nature'],
  equipmentOption: 0,
  preferredCantrips: [],
  preferredLevel1Spells: ['marque-du-chasseur', 'soins', 'grande-foulee'],
};
