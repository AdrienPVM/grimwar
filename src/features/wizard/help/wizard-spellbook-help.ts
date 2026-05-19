import type { HelpDifficulty } from './help-panel';

/**
 * Contenu pédagogique pour le Grimoire du Magicien (plan 13.9 commit 2).
 *
 * Concept unique — explique la distinction SRD 5.2.1 entre **inscrits**
 * (le grimoire, 6 sorts à L1) et **préparés** (jouables aujourd'hui, 4 à L1).
 */

export interface WizardSpellbookHelpEntry {
  title: string;
  tagline: string;
  whyChoose: string;
  inGame: readonly string[];
  difficulty: HelpDifficulty;
}

export const WIZARD_SPELLBOOK_HELP: WizardSpellbookHelpEntry = {
  title: 'Grimoire du Magicien',
  tagline: 'Ton grimoire contient 6 sorts ; chaque matin tu en prépares 4',
  whyChoose:
    'Le Magicien apprend des sorts en les écrivant dans un grimoire. Tous les jours, il choisit lesquels préparer — les autres dorment jusqu’au lendemain.',
  inGame: [
    'Inscris 6 sorts dans ton grimoire à la création — c’est ta bibliothèque',
    'Prépare 4 sorts parmi ces 6 — ce sont ceux que tu peux lancer aujourd’hui',
    'Les 2 sorts non préparés restent inscrits mais inutilisables tant que tu ne les prépares pas',
    'Au level-up, tu pourras inscrire de nouveaux sorts et changer ta préparation',
  ],
  difficulty: 'medium',
};
