/**
 * SRD CC v5.2.1 — Armes magiques diverses & munitions (6 entrées).
 *
 * Batch D29.10 (backfill EN des magic-items grandfathered AideDD) — clôt les
 * 25 armes du bundle.
 *
 * Sources verbatim :
 *   - EN : `content-sources/extracted/raw/SRD_CC_v5.2.1.txt`
 *     (Ammunition of Slaying l. 20893, Dragon Slayer l. 21913, Frost Brand
 *     l. 22369, Giant Slayer l. 22424, Oathbow l. 23479, Vicious Weapon l. 25283)
 *   - FR : `content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt`
 *     (Arc du serment l. 24810, Arme brutale l. 24855, Fer gelé l. 26684,
 *     Projectile tueur l. 28310, Tueuse de dragons l. 29496, Tueuse de géants
 *     l. 29502)
 *
 * Corrections issues du SRD :
 *   - `attunement` : l'Arc du serment et le Fer gelé étaient `false` (héritage
 *     AideDD). Le SRD 5.2.1 les marque « Requires Attunement » (simple → `true`).
 *     Corrigé. Les 4 autres (Arme brutale, Projectile tueur, Tueuse de dragons,
 *     Tueuse de géants) n'exigent AUCUNE Harmonisation → restent `false`.
 *   - `name.fr` (DRIFT — généralisation du type d'objet en 5.2.1) :
 *       • « Arme vicieuse » → **« Arme brutale »** (Vicious Weapon ; nom officiel
 *         WotC FR l. 24855).
 *       • « Flèche tueuse » → **« Projectile tueur »** (le SRD 5.2.1 généralise
 *         « Arrow of Slaying » en « Ammunition of Slaying » / « tout type de
 *         munitions » ; nom officiel WotC FR l. 28310). Slugs préservés.
 *   - `magicDescription` : reformulé sur la VF officielle SRD. La table de type
 *     de créature du Projectile tueur est **différente entre les deux éditions**
 *     (EN et FR n'ont ni le même ordre ni les mêmes tranches de d100) : chaque
 *     langue reproduit fidèlement SA table officielle.
 *
 * Conventions (identiques aux modules D29.1→D29.9) : hyphénations de fin de ligne
 * retirées ; apostrophes FR en ASCII, guillemets français « » pour les mots de
 * commande de l'Arc du serment, EN verbatim SRD (quotes courbes) ; `\n\n` entre
 * blocs de propriété ; table de créatures inlinée en énumération.
 */

import type { SrdMagicItemEntry } from './srd-magic-items-potions';

export const SRD_MAGIC_ITEMS_WEAPONS_MISC: SrdMagicItemEntry[] = [
  {
    id: 'arc-du-serment',
    name: { fr: 'Arc du serment', en: 'Oathbow' },
    category: 'weapon',
    rarity: 'very rare',
    attunement: true,
    magicDescription: {
      fr: "Lorsque vous encochez une flèche sur cet arc, il murmure en elfique « Une prompte défaite pour mes ennemis. » Lorsque vous utilisez l'arme pour effectuer une attaque à distance, vous pouvez prononcer ou signer les mots de commande suivants : « Une mort rapide à toi qui m'as fait du tort. » La cible devient votre ennemi désigné et le reste pendant 7 jours, jusqu'à l'aube du dernier jour. Elle ne l'est plus si elle meurt dans l'intervalle. Vous ne pouvez avoir qu'un seul ennemi désigné de ce type à la fois. Lorsque votre ennemi désigné meurt, vous pouvez en désigner un nouveau après l'aube suivante.\n\nLorsque vous effectuez un jet d'attaque à distance avec cette arme contre votre ennemi désigné, vous bénéficiez de l'Avantage sur le jet. De plus, votre cible ne reçoit aucun bénéfice lié à un Abri partiel ou supérieur, et vous ne subissez aucun Désavantage dû à la portée longue. Si l'attaque touche, votre ennemi désigné subit 3d6 dégâts perforants supplémentaires.\n\nTant que votre ennemi désigné est vivant, vous subissez le Désavantage aux jets d'attaque avec toutes les autres armes.",
      en: 'When you nock an arrow on this bow, it whispers in Elvish, “Swift defeat to my enemies.” When you use this weapon to make a ranged attack, you can utter or sign the following command words: “Swift death to you who have wronged me.” The target of your attack becomes your sworn enemy until it dies or until dawn 7 days later. You can have only one such sworn enemy at a time. When your sworn enemy dies, you can choose a new one after the next dawn.\n\nWhen you make a ranged attack roll with this weapon against your sworn enemy, you have Advantage on the roll. In addition, your target gains no benefit from Half Cover or Three-Quarters Cover, and you suffer no Disadvantage due to long range. If the attack hits, your sworn enemy takes an extra 3d6 Piercing damage.\n\nWhile your sworn enemy lives, you have Disadvantage on attack rolls with all other weapons.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // DRIFT : « Arme vicieuse » → « Arme brutale ». Slug préservé.
    id: 'arme-vicieuse',
    name: { fr: 'Arme brutale', en: 'Vicious Weapon' },
    category: 'weapon',
    rarity: 'rare',
    attunement: false,
    magicDescription: {
      fr: "Cette arme magique inflige 2d6 dégâts supplémentaires à toute créature qu'elle touche. Ces dégâts supplémentaires sont du même type que les dégâts normaux de l'arme.",
      en: 'This magic weapon deals an extra 2d6 damage to any creature it hits. This extra damage is of the same type as the weapon’s normal damage.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'fer-gele',
    name: { fr: 'Fer gelé', en: 'Frost Brand' },
    category: 'weapon',
    rarity: 'very rare',
    attunement: true,
    magicDescription: {
      fr: "Lorsque votre jet d'attaque touche avec cette arme magique, la cible subit 1d6 dégâts de froid supplémentaires. En outre et tant que vous tenez l'arme, vous bénéficiez de la Résistance aux dégâts de feu.\n\nLorsqu'il gèle, l'arme émet une Lumière vive sur un rayon de 3 m et une Lumière faible sur 3 m de plus.\n\nEn dégainant cette arme, vous pouvez décider d'éteindre toutes les flammes non magiques dans un rayon de 9 m. Une fois utilisée, cette propriété ne peut plus resservir pendant 1 heure.",
      en: 'When you hit with an attack roll using this magic weapon, the target takes an extra 1d6 Cold damage. In addition, while you hold the weapon, you have Resistance to Fire damage.\n\nIn freezing temperatures, the weapon sheds Bright Light in a 10-foot radius and Dim Light for an additional 10 feet.\n\nWhen you draw this weapon, you can extinguish all nonmagical flames within 30 feet of yourself. Once used, this property can’t be used again for 1 hour.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // DRIFT : « Flèche tueuse » → « Projectile tueur » (Arrow of Slaying →
    // Ammunition of Slaying, généralisé en 5.2.1). Slug préservé.
    id: 'fleche-tueuse',
    name: { fr: 'Projectile tueur', en: 'Ammunition of Slaying' },
    category: 'weapon',
    rarity: 'very rare',
    attunement: false,
    magicDescription: {
      fr: "Ce projectile magique est conçu pour tuer les créatures d'un type donné, que le MJ choisit ou détermine aléatoirement selon la table ci-après. Si la créature de ce type subit des dégâts du projectile, elle effectue un jet de sauvegarde de Constitution DD 17 et subit 6d10 dégâts de force supplémentaires en cas d'échec, la moitié en cas de réussite.\n\nAprès avoir infligé ces dégâts supplémentaires à une créature, le projectile devient non magique.\n\nType de créature (1d100) : Aberrations 01-10, Artificiels 11-15, Bêtes 16-20, Célestes 21-25, Dragons 26-35, Élémentaires 36-45, Fées 46-55, Fiélons 56-65, Géants 66-70, Humanoïdes 71-75, Monstruosités 76-80, Morts-vivants 81-90, Plantes 91-95, Vases 96-00.",
      en: 'This magic ammunition is meant to slay creatures of a particular type, which the GM chooses or determines randomly by rolling on the table below. If a creature of that type takes damage from the ammunition, the creature makes a DC 17 Constitution saving throw, taking an extra 6d10 Force damage on a failed save or half as much extra damage on a successful one.\n\nAfter dealing its extra damage to a creature, the ammunition becomes nonmagical.\n\nCreature Type (1d100): Aberrations 01–10, Beasts 11–15, Celestials 16–20, Constructs 21–25, Dragons 26–35, Elementals 36–45, Humanoids 46–50, Fey 51–60, Fiends 61–70, Giants 71–75, Monstrosities 76–80, Oozes 81–85, Plants 86–90, Undead 91–00.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'tueuse-de-dragons',
    name: { fr: 'Tueuse de dragons', en: 'Dragon Slayer' },
    category: 'weapon',
    rarity: 'rare',
    attunement: false,
    magicDescription: {
      fr: "Vous recevez un bonus de +1 aux jets d'attaque et de dégâts effectués avec cette arme magique.\n\nL'arme inflige 3d6 dégâts supplémentaires du type de l'arme si la cible est un Dragon.",
      en: 'You gain a +1 bonus to attack rolls and damage rolls made with this magic weapon.\n\nThe weapon deals an extra 3d6 damage of the weapon’s type if the target is a Dragon.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'tueuse-de-geants',
    name: { fr: 'Tueuse de géants', en: 'Giant Slayer' },
    category: 'weapon',
    rarity: 'rare',
    attunement: false,
    magicDescription: {
      fr: "Vous recevez un bonus de +1 aux jets d'attaque et de dégâts effectués avec cette arme magique.\n\nQuand vous touchez un Géant avec cette arme, il subit 2d6 dégâts supplémentaires du type associé à l'arme et doit réussir un jet de sauvegarde de Force DD 15 sous peine de subir l'état À terre.",
      en: 'You gain a +1 bonus to attack rolls and damage rolls made with this magic weapon.\n\nWhen you hit a Giant with this weapon, the Giant takes an extra 2d6 damage of the weapon’s type and must succeed on a DC 15 Strength saving throw or have the Prone condition.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
];

/** Compteurs figés (parse strict côté merge script). */
export const SRD_MAGIC_ITEMS_WEAPONS_MISC_COUNTS = {
  total: SRD_MAGIC_ITEMS_WEAPONS_MISC.length,
  rare: SRD_MAGIC_ITEMS_WEAPONS_MISC.filter((e) => e.rarity === 'rare').length,
  veryRare: SRD_MAGIC_ITEMS_WEAPONS_MISC.filter((e) => e.rarity === 'very rare').length,
  attuned: SRD_MAGIC_ITEMS_WEAPONS_MISC.filter((e) => e.attunement !== false).length,
} as const;
