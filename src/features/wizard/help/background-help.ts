import type { HelpDifficulty } from './help-panel';

/**
 * Contenu pédagogique par historique (plan 05 §D.1 + §D.3).
 *
 * Couvre les 4 historiques de `public/data/backgrounds.json` :
 *   acolyte, criminal, sage, soldier.
 *
 * Règle de rédaction (cf. CLAUDE.md > i18n) : chaque chaîne visible
 * commence par une majuscule, ponctuation correcte, pas d'anglicisme.
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
      'Avoir une raison de croire à quelque chose de plus grand, un réseau de prêtres et de moines, et de la pratique en parole publique et en théologie.',
    inGame: [
      'Reconnaître un dieu, son symbole, ses rites',
      'Trouver l’hospitalité dans un temple de ta foi',
      'Lancer un petit sortilège du quotidien (selon ton historique)',
    ],
    difficulty: 'easy',
  },
  criminal: {
    tagline: 'Tu as vécu en marge — voleur, espion, contrebandier',
    whyChoose:
      'Avoir des contacts pas très recommandables, savoir crocheter, mentir, te faufiler. Un passé qui parle quand l’aventure t’emmène en ville.',
    inGame: [
      'Connaître un contact criminel local (fournisseur, receleur, indic)',
      'Crocheter une serrure ou désamorcer un piège simple',
      'Gagner ta vie en cas de besoin par des moyens douteux',
    ],
    difficulty: 'easy',
  },
  sage: {
    tagline: 'Tu as étudié, lu, compilé — le savoir est ton arme',
    whyChoose:
      'Avoir une excuse narrative pour tout savoir un peu : histoire, arcanes, biologie, langues oubliées. Idéal pour un Magicien, un Clerc d’étude, un Barde.',
    inGame: [
      'Reconnaître des écritures anciennes, des objets magiques, des symboles',
      'Savoir où trouver un livre ou un sage qui sait',
      'Gagner un avantage social dans les milieux érudits',
    ],
    difficulty: 'easy',
  },
  soldier: {
    tagline: 'Tu as porté l’uniforme — discipline et baroud',
    whyChoose:
      'Avoir un passé militaire, des grades, des hiérarchies, des compagnons d’armes morts ou disparus. Excellent pour Guerrier, Paladin, Barbare.',
    inGame: [
      'Reconnaître des armées, des bannières, des tactiques',
      'Imposer ton autorité auprès de soldats ou de gardes',
      'Gagner ta vie facilement en faisant le mercenaire',
    ],
    difficulty: 'easy',
  },
};
