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
 * accidentelle, perte d'accent FR, renommage de slug, troncature du summary)
 * qui ferait diverger le contenu canonique d'un release à l'autre.
 *
 * Règle d'ajout : on n'ajoute une entrée que si on a vérifié humainement
 * contre le SRD (PDF ou texte officiel CC). Une fois figée, le test maintient
 * la vérité. Pas de re-vérification humaine répétée.
 *
 * Historique :
 *   - Plan 13.9 commit 4b : stub 7 entrées (3 sorts Magicien L1 + 4 ordres).
 *   - Plan 13.12 commit 2 : étendu 7 → 21 (couverture 8/8 écoles de sort
 *     L0→L3 + 4 armes SRD + 4 ordres). Ajout de `nameEn` à toutes les
 *     références de sort (+ backfill des 3 sorts d'origine) — défense en
 *     profondeur contre une dérive EN qu'un pin FR-seul ne verrait pas
 *     (cf. bug « Mastery · Écorchure », dérive EN corrigée en 13.9). Nouveau
 *     type `SrdWeaponReference` pour figer dés/type/maîtrise d'arme.
 *
 * Les valeurs FR/EN/niveau/école/classes ci-dessous ont été croisées par Adrien
 * contre le PDF FR officiel SRD 5.2.1 le 2026-05-20 (correspondance d'école
 * Conjuration EN = Invocation FR officielle WotC, classes en correspondance
 * EN/FR officielle). Les 4 armes sont du SRD 5.2.1 standard.
 */

export interface SrdSpellReference {
  readonly bundle: 'spells';
  readonly id: string;
  readonly nameFr: string;
  readonly nameEn: string;
  readonly level: number;
  readonly school: string;
  readonly classes: readonly string[];
}

export interface SrdWeaponReference {
  readonly bundle: 'items';
  readonly id: string;
  readonly nameFr: string;
  readonly nameEn: string;
  /** Dé de dégâts (ex. '1d8'). */
  readonly dice: string;
  /** Type de dégâts canonique (ex. 'slashing'). */
  readonly damageType: string;
  /** Propriété de maîtrise d'arme SRD 5.2.1 (ex. 'sap', 'nick'). */
  readonly masteryProperty: string;
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

export type SrdReferenceEntry =
  | SrdSpellReference
  | SrdWeaponReference
  | SrdClassOrderReference;

/**
 * Sorts figés contre le SRD 5.2.1. Couverture 8/8 écoles, niveaux L0→L3.
 * Les 3 premiers (Magicien L1) datent du stub 13.9 ; les 10 suivants ont été
 * ajoutés en 13.12 commit 2 (vérifiés une fois contre le PDF FR officiel).
 */
export const SRD_SPELL_REFERENCES: readonly SrdSpellReference[] = [
  // — Sorts Magicien L1 d'origine (stub 13.9), backfill nameEn en 13.12 —
  {
    bundle: 'spells',
    id: 'projectile-magique',
    nameFr: 'Projectile magique',
    nameEn: 'Magic Missile',
    level: 1,
    school: 'evocation',
    classes: ['sorcerer', 'wizard'],
  },
  {
    bundle: 'spells',
    id: 'bouclier',
    nameFr: 'Bouclier',
    nameEn: 'Shield',
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
    nameEn: 'Mage Armor',
    level: 1,
    school: 'abjuration',
    classes: ['sorcerer', 'wizard'],
  },

  // — Sorts mineurs (niveau 0) — couvre evocation/conjuration/divination/transmutation —
  {
    bundle: 'spells',
    id: 'flamme-sacree',
    nameFr: 'Flamme sacrée',
    nameEn: 'Sacred Flame',
    level: 0,
    school: 'evocation',
    classes: ['cleric'],
  },
  {
    bundle: 'spells',
    id: 'main-du-mage',
    nameFr: 'Main du mage',
    nameEn: 'Mage Hand',
    level: 0,
    school: 'conjuration',
    classes: ['bard', 'sorcerer', 'warlock', 'wizard'],
  },
  {
    bundle: 'spells',
    id: 'assistance',
    nameFr: 'Assistance',
    nameEn: 'Guidance',
    level: 0,
    school: 'divination',
    classes: ['cleric', 'druid'],
  },
  {
    bundle: 'spells',
    id: 'thaumaturgie',
    nameFr: 'Thaumaturgie',
    nameEn: 'Thaumaturgy',
    level: 0,
    school: 'transmutation',
    classes: ['cleric'],
  },

  // — Sorts de niveau 1 — couvre enchantment + necromancy (8/8 écoles) —
  {
    bundle: 'spells',
    id: 'soins',
    nameFr: 'Soins',
    nameEn: 'Cure Wounds',
    level: 1,
    school: 'abjuration',
    classes: ['bard', 'cleric', 'druid', 'paladin', 'ranger'],
  },
  {
    bundle: 'spells',
    id: 'benediction',
    nameFr: 'Bénédiction',
    nameEn: 'Bless',
    level: 1,
    school: 'enchantment',
    classes: ['cleric', 'paladin'],
  },
  {
    // Double duty : couvre l'école nécromancie ET fige le slug officiel SRD
    // 5.2.1 résolu en 13.10 (D9, ancien slug fantôme tiefling re-pointé).
    // Protection contre une régression de renommage.
    bundle: 'spells',
    id: 'rayon-empoisonne',
    nameFr: 'Rayon empoisonné',
    nameEn: 'Ray of Sickness',
    level: 1,
    school: 'necromancy',
    classes: ['sorcerer', 'wizard'],
  },

  // — Sorts de niveau 2 — conjuration + illusion —
  {
    bundle: 'spells',
    id: 'foulee-brumeuse',
    nameFr: 'Foulée brumeuse',
    nameEn: 'Misty Step',
    level: 2,
    school: 'conjuration',
    classes: ['sorcerer', 'warlock', 'wizard'],
  },
  {
    bundle: 'spells',
    id: 'image-miroir',
    nameFr: 'Image miroir',
    nameEn: 'Mirror Image',
    level: 2,
    school: 'illusion',
    classes: ['bard', 'sorcerer', 'warlock', 'wizard'],
  },

  // — Sort de niveau 3 — evocation iconique —
  {
    bundle: 'spells',
    id: 'boule-de-feu',
    nameFr: 'Boule de feu',
    nameEn: 'Fireball',
    level: 3,
    school: 'evocation',
    classes: ['sorcerer', 'wizard'],
  },
];

/**
 * Armes figées contre le SRD 5.2.1 (`items.json`). Échantillon de 4 armes
 * couvrant 4 des 9 propriétés de maîtrise SRD (sap/nick/slow/cleave) — principe
 * couverture, pas exhaustivité. Ajoutées en 13.12 commit 2.
 */
export const SRD_WEAPON_REFERENCES: readonly SrdWeaponReference[] = [
  {
    bundle: 'items',
    id: 'longsword',
    nameFr: 'Épée longue',
    nameEn: 'Longsword',
    dice: '1d8',
    damageType: 'slashing',
    masteryProperty: 'sap',
  },
  {
    bundle: 'items',
    id: 'dagger',
    nameFr: 'Dague',
    nameEn: 'Dagger',
    dice: '1d4',
    damageType: 'piercing',
    masteryProperty: 'nick',
  },
  {
    bundle: 'items',
    id: 'longbow',
    nameFr: 'Arc long',
    nameEn: 'Longbow',
    dice: '1d8',
    damageType: 'piercing',
    masteryProperty: 'slow',
  },
  {
    bundle: 'items',
    id: 'greataxe',
    nameFr: 'Hache à deux mains',
    nameEn: 'Greataxe',
    dice: '1d12',
    damageType: 'slashing',
    masteryProperty: 'cleave',
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
