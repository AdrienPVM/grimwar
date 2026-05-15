import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────
// I18n shape — FR is mandatory, EN is optional fallback for plan 34.
// ─────────────────────────────────────────────────────────────────────

export const I18nSchema = z.object({
  fr: z.string().min(1),
  en: z.string().min(1).optional(),
});
export type I18n = z.infer<typeof I18nSchema>;

const slug = z
  .string()
  .min(1)
  .regex(/^[a-z0-9-]+$/, 'kebab-case slug only');

const sourceTag = z.enum([
  'srd-5.2.1',
  'free-rules-2024',
  'basic-rules',
  'aidedd-homebrew',
]);
export type SourceTag = z.infer<typeof sourceTag>;

// ─────────────────────────────────────────────────────────────────────
// Spells
// ─────────────────────────────────────────────────────────────────────

export const spellSchoolSchema = z.enum([
  'abjuration',
  'conjuration',
  'divination',
  'enchantment',
  'evocation',
  'illusion',
  'necromancy',
  'transmutation',
]);
export type SpellSchool = z.infer<typeof spellSchoolSchema>;

export const SpellSchema = z.object({
  id: slug,
  name: I18nSchema,
  level: z.number().int().min(0).max(9),
  school: spellSchoolSchema,
  castingTime: I18nSchema,
  range: I18nSchema,
  components: z.object({
    v: z.boolean(),
    s: z.boolean(),
    m: z.boolean(),
    material: I18nSchema.optional(),
  }),
  duration: I18nSchema,
  concentration: z.boolean(),
  ritual: z.boolean(),
  description: I18nSchema,
  atHigherLevels: I18nSchema.nullable(),
  classes: z.array(slug),
  source: sourceTag,
});
export type Spell = z.infer<typeof SpellSchema>;

// ─────────────────────────────────────────────────────────────────────
// Monsters
// ─────────────────────────────────────────────────────────────────────

export const sizeSchema = z.enum([
  'tiny',
  'small',
  'medium',
  'large',
  'huge',
  'gargantuan',
]);
export type CreatureSize = z.infer<typeof sizeSchema>;

export const abilitiesSchema = z.object({
  for: z.number().int(),
  dex: z.number().int(),
  con: z.number().int(),
  int: z.number().int(),
  sag: z.number().int(),
  cha: z.number().int(),
});
export type Abilities = z.infer<typeof abilitiesSchema>;

const namedDescription = z.object({
  name: I18nSchema,
  description: I18nSchema,
});

export const MonsterSchema = z.object({
  id: slug,
  name: I18nSchema,
  size: sizeSchema,
  type: z.string(),
  alignment: I18nSchema,
  ac: z.number().int(),
  acDetail: I18nSchema.nullable(),
  hp: z.object({
    avg: z.number().int(),
    formula: z.string(),
  }),
  speed: z.object({
    walk: z.number().int().optional(),
    fly: z.number().int().optional(),
    swim: z.number().int().optional(),
    climb: z.number().int().optional(),
    burrow: z.number().int().optional(),
  }),
  abilities: abilitiesSchema,
  saves: z.record(z.string(), z.number().int()),
  skills: z.record(z.string(), z.number().int()),
  resistances: z.array(z.string()),
  immunities: z.array(z.string()),
  vulnerabilities: z.array(z.string()),
  conditionImmunities: z.array(z.string()),
  senses: z.object({
    darkvision: z.number().int().optional(),
    blindsight: z.number().int().optional(),
    tremorsense: z.number().int().optional(),
    truesight: z.number().int().optional(),
    passivePerception: z.number().int(),
  }),
  languages: z.array(z.string()),
  cr: z.number(),
  xp: z.number().int(),
  traits: z.array(namedDescription),
  actions: z.array(namedDescription),
  reactions: z.array(namedDescription).nullable(),
  legendaryActions: z.array(namedDescription).nullable(),
  source: sourceTag,
});
export type Monster = z.infer<typeof MonsterSchema>;

// ─────────────────────────────────────────────────────────────────────
// Items + Magic items
// ─────────────────────────────────────────────────────────────────────

export const itemCategorySchema = z.enum([
  'weapon',
  'armor',
  'shield',
  'gear',
  'tool',
  'pack',
  'mount',
  'vehicle',
]);
export type ItemCategory = z.infer<typeof itemCategorySchema>;

const coinUnitSchema = z.enum(['cp', 'sp', 'ep', 'gp', 'pp']);

export const ItemSchema = z.object({
  id: slug,
  name: I18nSchema,
  category: itemCategorySchema,
  cost: z
    .object({
      qty: z.number().int().nonnegative(),
      unit: coinUnitSchema,
    })
    .nullable(),
  weight: z.number().nonnegative(),
  description: I18nSchema.nullable(),
  damage: z
    .object({
      dice: z.string(),
      type: z.string(),
      typeLabel: I18nSchema,
    })
    .optional(),
  properties: z.array(z.string()).optional(),
  range: z
    .object({
      normal: z.number().int(),
      max: z.number().int(),
    })
    .optional(),
  acBase: z.number().int().optional(),
  acDexMax: z.number().int().nullable().optional(),
  strRequired: z.number().int().optional(),
  stealthDisadvantage: z.boolean().optional(),
  source: sourceTag,
});
export type Item = z.infer<typeof ItemSchema>;

export const rarityScheme = z.enum([
  'common',
  'uncommon',
  'rare',
  'very rare',
  'legendary',
  'artifact',
]);
export type Rarity = z.infer<typeof rarityScheme>;

export const MagicItemSchema = z.object({
  id: slug,
  name: I18nSchema,
  category: itemCategorySchema,
  rarity: rarityScheme,
  attunement: z.union([z.boolean(), I18nSchema]),
  magicDescription: I18nSchema,
  description: I18nSchema.nullable(),
  source: sourceTag,
});
export type MagicItem = z.infer<typeof MagicItemSchema>;

// ─────────────────────────────────────────────────────────────────────
// Classes / subclasses / ancestries / subancestries / backgrounds
// ─────────────────────────────────────────────────────────────────────

export const ClassSchema = z.object({
  id: slug,
  name: I18nSchema,
  hitDie: z.enum(['d6', 'd8', 'd10', 'd12']),
  primaryAbility: z.array(z.enum(['for', 'dex', 'con', 'int', 'sag', 'cha'])),
  saveProficiencies: z.array(z.enum(['for', 'dex', 'con', 'int', 'sag', 'cha'])),
  armorProficiencies: z.array(z.string()),
  weaponProficiencies: z.array(z.string()),
  toolProficiencies: z.array(z.string()),
  skillChoices: z.object({
    count: z.number().int().nonnegative(),
    from: z.array(z.string()),
  }),
  spellcasting: z
    .object({
      ability: z.enum(['int', 'sag', 'cha']),
      progression: z.enum(['full', 'half', 'third', 'pact']),
    })
    .nullable(),
  description: I18nSchema,
  features: z.array(
    z.object({
      level: z.number().int().min(1).max(20),
      name: I18nSchema,
      description: I18nSchema,
    }),
  ),
  source: sourceTag,
});
export type ClassEntity = z.infer<typeof ClassSchema>;

export const SubclassSchema = z.object({
  id: slug,
  classId: slug,
  name: I18nSchema,
  description: I18nSchema,
  features: z.array(
    z.object({
      level: z.number().int().min(1).max(20),
      name: I18nSchema,
      description: I18nSchema,
    }),
  ),
  source: sourceTag,
});
export type Subclass = z.infer<typeof SubclassSchema>;

export const AncestrySchema = z.object({
  id: slug,
  name: I18nSchema,
  size: sizeSchema,
  speed: z.number().int(),
  description: I18nSchema,
  abilityScoreIncrease: z.array(
    z.object({
      ability: z.enum(['for', 'dex', 'con', 'int', 'sag', 'cha']),
      bonus: z.number().int(),
    }),
  ),
  traits: z.array(namedDescription),
  languages: z.array(z.string()),
  source: sourceTag,
});
export type Ancestry = z.infer<typeof AncestrySchema>;

export const SubancestrySchema = z.object({
  id: slug,
  ancestryId: slug,
  name: I18nSchema,
  description: I18nSchema,
  traits: z.array(namedDescription),
  abilityScoreIncrease: z.array(
    z.object({
      ability: z.enum(['for', 'dex', 'con', 'int', 'sag', 'cha']),
      bonus: z.number().int(),
    }),
  ),
  source: sourceTag,
});
export type Subancestry = z.infer<typeof SubancestrySchema>;

export const BackgroundSchema = z.object({
  id: slug,
  name: I18nSchema,
  description: I18nSchema,
  skillProficiencies: z.array(z.string()),
  toolProficiencies: z.array(z.string()),
  languages: z.number().int().nonnegative(),
  equipment: z.array(z.string()),
  feature: z.object({
    name: I18nSchema,
    description: I18nSchema,
  }),
  source: sourceTag,
});
export type Background = z.infer<typeof BackgroundSchema>;

// ─────────────────────────────────────────────────────────────────────
// Feats / Conditions / Rules
// ─────────────────────────────────────────────────────────────────────

export const FeatSchema = z.object({
  id: slug,
  name: I18nSchema,
  prerequisite: I18nSchema.nullable(),
  summary: I18nSchema.nullable(),
  description: I18nSchema,
  source: sourceTag,
});
export type Feat = z.infer<typeof FeatSchema>;

export const ConditionSchema = z.object({
  id: slug,
  name: I18nSchema,
  description: I18nSchema,
  source: sourceTag,
});
export type Condition = z.infer<typeof ConditionSchema>;

export const RuleSchema = z.object({
  id: slug,
  name: I18nSchema,
  description: I18nSchema,
  category: z.string(),
  source: sourceTag,
});
export type Rule = z.infer<typeof RuleSchema>;

// ─────────────────────────────────────────────────────────────────────
// Aggregate registry — used by content-loader to validate per-type files.
// ─────────────────────────────────────────────────────────────────────

export const ContentTypeSchemas = {
  spells: SpellSchema,
  monsters: MonsterSchema,
  items: ItemSchema,
  'magic-items': MagicItemSchema,
  classes: ClassSchema,
  subclasses: SubclassSchema,
  ancestries: AncestrySchema,
  subancestries: SubancestrySchema,
  backgrounds: BackgroundSchema,
  feats: FeatSchema,
  conditions: ConditionSchema,
  rules: RuleSchema,
} as const;

export type ContentTypeKey = keyof typeof ContentTypeSchemas;

export type ContentEntityByKey = {
  spells: Spell;
  monsters: Monster;
  items: Item;
  'magic-items': MagicItem;
  classes: ClassEntity;
  subclasses: Subclass;
  ancestries: Ancestry;
  subancestries: Subancestry;
  backgrounds: Background;
  feats: Feat;
  conditions: Condition;
  rules: Rule;
};
