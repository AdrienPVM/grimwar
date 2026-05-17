import type { GoliathAncestry } from '@/shared/types/character';

import type { AncestryHelpEntry } from './ancestry-help';

/**
 * Contenu pédagogique par ascendance gigante (plan 13.8 step 18).
 *
 * 6 ascendances SRD 5.2.1. Chaque effet est utilisable un nombre limité
 * de fois par repos long (= bonus de maîtrise). Le panneau explique le
 * type de tactique débloquée : mobilité, dégâts bonus, contrôle, défense.
 */
export const GOLIATH_ANCESTRY_HELP: Record<GoliathAncestry, AncestryHelpEntry> = {
  cloud: {
    tagline: 'Saut des nuées — téléportation tactique',
    whyChoose:
      'Tu veux pouvoir te repositionner instantanément. Idéal pour échapper à un combat dangereux ou attraper un adversaire qui s’enfuit.',
    inGame: [
      'Te téléporter jusqu’à 9 m par une action bonus',
      'Sortir d’une étreinte, franchir un gouffre, surgir dans le dos',
      'Utilisable autant de fois que ton bonus de maîtrise par repos long',
    ],
    difficulty: 'medium',
  },
  fire: {
    tagline: 'Brûlure ignée — dégâts bonus au corps-à-corps',
    whyChoose:
      'Tu veux du dégât pur. Sur un coup réussi, tu ajoutes 1d10 dégâts de feu — substantiel à bas niveau.',
    inGame: [
      'Sur un coup au but : ajouter 1d10 dégâts de feu',
      'Idéal pour Barbare, Guerrier, Paladin',
      'Utilisable autant de fois que ton bonus de maîtrise par repos long',
    ],
    difficulty: 'easy',
  },
  frost: {
    tagline: 'Froid mordant — dégâts + ralentissement',
    whyChoose:
      'Tu veux contrôler la cible. Dégâts bonus + sa vitesse chute de 3 m — précieux pour empêcher la fuite ou le repositionnement.',
    inGame: [
      'Sur un coup au but : ajouter 1d6 dégâts de froid',
      'La cible perd 3 m de vitesse jusqu’à la fin de ton prochain tour',
      'Utilisable autant de fois que ton bonus de maîtrise par repos long',
    ],
    difficulty: 'medium',
  },
  hill: {
    tagline: 'Renversement — mise à terre',
    whyChoose:
      'Tu veux mettre l’ennemi par terre. Une cible Prone attaque en désavantage et se relever consomme la moitié de son mouvement.',
    inGame: [
      'Sur un coup au but contre une cible ≤Large : elle tombe Prone',
      'Idéal pour neutraliser un opposant solide ou créer une opportunité au groupe',
      'Utilisable autant de fois que ton bonus de maîtrise par repos long',
    ],
    difficulty: 'easy',
  },
  stone: {
    tagline: 'Endurance de la pierre — réduction de dégâts',
    whyChoose:
      'Tu veux encaisser. Réaction qui réduit les dégâts subis de 1d12 + ton modificateur de Constitution. Ta peau devient pierre vivante.',
    inGame: [
      'Réaction quand tu subis des dégâts : réduis-les de 1d12 + mod. Constitution',
      'Idéal pour tank, classes en première ligne',
      'Utilisable autant de fois que ton bonus de maîtrise par repos long',
    ],
    difficulty: 'medium',
  },
  storm: {
    tagline: 'Tonnerre — riposte automatique à distance',
    whyChoose:
      'Tu veux punir ceux qui te frappent à distance. Sur réception de dégâts d’une cible ≤18 m, riposte 1d8 dégâts de tonnerre sans action.',
    inGame: [
      'Réaction quand tu subis des dégâts d’une cible à ≤18 m : 1d8 dégâts de tonnerre',
      'Force ennemis à hésiter à te canarder',
      'Utilisable autant de fois que ton bonus de maîtrise par repos long',
    ],
    difficulty: 'medium',
  },
};
