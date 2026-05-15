/**
 * Liste typée des icônes du sprite — voir `<IconSprite />` pour le markup JSX
 * correspondant. Garder synchro avec le prototype : si on ajoute un symbole
 * dans `icon-sprite.tsx`, l'ajouter ici.
 */
export const iconNames = [
  // Caractéristiques
  'i-for',
  'i-dex',
  'i-con',
  'i-int',
  'i-sag',
  'i-cha',
  // Vitalité / combat
  'i-init',
  'i-ac',
  'i-speed',
  'i-spell',
  // Armes
  'i-sword',
  'i-bow',
  'i-dagger',
  'i-staff',
  // Magie
  'i-flame',
  'i-magic',
  // Divers
  'i-eye',
  'i-book',
  'i-shield',
  'i-potion',
  'i-bag',
  'i-search',
  'i-dice',
  'i-heart',
  'i-plus',
  'i-feather',
  'i-skull',
] as const;

export type IconName = (typeof iconNames)[number];
