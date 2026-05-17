import type { AncestryHelpEntry } from './ancestry-help';

/**
 * Pédagogie « compétence supplémentaire » (plan 13.8 step 20).
 *
 * Deux variantes : Sens Aiguisés (Elfe, choix parmi 3) et Compétent
 * (Humain, choix parmi 18). Le panneau pose le « pourquoi » de chaque
 * trait pour orienter le débutant.
 */
export const ANCESTRY_EXTRA_SKILL_HELP: Record<'elf' | 'human', AncestryHelpEntry> = {
  elf: {
    tagline: 'Sens Aiguisés — la signature des elfes en exploration',
    whyChoose:
      'Choisis l’une des trois compétences associées à la perception du monde. Tu y gagnes la maîtrise — ton bonus s’y ajoute.',
    inGame: [
      'Perspicacité : lire les motivations des PNJ',
      'Perception : détecter pièges, embuscades, indices visuels',
      'Survie : pister, s’orienter, trouver à manger',
    ],
    difficulty: 'easy',
  },
  human: {
    tagline: 'Compétent — l’atout humain',
    whyChoose:
      'Tu peux choisir n’importe quelle compétence parmi les 18 du SRD. Idéal pour combler un trou laissé par ta classe ou ton historique.',
    inGame: [
      'Maîtrise complète d’une compétence supplémentaire',
      'Combine bien avec un Background qui en accorde 2 — tu finis avec 3 compétences couvertes hors classe',
      'Choisis selon ton concept : Athlétisme pour un brutal, Persuasion pour un orateur, Investigation pour un détective',
    ],
    difficulty: 'easy',
  },
};
