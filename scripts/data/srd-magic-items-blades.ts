/**
 * SRD CC v5.2.1 — Lames magiques spéciales (6 entrées).
 *
 * Batch D29.9 (backfill EN des magic-items grandfathered AideDD).
 *
 * Sources verbatim :
 *   - EN : `content-sources/extracted/raw/SRD_CC_v5.2.1.txt`
 *     (Dagger of Venom l. 21666, Defender l. 21794, Holy Avenger l. 22678, Luck
 *     Blade l. 22984, Nine Lives Stealer l. 23464, Scimitar of Speed l. 24530)
 *   - FR : `content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt`
 *     (Cimeterre de célérité l. 26343, Dague venimeuse l. 26520, Gardienne
 *     l. 27008, Lame porte-bonheur l. 27306, Vengeresse sacrée l. 29525,
 *     Voleuse de vie l. 29540)
 *
 * Corrections issues du SRD :
 *   - `attunement` : 5 des 6 armes étaient `false` dans le bundle (héritage
 *     AideDD). Le SRD 5.2.1 exige l'Harmonisation pour la Gardienne, la Lame
 *     porte-bonheur, la Voleuse de vie et le Cimeterre de célérité (simple →
 *     `true`) et pour la Vengeresse sacrée, qualifiée (« avec un Paladin » →
 *     objet). La **Dague venimeuse** ne l'exige PAS (EN « Weapon (Dagger), Rare »
 *     l. 21667 ; FR « Arme (dague), rare » l. 26521) → reste `false`. Corrigé.
 *   - `name.fr` (DRIFT) :
 *       • « Cimeterre de rapidité » → **« Cimeterre de célérité »** (Scimitar of
 *         Speed ; nom officiel WotC FR l. 26343).
 *       • « Voleuse des neuf vies » → **« Voleuse de vie »** (Nine Lives Stealer ;
 *         nom officiel WotC FR l. 29540 — à ne pas confondre avec l'« Épée voleuse
 *         de vie » = Sword of Life Stealing, item distinct). Slugs préservés.
 *   - `magicDescription` : reformulé sur la VF officielle SRD. Coquille FR
 *     « à chacun de vous tours » → « à chacun de vos tours » corrigée sur le
 *     Cimeterre de célérité.
 *
 * Conventions (identiques aux modules D29.1→D29.8) : hyphénations de fin de ligne
 * retirées ; apostrophes FR en ASCII, EN verbatim SRD (quotes courbes) ; `\n\n`
 * entre blocs de propriété.
 */

import type { SrdMagicItemEntry } from './srd-magic-items-potions';

export const SRD_MAGIC_ITEMS_BLADES: SrdMagicItemEntry[] = [
  {
    id: 'gardienne',
    name: { fr: 'Gardienne', en: 'Defender' },
    category: 'weapon',
    rarity: 'legendary',
    attunement: true,
    magicDescription: {
      fr: "Vous recevez un bonus de +3 aux jets d'attaque et de dégâts effectués avec cette arme magique.\n\nLa première fois que vous attaquez avec l'arme à chacun de vos tours, vous pouvez transférer tout ou partie de son bonus à votre classe d'armure. Vous pouvez par exemple réduire le bonus à vos jets d'attaque et de dégâts à +1 afin de recevoir un bonus de +2 à la CA. Les bonus ajustés restent en vigueur jusqu'au début de votre tour suivant, mais vous devez continuer à tenir l'arme pour recevoir le bonus qu'elle octroie à la CA.",
      en: 'You gain a +3 bonus to attack rolls and damage rolls made with this magic weapon.\n\nThe first time you attack with the weapon on each of your turns, you can transfer some or all of the weapon’s bonus to your Armor Class. For example, you could reduce the bonus to your attack rolls and damage rolls to +1 and gain a +2 bonus to Armor Class. The adjusted bonuses remain in effect until the start of your next turn, although you must hold the weapon to gain a bonus to AC from it.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'lame-porte-bonheur',
    name: { fr: 'Lame porte-bonheur', en: 'Luck Blade' },
    category: 'weapon',
    rarity: 'legendary',
    attunement: true,
    magicDescription: {
      fr: "Vous recevez un bonus de +1 aux jets d'attaque et de dégâts effectués avec cette arme magique. Tant que l'arme est sur vous, vous recevez en outre un bonus de +1 aux jets de sauvegarde.\n\nChance. Si l'arme est sur vous et si vous ne subissez pas l'état Neutralisé, vous pouvez faire appel à sa chance (pas d'action requise) pour relancer un Test d20 raté. Vous devez garder le deuxième jet. Une fois utilisée, cette propriété ne peut plus resservir avant l'aube suivante.\n\nSouhait. L'arme est dotée de 1d3 charges. En la tenant, vous pouvez dépenser 1 charge et lancer souhait par son intermédiaire. Une fois utilisée, cette propriété ne peut plus resservir avant l'aube suivante. L'arme perd cette propriété quand toutes ses charges ont été dépensées.",
      en: 'You gain a +1 bonus to attack rolls and damage rolls made with this magic weapon. While the weapon is on your person, you also gain a +1 bonus to saving throws.\n\nLuck. If the weapon is on your person, you can call on its luck (no action required) to reroll one failed D20 Test if you don’t have the Incapacitated condition. You must use the second roll. Once used, this property can’t be used again until the next dawn.\n\nWish. The weapon has 1d3 charges. While holding it, you can expend 1 charge and cast Wish from it. Once used, this property can’t be used again until the next dawn. The weapon loses this property if it has no charges.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'vengeresse-sacree',
    name: { fr: 'Vengeresse sacrée', en: 'Holy Avenger' },
    category: 'weapon',
    rarity: 'legendary',
    attunement: {
      fr: 'Harmonisation requise avec un Paladin',
      en: 'Requires Attunement by a Paladin',
    },
    magicDescription: {
      fr: "Vous recevez un bonus de +3 aux jets d'attaque et de dégâts effectués avec cette arme magique. Quand vous touchez un Fiélon ou un Mort-vivant avec cette arme, la créature subit 2d10 dégâts radiants supplémentaires.\n\nTant que vous tenez l'arme au clair, elle crée une Émanation de 3 m centrée sur vous. Vous-même et toutes les créatures de l'Émanation qui vous sont Amicales bénéficiez de l'Avantage aux jets de sauvegarde contre les sorts et autres effets magiques. Si vous disposez de 17 niveaux ou plus dans la classe de Paladin, la taille de cette Émanation passe à 9 m.",
      en: 'You gain a +3 bonus to attack rolls and damage rolls made with this magic weapon. When you hit a Fiend or an Undead with it, that creature takes an extra 2d10 Radiant damage.\n\nWhile you hold the drawn weapon, it creates a 10-foot Emanation originating from you. You and all creatures Friendly to you in the Emanation have Advantage on saving throws against spells and other magical effects. If you have 17 or more levels in the Paladin class, the size of the Emanation increases to 30 feet.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // DRIFT : « Voleuse des neuf vies » → « Voleuse de vie ». Slug préservé.
    id: 'voleuse-des-neuf-vies',
    name: { fr: 'Voleuse de vie', en: 'Nine Lives Stealer' },
    category: 'weapon',
    rarity: 'very rare',
    attunement: true,
    magicDescription: {
      fr: "Vous recevez un bonus de +2 aux jets d'attaque et de dégâts effectués avec cette arme magique.\n\nVol de vie. L'arme dispose de 1d8 + 1 charges. Lorsque vous attaquez une créature dotée de moins de 100 points de vie avec cette arme et obtenez un 20 sur le d20 du jet d'attaque, la créature doit réussir un jet de sauvegarde de Constitution DD 15 sous peine de mourir sur-le-champ, l'épée lui arrachant sa force vitale. Les Artificiels et les Morts-vivants réussissent automatiquement ce JS. L'arme perd 1 charge si la créature est tuée. Elle perd cette propriété quand toutes ses charges ont été dépensées.",
      en: 'You gain a +2 bonus to attack rolls and damage rolls made with this magic weapon.\n\nLife Stealing. The weapon has 1d8 + 1 charges. When you attack a creature that has fewer than 100 Hit Points with this weapon and roll a 20 on the d20 for the attack roll, the creature must succeed on a DC 15 Constitution saving throw or be slain instantly as the sword tears its life force from its body. Constructs and Undead succeed on the save automatically. The weapon loses 1 charge if the creature is slain. When the weapon has no charges remaining, it loses this property.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // DRIFT : « Cimeterre de rapidité » → « Cimeterre de célérité ». Slug préservé.
    id: 'cimeterre-de-rapidite',
    name: { fr: 'Cimeterre de célérité', en: 'Scimitar of Speed' },
    category: 'weapon',
    rarity: 'very rare',
    attunement: true,
    magicDescription: {
      fr: "Vous recevez un bonus de +2 aux jets d'attaque et de dégâts effectués avec cette arme magique. Vous pouvez en outre effectuer une attaque avec ce cimeterre par une action Bonus à chacun de vos tours.",
      en: 'You gain a +2 bonus to attack rolls and damage rolls made with this magic weapon. In addition, you can make one attack with it as a Bonus Action on each of your turns.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'dague-venimeuse',
    name: { fr: 'Dague venimeuse', en: 'Dagger of Venom' },
    category: 'weapon',
    rarity: 'rare',
    attunement: false,
    magicDescription: {
      fr: "Vous recevez un bonus de +1 aux jets d'attaque et de dégâts effectués avec cette arme magique.\n\nPar une action Bonus, vous enduisez magiquement la lame de poison. Le poison persiste 1 minute ou jusqu'à ce qu'une attaque avec cette arme touche une créature. Cette créature doit réussir un jet de sauvegarde de Constitution DD 15 sous peine de subir 2d10 dégâts de poison et l'état Empoisonné pendant 1 minute. L'arme ne peut plus resservir de cette manière avant l'aube suivante.",
      en: 'You gain a +1 bonus to attack rolls and damage rolls made with this magic weapon.\n\nYou can take a Bonus Action to magically coat the blade with poison. The poison remains for 1 minute or until an attack using this weapon hits a creature. That creature must succeed on a DC 15 Constitution saving throw or take 2d10 Poison damage and have the Poisoned condition for 1 minute. The weapon can’t be used this way again until the next dawn.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
];

/** Compteurs figés (parse strict côté merge script). */
export const SRD_MAGIC_ITEMS_BLADES_COUNTS = {
  total: SRD_MAGIC_ITEMS_BLADES.length,
  rare: SRD_MAGIC_ITEMS_BLADES.filter((e) => e.rarity === 'rare').length,
  veryRare: SRD_MAGIC_ITEMS_BLADES.filter((e) => e.rarity === 'very rare').length,
  legendary: SRD_MAGIC_ITEMS_BLADES.filter((e) => e.rarity === 'legendary').length,
  attuned: SRD_MAGIC_ITEMS_BLADES.filter((e) => e.attunement !== false).length,
} as const;
