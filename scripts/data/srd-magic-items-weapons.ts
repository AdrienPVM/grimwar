/**
 * SRD CC v5.2.1 — Armes magiques + munitions Common + Uncommon (5 entrées).
 *
 * Sources verbatim :
 *   - EN : `content-sources/extracted/raw/SRD_CC_v5.2.1.txt`
 *   - FR : `content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt`
 *
 * Cf. plan `plans/C-magic-items-srd-common-uncommon.md` (tracer-bullet C.4).
 *
 * Scope C.4 :
 *   - 2 génériques uncommon : Arme +1, Projectile +1.
 *   - 3 armes spécifiques uncommon : Javeline de foudre, Trident de domination
 *     aquatique, Arme vigilante.
 *
 * Politique :
 *   - Slugs préservés byte-identique (4 remplacements + 1 nouveau `arme-vigilante`).
 *   - `name.fr` aligné sur la traduction officielle WotC FR (drift terminologique
 *     corrigé sur "Munition" → "Projectile" pour la munition +1).
 *   - `magicDescription` reprend la formulation officielle SRD FR.
 *   - `category: 'weapon'` (et non 'gear') pour ces entrées (alignement avec
 *     baseline).
 */

import type { Rarity } from '../../src/shared/types/content';

export interface SrdMagicItemEntry {
  id: string;
  name: { fr: string; en: string };
  category: 'gear' | 'weapon' | 'armor' | 'shield' | 'tool' | 'pack' | 'mount' | 'vehicle';
  rarity: Rarity;
  attunement: boolean;
  magicDescription: { fr: string; en: string };
  description: { fr: string; en?: string } | null;
  source: 'srd-5.2.1';
}

export const SRD_MAGIC_ITEMS_WEAPONS: SrdMagicItemEntry[] = [
  {
    // Slug conservé byte-identique ; name.fr officiel "Arme +1, +2 ou +3".
    id: 'arme-1-2-ou-3',
    name: { fr: 'Arme +1, +2 ou +3', en: 'Weapon, +1, +2, or +3' },
    category: 'weapon',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Vous recevez un bonus aux jets d'attaque et de dégâts effectués avec cette arme magique. Ce bonus est déterminé par la rareté de l'arme (+1 = peu courante, +2 = rare, +3 = très rare).",
      en: "You have a bonus to attack rolls and damage rolls made with this magic weapon. The bonus is determined by the weapon's rarity (+1 = Uncommon, +2 = Rare, +3 = Very Rare).",
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // Slug `munition-1-2-ou-3` conservé byte-identique ; name.fr corrigé selon
    // SRD FR officiel : "Projectile" (pas "Munition").
    id: 'munition-1-2-ou-3',
    name: { fr: 'Projectile +1, +2 ou +3', en: 'Ammunition, +1, +2, or +3' },
    category: 'weapon',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Vous recevez un bonus aux jets d'attaque et de dégâts effectués avec ces munitions magiques. Ce bonus est déterminé par la rareté du projectile. Dès qu'il touche une cible, le projectile perd ses propriétés magiques.\n\nCes munitions sont généralement trouvées ou vendues par quantités de dix ou vingt. Dix projectiles équivalent en valeur à une potion de même rareté.",
      en: "You have a bonus to attack rolls and damage rolls made with this piece of magic ammunition. The bonus is determined by the rarity of the ammunition. Once it hits a target, the ammunition is no longer magical.\n\nThis ammunition is typically found or sold in quantities of ten or twenty pieces. Ten pieces of this ammunition are equivalent in value to a potion of the same rarity.",
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'javeline-de-foudre',
    name: { fr: 'Javeline de foudre', en: 'Javelin of Lightning' },
    category: 'weapon',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Chaque fois que vous réussissez un jet d'attaque avec cette arme magique, vous pouvez choisir d'infliger des dégâts de foudre au lieu de dégâts perforants.\n\nÉclair. Lorsque vous lancez cette arme sur une cible située à 36 m ou moins de vous, vous pouvez renoncer au jet d'attaque à distance pour transformer l'arme en éclair. Cet éclair forme une Ligne de 1,50 m de large entre vous et la cible. La cible et chaque créature prise dans la Ligne (vous excepté) effectuent un jet de sauvegarde de Dextérité DD 13, et subissent 4d6 dégâts de foudre en cas d'échec, la moitié en cas de réussite. Aussitôt après avoir infligé ces dégâts, l'arme réapparaît dans votre main. Cette propriété ne peut plus resservir avant l'aube suivante.",
      en: 'Each time you make an attack roll with this magic weapon and hit, you can have it deal Lightning damage instead of Piercing damage.\n\nLightning Bolt. When you throw this weapon at a target no farther than 120 feet from you, you can forgo making a ranged attack roll and instead turn the weapon into a bolt of lightning. This bolt forms a 5-foot-wide Line between you and the target. The target and each other creature in the Line (excluding you) makes a DC 13 Dexterity saving throw, taking 4d6 Lightning damage on a failed save or half as much damage on a successful one. Immediately after dealing this damage, the weapon reappears in your hand. This property can’t be used again until the next dawn.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'trident-de-domination-aquatique',
    name: { fr: 'Trident de domination aquatique', en: 'Trident of Fish Command' },
    category: 'weapon',
    rarity: 'uncommon',
    attunement: true,
    magicDescription: {
      fr: "Cette arme magique dispose de 3 charges et récupère quotidiennement 1d3 charges dépensées, à l'aube. Tant que vous la portez, vous pouvez dépenser 1 charge pour lancer le sort domination de bête (DD de sauvegarde 15) par son biais sur une Bête dotée d'une Vitesse de nage.",
      en: 'This magic weapon has 3 charges, and it regains 1d3 expended charges daily at dawn. While you carry it, you can expend 1 charge to cast Dominate Beast (save DC 15) from it on a Beast that has a Swim Speed.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // Nouveau slug — Weapon of Warning absente du bundle baseline AideDD.
    id: 'arme-vigilante',
    name: { fr: 'Arme vigilante', en: 'Weapon of Warning' },
    category: 'weapon',
    rarity: 'uncommon',
    attunement: true,
    magicDescription: {
      fr: "Tant que cette arme est à portée d'allonge et que persiste votre Harmonisation avec elle, vous-même et vos alliés dans un rayon de 9 m recevez les bénéfices suivants.\n\nAlarme. L'arme réveille magiquement chaque sujet endormi lorsqu'un combat commence. Ce bénéfice ne tire pas un sujet d'un sommeil provoqué magiquement.\n\nVigilance surnaturelle. Chaque sujet a l'Avantage aux jets d'Initiative.",
      en: 'As long as this weapon is within your reach and you are attuned to it, you and allies within 30 feet of you gain the following benefits.\n\nAlarm. The weapon magically awakens each subject who is sleeping naturally when combat begins. This benefit doesn’t wake a subject from magically induced sleep.\n\nSupernatural Readiness. Each subject has Advantage on its Initiative rolls.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
];

export const SRD_MAGIC_ITEMS_WEAPONS_COUNTS = {
  total: SRD_MAGIC_ITEMS_WEAPONS.length,
  common: SRD_MAGIC_ITEMS_WEAPONS.filter((i) => i.rarity === 'common').length,
  uncommon: SRD_MAGIC_ITEMS_WEAPONS.filter((i) => i.rarity === 'uncommon').length,
} as const;
