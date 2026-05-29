/**
 * SRD 5.2.1 — enrichissements L1 pour `public/data/classes.json`.
 *
 * Source (plan 13.7 §0.4) : `docs/AUDIT-SRD-COMPLETUDE.md` § B.2 + C.1 + B.4.
 * Aucune lecture de PDF non-SRD.
 *
 * Trois enrichissements posés par classe :
 *  1. `divineOrders[]` (Cleric uniquement) — 2 entrées Protector / Thaumaturge.
 *  2. `primalOrders[]` (Druid uniquement) — 2 entrées Magician / Warden.
 *  3. `weaponMasteryCount` (Barbarian / Fighter / Paladin / Ranger / Rogue) — nb
 *     de Weapon Mastery reçues à L1. Monk = 0 explicite (audit C.1 ligne « Allocation »).
 */

export interface DivineOrderEntry {
  id: 'protector' | 'thaumaturge';
  name: { fr: string; en: string };
  summary: { fr: string; en: string };
}

export interface PrimalOrderEntry {
  id: 'magician' | 'warden';
  name: { fr: string; en: string };
  summary: { fr: string; en: string };
}

export const CLERIC_DIVINE_ORDERS: DivineOrderEntry[] = [
  {
    id: 'protector',
    name: { fr: 'Protecteur', en: 'Protector' },
    summary: {
      fr: "Clerc de première ligne : maîtrise des armes de guerre + formation à l'armure lourde.",
      en: 'Front-line cleric: martial weapon mastery + heavy armor training.',
    },
  },
  {
    id: 'thaumaturge',
    name: { fr: 'Thaumaturge', en: 'Thaumaturge' },
    summary: {
      fr: "Clerc érudit : 1 sort mineur Clerc supplémentaire + bonus aux tests INT (Arcana ou Religion) égal au modificateur de Sagesse (min +1).",
      en: 'Scholarly cleric: 1 extra Cleric cantrip + bonus to Int (Arcana or Religion) checks equal to Wis modifier (min +1).',
    },
  },
];

export const DRUID_PRIMAL_ORDERS: PrimalOrderEntry[] = [
  {
    id: 'magician',
    name: { fr: 'Mage', en: 'Magician' },
    summary: {
      fr: "Druide-sorcier : 1 sort mineur Druide supplémentaire + bonus aux tests INT (Arcana ou Nature) égal au modificateur de Sagesse (min +1).",
      en: 'Druid-mage: 1 extra Druid cantrip + bonus to Int (Arcana or Nature) checks equal to Wis modifier (min +1).',
    },
  },
  {
    id: 'warden',
    name: { fr: 'Gardien', en: 'Warden' },
    summary: {
      fr: "Druide-gardien : maîtrise des armes de guerre + formation à l'armure intermédiaire.",
      en: 'Druid-warden: martial weapon mastery + medium armor training.',
    },
  },
];

/**
 * Override SRD 2024 — `skillChoices` quand le parser PDF rate le motif
 * (« Choose any 3 skills » pour le Barde notamment, qui produit un `from: []`
 * dans `classes.json` → pool vide → classe incréable).
 *
 * Bug 2 UAT 2026-05-18 — cf. `tests/content-referential-integrity.test.ts`.
 *
 * Les noms EN ici matchent ceux que produirait l'extraction PDF — le runtime
 * `resolveSkillId` normalise vers kebab-case (`athletics`, `animal-handling`,
 * …) via `SKILLS` (cf. `src/shared/lib/rules/skills.ts`).
 *
 * Quand le SRD dit « Choose any N » (Barde), on matérialise les 18 skills.
 */
const SRD_ALL_SKILLS_EN: readonly string[] = [
  'Athletics',
  'Acrobatics',
  'Sleight of Hand',
  'Stealth',
  'Arcana',
  'History',
  'Investigation',
  'Nature',
  'Religion',
  'Animal Handling',
  'Insight',
  'Medicine',
  'Perception',
  'Survival',
  'Deception',
  'Intimidation',
  'Performance',
  'Persuasion',
];

export const SRD_CLASS_SKILL_CHOICES_OVERRIDE: Record<
  string,
  { count: number; from: readonly string[] }
> = {
  // SRD 5.2.1 : « Choose any 3 skills (see "Playing the Game") ».
  bard: { count: 3, from: SRD_ALL_SKILLS_EN },
};

/** Allocation de Weapon Masteries reçues à L1 par classe. */
export const SRD_WEAPON_MASTERY_COUNT_PER_CLASS: Record<string, number> = {
  barbarian: 2,
  bard: 0,
  cleric: 0,
  druid: 0,
  fighter: 3,
  monk: 0, // Explicite : Monk N'A PAS Weapon Mastery en SRD 5.2.1.
  paladin: 2,
  ranger: 2,
  rogue: 2,
  sorcerer: 0,
  warlock: 0,
  wizard: 0,
};

/**
 * Politique d'éligibilité Weapon Mastery par classe (JALON 2A.5).
 *
 * Pourquoi : avant 2A.5, ce mapping vivait en `switch (classId)` dans
 * `src/shared/lib/rules/weapon-mastery.ts`. On le déplace en data pour que
 * le moteur de wizard reste agnostique de la liste fermée des classes SRD
 * (le custom content campagne pourra déclarer ses propres classes avec
 * leur eligibility — JALON 3).
 *
 * Sémantique :
 *   - `'all-proficient'` : armes simples ET martiales (Barb/Fighter/Pala/Rgr).
 *   - `'rogue-finesse-light'` : armes simples + martiales Finesse OU Light.
 *   - `null` : pas de Weapon Mastery à L1 → champ omis dans le bundle final.
 *
 * Le couple count/eligibility est validé par le `superRefine` de
 * `ClassSchema` (cf. `src/shared/types/content.ts`) : count > 0 ⇔
 * eligibility présente.
 */
export const SRD_WEAPON_MASTERY_ELIGIBILITY_PER_CLASS: Record<
  string,
  'all-proficient' | 'rogue-finesse-light' | null
> = {
  barbarian: 'all-proficient',
  bard: null,
  cleric: null,
  druid: null,
  fighter: 'all-proficient',
  monk: null,
  paladin: 'all-proficient',
  ranger: 'all-proficient',
  rogue: 'rogue-finesse-light',
  sorcerer: null,
  warlock: null,
  wizard: null,
};

/**
 * Niveaux où chaque classe gagne une Ability Score Improvement (SRD 5.2.1).
 *
 * Tableau ordonné des niveaux ASI génériques par classe — JALON 2B.2a.
 *
 * SRD 5.2.1 (vérifié contre `content-sources/extracted/raw/SRD_CC_v5.2.1.txt`) :
 *  - 10 classes "normales" : ASI à L4/8/12/16 (4 ASIs)
 *  - Fighter : ASI à L4/6/8/12/14/16 (6 ASIs — la classe martial "elite")
 *  - Rogue : ASI à L4/8/10/12/16 (5 ASIs — 1 extra à L10)
 *
 * Tous les ASI suivent la même mécanique L4 (cf. `apply-level-up.ts` en 2B.3).
 *
 * L19 = **Epic Boon** dans la table de classe (pas un ASI générique) — déjà
 * encodé comme feature « Faveur épique » dans `classes.json`, hors de ce
 * tableau.
 *
 * Multi-class L2+ : hors scope 2B.2 — porté par JALON 2D. Les ASI restent
 * comptés par classe (cf. SRD : un Fighter 4 / Rogue 4 a 1 ASI Fighter L4 +
 * 1 ASI Rogue L4, pas 2 ASIs totaux).
 */
export const SRD_ASI_LEVELS_PER_CLASS: Record<string, readonly number[]> = {
  barbarian: [4, 8, 12, 16],
  bard: [4, 8, 12, 16],
  cleric: [4, 8, 12, 16],
  druid: [4, 8, 12, 16],
  fighter: [4, 6, 8, 12, 14, 16],
  monk: [4, 8, 12, 16],
  paladin: [4, 8, 12, 16],
  ranger: [4, 8, 12, 16],
  rogue: [4, 8, 10, 12, 16],
  sorcerer: [4, 8, 12, 16],
  warlock: [4, 8, 12, 16],
  wizard: [4, 8, 12, 16],
};

/** Compteurs de référence pour `tests/srd-counters.test.ts`. */
export const SRD_CLASSES_COUNTS = {
  divineOrders: CLERIC_DIVINE_ORDERS.length, // 2
  primalOrders: DRUID_PRIMAL_ORDERS.length, // 2
  totalWeaponMasteries: Object.values(SRD_WEAPON_MASTERY_COUNT_PER_CLASS).reduce(
    (sum, n) => sum + n,
    0,
  ), // 2+3+2+2+2 = 11
  /** Total des entrées ASI dans `classes.json` après backfill 2B.2a. */
  totalAsiEntries: Object.values(SRD_ASI_LEVELS_PER_CLASS).reduce(
    (sum, levels) => sum + levels.length,
    0,
  ), // 10×4 + 6 + 5 = 51
};
