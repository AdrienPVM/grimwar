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
      fr: "Clerc érudit : 1 cantrip Clerc supplémentaire + bonus aux tests INT (Arcana ou Religion) égal au modificateur de Sagesse (min +1).",
      en: 'Scholarly cleric: 1 extra Cleric cantrip + bonus to Int (Arcana or Religion) checks equal to Wis modifier (min +1).',
    },
  },
];

export const DRUID_PRIMAL_ORDERS: PrimalOrderEntry[] = [
  {
    id: 'magician',
    name: { fr: 'Mage', en: 'Magician' },
    summary: {
      fr: "Druide-sorcier : 1 cantrip Druide supplémentaire + bonus aux tests INT (Arcana ou Nature) égal au modificateur de Sagesse (min +1).",
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

/** Compteurs de référence pour `tests/srd-counters.test.ts`. */
export const SRD_CLASSES_COUNTS = {
  divineOrders: CLERIC_DIVINE_ORDERS.length, // 2
  primalOrders: DRUID_PRIMAL_ORDERS.length, // 2
  totalWeaponMasteries: Object.values(SRD_WEAPON_MASTERY_COUNT_PER_CLASS).reduce(
    (sum, n) => sum + n,
    0,
  ), // 2+3+2+2+2 = 11
};
