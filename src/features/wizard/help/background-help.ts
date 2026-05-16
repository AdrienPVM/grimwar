import type { HelpDifficulty } from './help-panel';

/**
 * Contenu pédagogique par historique (plan 05 §D.1 + §D.3).
 *
 * Couvre les 4 historiques de `public/data/backgrounds.json` :
 *   acolyte, criminal, sage, soldier.
 *
 * L'historique répond à la question « qu'as-tu fait avant de partir à
 * l'aventure ? ». Il donne des maîtrises de compétences, un sortilège (ou
 * équivalent) et un peu d'équipement de base.
 */

export interface BackgroundHelpEntry {
  tagline: string;
  whyChoose: string;
  inGame: readonly string[];
  difficulty: HelpDifficulty;
}

export const BACKGROUND_HELP: Record<string, BackgroundHelpEntry> = {
  acolyte: {
    tagline: 'Tu as servi un temple, tu connais la foi et ses gens',
    whyChoose:
      'avoir une raison de croire à quelque chose de plus grand, un réseau de prêtres et de moines, et de la pratique en parole publique et en théologie.',
    inGame: [
      'reconnaître un dieu, son symbole, ses rites',
      'trouver l’hospitalité dans un temple de ta foi',
      'lancer un petit sortilège du quotidien (selon ton historique)',
    ],
    difficulty: 'easy',
  },
  criminal: {
    tagline: 'Tu as vécu en marge — voleur, espion, contrebandier',
    whyChoose:
      'avoir des contacts pas très recommandables, savoir crocheter, mentir, te faufiler. Un passé qui parle quand l’aventure t’emmène en ville.',
    inGame: [
      'connaître un contact criminel local (fournisseur, fence, indic)',
      'crocheter une serrure ou désamorcer un piège simple',
      'gagner ta vie en cas de besoin par des moyens douteux',
    ],
    difficulty: 'easy',
  },
  sage: {
    tagline: 'Tu as étudié, lu, compilé — le savoir est ton arme',
    whyChoose:
      'avoir une excuse narrative pour tout savoir un peu : histoire, arcanes, biologie, languages oubliés. Idéal pour un Magicien, un Clerc d’étude, un Barde.',
    inGame: [
      'reconnaître des écritures anciennes, des objets magiques, des symboles',
      'savoir où trouver un livre ou un sage qui sait',
      'gagner un avantage social dans les milieux érudits',
    ],
    difficulty: 'easy',
  },
  soldier: {
    tagline: 'Tu as porté l’uniforme — discipline et baroud',
    whyChoose:
      'avoir un passé militaire, des grades, des hiérarchies, des compagnons d’armes morts ou disparus. Excellent pour Guerrier, Paladin, Barbare.',
    inGame: [
      'reconnaître des armées, des bannières, des tactiques',
      'imposer ton autorité auprès de soldats ou de gardes',
      'gagner ta vie facilement en faisant le mercenaire',
    ],
    difficulty: 'easy',
  },
};
