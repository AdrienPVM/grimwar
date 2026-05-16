import type { HelpDifficulty } from './help-panel';

/**
 * Contenu pédagogique par ascendance (plan 05 §D.1 + §D.3).
 *
 * Couvre les 9 ascendances de `public/data/ancestries.json` :
 *   dragonborn, dwarf, elf, gnome, goliath, halfling, human, orc, tiefling.
 *
 * Ton : décrit ce que joue cette ascendance (pas ses bonus chiffrés — c'est
 * affiché à part). On parle de ce que tu fais en jeu, pas de tes statistiques.
 */

export interface AncestryHelpEntry {
  tagline: string;
  whyChoose: string;
  inGame: readonly string[];
  difficulty: HelpDifficulty;
}

export const ANCESTRY_HELP: Record<string, AncestryHelpEntry> = {
  dragonborn: {
    tagline: 'Drakéide, descendant des dragons — fier et flamboyant',
    whyChoose:
      'incarner un humanoïde imposant avec un souffle élémentaire (feu, froid, foudre…) — un peu de magie naturelle et beaucoup de présence.',
    inGame: [
      'lâcher un souffle élémentaire dans un cône une fois par repos',
      'résister à un type de dégâts (celui de ton dragon ancêtre)',
      'imposer ta présence dans une scène sociale',
    ],
    difficulty: 'easy',
  },
  dwarf: {
    tagline: 'Le forgeron des profondeurs, robuste et tenace',
    whyChoose:
      'jouer un personnage solide, résistant aux poisons, à l’aise sous la terre, avec une mémoire de chant et de pierre.',
    inGame: [
      'résister naturellement aux poisons (avantage aux jets)',
      'voir dans le noir jusqu’à 18 mètres (vision dans le noir)',
      'reconnaître pièges et ouvrages de pierre par instinct',
    ],
    difficulty: 'easy',
  },
  elf: {
    tagline: 'L’antique gardien des bois, gracieux et perspicace',
    whyChoose:
      'jouer un personnage longéviste, élégant, attentif à tout ce qui bouge. Les Elfes ont des sous-races (Haut, des bois, drow) qui changent ton style.',
    inGame: [
      'voir dans le noir et avoir un sens aigu de la perception',
      'résister à l’enchantement et ne jamais être endormi par magie',
      'transer 4h au lieu de dormir 8h (méditation)',
    ],
    difficulty: 'easy',
  },
  gnome: {
    tagline: 'Le petit inventeur, curieux et plein de malice',
    whyChoose:
      'jouer petit, agile, intelligent. Les Gnomes sont taillés pour les classes intellectuelles : Magicien, Roublard, Barde.',
    inGame: [
      'voir dans le noir et résister aux sorts qui visent l’esprit',
      'utiliser ta petite taille pour te faufiler entre les ennemis',
      'parler aux petits animaux (selon ta sous-race)',
    ],
    difficulty: 'medium',
  },
  goliath: {
    tagline: 'Le géant parmi les mortels, héritier du sang des géants',
    whyChoose:
      'jouer une carrure imposante, à l’aise en altitude et au froid. Excellent pour Barbare, Guerrier, Paladin — tout ce qui veut être grand et taper fort.',
    inGame: [
      'porter plus que ta carrure et soulever des objets lourds',
      'résister au froid et à l’altitude',
      'frapper un peu plus fort une fois par repos court (Endurance des pierres)',
    ],
    difficulty: 'easy',
  },
  halfling: {
    tagline: 'Le petit aventurier discret au cœur immense',
    whyChoose:
      'jouer un personnage chanceux (relance des 1 naturels), insouciant et discret. Petit format = plus de places où passer.',
    inGame: [
      'relancer un 1 naturel sur un d20 (Chanceux)',
      'te cacher derrière des créatures plus grandes que toi',
      'résister à la peur (Brave) selon la sous-race',
    ],
    difficulty: 'easy',
  },
  human: {
    tagline: 'L’adaptable, taillé pour toutes les classes',
    whyChoose:
      'ne pas avoir à choisir un thème particulier : l’Humain gagne des bonus polyvalents, et c’est le meilleur choix par défaut quand on débute.',
    inGame: [
      'gagner des bonus de caractéristiques répartis comme tu veux',
      'apprendre une langue supplémentaire',
      'commencer avec une maîtrise de compétence en plus',
    ],
    difficulty: 'easy',
  },
  orc: {
    tagline: 'Le marcheur infatigable, taillé pour l’endurance et la poussée en avant',
    whyChoose:
      'incarner un personnage qui ne s’arrête jamais : tu encaisses, tu poursuis, tu débordes. Excellent pour Barbare, Guerrier, ou tout rôle qui veut être devant.',
    inGame: [
      'survivre à un coup qui devrait te mettre KO (Endurance implacable)',
      'voir dans le noir et avoir un sens aigu de la perception',
      'avancer après un meurtre ou un déplacement (Agressif)',
    ],
    difficulty: 'easy',
  },
  tiefling: {
    tagline: 'L’héritier d’un pacte infernal, marqué dans sa chair',
    whyChoose:
      'jouer un personnage atypique, avec des traits marqués par son héritage (cornes, queue, yeux lumineux) — et un peu de magie infernale. Très narratif, parfait pour un Barde, un Sorcier ou un Magicien.',
    inGame: [
      'lancer quelques sorts infernaux (thaumaturgie, énergie ardente…)',
      'résister naturellement aux dégâts de feu',
      'voir dans le noir et susciter méfiance ou fascination',
    ],
    difficulty: 'medium',
  },
};
