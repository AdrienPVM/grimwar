import type { GameEvent } from '@/shared/types/event';

/**
 * Contexte de compilation du journal (plan 25.1).
 *
 * Le compilateur et les templates sont PURS : ils ne touchent ni Firestore ni
 * le contenu SRD. Toute résolution d'identité (nom de personnage, libellé de
 * sort / d'objet / d'état) est injectée via ce contexte par l'appelant (l'écran
 * de séance, plan 25.2), qui a accès au roster + au contenu chargé.
 *
 * Chaque resolver renvoie un libellé FR prêt à afficher. Un repli est fourni
 * côté template quand l'identité n'est pas résolvable (`null` / id brut) — le
 * journal ne doit jamais afficher un id machine cru ni planter sur une donnée
 * manquante.
 */
export interface JournalContext {
  /**
   * Nom d'affichage d'un personnage (acteur / cible) à partir de son id. `null`
   * (action MJ sans personnage, ou id introuvable) ⇒ le template applique son
   * repli générique (« Le meneur », « Quelqu'un »…).
   */
  resolveCharacterName: (characterId: string | null) => string | null;
  /** Libellé FR d'un sort à partir de son slug. Repli = slug capitalisé. */
  resolveSpellName: (spellId: string) => string;
  /** Libellé FR d'un objet à partir de sa référence de contenu. Repli = ref capitalisée. */
  resolveItemName: (itemRef: string) => string;
  /** Libellé FR d'un état (condition) à partir de son slug. Repli = slug capitalisé. */
  resolveConditionName: (conditionId: string) => string;
}

/**
 * Signature d'un template d'événement : un événement + le contexte → une ligne
 * de prose FR (sans puce Markdown ni saut de ligne — le compilateur assemble).
 * Renvoie `null` quand l'événement ne produit volontairement aucune ligne (ex.
 * un kind structurel comme `encounter-start`, consommé par le groupage et non
 * rendu en ligne).
 */
export type JournalTemplate = (event: GameEvent, ctx: JournalContext) => string | null;
