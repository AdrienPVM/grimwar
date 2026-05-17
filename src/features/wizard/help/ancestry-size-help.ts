import type { AncestrySize } from '@/shared/types/character';

import type { AncestryHelpEntry } from './ancestry-help';

/**
 * Pédagogie « taille » (plan 13.8 step 21).
 *
 * Humain et Tieffelin peuvent choisir entre Petite et Moyenne. La
 * différence n'est ni visuelle ni narrative seulement — elle impacte les
 * armes lourdes et la mobilité en combat.
 */
export const ANCESTRY_SIZE_HELP: Record<AncestrySize, AncestryHelpEntry> = {
  medium: {
    tagline: 'Moyenne — taille humaine standard',
    whyChoose:
      'Aucune restriction. Tu manies toutes les armes sans pénalité. Choix par défaut si tu ne sais pas quoi prendre.',
    inGame: [
      'Tu manies épées à deux mains, hallebardes, arcs lourds sans gêne',
      'Tu prends 1,50 m de côté sur la grille de combat',
      'Tu pèses environ 70 kg → monture standard',
    ],
    difficulty: 'easy',
  },
  small: {
    tagline: 'Petite — agile mais restreinte',
    whyChoose:
      'Tu te faufiles entre les jambes d’adversaires plus grands. En contrepartie, les armes lourdes deviennent moins efficaces.',
    inGame: [
      'Tu peux te déplacer dans l’espace d’une créature plus grande sans t’arrêter',
      'Tu attaques avec Désavantage si tu manies une arme à propriété Lourde',
      'Tu prends moins de place et tu peux passer dans des conduits étroits',
    ],
    difficulty: 'medium',
  },
};
