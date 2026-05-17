import type { AncestryHelpEntry } from './ancestry-help';

/**
 * Pédagogie « caractéristique d'incantation pour les sorts d'ascendance »
 * (plan 13.8 step 19).
 *
 * Une seule caractéristique gouverne TOUS les sorts liés à l'ascendance
 * (cantrip + Thaumaturgie pour Tieffelin, cantrip de lignage pour Elfe et
 * Gnome). On évite le jargon « modificateur d'attaque magique » — on
 * parle de « puissance des sorts ».
 */
export const ANCESTRY_CASTING_ABILITY_HELP: Record<
  'int' | 'sag' | 'cha',
  AncestryHelpEntry
> = {
  int: {
    tagline: 'Intelligence — savoir étudié, théorie magique',
    whyChoose:
      'Tu vois la magie comme une discipline. Tes sorts d’ascendance puisent dans la connaissance accumulée — grimoires, runes, arcanes.',
    inGame: [
      'Cohérent avec un Magicien ou un Roublard érudit',
      'Si tu lances un sort lié à ton ascendance, tu ajoutes ton modificateur d’Intelligence à son DD/jet d’attaque',
    ],
    difficulty: 'medium',
  },
  sag: {
    tagline: 'Sagesse — intuition, perception de l’invisible',
    whyChoose:
      'Tu sens la magie plus que tu ne la comprends. Tes sorts d’ascendance reflètent une connexion instinctive au monde — comme un Clerc ou un Druide.',
    inGame: [
      'Cohérent avec un Clerc, un Druide ou un Rôdeur',
      'Si tu lances un sort lié à ton ascendance, tu ajoutes ton modificateur de Sagesse à son DD/jet d’attaque',
    ],
    difficulty: 'easy',
  },
  cha: {
    tagline: 'Charisme — présence, force de conviction',
    whyChoose:
      'Tu canalises la magie par ton aura, ta volonté, ton verbe. Le choix le plus narratif pour un Tieffelin ou un Barde.',
    inGame: [
      'Cohérent avec un Ensorceleur, un Occultiste, un Paladin ou un Barde',
      'Si tu lances un sort lié à ton ascendance, tu ajoutes ton modificateur de Charisme à son DD/jet d’attaque',
    ],
    difficulty: 'easy',
  },
};
