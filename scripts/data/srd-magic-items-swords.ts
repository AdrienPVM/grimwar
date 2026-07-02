/**
 * SRD CC v5.2.1 — Épées / lames magiques (7 entrées).
 *
 * Batch D29.7 (backfill EN des magic-items grandfathered AideDD).
 *
 * Sources verbatim :
 *   - EN : `content-sources/extracted/raw/SRD_CC_v5.2.1.txt`
 *     (section "Magic Items A–Z" : Dancing Sword l. 21680, Flame Tongue l. 22335,
 *     Sun Blade l. 25085, Sword of Life Stealing l. 25107, Sword of Sharpness
 *     l. 25116, Sword of Wounding l. 25126, Vorpal Sword l. 25288)
 *   - FR : `content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt`
 *     (section "Objets magiques de A à Z" : Arme ardente l. 24841, Épée acérée
 *     l. 26571, Épée dansante l. 26581, Épée mordante l. 26605, Épée radieuse
 *     l. 26617, Épée voleuse de vie l. 26641, Épée vorpale l. 26651)
 *
 * Comme D29.1→D29.6, on **remplace l'entrée grandfathered intégralement** par la
 * version officielle SRD 5.2.1 bilingue. Couverture : les 7 épées SRD encore sans
 * `name.en` dans le bundle.
 *
 * Corrections issues du SRD :
 *   - `attunement` : les 7 épées étaient `false` dans le bundle (héritage AideDD).
 *     Le SRD 5.2.1 exige l'Harmonisation pour les 7 (« Requires Attunement »,
 *     sans restriction de classe → `attunement: true`). Corrigé sur les 7.
 *   - `name.fr` (DRIFT MAJEUR) : « Épée ardente » → **« Arme ardente »** pour
 *     Flame Tongue. Le type d'arme est passé de « épée longue » (2014) à
 *     « toute arme de corps à corps » (5.2.1) ; le nom officiel WotC FR n'est
 *     donc plus « Épée ardente » mais « Arme ardente » (EN « Weapon (Any Melee
 *     Weapon) » l. 22336 ; FR « Arme (toute arme de corps à corps) » l. 24842).
 *     Slug `epee-ardente` préservé byte-identique (les 6 autres noms FR étaient
 *     déjà conformes au WotC FR — vérifié l. 26571–26674).
 *   - `magicDescription` : reformulé sur la VF officielle SRD (le bundle portait
 *     la formulation AideDD 2014 divergente ; ex. l'Épée radieuse citait des
 *     valeurs de portée de l'édition 2014).
 *
 * Conventions (identiques aux modules D29.1→D29.6) : hyphénations de fin de ligne
 * retirées ; artefacts de saut de page supprimés (« Document de Référence du
 * Système 5.2.1 / 241 » entre les blocs de l'Épée vorpale) ; apostrophes FR en
 * ASCII, EN verbatim SRD (quotes courbes + tiret cadratin) ; `\n\n` entre blocs
 * de propriété.
 */

import type { SrdMagicItemEntry } from './srd-magic-items-potions';

export const SRD_MAGIC_ITEMS_SWORDS: SrdMagicItemEntry[] = [
  {
    id: 'epee-aceree',
    name: { fr: 'Épée acérée', en: 'Sword of Sharpness' },
    category: 'weapon',
    rarity: 'very rare',
    attunement: true,
    magicDescription: {
      fr: "Lorsque vous attaquez un objet avec cette arme magique et que l'attaque touche, vos dés de dégâts d'arme contre cette cible sont maximisés.\n\nLorsque vous attaquez une créature avec cette arme et obtenez un 20 sur le d20 du jet d'attaque, cette cible subit 14 dégâts tranchants supplémentaires et reçoit 1 niveau d'Épuisement.",
      en: 'When you attack an object with this magic weapon and hit, maximize your weapon damage dice against the target.\n\nWhen you attack a creature with this weapon and roll a 20 on the d20 for the attack roll, that target takes an extra 14 Slashing damage and gains 1 Exhaustion level.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // DRIFT : « Épée ardente » → « Arme ardente » (Flame Tongue est désormais
    // « toute arme de corps à corps » au SRD 5.2.1). Slug préservé.
    id: 'epee-ardente',
    name: { fr: 'Arme ardente', en: 'Flame Tongue' },
    category: 'weapon',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: "Tant que vous tenez cette arme magique, vous pouvez, par une action Bonus et en prononçant son mot de commande, susciter des flammes autour de la partie de l'arme qui inflige des dégâts. Ces flammes projettent une Lumière vive sur un rayon de 12 m et une Lumière faible sur 12 m de plus. Tant que l'arme est nimbée de flammes, elle inflige 2d6 dégâts de feu supplémentaires si l'attaque touche. Ces flammes persistent jusqu'à ce que, par une action Bonus, vous réitériez le mot de commande ou que vous lâchiez, rangiez ou rengainiez l'arme.",
      en: 'While holding this magic weapon, you can take a Bonus Action and use a command word to cause flames to engulf the damage-dealing part of the weapon. These flames shed Bright Light in a 40-foot radius and Dim Light for an additional 40 feet. While the weapon is ablaze, it deals an extra 2d6 Fire damage on a hit. The flames last until you take a Bonus Action to issue the command again or until you drop, stow, or sheathe the weapon.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'epee-dansante',
    name: { fr: 'Épée dansante', en: 'Dancing Sword' },
    category: 'weapon',
    rarity: 'very rare',
    attunement: true,
    magicDescription: {
      fr: "Par une action Bonus, vous lancez cette arme magique en l'air. Ce faisant, l'arme prend son envol avec le vol stationnaire et s'élance sur une distance maximale de 9 m en attaquant la créature de votre choix dans un rayon de 1,50 m d'elle. L'arme utilise votre jet d'attaque et ajoute votre modificateur de caractéristique aux jets de dégâts.\n\nTant que l'épée est en vol stationnaire, vous pouvez par une action Bonus la faire voler sur une distance maximale de 9 m vers un autre endroit situé dans un rayon de 9 m de vous. Dans le cadre de la même action Bonus, vous pouvez ordonner à l'arme d'attaquer une créature dans un rayon de 1,50 m d'elle.\n\nAprès avoir attaqué ainsi une quatrième fois, l'arme file jusqu'à vous en tentant de revenir dans votre main. Si vous n'avez aucune main libre, l'arme tombe au sol dans votre espace. En l'absence de chemin dégagé jusqu'à vous, l'arme se rapproche au maximum puis tombe au sol. Elle cesse également son vol stationnaire si vous l'empoignez ou vous retrouvez à plus de 9 m d'elle.",
      en: 'You can take a Bonus Action to toss this magic weapon into the air. When you do so, the weapon begins to hover, flies up to 30 feet, and attacks one creature of your choice within 5 feet of itself. The weapon uses your attack roll and adds your ability modifier to damage rolls.\n\nWhile the weapon hovers, you can take a Bonus Action to cause it to fly up to 30 feet to another spot within 30 feet of you. As part of the same Bonus Action, you can cause the weapon to attack one creature within 5 feet of the weapon.\n\nAfter the hovering weapon attacks for the fourth time, it flies back to you and tries to return to your hand. If you have no hand free, the weapon falls to the ground in your space. If the weapon has no unobstructed path to you, it moves as close to you as it can and then falls to the ground. It also ceases to hover if you grasp it or are more than 30 feet away from it.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'epee-mordante',
    name: { fr: 'Épée mordante', en: 'Sword of Wounding' },
    category: 'weapon',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: "Lorsque vous touchez une créature avec une attaque utilisant cette arme magique, la cible subit 2d6 dégâts nécrotiques supplémentaires et doit réussir un jet de sauvegarde de Constitution DD 15 sous peine de ne plus pouvoir récupérer de points de vie pendant 1 heure. La cible réitère le JS à la fin de chacun de ses tours et met un terme à l'effet sur elle-même en cas de réussite.",
      en: 'When you hit a creature with an attack using this magic weapon, the target takes an extra 2d6 Necrotic damage and must succeed on a DC 15 Constitution saving throw or be unable to regain Hit Points for 1 hour. The target repeats the save at the end of each of its turns, ending the effect on itself on a success.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'epee-radieuse',
    name: { fr: 'Épée radieuse', en: 'Sun Blade' },
    category: 'weapon',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: "Cet objet se présente comme une simple poignée d'épée.\n\nLame de radiance. Quand vous la tenez en main, vous pouvez en faire surgir une lame de lumière pure ou faire disparaître celle-ci, par une action Bonus. Tant que la lame existe, cette arme magique fonctionne comme une épée longue dotée de la propriété Finesse. Si vous avez la maîtrise des épées courtes ou des épées longues, vous avez aussi celle de cette épée radieuse.\n\nVous recevez un bonus de +2 aux jets d'attaque et de dégâts effectués avec cette arme, qui inflige des dégâts radiants au lieu de dégâts tranchants. Quand vous touchez un Mort-vivant avec cette arme, la cible subit 1d8 dégâts radiants supplémentaires.\n\nLumière du soleil. La lame lumineuse de l'épée émet une Lumière vive sur un rayon de 4,50 m et une Lumière faible sur 4,50 m de plus. Cette lumière est celle du soleil. Tant que la lame persiste, vous pouvez entreprendre l'action Magie pour étendre ou réduire ses rayons de Lumière vive et de Lumière faible de 1,50 m chacun, jusqu'à un maximum de 9 m chacun ou un minimum de 3 m chacun.",
      en: 'This item appears to be a sword hilt.\n\nBlade of Radiance. While grasping the hilt, you can take a Bonus Action to cause a blade of pure radiance to spring into existence or make the blade disappear. While the blade exists, this magic weapon functions as a Longsword with the Finesse property. If you are proficient with Longswords or Shortswords, you are proficient with the Sun Blade.\n\nYou gain a +2 bonus to attack rolls and damage rolls made with this weapon, which deals Radiant damage instead of Slashing damage. When you hit an Undead with it, that target takes an extra 1d8 Radiant damage.\n\nSunlight. The sword’s luminous blade emits Bright Light in a 15-foot radius and Dim Light for an additional 15 feet. The light is sunlight. While the blade persists, you can take a Magic action to expand or reduce its radius of Bright Light and Dim Light by 5 feet each, to a maximum of 30 feet each or a minimum of 10 feet each.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'epee-voleuse-de-vie',
    name: { fr: 'Épée voleuse de vie', en: 'Sword of Life Stealing' },
    category: 'weapon',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: "Lorsque vous attaquez une créature avec cette arme magique et obtenez un 20 sur le d20 du jet d'attaque, la cible subit 15 dégâts nécrotiques supplémentaires si elle n'est ni un Artificiel ni un Mort-vivant, et vous recevez autant de points de vie temporaires que les dégâts nécrotiques infligés.",
      en: 'When you attack a creature with this magic weapon and roll a 20 on the d20 for the attack roll, that target takes an extra 15 Necrotic damage if it isn’t a Construct or an Undead, and you gain Temporary Hit Points equal to the amount of Necrotic damage taken.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'epee-vorpale',
    name: { fr: 'Épée vorpale', en: 'Vorpal Sword' },
    category: 'weapon',
    rarity: 'legendary',
    attunement: true,
    magicDescription: {
      fr: "Vous recevez un bonus de +3 aux jets d'attaque et de dégâts effectués avec cette arme magique. De plus, l'arme passe outre à la Résistance aux dégâts tranchants.\n\nLorsque vous utilisez cette arme pour attaquer une créature dotée d'au moins une tête et que vous obtenez un 20 sur le d20 du jet d'attaque, vous tranchez l'une de ces têtes. La créature meurt si elle ne peut survivre sans cette tête. Une créature est immunisée contre cet effet si elle a l'Immunité contre les dégâts tranchants, n'a pas de tête ou peut s'en passer, ou encore si le MJ estime qu'elle est trop imposante pour que l'arme puisse lui trancher la tête. Une telle créature subit en fait 30 dégâts tranchants supplémentaires sur un tel coup. Si la créature dispose d'une Résistance légendaire, elle peut en dépenser une utilisation quotidienne pour éviter la décapitation, et subit uniquement les dégâts supplémentaires.",
      en: 'You gain a +3 bonus to attack rolls and damage rolls made with this magic weapon. In addition, the weapon ignores Resistance to Slashing damage.\n\nWhen you use this weapon to attack a creature that has at least one head and roll a 20 on the d20 for the attack roll, you cut off one of the creature’s heads. The creature dies if it can’t survive without the lost head. A creature is immune to this effect if it has Immunity to Slashing damage, if it doesn’t have or need a head, or if the GM decides that the creature is too big for its head to be cut off with this weapon. Such a creature instead takes an extra 30 Slashing damage from the hit. If the creature has Legendary Resistance, it can expend one daily use of that trait to avoid losing its head, taking the extra damage instead.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
];

/** Compteurs figés (parse strict côté merge script). */
export const SRD_MAGIC_ITEMS_SWORDS_COUNTS = {
  total: SRD_MAGIC_ITEMS_SWORDS.length,
  rare: SRD_MAGIC_ITEMS_SWORDS.filter((e) => e.rarity === 'rare').length,
  veryRare: SRD_MAGIC_ITEMS_SWORDS.filter((e) => e.rarity === 'very rare').length,
  legendary: SRD_MAGIC_ITEMS_SWORDS.filter((e) => e.rarity === 'legendary').length,
  attuned: SRD_MAGIC_ITEMS_SWORDS.filter((e) => e.attunement !== false).length,
} as const;
