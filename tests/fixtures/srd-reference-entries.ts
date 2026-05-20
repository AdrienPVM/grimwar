/**
 * Cat. 3 — Fidélité bundle (politique « Vérité du contenu » 2026-05-19,
 * CLAUDE.md > Required at every commit > Vérité du contenu).
 *
 * Liste d'entrées de référence dont les valeurs ont été vérifiées **UNE FOIS**
 * contre le SRD 5.2.1 officiel (Creative Commons), puis figées ici. Le test
 * `srd-reference-entries.test.ts` itère sur cette fixture et vérifie que le
 * bundle `public/data/*.json` contient EXACTEMENT ces valeurs.
 *
 * Objectif : détecter une dérive du bundle (rebuild silencieux, normalisation
 * accidentelle, perte d'accent FR, troncature du summary) qui ferait diverger
 * le contenu canonique d'un release à l'autre.
 *
 * Règle d'ajout : on n'ajoute une entrée que si on a vérifié humainement
 * contre le SRD (PDF ou texte officiel CC). Une fois figée, le test maintient
 * la vérité. Pas de re-vérification humaine répétée.
 *
 * Stub minimal au plan 13.9 commit 4b : 3 sorts Magicien L1 + 2 Divine
 * Orders. Le plan 13.12 (matrice de tests de parcours + vérité contenu)
 * étend cette fixture aux 20 entrées canoniques de l'objectif structuré.
 */

export interface SrdSpellReference {
  readonly bundle: 'spells';
  readonly id: string;
  readonly nameFr: string;
  readonly level: number;
  readonly school: string;
  readonly classes: readonly string[];
}

export interface SrdClassOrderReference {
  readonly bundle: 'classes';
  readonly classId: string;
  readonly group: 'divineOrders' | 'primalOrders';
  readonly id: string;
  readonly nameFr: string;
  /**
   * Premier mot-clé sémantique du summary FR pour vérifier l'identité du
   * contenu sans figer la prose complète (qui peut être éditée par typo-fix
   * sans changer la sémantique). Ex : « Clerc de première ligne » pour
   * Protector.
   */
  readonly summaryFrContains: string;
}

export type SrdReferenceEntry = SrdSpellReference | SrdClassOrderReference;

/**
 * Sorts Magicien L1 figés contre le SRD 5.2.1. Vérifiés humainement
 * 2026-05-19 contre le bundle au commit `da02302` (état stable).
 */
export const SRD_SPELL_REFERENCES: readonly SrdSpellReference[] = [
  {
    bundle: 'spells',
    id: 'projectile-magique',
    nameFr: 'Projectile magique',
    level: 1,
    school: 'evocation',
    classes: ['sorcerer', 'wizard'],
  },
  {
    bundle: 'spells',
    id: 'bouclier',
    nameFr: 'Bouclier',
    level: 1,
    school: 'abjuration',
    classes: ['sorcerer', 'wizard'],
  },
  {
    // Renommé SRD 5.2.1 : `armure-de-mage` → `armure-du-mage`
    // (« Armure de mage » → « Armure du mage »), cf.
    // scripts/maps/spell-renames-2014-to-2024.ts. Mis à jour au plan 13.10
    // commit 3 lors de la régénération du bundle SRD-only bilingue.
    bundle: 'spells',
    id: 'armure-du-mage',
    nameFr: 'Armure du mage',
    level: 1,
    school: 'abjuration',
    classes: ['sorcerer', 'wizard'],
  },
];

/**
 * Divine + Primal Orders figés contre le SRD 5.2.1. Vérifiés humainement
 * 2026-05-19 contre `public/data/classes.json` au commit `da02302`.
 */
export const SRD_CLASS_ORDER_REFERENCES: readonly SrdClassOrderReference[] = [
  {
    bundle: 'classes',
    classId: 'cleric',
    group: 'divineOrders',
    id: 'protector',
    nameFr: 'Protecteur',
    summaryFrContains: 'Clerc de première ligne',
  },
  {
    bundle: 'classes',
    classId: 'cleric',
    group: 'divineOrders',
    id: 'thaumaturge',
    nameFr: 'Thaumaturge',
    summaryFrContains: 'Clerc érudit',
  },
  {
    bundle: 'classes',
    classId: 'druid',
    group: 'primalOrders',
    id: 'magician',
    nameFr: 'Mage',
    summaryFrContains: 'Druide-sorcier',
  },
  {
    bundle: 'classes',
    classId: 'druid',
    group: 'primalOrders',
    id: 'warden',
    nameFr: 'Gardien',
    summaryFrContains: 'Druide-gardien',
  },
];
