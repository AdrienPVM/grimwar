import type { ElfLineage } from '@/shared/types/character';

import type { AncestryHelpEntry } from './ancestry-help';

/**
 * Contenu pédagogique par lignage elfique (plan 13.8 step 16).
 *
 * 3 lignages SRD 5.2.1 : Drow / Haut-elfe / Elfe sylvestre. Chacun
 * impose un sort mineur + une signature mécanique de niveau 1 distincte.
 */
export const ELF_LINEAGE_HELP: Record<ElfLineage, AncestryHelpEntry> = {
  drow: {
    tagline: 'Drow — elfe des profondeurs, vif et ombrageux',
    whyChoose:
      'Tu veux un personnage adapté aux ténèbres totales. Vision dans le noir étendue, sorts d’illusion lumineuse.',
    inGame: [
      'Voir dans le noir jusqu’à 36 m (au lieu de 18 m)',
      'Lancer Danses lumineuses (sort mineur — petites lueurs voltigeantes)',
      'Apprendre Lumières féériques au niveau 3, Ténèbres au niveau 5',
    ],
    difficulty: 'medium',
  },
  'high-elf': {
    tagline: 'Haut-elfe — savant des arcanes, polyvalent',
    whyChoose:
      'Tu veux la flexibilité magique. Tu peux changer ton sort mineur à chaque repos long en piochant dans la liste Magicien.',
    inGame: [
      'Lancer Prestidigitation (sort mineur — petits effets utiles)',
      'Échanger ton sort mineur de lignage à chaque repos long',
      'Apprendre Détection de la magie au niveau 3, Pas brumeux au niveau 5',
    ],
    difficulty: 'medium',
  },
  'wood-elf': {
    tagline: 'Elfe sylvestre — gardien des bois, rapide et discret',
    whyChoose:
      'Tu veux la mobilité. Vitesse de 10,50 m (au lieu de 9 m) + lien avec la nature.',
    inGame: [
      'Te déplacer plus vite que les autres en exploration et en combat',
      'Lancer Druidisme (sort mineur — petits prodiges naturels)',
      'Apprendre Foulée allongée au niveau 3, Passage sans trace au niveau 5',
    ],
    difficulty: 'easy',
  },
};
