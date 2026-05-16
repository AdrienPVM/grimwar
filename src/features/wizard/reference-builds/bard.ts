import type { ReferenceBuild } from './builds';

// CHA primary, DEX secondary. Full caster.
// Point buy 8→0, 9→1, 10→2, 11→3, 12→4, 13→5, 14→7, 15→9.
// FOR8(0) DEX14(7) CON13(5) INT10(2) SAG12(4) CHA15(9) = 27.
export const BARD_BUILD: ReferenceBuild = {
  classId: 'bard',
  standardArray: [8, 14, 13, 10, 12, 15],
  pointBuy: [8, 14, 13, 10, 12, 15],
  preferredSkills: ['persuasion', 'deception', 'performance'],
  equipmentOption: 0,
  preferredCantrips: ['lumieres-dansantes', 'moquerie-cruelle'],
  preferredLevel1Spells: ['mot-de-guerison', 'heroisme', 'charme-personne', 'identification'],
};
