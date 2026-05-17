import type { DragonAncestry } from '@/shared/types/character';

import type { AncestryHelpEntry } from './ancestry-help';

/**
 * Contenu pédagogique par type de dragon (plan 13.8 step 14).
 *
 * Pour chaque dragon : description courte + exemple narratif évocateur +
 * impact mécanique en 1 phrase claire. Le but est qu'un débutant total
 * comprenne ce qu'il choisit (« dragon rouge → feu ») sans ouvrir le SRD.
 *
 * Pas de jargon : « cône » → « jet en éventail », « DC » → « jet de
 * sauvegarde », etc. Cf. CLAUDE.md > i18n FR.
 */
export const DRAGON_ANCESTRY_HELP: Record<DragonAncestry, AncestryHelpEntry> = {
  black: {
    tagline: 'Dragon noir des marais, corrosif et cruel',
    whyChoose:
      'Tu veux un personnage furtif et venimeux. L’acide ronge ce qu’il touche — armures, peaux, énigmes.',
    inGame: [
      'Souffler un jet d’acide en éventail (jet de sauvegarde de Dextérité)',
      'Encaisser l’acide qui te frappe (résistance)',
      'Évoquer une descendance reptilienne, marécageuse',
    ],
    difficulty: 'easy',
  },
  blue: {
    tagline: 'Dragon bleu du désert, foudroyant et arrogant',
    whyChoose:
      'Tu rêves d’éclairs. Une décharge nette qui terrasse les ennemis groupés.',
    inGame: [
      'Souffler une ligne de foudre (1d10 dégâts L1, monte à L5/L11/L17)',
      'Encaisser les chocs électriques (résistance)',
      'Imposer ton autorité dans les terres arides',
    ],
    difficulty: 'easy',
  },
  brass: {
    tagline: 'Dragon d’airain, bavard et solaire',
    whyChoose:
      'Tu veux un dragon de feu sociable, plus orateur que conquérant. Le souffle reste mortel.',
    inGame: [
      'Souffler le feu (1d10 dégâts L1, comme Rouge ou Or)',
      'Résister aux flammes',
      'Cultiver une lignée diplomate, voire facétieuse',
    ],
    difficulty: 'easy',
  },
  bronze: {
    tagline: 'Dragon de bronze, juste et tempétueux',
    whyChoose:
      'Tu veux la foudre du dragon bleu mais avec une morale claire. Gardien des côtes et des serments.',
    inGame: [
      'Souffler la foudre (1d10 dégâts L1, ligne)',
      'Résister aux décharges électriques',
      'Patrouiller comme protecteur, pas comme prédateur',
    ],
    difficulty: 'easy',
  },
  copper: {
    tagline: 'Dragon de cuivre, malicieux et chicaneur',
    whyChoose:
      'Acide comme le Noir, mais avec l’humour et l’ironie en plus. Tu charmes autant que tu corroses.',
    inGame: [
      'Souffler l’acide (1d10 dégâts L1, ligne)',
      'Résister à l’acide',
      'Inventer des farces, déjouer par l’esprit',
    ],
    difficulty: 'easy',
  },
  gold: {
    tagline: 'Dragon d’or, noble et flamboyant',
    whyChoose:
      'Tu veux le souffle du feu et un port royal. L’incarnation du paladin sans paladin.',
    inGame: [
      'Souffler le feu (1d10 dégâts L1, cône)',
      'Résister aux flammes (utile face aux démons et dragons rouges)',
      'Présider une table, juger un crime, mener une armée',
    ],
    difficulty: 'easy',
  },
  green: {
    tagline: 'Dragon vert des forêts, fourbe et manipulateur',
    whyChoose:
      'Le poison plutôt que la force brute. Tu négocies, tu trahis, tu empoisonnes.',
    inGame: [
      'Souffler le poison (1d10 dégâts L1, cône)',
      'Résister aux poisons et toxines',
      'Tisser un réseau d’alliances trompeuses',
    ],
    difficulty: 'medium',
  },
  red: {
    tagline: 'Dragon rouge, féroce et destructeur — comme Smaug',
    whyChoose:
      'L’archétype dragon. Brûlant, dominateur, à l’aise dans les volcans et les batailles épiques.',
    inGame: [
      'Souffler le feu (1d10 dégâts L1, cône)',
      'Résister aux flammes',
      'Imposer la peur par ta présence — un dragon, ça regarde de haut',
    ],
    difficulty: 'easy',
  },
  silver: {
    tagline: 'Dragon d’argent, chevaleresque et glaçant',
    whyChoose:
      'Tu veux le souffle de froid et l’éthique d’un croisé. Beauté austère, jugement implacable.',
    inGame: [
      'Souffler le froid (1d10 dégâts L1, cône)',
      'Résister au froid (sommets enneigés, donjons gelés)',
      'Défendre les faibles, frapper les corrupteurs',
    ],
    difficulty: 'easy',
  },
  white: {
    tagline: 'Dragon blanc des banquises, primitif et féroce',
    whyChoose:
      'Le plus brutal des dragons chromatiques. Pas de complot — juste la chasse.',
    inGame: [
      'Souffler le froid (1d10 dégâts L1, cône)',
      'Résister au froid mordant',
      'Survivre dans la toundra, traquer dans le blizzard',
    ],
    difficulty: 'easy',
  },
};
