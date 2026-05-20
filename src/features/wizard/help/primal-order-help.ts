import type { HelpDifficulty } from './help-panel';

/**
 * Contenu pédagogique pour l'Ordre primordial du Druide (plan 13.9 commit 2).
 *
 * Ids autoritaires de `public/data/classes.json > druid.primalOrders`. Le
 * bundle FR utilise « Mage » (à ne pas confondre avec la classe Magicien) —
 * id technique reste `magician`.
 *
 * Vérification SRD 5.2.1 : Mage = +1 cantrip Druide + bonus aux tests d'INT
 * (Arcanes ou Nature) égal au modificateur de Sagesse (min +1).
 */

export interface PrimalOrderHelpEntry {
  tagline: string;
  whyChoose: string;
  inGame: readonly string[];
  difficulty: HelpDifficulty;
}

export const PRIMAL_ORDER_HELP: Record<string, PrimalOrderHelpEntry> = {
  magician: {
    tagline: 'Druide-mage, canal de la magie naturelle',
    whyChoose:
      'Tu veux faire pleuvoir des éclairs, faire pousser des ronces, transformer un caillou en serpent. La magie d’abord.',
    inGame: [
      'Un sort mineur Druide supplémentaire',
      'Quand tu fais un test d’Intelligence (Arcanes) ou (Nature), tu ajoutes ton modificateur de Sagesse (minimum +1) au résultat',
      'Le combat se gagne par les sorts',
    ],
    difficulty: 'easy',
  },
  warden: {
    tagline: 'Druide-protecteur, défenseur physique de la nature',
    whyChoose:
      'Tu veux frapper, encaisser, te transformer en bête robuste. Le bâton avant le grimoire.',
    inGame: [
      'Maîtrise des armures intermédiaires',
      'Maîtrise des armes de guerre',
      'Tu tiens la ligne quand les sortilèges échouent',
    ],
    difficulty: 'easy',
  },
};
