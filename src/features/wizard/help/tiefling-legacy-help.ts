import type { TieflingLegacy } from '@/shared/types/character';

import type { AncestryHelpEntry } from './ancestry-help';

/**
 * Contenu pédagogique par héritage Tieffelin (plan 13.8 step 15).
 *
 * 3 lignées infernales SRD 5.2.1. Chaque entrée explique la teinte
 * narrative (abysses / mondes morts / fournaises), le cantrip L1 et le
 * type de résistance, sans jargon arcanique.
 */
export const TIEFLING_LEGACY_HELP: Record<TieflingLegacy, AncestryHelpEntry> = {
  abyssal: {
    tagline: 'Lignée des Abysses — démons et chaos primordial',
    whyChoose:
      'Tu veux un Tieffelin né d’une descendance démoniaque. Poison, déchaînement, frénésie sauvage.',
    inGame: [
      'Lancer Bouffée empoisonnée (cantrip — nuage toxique)',
      'Résister naturellement au poison',
      'Apprendre Rayon de maladie au niveau 3, Immobilisation de personne au niveau 5',
    ],
    difficulty: 'easy',
  },
  chthonic: {
    tagline: 'Lignée chtonienne — morts-vivants et plans inférieurs',
    whyChoose:
      'Tu veux un personnage marqué par la mort. Énergie nécrotique, drain vital, lien avec les outre-mondes glacés.',
    inGame: [
      'Lancer Contact glacial (cantrip — sape les morts-vivants)',
      'Résister aux dégâts nécrotiques',
      'Apprendre Fausse vie au niveau 3, Rayon d’affaiblissement au niveau 5',
    ],
    difficulty: 'medium',
  },
  infernal: {
    tagline: 'Lignée infernale — Neuf Enfers, le pacte le plus classique',
    whyChoose:
      'Le Tieffelin canonique. Feu, malice diabolique, sorts qui brûlent et qui dominent.',
    inGame: [
      'Lancer Trait de feu (cantrip — projectile incandescent)',
      'Résister aux flammes',
      'Apprendre Châtiment infernal au niveau 3, Ténèbres au niveau 5',
    ],
    difficulty: 'easy',
  },
};
