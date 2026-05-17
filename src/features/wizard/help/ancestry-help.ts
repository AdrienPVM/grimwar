import type { HelpDifficulty } from './help-panel';

/**
 * Contenu pédagogique par ascendance (plan 05 §D.1 + §D.3).
 *
 * Couvre les 9 ascendances de `public/data/ancestries.json` :
 *   dragonborn, dwarf, elf, gnome, goliath, halfling, human, orc, tiefling.
 *
 * Règle de rédaction (cf. CLAUDE.md > i18n) : chaque chaîne visible
 * commence par une majuscule, ponctuation correcte, pas d'anglicisme.
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
      'Incarner un humanoïde imposant avec un souffle élémentaire (feu, froid, foudre…) — un peu de magie naturelle et beaucoup de présence.',
    inGame: [
      'Lâcher un souffle élémentaire dans un cône une fois par repos',
      'Résister à un type de dégâts (celui de ton dragon ancêtre)',
      'Imposer ta présence dans une scène sociale',
    ],
    difficulty: 'easy',
  },
  dwarf: {
    tagline: 'Le forgeron des profondeurs, robuste et tenace',
    whyChoose:
      'Jouer un personnage solide, résistant aux poisons, à l’aise sous la terre, avec une mémoire de chant et de pierre.',
    inGame: [
      'Résister naturellement aux poisons (avantage aux jets)',
      'Voir dans le noir jusqu’à 18 mètres (vision dans le noir)',
      'Reconnaître pièges et ouvrages de pierre par instinct',
    ],
    difficulty: 'easy',
  },
  elf: {
    tagline: 'L’antique gardien des bois, gracieux et perspicace',
    whyChoose:
      'Jouer un personnage à la longévité immense, élégant, attentif à tout ce qui bouge. Les Elfes ont des sous-races (haut, des bois, drow) qui changent ton style.',
    inGame: [
      'Voir dans le noir et avoir un sens aigu de la perception',
      'Résister à l’enchantement et ne jamais être endormi par magie',
      'Transer 4 h au lieu de dormir 8 h (méditation)',
    ],
    difficulty: 'easy',
  },
  gnome: {
    tagline: 'Le petit inventeur, curieux et plein de malice',
    whyChoose:
      'Jouer petit, agile, intelligent. Les Gnomes sont taillés pour les classes intellectuelles : Magicien, Roublard, Barde.',
    inGame: [
      'Voir dans le noir et résister aux sorts qui visent l’esprit',
      'Utiliser ta petite taille pour te faufiler entre les ennemis',
      'Parler aux petits animaux (selon ta sous-race)',
    ],
    difficulty: 'medium',
  },
  goliath: {
    tagline: 'Le géant parmi les mortels, héritier du sang des géants',
    whyChoose:
      'Jouer une carrure imposante, à l’aise en altitude et au froid. Excellent pour Barbare, Guerrier, Paladin — tout ce qui veut être grand et taper fort.',
    inGame: [
      'Porter plus que ta carrure et soulever des objets lourds',
      'Résister au froid et à l’altitude',
      'Frapper un peu plus fort une fois par repos court (Endurance des pierres)',
    ],
    difficulty: 'easy',
  },
  halfling: {
    tagline: 'Le petit aventurier discret au cœur immense',
    whyChoose:
      'Jouer un personnage chanceux (relance des 1 naturels), insouciant et discret. Petit format = plus de places où passer.',
    inGame: [
      'Relancer un 1 naturel sur un d20 (Chanceux)',
      'Te cacher derrière des créatures plus grandes que toi',
      'Résister à la peur (Brave) selon la sous-race',
    ],
    difficulty: 'easy',
  },
  human: {
    tagline: 'L’adaptable, taillé pour toutes les classes',
    whyChoose:
      'Ne pas avoir à choisir un thème particulier : l’Humain gagne des bonus polyvalents, et c’est le meilleur choix par défaut quand on débute.',
    inGame: [
      'Gagner des bonus de caractéristiques répartis comme tu veux',
      'Apprendre une langue supplémentaire',
      'Commencer avec une maîtrise de compétence en plus',
    ],
    difficulty: 'easy',
  },
  orc: {
    tagline: 'Le marcheur infatigable, taillé pour l’endurance et la poussée en avant',
    whyChoose:
      'Incarner un personnage qui ne s’arrête jamais : tu encaisses, tu poursuis, tu débordes. Excellent pour Barbare, Guerrier, ou tout rôle qui veut être devant.',
    inGame: [
      'Survivre à un coup qui devrait te mettre KO (Endurance implacable)',
      'Voir dans le noir et avoir un sens aigu de la perception',
      'Avancer après un meurtre ou un déplacement (Agressif)',
    ],
    difficulty: 'easy',
  },
  tiefling: {
    tagline: 'L’héritier d’un pacte infernal, marqué dans sa chair',
    whyChoose:
      'Jouer un personnage atypique, avec des traits marqués par son héritage (cornes, queue, yeux lumineux) — et un peu de magie infernale. Très narratif, parfait pour un Barde, un Sorcier ou un Magicien.',
    inGame: [
      'Lancer quelques sorts infernaux (thaumaturgie, énergie ardente…)',
      'Résister naturellement aux dégâts de feu',
      'Voir dans le noir et susciter méfiance ou fascination',
    ],
    difficulty: 'medium',
  },
};
