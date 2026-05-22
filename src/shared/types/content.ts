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

/**
 * Mapping canonical des dégâts de sort. Introduit en plan 12 comme champ
 * **optionnel** pour ne pas casser `spells.json` existant. Le pipeline
 * d'extraction (`scripts/build-public-content`) populera ces structures dans
 * un suivi dédié — la regex fallback `extractDamageFormula` dans
 * `spell-detail-modal.tsx` continue de tourner pour les sorts sans `damage[]`
 * (étape 9 de plan 12 explicitement deferred au pipeline, voir Notes).
 */
export const SpellDamageSchema = z.object({
  formula: z.string(),
  type: z.string(),
  atHigherLevels: z
    .object({
      perLevel: z.string(),
    })
    .optional(),
});
export type SpellDamage = z.infer<typeof SpellDamageSchema>;

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
  /** Dégâts canoniques structurés. Optionnel — fallback regex tant que le
   * pipeline d'extraction SRD n'est pas câblé (suivi plan 12+). */
  damage: z.array(SpellDamageSchema).optional(),
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
export type CoinUnit = z.infer<typeof coinUnitSchema>;

/**
 * Propriétés Weapon Mastery SRD 5.2.1 (8 valeurs canoniques — cf.
 * `docs/AUDIT-SRD-COMPLETUDE.md > C.1`). Énumération typée pour que tout
 * lecteur (chooser de classe 13.9, render Combat, moteur de dés) reste
 * cohérent et type-safe — pas de chaîne libre.
 */
export const weaponMasteryPropertySchema = z.enum([
  'cleave',
  'graze',
  'nick',
  'push',
  'sap',
  'slow',
  'topple',
  'vex',
]);
export type WeaponMasteryProperty = z.infer<typeof weaponMasteryPropertySchema>;

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
  /**
   * Propriété Mastery de l'arme (SRD 5.2.1) — uniquement sur les armes
   * éligibles (37 armes simples + martiales). Lu par le chooser
   * `weapon-mastery-chooser` du wizard et par les badges Combat du sheet.
   * `optional` parce que non-weapon items et armes hors-table SRD ne l'ont pas.
   */
  masteryProperty: weaponMasteryPropertySchema.optional(),
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

/**
 * Starting Equipment — items DB strict.
 * Chaque entrée référence un id de items.json (validé cross-bundle au build).
 */
export const StartingEquipmentItemRefSchema = z.object({
  itemId: slug,
  qty: z.number().int().positive(),
});
export type StartingEquipmentItemRef = z.infer<typeof StartingEquipmentItemRefSchema>;

export const StartingCoinsSchema = z.object({
  qty: z.number().int().nonnegative(),
  unit: coinUnitSchema,
});
export type StartingCoins = z.infer<typeof StartingCoinsSchema>;

/** SRD 2024 : chaque classe propose 1+ options (A, B et parfois C pour Guerrier). */
export const StartingEquipmentChoiceSchema = z.object({
  items: z.array(StartingEquipmentItemRefSchema),
  coins: StartingCoinsSchema.nullable(),
});
export type StartingEquipmentChoice = z.infer<typeof StartingEquipmentChoiceSchema>;
export const StartingEquipmentSchema = z.object({
  options: z.array(StartingEquipmentChoiceSchema).min(1),
});
export type StartingEquipment = z.infer<typeof StartingEquipmentSchema>;

/**
 * Option Divine Order Clerc / Primal Order Druide (SRD 5.2.1) — même shape
 * pour les deux, factorisé dans un schéma partagé pour stabilité.
 */
export const ClassOrderOptionSchema = z.object({
  id: slug,
  name: I18nSchema,
  summary: I18nSchema,
});
export type ClassOrderOption = z.infer<typeof ClassOrderOptionSchema>;

export const ClassSchema = z
  .object({
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
    startingEquipment: StartingEquipmentSchema,
    description: I18nSchema,
    features: z.array(
      z.object({
        level: z.number().int().min(1).max(20),
        name: I18nSchema,
        description: I18nSchema,
      }),
    ),
    /**
     * Sous-choix L1 portés par le bundle classe (plan 13.7 §0.3) — `optional`
     * parce que la majorité des classes n'en n'expose qu'un seul. Le
     * `superRefine` ci-dessous impose que cleric ait `divineOrders` non vide
     * et druid ait `primalOrders` non vide (rejet d'un cache pré-13.7).
     */
    divineOrders: z.array(ClassOrderOptionSchema).optional(),
    primalOrders: z.array(ClassOrderOptionSchema).optional(),
    /**
     * Nombre d'armes Weapon Mastery accessibles à L1 par cette classe (SRD
     * 5.2.1 : 0 pour les non-martiales, 2 pour Barb/Pal/Rgr/Rog, 3 pour
     * Fighter). Toujours présent dans le bundle — `int >= 0` borné côté
     * superRefine. Le chooser 13.9 utilise cette valeur comme `count` exact.
     */
    weaponMasteryCount: z.number().int().min(0).max(6),
    source: sourceTag,
  })
  .superRefine((cls, ctx) => {
    // Validation cross-field SRD 5.2.1 : si cleric, divineOrders non vide ;
    // si druid, primalOrders non vide. Une entrée bundle ou cache dégradée
    // sans cette clé est REJETÉE (cf. plan 13.9 exigence héritée 13.8 #1).
    if (cls.id === 'cleric') {
      if (!Array.isArray(cls.divineOrders) || cls.divineOrders.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['divineOrders'],
          message: 'Class "cleric" doit fournir divineOrders non vide (SRD 5.2.1 sub-choice L1).',
        });
      }
    }
    if (cls.id === 'druid') {
      if (!Array.isArray(cls.primalOrders) || cls.primalOrders.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['primalOrders'],
          message: 'Class "druid" doit fournir primalOrders non vide (SRD 5.2.1 sub-choice L1).',
        });
      }
    }
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

/**
 * Options enrichies des ascendances SRD 5.2.1 (plan 13.7 + consommé 13.8).
 * Chaque liste est `optional` car la majorité des ascendances n'en n'expose
 * qu'une seule (Drakéide → `dragonAncestries`, Tieffelin → `tieflingLegacies`,
 * etc.). Le wizard 13.8 lit ces options pour construire les radio cards et le
 * hook `useAncestrySubChoices` les expose en valeurs admises.
 */
export const AncestryDragonOptionSchema = z.object({
  id: slug,
  name: I18nSchema,
  damageType: z.string(),
  damageTypeLabel: I18nSchema,
});
export type AncestryDragonOption = z.infer<typeof AncestryDragonOptionSchema>;

export const AncestryTieflingLegacyOptionSchema = z.object({
  id: slug,
  name: I18nSchema,
  resistance: I18nSchema,
  cantripSpellId: slug,
  level3SpellId: slug,
  level5SpellId: slug,
});
export type AncestryTieflingLegacyOption = z.infer<
  typeof AncestryTieflingLegacyOptionSchema
>;

export const AncestryElfLineageOptionSchema = z.object({
  id: slug,
  name: I18nSchema,
  benefit: I18nSchema,
  cantripSpellId: slug,
  level3SpellId: slug,
  level5SpellId: slug,
});
export type AncestryElfLineageOption = z.infer<typeof AncestryElfLineageOptionSchema>;

export const AncestryGnomeLineageOptionSchema = z.object({
  id: slug,
  name: I18nSchema,
  benefit: I18nSchema,
  cantripSpellIds: z.array(slug),
  /**
   * Sorts de trait SPÉCIFIQUES au lignage (pas communs à toute l'ascendance).
   * Forest Gnome « Gnome des forêts » → `communication-avec-les-animaux`
   * (rituel, usage limité PB×/repos). Rock Gnome ne l'a PAS → champ absent.
   * Plan 13.14b (D18) : présence injectée ; cast à usage limité = D12.
   */
  spellIds: z.array(slug).optional(),
});
export type AncestryGnomeLineageOption = z.infer<
  typeof AncestryGnomeLineageOptionSchema
>;

export const AncestryGiantOptionSchema = z.object({
  id: slug,
  name: I18nSchema,
  effect: I18nSchema,
});
export type AncestryGiantOption = z.infer<typeof AncestryGiantOptionSchema>;

/**
 * `options` doit être PRÉSENT (au minimum `{}`) — on retire le `.default({})`
 * volontaire qui camouflait un cache pré-13.7 où la clé manquait totalement.
 * Combiné au `superRefine` ci-dessous, une entrée d'ancestrie avec sous-choix
 * mais options absentes ou vides est REJETÉE au lieu d'être tolérée. La
 * conséquence pratique : le re-parse au cache read (cf. `content-loader.ts`)
 * échoue, invalide la row Dexie, et déclenche un fetch frais qui re-peuple
 * proprement depuis `public/data/ancestries.json`.
 */
export const AncestryOptionsSchema = z.object({
  dragonAncestries: z.array(AncestryDragonOptionSchema).optional(),
  tieflingLegacies: z.array(AncestryTieflingLegacyOptionSchema).optional(),
  elfLineages: z.array(AncestryElfLineageOptionSchema).optional(),
  gnomeLineages: z.array(AncestryGnomeLineageOptionSchema).optional(),
  giantAncestries: z.array(AncestryGiantOptionSchema).optional(),
  versatileFeatIds: z.array(slug).optional(),
  skillfulOptions: z.array(slug).optional(),
});
export type AncestryOptions = z.infer<typeof AncestryOptionsSchema>;

/**
 * Sous-clé d'options requise (non vide) par ancestryId. SRD 5.2.1.
 * Dwarf / Halfling / Orc n'ont aucun sous-choix L1 → pas d'entrée ici (options
 * peut rester `{}`). Pour human, on exige `skillfulOptions` non vide (sinon
 * `AncestryExtraSkillChooser` tombe sur le fallback elfique faux pour humain).
 */
const REQUIRED_ANCESTRY_OPTION_KEY: Record<string, keyof AncestryOptions> = {
  dragonborn: 'dragonAncestries',
  tiefling: 'tieflingLegacies',
  elf: 'elfLineages',
  gnome: 'gnomeLineages',
  goliath: 'giantAncestries',
  human: 'skillfulOptions',
};

export const AncestrySchema = z
  .object({
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
    options: AncestryOptionsSchema,
    /**
     * Sorts de trait COMMUNS à toute l'ascendance (tous sous-choix confondus).
     * SRD 5.2.1 : Tieffelin « Présence d'outre-monde » → `thaumaturgie`, commun
     * aux 3 héritages. Les sorts propres à UN sous-choix (lignage/héritage)
     * vivent sur l'option correspondante, pas ici. Plan 13.14b (D18).
     */
    commonSpellIds: z.array(slug).optional(),
  })
  .superRefine((ancestry, ctx) => {
    // Validation cross-field : si l'ascendance a un sous-choix L1 SRD, la
    // liste correspondante doit exister et être non vide. Une entrée cache
    // pré-13.7 sans `options` (ou avec `options: {}`) tombe ici → safeParse
    // échoue → cache invalidé → fetch frais (cf. content-loader).
    const requiredKey = REQUIRED_ANCESTRY_OPTION_KEY[ancestry.id];
    if (!requiredKey) return;
    const list = ancestry.options[requiredKey];
    if (!Array.isArray(list) || list.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options', requiredKey],
        message: `Ancestry "${ancestry.id}" doit fournir options.${requiredKey} non vide (SRD 5.2.1 sub-choice L1).`,
      });
    }
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
  /**
   * Items DB strict : chaque entrée référence un itemId réel de items.json
   * (validé cross-bundle au build). Plus de chaînes libres "Holy Symbol" — un
   * symbole sacré devient { itemId: 'holy-symbol-amulet', qty: 1 }.
   */
  equipment: z.array(StartingEquipmentItemRefSchema),
  /** Pièces de départ séparées (le « 8 GP » des backgrounds SRD). */
  startingCoins: StartingCoinsSchema.nullable(),
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

/**
 * Catégorie de feat SRD 5.2.1 — `fighting-style` est consommée par le chooser
 * Fighter L1 du plan 13.9 (filtre les 4 styles SRD parmi les 17 feats).
 * `optional` parce que les feats hors-catégorie pré-13.7 ne l'ont pas encore.
 */
export const FeatSchema = z.object({
  id: slug,
  name: I18nSchema,
  prerequisite: I18nSchema.nullable(),
  summary: I18nSchema.nullable(),
  /**
   * Texte long. Nullable/optional parce que `public/data/feats.json` (post-13.7)
   * livre `description: null` pour la plupart des entrées — `description` viendra
   * avec une passe d'extraction étendue. Le chooser 13.9 utilise `summary` qui
   * est garanti.
   */
  description: I18nSchema.nullable().optional(),
  category: z.string().optional(),
  source: sourceTag,
});
export type Feat = z.infer<typeof FeatSchema>;

/**
 * Eldritch Invocation SRD 5.2.1 (28 entrées — `prerequisiteWarlockLevel: null`
 * pour les 5 éligibles L1 + Pact of the Blade/Chain/Tome). Consommé par
 * `warlock-invocation-chooser` au plan 13.9.
 */
export const InvocationSchema = z.object({
  id: slug,
  name: I18nSchema,
  summary: I18nSchema,
  /** Niveau Warlock minimum requis — `null` = utilisable dès L1. */
  prerequisiteWarlockLevel: z.number().int().min(1).max(20).nullable(),
  /** Pré-requis non-niveau (ex. « Pact of the Blade »). `null` si aucun. */
  prerequisiteOther: I18nSchema.nullable(),
  source: sourceTag,
});
export type Invocation = z.infer<typeof InvocationSchema>;

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
  invocations: InvocationSchema,
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
  invocations: Invocation;
  conditions: Condition;
  rules: Rule;
};
