/**
 * SRD CC v5.2.1 — Capes, manteau & robes magiques (10 entrées).
 *
 * Batch D29.11 (backfill EN des magic-items grandfathered AideDD).
 *
 * Sources verbatim :
 *   - EN : `content-sources/extracted/raw/SRD_CC_v5.2.1.txt`
 *     (Cape of the Mountebank l. 21482, Cloak of Arachnida l. 21534, Cloak of
 *     Displacement l. 21552, Cloak of the Bat l. 21583, Mantle of Spell
 *     Resistance l. 23043, Robe of Eyes l. 24181, Robe of Scintillating Colors
 *     l. 24195, Robe of Stars l. 24210, Robe of the Archmagi l. 24228, Wings of
 *     Flying l. 25612)
 *   - FR : `content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt`
 *     (Cape de déplacement l. 26001, Cape de l'arachnide l. 26011, Cape de la
 *     chauve-souris l. 26032, Cape de vol l. 26057, Cape du prestidigitateur
 *     l. 26067, Manteau de résistance aux sorts l. 27379, Robe aux étoiles
 *     l. 28401, Robe de l'archimage l. 28424, Robe de vision totale l. 28440,
 *     Robe prismatique l. 28510)
 *
 * Correspondances de nom notables (aucun drift FR — les 10 noms du bundle sont
 * conformes au WotC FR) : `cape-de-vol` = **Wings of Flying** (FR officiel « Cape
 * de vol ») ; `cape-du-prestidigitateur` = **Cape of the Mountebank** ;
 * `robe-de-vision-totale` = **Robe of Eyes** ; `robe-prismatique` = **Robe of
 * Scintillating Colors**.
 *
 * Corrections issues du SRD :
 *   - `attunement` : 9 des 10 objets étaient `false` (héritage AideDD). Le SRD
 *     5.2.1 exige l'Harmonisation pour tous sauf la **Cape du prestidigitateur**
 *     (EN « Wondrous Item, Rare » l. 21483 ; FR « Objet merveilleux, rare »
 *     l. 26068, sans mention) → reste `false`. Harmonisation qualifiée (objet
 *     {fr,en}) : Robe de l'archimage (« un Ensorceleur, Magicien ou Occultiste »).
 *   - `magicDescription` : reformulé sur la VF officielle SRD. L'ordre des blocs
 *     de propriété peut différer entre EN et FR (chaque langue reproduit SON
 *     ordre officiel).
 *
 * Conventions (identiques aux modules D29.1→D29.10) : hyphénations de fin de ligne
 * retirées ; ordinaux scindés « 5\ne\n niveau » → « 5e niveau » ; apostrophes FR
 * en ASCII, EN verbatim SRD (quotes courbes) ; `\n\n` entre blocs de propriété.
 */

import type { SrdMagicItemEntry } from './srd-magic-items-potions';

export const SRD_MAGIC_ITEMS_CLOAKS: SrdMagicItemEntry[] = [
  {
    id: 'cape-de-deplacement',
    name: { fr: 'Cape de déplacement', en: 'Cloak of Displacement' },
    category: 'gear',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: "Tant que vous portez cette cape, elle projette magiquement un double illusoire de vous-même qui vous fait apparaître à côté de votre véritable position. Toutes les créatures subissent le Désavantage à leurs jets d'attaque contre vous. Si vous subissez des dégâts, cette propriété cesse de fonctionner jusqu'au début de votre tour suivant. Cette propriété est réprimée quand votre Vitesse tombe à 0 et tant qu'elle le reste.",
      en: 'While you wear this cloak, it magically projects an illusion that makes you appear to be standing in a place near your actual location, causing any creature to have Disadvantage on attack rolls against you. If you take damage, the property ceases to function until the start of your next turn. This property is suppressed while your Speed is 0.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'cape-de-l-arachnide',
    name: { fr: "Cape de l'arachnide", en: 'Cloak of Arachnida' },
    category: 'gear',
    rarity: 'very rare',
    attunement: true,
    magicDescription: {
      fr: "Ce somptueux vêtement en soie noire est brodé de fils d'argent. Tant que vous le portez, vous recevez les bénéfices suivants :\n\nDéplacement arachnéen. Aucune toile d'araignée ne peut vous coincer ; vous pouvez vous déplacer librement à travers toute toile d'araignée comme s'il s'agissait d'un Terrain difficile.\n\nPattes d'araignée. Vous bénéficiez d'une Vitesse d'escalade égale à votre Vitesse et pouvez monter, descendre ou vous déplacer à l'horizontale sur une surface verticale ou encore au plafond, la tête en bas, tout en gardant les mains libres.\n\nRésistance au poison. Vous bénéficiez de la Résistance aux dégâts de poison.\n\nToile d'araignée. Vous pouvez lancer toile d'araignée (DD de sauvegarde 13). La toile d'araignée créée par ce sort remplit le double de la surface normale. Une fois utilisée, cette propriété ne peut plus resservir avant l'aube suivante.",
      en: 'This fine garment is made of black silk interwoven with faint, silvery threads. While wearing it, you gain the following benefits.\n\nPoison Resistance. You have Resistance to Poison damage.\n\nSpider Climb. You have a Climb Speed equal to your Speed and can move up, down, and across vertical surfaces and along ceilings, while leaving your hands free.\n\nSpider Walk. You can’t be caught in webs of any sort and can move through webs as if they were Difficult Terrain.\n\nWeb. You can cast Web (save DC 13). The web created by the spell fills twice its normal area. Once used, this property can’t be used again until the next dawn.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'cape-de-la-chauve-souris',
    name: { fr: 'Cape de la chauve-souris', en: 'Cloak of the Bat' },
    category: 'gear',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: "Tant que vous portez cette cape, vous bénéficiez de l'Avantage aux tests de Dextérité (Discrétion). Dans une zone de Lumière faible ou de Ténèbres, vous pouvez saisir les bords de la cape à deux mains et l'utiliser pour recevoir une Vitesse de vol de 12 m. Si vous lâchez les bords de la cape en volant de cette manière, ou si vous n'êtes plus dans une zone de Lumière faible ou de Ténèbres, vous perdez cette Vitesse de vol.\n\nTant que vous portez cette cape dans une zone de Lumière faible ou de ténèbres, vous pouvez lancer métamorphose sur vous-même, qui vous transforme en chauve-souris. Sous cette forme, vous conservez vos valeurs d'Intelligence, de Sagesse et de Charisme. La cape ne peut plus être utilisée de cette manière jusqu'à l'aube suivante.",
      en: 'While wearing this cloak, you have Advantage on Dexterity (Stealth) checks. In an area of Dim Light or Darkness, you can grip the edges of the cloak and use it to gain a Fly Speed of 40 feet. If you ever fail to grip the cloak’s edges while flying in this way, or if you are no longer in Dim Light or Darkness, you lose this Fly Speed.\n\nWhile wearing the cloak in an area of Dim Light or Darkness, you can cast Polymorph on yourself, shape-shifting into a Bat. While in that form, you retain your Intelligence, Wisdom, and Charisma scores. The cloak can’t be used this way again until the next dawn.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // cape-de-vol = Wings of Flying (nom FR officiel « Cape de vol »).
    id: 'cape-de-vol',
    name: { fr: 'Cape de vol', en: 'Wings of Flying' },
    category: 'gear',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: "Tant que vous portez cette cape, vous pouvez entreprendre l'action Magie pour la transformer en paire d'ailes dans votre dos. Elles persistent pendant 1 heure, sauf si vous y mettez fin prématurément au prix de l'action Magie. Ces ailes vous octroient une Vitesse de vol de 18 m. Si vous êtes en l'air lorsqu'elles disparaissent, vous tombez. Après leur disparition, vous ne pouvez plus les déployer pendant 1d12 heures.",
      en: 'While wearing this cloak, you can take a Magic action to turn the cloak into a pair of wings on your back. The wings lasts for 1 hour or until you end the effect early as a Magic action. The wings give you a Fly Speed of 60 feet. If you are aloft when the wings disappear, you fall. When the wings disappear, you can’t use them again for 1d12 hours.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'cape-du-prestidigitateur',
    name: { fr: 'Cape du prestidigitateur', en: 'Cape of the Mountebank' },
    category: 'gear',
    rarity: 'rare',
    attunement: false,
    magicDescription: {
      fr: "Cette cape sent légèrement le soufre. Quand vous la portez, vous pouvez l'utiliser pour lancer porte dimensionnelle au prix de l'action Magie. Cette propriété ne peut plus resservir avant l'aube suivante.\n\nEn vous téléportant avec ce sort, vous laissez derrière vous un nuage de fumée. Cette fumée entraîne une Visibilité réduite dans l'espace que vous venez de quitter jusqu'à la fin de votre tour suivant.",
      en: 'This cape smells faintly of brimstone. While wearing it, you can use it to cast Dimension Door as a Magic action. This property can’t be used again until the next dawn.\n\nWhen you teleport with that spell, you leave behind a cloud of smoke. The space you left is Lightly Obscured by that smoke until the end of your next turn.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'manteau-de-resistance-aux-sorts',
    name: { fr: 'Manteau de résistance aux sorts', en: 'Mantle of Spell Resistance' },
    category: 'gear',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: "Vous avez l'Avantage aux jets de sauvegarde contre les sorts quand vous portez ce manteau.",
      en: 'You have Advantage on saving throws against spells while you wear this cloak.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'robe-aux-etoiles',
    name: { fr: 'Robe aux étoiles', en: 'Robe of Stars' },
    category: 'gear',
    rarity: 'very rare',
    attunement: true,
    magicDescription: {
      fr: "De petites étoiles blanches et argentées sont brodées sur cette robe noire ou bleu nuit. Vous recevez un bonus de +1 aux jets de sauvegarde tant que vous la portez.\n\nSix étoiles, situées sur la face avant de la robe, au niveau du col, sont plus grandes que les autres. Tant que vous portez cette robe, vous pouvez entreprendre l'action Magie pour retirer l'une des étoiles et la dépenser afin de lancer projectile magique au 5e niveau. Chaque jour au crépuscule, 1d6 étoiles ainsi retirées réapparaissent sur la robe.\n\nLorsque vous portez la robe, vous pouvez entreprendre l'action Magie pour entrer dans le Plan Astral avec tout ce que vous portez. Vous y restez jusqu'à ce que vous entrepreniez l'action Magie pour retourner sur le plan d'existence où vous étiez auparavant. Vous réapparaissez dans le dernier espace que vous occupiez ou, si celui-ci n'est plus libre, dans l'espace inoccupé le plus proche.",
      en: 'This black or dark-blue robe is embroidered with small white or silver stars. You gain a +1 bonus to saving throws while you wear it.\n\nSix stars, located on the robe’s upper-front portion, are particularly large. While wearing this robe, you can take a Magic action to remove one of the stars and expend it to cast the level 5 version of Magic Missile. Daily at dusk, 1d6 removed stars reappear on the robe.\n\nWhile you wear the robe, you can take a Magic action to enter the Astral Plane along with everything you are wearing and carrying. You remain there until you take a Magic action to return to the plane you were on. You reappear in the last space you occupied or, if that space is occupied, the nearest unoccupied space.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'robe-de-l-archimage',
    name: { fr: "Robe de l'archimage", en: 'Robe of the Archmagi' },
    category: 'gear',
    rarity: 'legendary',
    attunement: {
      fr: 'Harmonisation requise avec un Ensorceleur, Magicien ou Occultiste',
      en: 'Requires Attunement by a Sorcerer, Warlock, or Wizard',
    },
    magicDescription: {
      fr: "Ce vêtement élégant est fait d'une superbe étoffe ornée de runes.\n\nTant que vous portez cette robe, vous recevez les bénéfices suivants :\n\nArmure. Si vous ne portez pas d'armure, votre classe d'armure de base est égale à 15 + votre modificateur de Dextérité.\n\nMagie de guerre. Votre DD de sauvegarde des sorts et votre bonus d'attaque de sort augmentent chacun de 2.\n\nRésistance à la magie. Vous avez l'Avantage aux jets de sauvegarde contre les sorts et autres effets magiques.",
      en: 'This elegant garment is made from exquisite cloth and adorned with runes.\n\nYou gain these benefits while wearing the robe.\n\nArmor. If you aren’t wearing armor, your base Armor Class is 15 plus your Dexterity modifier.\n\nMagic Resistance. You have Advantage on saving throws against spells and other magical effects.\n\nWar Mage. Your spell save DC and spell attack bonus each increase by 2.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // robe-de-vision-totale = Robe of Eyes.
    id: 'robe-de-vision-totale',
    name: { fr: 'Robe de vision totale', en: 'Robe of Eyes' },
    category: 'gear',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: "Cette robe est ornée de motifs représentant des yeux. Tant que vous la portez, vous recevez les bénéfices suivants :\n\nSens spéciaux. Vous disposez de la Vision dans le noir et de la Vision lucide sur 36 m.\n\nVision panoramique. La robe vous confère l'Avantage aux tests de Sagesse (Perception) qui reposent sur la vue.\n\nInconvénients. Le sort lumière lancé sur la robe ou le sort lumière du jour lancé dans un rayon de 1,50 m du vêtement vous fait subir l'état Aveuglé pendant 1 minute. À la fin de chacun de vos tours, vous pouvez effectuer un jet de sauvegarde de Constitution (DD 11 pour lumière, DD 15 pour lumière du jour) et mettez fin à cet état en cas de réussite.",
      en: 'This robe is adorned with eyelike patterns. While you wear the robe, you gain the following benefits:\n\nAll-Around Vision. The robe gives you Advantage on Wisdom (Perception) checks that rely on sight.\n\nSpecial Senses. You have Darkvision and Truesight, both with a range of 120 feet.\n\nDrawbacks. A Light spell cast on the robe or a Daylight spell cast within 5 feet of the robe gives you the Blinded condition for 1 minute. At the end of each of your turns, you make a Constitution saving throw (DC 11 for Light or DC 15 for Daylight), ending the condition on yourself on a success.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // robe-prismatique = Robe of Scintillating Colors.
    id: 'robe-prismatique',
    name: { fr: 'Robe prismatique', en: 'Robe of Scintillating Colors' },
    category: 'gear',
    rarity: 'very rare',
    attunement: true,
    magicDescription: {
      fr: "Cette robe dispose de 3 charges et récupère quotidiennement 1d3 charges dépensées, à l'aube. Lorsque vous la portez, vous pouvez entreprendre l'action Magie et dépenser 1 charge pour y faire apparaître un motif changeant de teintes éblouissantes, jusqu'à la fin de votre tour suivant. Pendant cet intervalle, elle produit une Lumière vive sur un rayon de 9 m et une Lumière faible sur 9 m de plus, et les créatures qui vous voient subissent le Désavantage aux jets d'attaque contre vous. Toute créature dans la zone de Lumière vive, si elle vous voit alors que le pouvoir de la robe est activé, doit réussir un jet de sauvegarde de Sagesse DD 15 sous peine de subir l'état Étourdi jusqu'à ce que l'effet prenne fin.",
      en: 'This robe has 3 charges, and it regains 1d3 expended charges daily at dawn. While you wear it, you can take a Magic action and expend 1 charge to cause the garment to display a shifting pattern of dazzling hues until the end of your next turn. During this time, the robe sheds Bright Light in a 30-foot radius and Dim Light for an additional 30 feet, and creatures that can see you have Disadvantage on attack rolls against you. Any creature in the Bright Light that can see you when the robe’s power is activated must succeed on a DC 15 Wisdom saving throw or have the Stunned condition until the effect ends.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
];

/** Compteurs figés (parse strict côté merge script). */
export const SRD_MAGIC_ITEMS_CLOAKS_COUNTS = {
  total: SRD_MAGIC_ITEMS_CLOAKS.length,
  rare: SRD_MAGIC_ITEMS_CLOAKS.filter((e) => e.rarity === 'rare').length,
  veryRare: SRD_MAGIC_ITEMS_CLOAKS.filter((e) => e.rarity === 'very rare').length,
  legendary: SRD_MAGIC_ITEMS_CLOAKS.filter((e) => e.rarity === 'legendary').length,
  attuned: SRD_MAGIC_ITEMS_CLOAKS.filter((e) => e.attunement !== false).length,
} as const;
