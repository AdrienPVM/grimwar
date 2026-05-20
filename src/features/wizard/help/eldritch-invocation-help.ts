import type { HelpDifficulty } from './help-panel';

/**
 * Contenu pédagogique pour les 5 Invocations occultes éligibles L1
 * (plan 13.9 commit 2).
 *
 * Ids autoritaires de `public/data/invocations.json` filtré sur
 * `prerequisiteWarlockLevel === null` : armor-of-shadows, eldritch-mind,
 * pact-of-the-blade, pact-of-the-chain, pact-of-the-tome.
 *
 * Vérification bundle : `pact-of-the-blade` permet de choisir le type de
 * dégâts entre nécrotiques, psychiques ou radiants (remplace le type
 * d'arme habituel). `pact-of-the-tome` ajoute 3 cantrips + 2 sorts L1
 * **rituels uniquement**.
 */

export interface EldritchInvocationHelpEntry {
  tagline: string;
  whyChoose: string;
  inGame: readonly string[];
  difficulty: HelpDifficulty;
}

export const ELDRITCH_INVOCATION_HELP: Record<string, EldritchInvocationHelpEntry> = {
  'armor-of-shadows': {
    tagline: 'Une armure d’ombre que tu portes en permanence',
    whyChoose:
      'Tu veux te protéger sans cuirasse — le pacte t’enveloppe d’une armure mystique tant que tu le souhaites.',
    inGame: [
      'Tu peux lancer Armure du mage sur toi à volonté, sans emplacement ni composante matérielle',
    ],
    difficulty: 'easy',
  },
  'eldritch-mind': {
    tagline: 'Ton esprit résiste aux assauts magiques',
    whyChoose:
      'Tu maintiens ta concentration sur un sort même quand on te frappe — utile pour tout occultiste qui s’appuie sur des sorts à concentration.',
    inGame: [
      'Avantage aux jets de sauvegarde de Constitution pour maintenir la concentration sur un sort',
    ],
    difficulty: 'easy',
  },
  'pact-of-the-blade': {
    tagline: 'Tu invoques une arme spectrale, Charisme au lieu de Force',
    whyChoose:
      'Tu veux frapper avec l’épée sans avoir investi en Force. Le pacte transforme ton Charisme en puissance martiale.',
    inGame: [
      'En action bonus, tu invoques ton arme de pacte',
      'Tu utilises ton Charisme pour le jet d’attaque et les dégâts (au lieu de Force ou Dextérité)',
      'Tu choisis le type de dégâts de l’arme entre nécrotique, psychique ou radiant (à la place du tranchant, perforant ou contondant habituel)',
    ],
    difficulty: 'medium',
  },
  'pact-of-the-chain': {
    tagline: 'Un familier exotique — démon mineur, pseudodragon, quasit ou sprite',
    whyChoose:
      'Tu veux un compagnon spécial qui t’accompagne, espionne, fait diversion. Au-delà du familier classique du sort Trouver un familier.',
    inGame: [
      'Tu apprends Trouver un familier (utilisable en rituel)',
      'Tu peux invoquer une forme spéciale : démon mineur, pseudodragon, quasit ou sprite',
    ],
    difficulty: 'medium',
  },
  'pact-of-the-tome': {
    tagline: 'Un Codex des Ombres : 3 sorts mineurs et 2 sorts rituels en plus',
    whyChoose:
      'Tu veux étoffer ton arsenal magique avec des sorts piochés dans n’importe quelle liste de classe. Le pacte le plus polyvalent.',
    inGame: [
      '3 sorts mineurs au choix dans n’importe quelle classe',
      '2 sorts de niveau 1 (rituels uniquement) au choix dans n’importe quelle classe',
      'Tous sont écrits dans ton Codex des Ombres',
    ],
    difficulty: 'medium',
  },
};
