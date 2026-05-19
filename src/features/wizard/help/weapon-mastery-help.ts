import type { WeaponMasteryProperty } from '@/shared/types/content';

/**
 * Contenu pédagogique pour les 8 propriétés de Weapon Mastery (plan 13.9
 * commit 2). Source autoritaire : `scripts/data/srd-weapon-mastery.ts`
 * (bundle effects FR) et PDF SRD 5.2.1.
 *
 * Schéma : tagline (slogan), effect (1 phrase normative alignée bundle),
 * example (mini scène concrète pour aider un débutant à visualiser).
 *
 * Libellés FR utilisés ici (Enchaînement / Écorchure / Coup double /
 * Poussée / Sape / Ralentissement / Renversement / Ouverture) sont la
 * source pour `MASTERY_LABELS_FR` du chooser (cohérence chooser ↔ help).
 */

export interface WeaponMasteryHelpEntry {
  /** Libellé FR de la propriété — affiché en titre du panneau. */
  label: string;
  tagline: string;
  /** Phrase normative (effet SRD aligné bundle). */
  effect: string;
  /** Mini scène concrète. */
  example: string;
}

export const WEAPON_MASTERY_HELP: Record<WeaponMasteryProperty, WeaponMasteryHelpEntry> = {
  cleave: {
    label: 'Enchaînement',
    tagline: 'Enchaîne deux ennemis collés',
    effect:
      'Sur un coup au corps à corps, fais une attaque supplémentaire contre une 2e créature à 1,50 m de la première — sans modificateur de caractéristique, 1×/tour.',
    example:
      'Grande hache : tu touches un orc, l’orc d’à côté prend les dégâts du dé d’arme.',
  },
  graze: {
    label: 'Écorchure',
    tagline: 'Inflige des dégâts même sur un raté',
    effect:
      'Si tu rates ton attaque, tu infliges quand même un nombre de dégâts égal à ton modificateur de caractéristique (du même type que l’arme).',
    example: 'Épée à deux mains : tu rates, tu poses quand même +3 dégâts tranchants.',
  },
  nick: {
    label: 'Coup double',
    tagline: 'Attaque bonus avec une arme légère, gratuite',
    effect:
      'Avec une arme légère en seconde main, ton attaque bonus devient gratuite (incluse dans l’action Attaque, plus une action bonus à part). 1×/tour.',
    example: 'Dague et dague : tu attaques deux fois pour le prix d’une action.',
  },
  push: {
    label: 'Poussée',
    tagline: 'Repousse l’ennemi de 3 mètres',
    effect:
      'Sur un coup, tu peux pousser ton ennemi de 3 mètres en arrière, à condition qu’il soit de taille Large ou moins.',
    example: 'Marteau de guerre : tu envoies l’ogre dans le piège — mais pas le géant.',
  },
  sap: {
    label: 'Sape',
    tagline: 'Désavantage à sa prochaine attaque',
    effect: 'Sur un coup, l’ennemi a un désavantage à son prochain jet d’attaque.',
    example: 'Épée longue : tu poses le malus avant que ton allié encaisse.',
  },
  slow: {
    label: 'Ralentissement',
    tagline: 'Réduit la vitesse de l’ennemi',
    effect:
      'Sur un coup qui inflige des dégâts, la vitesse de l’ennemi tombe de 3 mètres (non cumulable sur la même cible).',
    example: 'Lance lourde : tu coupes les jambes — il avance moins.',
  },
  topple: {
    label: 'Renversement',
    tagline: 'Met l’ennemi au sol',
    effect:
      'Sur un coup, l’ennemi tente un jet de sauvegarde de Constitution (DD 8 + ton modificateur de caractéristique + ton bonus de maîtrise). En cas d’échec, il tombe à terre.',
    example:
      'Hache d’armes : l’ennemi tombe — désavantage sur ses attaques jusqu’à ce qu’il se relève.',
  },
  vex: {
    label: 'Ouverture',
    tagline: 'Avantage à ta prochaine attaque sur la même cible',
    effect:
      'Sur un coup qui inflige des dégâts, ton prochain jet d’attaque contre cette même cible a l’avantage.',
    example: 'Rapière : tu prépares ton ouverture pour le coup décisif suivant.',
  },
};
