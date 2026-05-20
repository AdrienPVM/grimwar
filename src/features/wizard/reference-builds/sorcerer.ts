import type { ReferenceBuild } from './builds';

// CHA primary, CON secondaire.
// Standard FOR8 DEX13 CON14 INT10 SAG12 CHA15.
// Point buy FOR8(0) DEX14(7) CON13(5) INT10(2) SAG12(4) CHA15(9) = 27.
export const SORCERER_BUILD: ReferenceBuild = {
  classId: 'sorcerer',
  standardArray: [8, 13, 14, 10, 12, 15],
  pointBuy: [8, 14, 13, 10, 12, 15],
  preferredSkills: ['arcana', 'persuasion', 'deception', 'insight'],
  equipmentOption: 0,
  preferredCantrips: ['poigne-electrique', 'rayon-de-givre', 'main-du-mage', 'prestidigitation'],
  preferredLevel1Spells: ['bouclier', 'projectile-magique', 'armure-du-mage', 'mains-brulantes'],
};
