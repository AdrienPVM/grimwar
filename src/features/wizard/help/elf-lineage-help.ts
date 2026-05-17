import type { ElfLineage } from '@/shared/types/character';

import type { AncestryHelpEntry } from './ancestry-help';

/**
 * Contenu pédagogique par lignage elfique (plan 13.8 step 16).
 *
 * 3 lignages SRD 5.2.1 : Drow / Haut-elfe / Elfe sylvestre. Chacun
 * impose un cantrip + une signature mécanique de niveau 1 distincte.
 */
export const ELF_LINEAGE_HELP: Record<ElfLineage, AncestryHelpEntry> = {
  drow: {
    tagline: 'Drow — elfe des profondeurs, vif et ombrageux',
    whyChoose:
      'Tu veux un personnage adapté aux ténèbres totales. Vision dans le noir étendue, sorts d’illusion lumineuse.',
    inGame: [
      'Voir dans le noir jusqu’à 36 m (au lieu de 18 m)',
      'Lancer Danses lumineuses (cantrip — petites lueurs voltigeantes)',
      'Apprendre Lumières féériques au niveau 3, Ténèbres au niveau 5',
    ],
    difficulty: 'medium',
  },
  'high-elf': {
    tagline: 'Haut-elfe — savant des arcanes, polyvalent',
    whyChoose:
      'Tu veux la flexibilité magique. Tu peux changer ton cantrip à chaque repos long en piochant dans la liste Magicien.',
    inGame: [
      'Lancer Prestidigitation (cantrip — petits effets utiles)',
      'Échanger ton cantrip de lignage à chaque repos long',
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
      'Lancer Druidisme (cantrip — petits prodiges naturels)',
      'Apprendre Foulée allongée au niveau 3, Passage sans trace au niveau 5',
    ],
    difficulty: 'easy',
  },
};
