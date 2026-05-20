import type { GnomeLineage } from '@/shared/types/character';

import type { AncestryHelpEntry } from './ancestry-help';

/**
 * Contenu pédagogique par lignage gnome (plan 13.8 step 17).
 *
 * 2 lignages SRD 5.2.1 : Forêts / Roches. Forêts = nature + illusion ;
 * Roches = mécanique + utilité quotidienne.
 */
export const GNOME_LINEAGE_HELP: Record<GnomeLineage, AncestryHelpEntry> = {
  forest: {
    tagline: 'Gnome des forêts — animaux et illusions vivantes',
    whyChoose:
      'Tu veux un personnage discret qui communique avec les bêtes et improvise des illusions pour tromper.',
    inGame: [
      'Lancer Illusion mineure (sort mineur — son ou image trompeuse)',
      'Parler aux animaux comme un rituel sans dépenser de sort (PB fois par repos long)',
      'Idéal pour un Roublard ou un Magicien malicieux',
    ],
    difficulty: 'easy',
  },
  rock: {
    tagline: 'Gnome des roches — bricoleur et inventeur',
    whyChoose:
      'Tu veux du concret. Mending pour réparer, Prestidigitation pour le quotidien, et la fabrication de petits jouets mécaniques.',
    inGame: [
      'Lancer Réparation (sort mineur — restaure un objet brisé)',
      'Lancer Prestidigitation (sort mineur — petits effets utiles)',
      'Fabriquer un appareil mécanique de taille TP en 10 minutes (jouet, boîte à musique, allume-feu)',
    ],
    difficulty: 'medium',
  },
};
