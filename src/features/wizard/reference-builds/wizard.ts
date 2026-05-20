import type { ReferenceBuild } from './builds';

// INT primary, CON secondaire, DEX pour AC sans armure.
// Standard FOR8 DEX14 CON13 INT15 SAG12 CHA10.
// Point buy FOR8(0) DEX14(7) CON14(7) INT15(9) SAG10(2) CHA10(2) = 27.
export const WIZARD_BUILD: ReferenceBuild = {
  classId: 'wizard',
  standardArray: [8, 14, 13, 15, 12, 10],
  pointBuy: [8, 14, 14, 15, 10, 10],
  preferredSkills: ['arcana', 'investigation', 'history', 'insight'],
  equipmentOption: 0,
  preferredCantrips: ['main-du-mage', 'prestidigitation', 'rayon-de-givre'],
  preferredLevel1Spells: [
    'bouclier',
    'projectile-magique',
    'armure-du-mage',
    'detection-de-la-magie',
    'identification',
    'graisse',
  ],
};
