import type { HelpDifficulty } from './help-panel';

/**
 * Contenu pédagogique pour le Style de combat du Guerrier (plan 13.9 commit 2).
 *
 * Ids autoritaires de `public/data/feats.json` filtré sur
 * `category === 'fighting-style'` : archery, defense, great-weapon-fighting,
 * two-weapon-fighting. Bundle FR : Archerie / Défense / Armes à deux mains /
 * Combat à deux armes.
 *
 * Vérification SRD 5.2.1 « Two-Weapon Fighting » : le style ajoute le
 * modificateur de caractéristique aux **dégâts** de l'attaque bonus (et non
 * au jet d'attaque) — correction vs brouillon initial.
 */

export interface FightingStyleHelpEntry {
  tagline: string;
  whyChoose: string;
  inGame: readonly string[];
  difficulty: HelpDifficulty;
}

export const FIGHTING_STYLE_HELP: Record<string, FightingStyleHelpEntry> = {
  archery: {
    tagline: 'Archer — précision au-dessus de la mêlée',
    whyChoose:
      'Tu vises plutôt que tu frappes. Arc, arbalète, javelot — toujours à distance.',
    inGame: [
      '+2 aux jets d’attaque à distance avec une arme à distance',
      'Idéal Rôdeur ou Guerrier-archer',
    ],
    difficulty: 'easy',
  },
  defense: {
    tagline: 'Tank — l’armure comme deuxième peau',
    whyChoose:
      'Tu encaisses avant tout. L’armure te rend plus dur à toucher.',
    inGame: [
      '+1 à la Classe d’Armure tant que tu portes une armure',
      'Solide partout — épée et bouclier, arme à deux mains, peu importe',
    ],
    difficulty: 'easy',
  },
  'great-weapon-fighting': {
    tagline: 'Force brute — frapper fort, frapper encore',
    whyChoose:
      'Tu manies une grande épée, une hache à deux mains. Tu n’aimes pas les petits dégâts ratés.',
    inGame: [
      'Relance les 1 et 2 sur les dés de dégâts d’une arme à deux mains',
      'Convertit les jets minables en jets décents',
    ],
    difficulty: 'medium',
  },
  'two-weapon-fighting': {
    tagline: 'Duelliste — deux lames qui s’enchaînent',
    whyChoose:
      'Tu te bats avec une arme dans chaque main. Hache courte et dague, deux cimeterres. Tempo rapide.',
    inGame: [
      'Ajoute ton modificateur de Force ou Dextérité aux dégâts de l’attaque bonus de la seconde arme',
      'Sans ce style, l’attaque bonus n’inflige que le dé de l’arme, sans bonus de caractéristique aux dégâts',
    ],
    difficulty: 'medium',
  },
};
