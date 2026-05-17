import { z } from 'zod';

/**
 * CharacterSchema — Firestore shape for users/{uid}/characters/{cid}.
 *
 * Aligné avec docs/DATA-MODEL.md. Multi-class supporté dès v1 via classes[].
 * Pour le formulaire manuel S1, on n'autorise qu'une seule entrée dans classes[].
 */

const slug = z
  .string()
  .min(1)
  .regex(/^[a-z0-9-]+$/, 'kebab-case slug only');

export const abilityCodeSchema = z.enum(['for', 'dex', 'con', 'int', 'sag', 'cha']);
export type AbilityCode = z.infer<typeof abilityCodeSchema>;

export const characterStatusSchema = z.enum(['alive', 'dead']);
export type CharacterStatus = z.infer<typeof characterStatusSchema>;

export const hitDieSchema = z.enum(['d6', 'd8', 'd10', 'd12']);
export type HitDie = z.infer<typeof hitDieSchema>;

/**
 * Sous-choix de classe niveau 1 (SRD 5.2.1). Portés par chaque entrée du tableau
 * `classes[]` (décision 13.7 §0.1) — sémantiquement correct en multi-classe.
 *
 * Toutes les valeurs sont `null` / `[]` par défaut (sentinelles). Le wizard
 * 13.8/13.9 refusera de submit si un sous-choix requis pour la classe reste en
 * sentinelle. La fiche tolère les sentinelles sans planter.
 */
export const fightingStyleSchema = z.enum([
  'archery',
  'defense',
  'great-weapon-fighting',
  'two-weapon-fighting',
]);
export type FightingStyle = z.infer<typeof fightingStyleSchema>;

export const divineOrderSchema = z.enum(['protector', 'thaumaturge']);
export type DivineOrder = z.infer<typeof divineOrderSchema>;

export const primalOrderSchema = z.enum(['magician', 'warden']);
export type PrimalOrder = z.infer<typeof primalOrderSchema>;

export const characterClassEntrySchema = z.object({
  classId: slug,
  subclassId: slug.nullable(),
  level: z.number().int().min(1).max(20),
  clericDivineOrder: divineOrderSchema.nullable(),
  druidPrimalOrder: primalOrderSchema.nullable(),
  fighterFightingStyle: fightingStyleSchema.nullable(),
  weaponMasteries: z.array(slug),
  expertiseSkills: z.array(slug),
  eldritchInvocations: z.array(slug),
  wizardSpellbookL1: z.array(slug),
});
export type CharacterClassEntry = z.infer<typeof characterClassEntrySchema>;

/**
 * Sous-choix d'ascendance niveau 1 (SRD 5.2.1). Groupés dans un sous-objet pour
 * lisibilité racine + migration en un bloc (décision 13.7 §0.1).
 *
 * Tous les champs sont nullable. La validation conditionnelle « si Drakéide alors
 * dragonAncestry requis » est portée par `wizard-validation.ts` au plan 13.8, pas
 * par ce schéma — qui reste tolérant pour permettre les fiches v1 migrées et les
 * ascendances sans sous-choix imposé (Nain, Halfling, Orc, etc.).
 */
export const dragonAncestrySchema = z.enum([
  'black',
  'blue',
  'brass',
  'bronze',
  'copper',
  'gold',
  'green',
  'red',
  'silver',
  'white',
]);
export type DragonAncestry = z.infer<typeof dragonAncestrySchema>;

export const tieflingLegacySchema = z.enum(['abyssal', 'chthonic', 'infernal']);
export type TieflingLegacy = z.infer<typeof tieflingLegacySchema>;

export const elfLineageSchema = z.enum(['drow', 'high-elf', 'wood-elf']);
export type ElfLineage = z.infer<typeof elfLineageSchema>;

export const gnomeLineageSchema = z.enum(['forest', 'rock']);
export type GnomeLineage = z.infer<typeof gnomeLineageSchema>;

export const goliathAncestrySchema = z.enum([
  'cloud',
  'fire',
  'frost',
  'hill',
  'stone',
  'storm',
]);
export type GoliathAncestry = z.infer<typeof goliathAncestrySchema>;

export const ancestrySizeSchema = z.enum(['small', 'medium']);
export type AncestrySize = z.infer<typeof ancestrySizeSchema>;

export const ancestrySubChoicesSchema = z.object({
  dragonAncestry: dragonAncestrySchema.nullable(),
  tieflingLegacy: tieflingLegacySchema.nullable(),
  elfLineage: elfLineageSchema.nullable(),
  gnomeLineage: gnomeLineageSchema.nullable(),
  goliathAncestry: goliathAncestrySchema.nullable(),
  ancestryCastingAbility: z.enum(['int', 'sag', 'cha']).nullable(),
  ancestryExtraSkill: slug.nullable(),
  ancestrySize: ancestrySizeSchema.nullable(),
});
export type AncestrySubChoices = z.infer<typeof ancestrySubChoicesSchema>;

/** Sentinelle vide pour un perso fresh sans sous-choix d'ascendance posé. */
export const EMPTY_ANCESTRY_SUB_CHOICES: AncestrySubChoices = {
  dragonAncestry: null,
  tieflingLegacy: null,
  elfLineage: null,
  gnomeLineage: null,
  goliathAncestry: null,
  ancestryCastingAbility: null,
  ancestryExtraSkill: null,
  ancestrySize: null,
};

/**
 * Sentinelles pour les sous-choix de classe — factory qui retourne un objet
 * mutable frais à chaque appel. Évite tout partage d'arrays entre entrées
 * `classes[]` (un push dans `weaponMasteries` de la classe 0 ne doit jamais
 * polluer la classe 1).
 */
export function createEmptyClassSubChoices(): {
  clericDivineOrder: DivineOrder | null;
  druidPrimalOrder: PrimalOrder | null;
  fighterFightingStyle: FightingStyle | null;
  weaponMasteries: string[];
  expertiseSkills: string[];
  eldritchInvocations: string[];
  wizardSpellbookL1: string[];
} {
  return {
    clericDivineOrder: null,
    druidPrimalOrder: null,
    fighterFightingStyle: null,
    weaponMasteries: [],
    expertiseSkills: [],
    eldritchInvocations: [],
    wizardSpellbookL1: [],
  };
}

export const hitDicePoolSchema = z.object({
  classId: slug,
  current: z.number().int().nonnegative(),
  max: z.number().int().positive(),
  die: hitDieSchema,
});
export type HitDicePool = z.infer<typeof hitDicePoolSchema>;

export const abilitiesScoreSchema = z.object({
  for: z.number().int().min(1).max(30),
  dex: z.number().int().min(1).max(30),
  con: z.number().int().min(1).max(30),
  int: z.number().int().min(1).max(30),
  sag: z.number().int().min(1).max(30),
  cha: z.number().int().min(1).max(30),
});
export type AbilitiesScore = z.infer<typeof abilitiesScoreSchema>;

export const savesProfSchema = z.object({
  for: z.boolean(),
  dex: z.boolean(),
  con: z.boolean(),
  int: z.boolean(),
  sag: z.boolean(),
  cha: z.boolean(),
});
export type SavesProf = z.infer<typeof savesProfSchema>;

export const skillProfSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
]);
export type SkillProf = z.infer<typeof skillProfSchema>;

export const inventoryItemSchema = z.object({
  contentId: slug,
  contentScope: z.enum(['public', 'user', 'campaign']),
  contentSource: z.string().optional(),
  qty: z.number().int().positive(),
  equipped: z.boolean(),
  attuned: z.boolean(),
  notes: z.string(),
});
export type InventoryItem = z.infer<typeof inventoryItemSchema>;

export const coinsSchema = z.object({
  cu: z.number().int().nonnegative(),
  ar: z.number().int().nonnegative(),
  el: z.number().int().nonnegative(),
  or: z.number().int().nonnegative(),
  pl: z.number().int().nonnegative(),
});
export type Coins = z.infer<typeof coinsSchema>;

export const portraitSchema = z.object({
  type: z.enum(['letter', 'svg', 'image']),
  value: z.string(),
});

export const CharacterSchema = z.object({
  id: slug,
  name: z.string().min(1).max(60),
  status: characterStatusSchema,

  classes: z.array(characterClassEntrySchema).min(1).max(4),
  totalLevel: z.number().int().min(1).max(20),
  primaryClassId: slug,

  ancestryId: slug,
  ancestrySubChoices: ancestrySubChoicesSchema,
  backgroundId: slug,
  extraLanguages: z.array(slug),

  experience: z.number().int().nonnegative(),
  alignment: z.string().max(8),

  abilities: abilitiesScoreSchema,
  saves: savesProfSchema,
  skills: z.record(z.string(), skillProfSchema),

  hp: z.object({
    current: z.number().int(),
    max: z.number().int().positive(),
    temp: z.number().int().nonnegative(),
  }),
  ac: z.number().int().positive(),
  speed: z.number().int().nonnegative(),
  initiative: z.number().int(),
  hitDice: z.array(hitDicePoolSchema),
  deathSaves: z.object({
    success: z.number().int().min(0).max(3),
    fail: z.number().int().min(0).max(3),
  }),
  conditions: z.array(z.string()),
  inspiration: z.boolean(),
  exhaustion: z.number().int().min(0).max(6),
  currentConcentration: z
    .object({ spellId: slug, slotLevel: z.number().int().min(0).max(9) })
    .nullable(),

  classResources: z.record(
    z.string(),
    z.object({
      current: z.number().int().nonnegative(),
      max: z.number().int().nonnegative(),
      restoresOn: z.enum(['short', 'long']),
    }),
  ),

  spellSlots: z.record(
    z.string(),
    z.object({
      current: z.number().int().nonnegative(),
      max: z.number().int().nonnegative(),
    }),
  ),
  preparedSpells: z.record(z.string(), z.array(slug)),
  knownSpells: z.record(z.string(), z.array(slug)),
  spellcastingAbility: z.record(z.string(), z.enum(['int', 'sag', 'cha']).nullable()),

  inventory: z.object({
    items: z.array(inventoryItemSchema),
    coins: coinsSchema,
    weightCache: z.number().nonnegative(),
  }),

  personality: z.object({
    trait: z.string(),
    ideal: z.string(),
    bond: z.string(),
    flaw: z.string(),
    backstory: z.string(),
  }),

  featureUsage: z.record(
    z.string(),
    z.object({
      current: z.number().int().nonnegative(),
      max: z.number().int().nonnegative(),
      restoresOn: z.enum(['short', 'long']),
    }),
  ),

  extraProficiencies: z.object({
    armor: z.array(z.string()),
    weapons: z.array(z.string()),
    tools: z.array(z.string()),
    languages: z.array(z.string()),
  }),

  presentInCampaigns: z.array(z.string()),
  homeCampaignId: z.string().nullable(),

  stats: z.object({
    totalRolls: z.number().int().nonnegative(),
    totalD20Sum: z.number().int().nonnegative(),
    crits: z.number().int().nonnegative(),
    fumbles: z.number().int().nonnegative(),
    skillUses: z.record(z.string(), z.number().int().nonnegative()),
  }),

  portrait: portraitSchema,

  schemaVersion: z.literal(2),
  createdAt: z.unknown(),
  updatedAt: z.unknown(),
  updatedBy: z.string(),
});
export type Character = z.infer<typeof CharacterSchema>;
