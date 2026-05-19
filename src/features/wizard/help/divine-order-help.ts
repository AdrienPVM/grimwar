import type { HelpDifficulty } from './help-panel';

/**
 * Contenu pédagogique pour l'Ordre divin du Clerc (plan 13.9 commit 2).
 *
 * Ids autoritaires de `public/data/classes.json > cleric.divineOrders`.
 *
 * Règle de rédaction (CLAUDE.md > i18n) : majuscule en début de phrase,
 * ponctuation correcte, zéro anglicisme. Contenu vérifié contre le PDF
 * SRD 5.2.1 — Thaumaturge : bonus aux tests d'INT (Arcanes ou Religion)
 * égal au modificateur de Sagesse (minimum +1).
 */

export interface DivineOrderHelpEntry {
  tagline: string;
  whyChoose: string;
  inGame: readonly string[];
  difficulty: HelpDifficulty;
}

export const DIVINE_ORDER_HELP: Record<string, DivineOrderHelpEntry> = {
  protector: {
    tagline: 'Clerc martial, armé pour le front',
    whyChoose:
      'Tu veux un prêtre qui frappe — armure lourde, bouclier, marteau. Pas un savant : un soldat.',
    inGame: [
      'Maîtrise des armures lourdes',
      'Maîtrise des armes de guerre',
      'Tu encaisses pour ceux que tu protèges',
    ],
    difficulty: 'easy',
  },
  thaumaturge: {
    tagline: 'Clerc érudit, expert des mystères',
    whyChoose:
      'Tu veux un prêtre savant — tu lances un sort de plus, tes tests de connaissance arcaniques et religieux deviennent excellents.',
    inGame: [
      'Un tour de magie Clerc supplémentaire',
      'Quand tu fais un test d’Intelligence (Arcanes) ou (Religion), tu ajoutes ton modificateur de Sagesse (minimum +1) au résultat',
      'Tu te bats par les sorts plus que par l’épée',
    ],
    difficulty: 'easy',
  },
};
