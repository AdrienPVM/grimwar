import type { HelpDifficulty } from './help-panel';

/**
 * Contenu pédagogique pour l'Expertise du Roublard (plan 13.9 commit 2).
 *
 * Concept unique — pas de variantes. Le chooser permet de choisir 2
 * compétences déjà maîtrisées et applique 2×PB au modificateur sur ces 2
 * compétences (cf. `skill-proficiencies.ts > expertiseSkills` valeur 2).
 */

export interface ExpertiseHelpEntry {
  title: string;
  tagline: string;
  whyChoose: string;
  inGame: readonly string[];
  difficulty: HelpDifficulty;
}

export const EXPERTISE_HELP: ExpertiseHelpEntry = {
  title: 'Expertise',
  tagline: 'Tu doubles ton bonus de maîtrise sur ces deux compétences',
  whyChoose:
    'Le Roublard choisit deux signatures — Discrétion et Crochetage est le classique. C’est ce qui fait de toi le meilleur, pas juste un bon.',
  inGame: [
    'Sur ces 2 compétences, ton bonus de maîtrise est multiplié par 2',
    'Choisis uniquement parmi tes compétences déjà maîtrisées',
    'Si tu vois la liste vide, retourne d’abord choisir tes compétences à l’étape précédente',
  ],
  difficulty: 'easy',
};
