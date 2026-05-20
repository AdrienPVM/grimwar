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
  preferredCantrips: ['decharge-occulte', 'main-du-mage', 'prestidigitation'],
  // `armure-d-agathys` (Armor of Agathys) retiré du SRD 5.2.1 → remplacé par
  // `protection-contre-le-mal-et-le-bien` (Protection from Evil and Good) : la
  // seule ward défensive personnelle dispo en SRD L1 occultiste, qui préserve
  // l'identité défensive/survivability du preset (CHA primary + CON « fragile à
  // protéger »). Conflit de concentration avec `malefice` (Hex) acté comme
  // choix de jeu réaliste, pas comme défaut de build. Substitution plan 13.10
  // commit 3 (régénération bundle SRD).
  preferredLevel1Spells: ['malefice', 'protection-contre-le-mal-et-le-bien', 'represailles-infernales'],
};
