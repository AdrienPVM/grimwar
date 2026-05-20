import type { ReferenceBuild } from './builds';

// SAG primary, CON secondary, DEX tertiaire.
// Standard FOR8 DEX13 CON14 INT10 SAG15 CHA12.
// Point buy FOR8(0) DEX14(7) CON14(7) INT10(2) SAG15(9) CHA10(2) = 27.
export const DRUID_BUILD: ReferenceBuild = {
  classId: 'druid',
  standardArray: [8, 13, 14, 10, 15, 12],
  pointBuy: [8, 14, 14, 10, 15, 10],
  preferredSkills: ['perception', 'nature', 'survival', 'animal-handling'],
  equipmentOption: 0,
  preferredCantrips: ['druidisme', 'flammes', 'crosse-des-druides'],
  preferredLevel1Spells: ['soins', 'enchevetrement', 'nappe-de-brouillard', 'mot-de-guerison'],
};
