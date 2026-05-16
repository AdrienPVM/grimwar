import type { ReferenceBuild } from './builds';

// CHA primary, CON pour rester debout (peu d'emplacements, fragile).
// Standard FOR8 DEX14 CON13 INT10 SAG12 CHA15.
// Point buy FOR8(0) DEX14(7) CON14(7) INT8(0) SAG12(4) CHA15(9) = 27.
export const WARLOCK_BUILD: ReferenceBuild = {
  classId: 'warlock',
  standardArray: [8, 14, 13, 10, 12, 15],
  pointBuy: [8, 14, 14, 8, 12, 15],
  preferredSkills: ['arcana', 'deception', 'persuasion', 'investigation'],
  equipmentOption: 0,
  preferredCantrips: ['decharge-occulte', 'main-de-mage', 'prestidigitation'],
  preferredLevel1Spells: ['malefice', 'armure-d-agathys', 'represailles-infernales'],
};
