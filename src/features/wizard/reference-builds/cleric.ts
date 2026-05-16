import type { ReferenceBuild } from './builds';

// SAG primary, CON secondary, FOR pour les armes lourdes.
// Standard FOR13 DEX10 CON14 INT8 SAG15 CHA12.
// Point buy FOR13(5) DEX10(2) CON14(7) INT8(0) SAG15(9) CHA12(4) = 27.
export const CLERIC_BUILD: ReferenceBuild = {
  classId: 'cleric',
  standardArray: [13, 10, 14, 8, 15, 12],
  pointBuy: [13, 10, 14, 8, 15, 12],
  preferredSkills: ['insight', 'religion', 'medicine', 'persuasion'],
  equipmentOption: 0,
  preferredCantrips: ['flamme-sacree', 'lumiere', 'thaumaturgie'],
  preferredLevel1Spells: ['soins', 'mot-de-guerison', 'bouclier-de-la-foi', 'benediction'],
};
