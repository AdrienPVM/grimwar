/**
 * SRD CC v5.2.1 — Armures + boucliers ≥ Rare (14 entrées, batch D29.6).
 *
 * Sources verbatim :
 *   - EN : `content-sources/extracted/raw/SRD_CC_v5.2.1.txt`
 *   - FR : `content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt`
 *
 * Backfill EN des armures/boucliers ≥ Rare encore grandfathered AideDD (les
 * Common/Uncommon sont déjà couverts par `srd-magic-items-armor-shields.ts`).
 *
 * Corrections de drift AideDD appliquées sur ces 14 entrées :
 *   - `attunement` : 10 items SRD « Requires Attunement » étaient à tort `false`
 *     (invulnérabilité, résistance, vulnérabilité, démoniaque, écailles de dragon,
 *     harnois éthéré, bouclier animé, bouclier antiprojectiles, bouclier
 *     d'attraction des projectiles, bouclier gardesort) → alignés sur le SRD.
 *     Restent `false` (4) : armure +1/2/3, cuir clouté enchantée (Glamoured
 *     Studded Leather), mailles elfique (Elven Chain), harnois nain (Dwarven Plate).
 *   - `name.fr` repris des intitulés officiels du SRD FR.
 *   - `magicDescription` 2014-edition remplacé par le texte 5.2.1.
 *
 * Hors scope (reste grandfathered) : `armure-de-matelot` (Mariner's Armor) — PAS
 * dans le SRD CC v5.2.1 (item 2014 uniquement), comme `anneau-de-resistance-au-poison`.
 *
 * Politique :
 *   - Slugs préservés byte-identique ; rareté préservée (aucun drift constaté).
 *   - `category: 'armor'` (le bundle existant range les boucliers sous `armor`).
 *   - Distances exprimées en unités métriques côté FR (convention du SRD FR officiel :
 *     45 km, 1,50 m, 3 m), pieds côté EN.
 */

import type { Rarity } from '../../src/shared/types/content';

import type { SrdMagicItemEntry } from './srd-magic-items-armor-shields';

export const SRD_MAGIC_ITEMS_ARMOR_RARE: SrdMagicItemEntry[] = [
  {
    // Rareté bundle « very rare » = point médian +2 de la famille +1/+2/+3
    // (même convention que bouclier-1-2-ou-3 gardé en uncommon). SRD : Rare (+1),
    // Very Rare (+2), Legendary (+3).
    id: 'armure-1-2-ou-3',
    name: { fr: 'Armure +1, +2 ou +3', en: 'Armor, +1, +2, or +3' },
    category: 'armor',
    rarity: 'very rare' as Rarity,
    attunement: false,
    magicDescription: {
      fr: 'Vous recevez un bonus à la CA tant que vous portez cette armure. Ce bonus est déterminé par sa rareté.',
      en: 'You have a bonus to Armor Class while wearing this armor. The bonus is determined by its rarity.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'armure-d-invulnerabilite',
    name: { fr: "Armure d'invulnérabilité", en: 'Armor of Invulnerability' },
    category: 'armor',
    rarity: 'legendary' as Rarity,
    attunement: true,
    magicDescription: {
      fr: "Vous bénéficiez de la résistance aux dégâts contondants, perforants et tranchants tant que vous portez cette armure.\n\nCarapace métallique. Vous pouvez entreprendre l'action Magie pour vous octroyer l'Immunité contre les dégâts contondants, perforants et tranchants pendant 10 minutes (l'effet prend prématurément fin si vous ne portez plus l'armure). Une fois cette propriété utilisée, vous ne pouvez plus y recourir avant l'aube suivante.",
      en: 'You have Resistance to Bludgeoning, Piercing, and Slashing damage while you wear this armor.\n\nMetal Shell. You can take a Magic action to give yourself Immunity to Bludgeoning, Piercing, and Slashing damage for 10 minutes or until you are no longer wearing the armor. Once this property is used, it can’t be used again until the next dawn.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'armure-de-resistance',
    name: { fr: 'Armure de résistance', en: 'Armor of Resistance' },
    category: 'armor',
    rarity: 'rare' as Rarity,
    attunement: true,
    magicDescription: {
      fr: 'Vous bénéficiez de la résistance à un type de dégâts tant que vous portez cette armure. Le MJ en choisit le type ou le détermine aléatoirement selon la table suivante.',
      en: 'You have Resistance to one type of damage while you wear this armor. The GM chooses the type or determines it randomly by rolling on the following table.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'armure-de-vulnerabilite',
    name: { fr: 'Armure de vulnérabilité', en: 'Armor of Vulnerability' },
    category: 'armor',
    rarity: 'rare' as Rarity,
    attunement: true,
    magicDescription: {
      fr: "Tant que vous portez cette armure, vous bénéficiez de la résistance à l'un des types de dégâts suivants : contondants, perforants ou tranchants. Le MJ choisit ce type ou laisse le hasard en décider.\n\nMalédiction. Cette armure est maudite, un fait qui n'est révélé que lorsque le sort identification est lancé sur l'armure ou quand vous vous harmonisez avec elle. S'harmoniser avec l'armure vous maudit jusqu'à ce que vous soyez la cible du sort délivrance des malédictions ou d'un effet magique équivalent ; ôter l'armure ne suffit pas à lever cette malédiction. Tant que cette malédiction vous affecte, vous subissez la Vulnérabilité à deux des trois types de dégâts associés à l'armure (autres que celui auquel elle octroie une résistance).",
      en: 'While wearing this armor, you have Resistance to one of the following damage types: Bludgeoning, Piercing, or Slashing. The GM chooses the type or determines it randomly.\n\nCurse. This armor is cursed, a fact that is revealed only when the Identify spell is cast on the armor or you attune to it. Attuning to the armor curses you until you are targeted by a Remove Curse spell or similar magic; removing the armor fails to end the curse. While cursed, you have Vulnerability to two of the three damage types associated with the armor (not the one to which it grants Resistance).',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'armure-demoniaque',
    name: { fr: 'Armure démoniaque', en: 'Demon Armor' },
    category: 'armor',
    rarity: 'very rare' as Rarity,
    attunement: true,
    magicDescription: {
      fr: "Tant que vous portez cette armure, vous recevez un bonus de +1 à la CA et parlez l'abyssal. Les gantelets griffus de l'armure permettent en outre à vos attaques à mains nues d'infliger 1d8 dégâts tranchants au lieu des dégâts contondants habituels, et vous recevez un bonus de +1 aux jets d'attaque et de dégâts de vos attaques à mains nues.\n\nMalédiction. Une fois cette armure maudite enfilée, vous ne pouvez plus l'ôter sauf si vous êtes la cible du sort délivrance des malédictions ou d'une magie équivalente. Tant que vous portez cette armure, vous subissez le Désavantage aux jets d'attaque contre les démons et aux jets de sauvegarde contre leurs sorts et aptitudes spéciales.",
      en: 'While wearing this armor, you gain a +1 bonus to Armor Class, and you know Abyssal. In addition, the armor’s clawed gauntlets allow your Unarmed Strikes to deal 1d8 Slashing damage instead of the usual Bludgeoning damage, and you gain a +1 bonus to the attack and damage rolls of your Unarmed Strikes.\n\nCurse. Once you don this cursed armor, you can’t doff it unless you are targeted by a Remove Curse spell or similar magic. While wearing the armor, you have Disadvantage on attack rolls against demons and on saving throws against their spells and special abilities.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'armure-d-ecailles-de-dragon',
    name: { fr: "Armure d'écailles de dragon", en: 'Dragon Scale Mail' },
    category: 'armor',
    rarity: 'very rare' as Rarity,
    attunement: true,
    magicDescription: {
      fr: "Chaque armure d'écailles de dragon est faite avec des écailles d'une espèce de dragon. Il arrive à certains dragons de rassembler leurs écailles tombées pour en faire don. En d'autres occasions, ces écailles sont prélevées avec soin sur le cadavre d'un dragon tué par des chasseurs. Dans tous les cas, une armure d'écailles de dragon est un bien inestimable.\n\nTant que vous portez cette armure, vous recevez un bonus de +1 à la CA, bénéficiez de l'Avantage aux jets de sauvegarde contre le souffle des Dragons, et de la Résistance à un type de dégâts déterminé par l'espèce de dragon qui a fourni les écailles (cf. table ci-après).\n\nAu prix de l'action Magie, vous pouvez en outre focaliser vos sens afin de percevoir à quelle distance et dans quelle direction se trouve le plus proche dragon de l'espèce correspondant à l'armure dans un rayon de 45 km. Cette action ne peut alors plus resservir avant l'aube suivante.",
      en: 'Dragon Scale Mail is made of the scales of one kind of dragon. Sometimes dragons collect their cast-off scales and gift them. Other times, hunters carefully preserve the hide of a dead dragon. In either case, Dragon Scale Mail is highly valued.\n\nWhile wearing this armor, you gain a +1 bonus to Armor Class, you have Advantage on saving throws against the breath weapons of Dragons, and you have Resistance to one damage type determined by the kind of dragon that provided the scales (see the accompanying table).\n\nAdditionally, you can focus your senses as a Magic action to discern the distance and direction to the closest dragon within 30 miles of yourself that is of the same type as the armor. This action can’t be used again until the next dawn.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'armure-de-cuir-cloute-enchantee',
    name: { fr: 'Armure de cuir clouté enchantée', en: 'Glamoured Studded Leather' },
    category: 'armor',
    rarity: 'rare' as Rarity,
    attunement: false,
    magicDescription: {
      fr: "Tant que vous portez cette armure, vous recevez un bonus de +1 à la CA. Par une action Bonus, vous faites prendre à l'armure l'apparence de vêtements ordinaires ou d'un autre type d'armure. Vous décidez de son aspect, y compris sa couleur, son style et ses accessoires, mais l'armure conserve son encombrement normal et son poids. L'apparence illusoire persiste jusqu'à ce que vous réutilisiez cette propriété ou ôtiez l'armure.",
      en: 'While wearing this armor, you gain a +1 bonus to Armor Class. You can also take a Bonus Action to cause the armor to assume the appearance of a normal set of clothing or some other kind of armor. You decide what it looks like—including color, style, and accessories—but the armor retains its normal bulk and weight. The illusory appearance lasts until you use this property again or doff the armor.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'mailles-elfiques',
    name: { fr: 'Armure de mailles elfique', en: 'Elven Chain' },
    category: 'armor',
    rarity: 'rare' as Rarity,
    attunement: false,
    magicDescription: {
      fr: 'Vous recevez un bonus de +1 à la CA tant que vous portez cette armure. Vous êtes considéré comme formé au port de cette armure même s’il vous manque la formation aux armures lourdes et intermédiaires.',
      en: 'You gain a +1 bonus to Armor Class while you wear this armor. You are considered trained with this armor even if you lack training with Medium or Heavy armor.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'harnois-ethere',
    name: { fr: 'Harnois éthéré', en: 'Plate Armor of Etherealness' },
    category: 'armor',
    rarity: 'legendary' as Rarity,
    attunement: true,
    magicDescription: {
      fr: "Tant que vous portez cette armure, vous pouvez entreprendre l'action Magie en prononçant un mot de commande pour recevoir l'effet du sort forme éthérée. Le sort prend aussitôt fin si vous ôtez l'armure ou entreprenez l'action Magie pour répéter le mot de commande. Une fois cette propriété de l'armure utilisée, elle ne peut plus resservir avant l'aube suivante.",
      en: 'While you’re wearing this armor, you can take a Magic action and use a command word to gain the effect of the Etherealness spell. The spell ends immediately if you remove the armor or take a Magic action to repeat the command word. This property of the armor can’t be used again until the next dawn.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'harnois-nain',
    name: { fr: 'Harnois nain', en: 'Dwarven Plate' },
    category: 'armor',
    rarity: 'very rare' as Rarity,
    attunement: false,
    magicDescription: {
      fr: "Tant que vous portez cette armure, vous recevez un bonus de +2 à la CA. En outre, si un effet vous déplace au sol contre votre volonté, vous pouvez jouer votre Réaction pour réduire d'un maximum de 3 m la distance sur laquelle vous êtes déplacé.",
      en: 'While wearing this armor, you gain a +2 bonus to Armor Class. In addition, if an effect moves you against your will along the ground, you can take a Reaction to reduce the distance you are moved by up to 10 feet.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'bouclier-anime',
    name: { fr: 'Bouclier animé', en: 'Animated Shield' },
    category: 'armor',
    rarity: 'very rare' as Rarity,
    attunement: true,
    magicDescription: {
      fr: "Tant que vous maniez ce bouclier, vous pouvez l'animer par une action Bonus. Le bouclier s'élance dans les airs, reste en vol stationnaire dans votre espace en vous protégeant comme si vous le portiez, ce qui vous laisse les mains libres. Le bouclier reste animé pendant 1 minute, mais disparaît avant cela si vous consacrez une action Bonus pour mettre fin à cet effet, mourez ou subissez l'état Neutralisé ; il tombe alors au sol ou revient dans votre main si vous avez une main libre.",
      en: 'While holding this Shield, you can take a Bonus Action to cause it to animate. The Shield leaps into the air and hovers in your space to protect you as if you were wielding it, leaving your hands free. The Shield remains animate for 1 minute, until you take a Bonus Action to end this effect, or until you die or have the Incapacitated condition, at which point the Shield falls to the ground or into your hand if you have one free.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'bouclier-antiprojectiles',
    name: { fr: 'Bouclier antiprojectiles', en: 'Arrow-Catching Shield' },
    category: 'armor',
    rarity: 'rare' as Rarity,
    attunement: true,
    magicDescription: {
      fr: "Vous recevez un bonus de +2 à la classe d'armure contre les jets d'attaque à distance tant que vous portez ce bouclier. Ce bonus s'ajoute à celui que le bouclier octroie normalement à la CA.\n\nChaque fois qu'un assaillant effectue un jet d'attaque à distance contre une cible dans un rayon de 1,50 m de vous, vous pouvez jouer votre Réaction pour devenir la cible de cette attaque à sa place.",
      en: 'You gain a +2 bonus to Armor Class against ranged attack rolls while you wield this Shield. This bonus is in addition to the Shield’s normal bonus to AC.\n\nWhenever an attacker makes a ranged attack roll against a target within 5 feet of you, you can take a Reaction to become the target of the attack instead.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'bouclier-d-attraction-des-projectiles',
    name: { fr: "Bouclier d'attraction des projectiles", en: 'Shield of Missile Attraction' },
    category: 'armor',
    rarity: 'rare' as Rarity,
    attunement: true,
    magicDescription: {
      fr: "Tant que vous tenez ce bouclier, vous bénéficiez de la Résistance aux dégâts des attaques des armes à distance.\n\nMalédiction. Ce bouclier est maudit. S'harmoniser avec lui vous maudit jusqu'à ce que vous soyez la cible du sort délivrance des malédictions ou d'un effet magique équivalent. Retirer le bouclier ne suffit pas à lever la malédiction. Chaque fois qu'une attaque avec une arme à distance cible une créature dans un rayon de 3 m de vous, vous en devenez en fait la cible.",
      en: 'While holding this Shield, you have Resistance to damage from attacks made with Ranged weapons.\n\nCurse. This Shield is cursed. Attuning to it curses you until you are targeted by a Remove Curse spell or similar magic. Removing the Shield fails to end the curse on you. Whenever an attack with a Ranged weapon targets a creature within 10 feet of you, the curse causes you to become the target instead.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'bouclier-gardesort',
    name: { fr: 'Bouclier gardesort', en: 'Spellguard Shield' },
    category: 'armor',
    rarity: 'very rare' as Rarity,
    attunement: true,
    magicDescription: {
      fr: "Tant que vous tenez ce bouclier, vous avez l'Avantage aux jets de sauvegarde contre les sorts et autres effets magiques, et les jets d'attaque de sort contre vous subissent le Désavantage.",
      en: 'While holding this Shield, you have Advantage on saving throws against spells and other magical effects, and spell attack rolls have Disadvantage against you.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
];

export const SRD_MAGIC_ITEMS_ARMOR_RARE_COUNTS = {
  total: SRD_MAGIC_ITEMS_ARMOR_RARE.length,
  rare: SRD_MAGIC_ITEMS_ARMOR_RARE.filter((i) => i.rarity === 'rare').length,
  veryRare: SRD_MAGIC_ITEMS_ARMOR_RARE.filter((i) => i.rarity === 'very rare').length,
  legendary: SRD_MAGIC_ITEMS_ARMOR_RARE.filter((i) => i.rarity === 'legendary').length,
} as const;
