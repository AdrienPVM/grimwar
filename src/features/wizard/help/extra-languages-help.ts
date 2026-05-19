/**
 * Contenu pédagogique pour les langues SRD supplémentaires (plan 13.9
 * commit 2). Ids autoritaires de `src/shared/lib/rules/languages.ts`
 * (16 langues, 8 standard + 8 rare).
 *
 * Note : le Commun est connu de tous les personnages SRD et **filtré
 * côté UI du chooser** (`extra-languages-chooser.tsx`). On garde
 * l'entrée ici pour pédagogie — un débutant peut vouloir lire « qui
 * parle Commun ? » sans avoir à la sélectionner.
 */

export interface LanguageHelpEntry {
  /** Phrase courte (10-15 mots) — qui parle cette langue. */
  shortDescription: string;
}

export const LANGUAGE_HELP: Record<string, LanguageHelpEntry> = {
  // Standard
  common: {
    shortDescription:
      'La lingua franca, parlée par presque tout le monde dans le monde civilisé.',
  },
  dwarvish: {
    shortDescription:
      'Langue des clans nains, des forges, des runes gravées dans la pierre.',
  },
  elvish: {
    shortDescription: 'Langue des elfes des bois, des hauts elfes, des drows.',
  },
  giant: { shortDescription: 'Langue des géants, des ogres, des trolls.' },
  gnomish: {
    shortDescription: 'Langue des gnomes, technicienne et inventive.',
  },
  goblin: {
    shortDescription: 'Langue des gobelins, gobelours et hobgobelins.',
  },
  halfling: {
    shortDescription: 'Langue des halfelins, familiale et chaleureuse.',
  },
  orc: {
    shortDescription:
      'Langue rugueuse des clans guerriers orcs et de leurs alliés.',
  },
  // Rare
  abyssal: {
    shortDescription: 'Langue des démons et des entités du chaos.',
  },
  celestial: {
    shortDescription: 'Langue des anges et des serviteurs des dieux bons.',
  },
  'deep-speech': {
    shortDescription:
      'Langue des aberrations et des horreurs de l’Outreterre.',
  },
  draconic: {
    shortDescription: 'Langue des dragons et de leurs serviteurs kobolds.',
  },
  infernal: {
    shortDescription:
      'Langue des diables et des pactisants des Neuf Enfers.',
  },
  primordial: {
    shortDescription: 'Langue des élémentaires — air, eau, terre, feu.',
  },
  sylvan: {
    shortDescription:
      'Langue des esprits des bois, satyres, dryades, fées.',
  },
  undercommon: {
    shortDescription:
      'Langue commerciale de l’Outreterre, parlée par les drow et les habitants des profondeurs.',
  },
};
