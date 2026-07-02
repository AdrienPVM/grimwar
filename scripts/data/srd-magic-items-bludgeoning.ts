/**
 * SRD CC v5.2.1 — Masses, marteaux & haches magiques (6 entrées).
 *
 * Batch D29.8 (backfill EN des magic-items grandfathered AideDD).
 *
 * Sources verbatim :
 *   - EN : `content-sources/extracted/raw/SRD_CC_v5.2.1.txt`
 *     (Berserker Axe l. 21322, Dwarven Thrower l. 21974, Hammer of Thunderbolts
 *     l. 22470, Mace of Disruption l. 23002, Mace of Smiting l. 23014, Mace of
 *     Terror l. 23025)
 *   - FR : `content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt`
 *     (Hache du berserker l. 27079, Marteau de tonnerre l. 27441, Marteau volant
 *     des nains l. 27476, Masse d'anéantissement l. 27489, Masse destructrice
 *     l. 27502, Masse terrifiante l. 27514)
 *
 * Corrections issues du SRD :
 *   - `attunement` : 5 des 6 armes étaient `false` dans le bundle (héritage
 *     AideDD). Le SRD 5.2.1 exige l'Harmonisation pour la Hache du berserker, le
 *     Marteau de tonnerre, la Masse d'anéantissement et la Masse terrifiante
 *     (simple → `true`) et pour le Marteau volant des nains, qualifiée (« avec un
 *     nain ou une créature harmonisée avec un ceinturon des nains » → objet). La
 *     **Masse destructrice** ne l'exige PAS (EN « Weapon (Mace), Rare » l. 23015 ;
 *     FR « Arme (masse d'armes), rare » l. 27503) → reste `false`. Corrigé.
 *   - `name.fr` (DRIFT) : « Marteau de lancer nain » → **« Marteau volant des
 *     nains »** (Dwarven Thrower ; nom officiel WotC FR l. 27476). Slug
 *     `marteau-de-lancer-nain` préservé byte-identique. Les 5 autres noms FR
 *     étaient déjà conformes.
 *   - `magicDescription` : reformulé sur la VF officielle SRD.
 *
 * Conventions (identiques aux modules D29.1→D29.7) : hyphénations de fin de ligne
 * retirées ; artefacts de saut de page supprimés (« Document de Référence du
 * Système 5.2.1 / 245 » et « / 248 ») ; apostrophes FR en ASCII, EN verbatim SRD
 * (quotes courbes) ; `\n\n` entre blocs de propriété.
 */

import type { SrdMagicItemEntry } from './srd-magic-items-potions';

export const SRD_MAGIC_ITEMS_BLUDGEONING: SrdMagicItemEntry[] = [
  {
    id: 'hache-du-berserker',
    name: { fr: 'Hache du berserker', en: 'Berserker Axe' },
    category: 'weapon',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: "Vous recevez un bonus de +1 aux jets d'attaque et de dégâts effectués avec cette arme magique. En outre et tant que vous êtes harmonisé avec cette arme, votre maximum de points de vie augmente de 1 par niveau dont vous disposez.\n\nMalédiction. Cette arme est maudite : être harmonisé avec elle vous inflige sa malédiction. Tant que vous êtes maudit, vous refusez de vous séparer de l'arme et la gardez en permanence à portée de main. Vous subissez en outre le Désavantage aux jets d'attaque effectués avec une autre arme que celle-ci.\n\nChaque fois qu'une autre créature vous inflige des dégâts alors que la hache est en votre possession, vous devez réussir un jet de sauvegarde de Sagesse DD 15 sous peine de devenir fou furieux. Cet état prend fin si vous commencez votre tour sans aucune créature que vous voyez ni n'entendez dans un rayon de 18 m.\n\nTant que cette folie persiste, vous considérez la créature la plus proche de vous, parmi celles que vous voyez ou entendez, comme un ennemi. Si plusieurs créatures sont concernées, choisissez-en une au hasard. À chacun de vos tours, vous devez vous rapprocher le plus possible de la créature et entreprendre l'action Attaque, en prenant cette créature pour cible. Si vous ne parvenez pas à vous approcher suffisamment de la créature pour l'attaquer avec l'arme, votre tour se termine après épuisement de votre déplacement disponible. Si la créature meurt ou que vous ne la voyez et ne l'entendez plus, la plus proche créature valide parmi celles que vous voyez ou entendez devient votre nouvelle cible.",
      en: 'You gain a +1 bonus to attack rolls and damage rolls made with this magic weapon. In addition, while you are attuned to this weapon, your Hit Point maximum increases by 1 for each level you have attained.\n\nCurse. This weapon is cursed, and becoming attuned to it extends the curse to you. As long as you remain cursed, you are unwilling to part with the weapon, keeping it within reach at all times. You also have Disadvantage on attack rolls with weapons other than this one.\n\nWhenever another creature damages you while the weapon is in your possession, you must succeed on a DC 15 Wisdom saving throw or go berserk. This berserk state ends when you start your turn and there are no creatures within 60 feet of you that you can see or hear.\n\nWhile berserk, you regard the creature nearest to you that you can see or hear as your enemy. If there are multiple possible creatures, choose one at random. On each of your turns, you must move as close to the creature as possible and take the Attack action, targeting the creature. If you’re unable to get close enough to the creature to attack it with the weapon, your turn ends after you’ve used up all your available movement. If the creature dies or can no longer be seen or heard by you, the next nearest creature that you can see or hear becomes your new target.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // DRIFT : « Marteau de lancer nain » → « Marteau volant des nains ». Slug
    // préservé. Harmonisation qualifiée (nain / ceinturon des nains).
    id: 'marteau-de-lancer-nain',
    name: { fr: 'Marteau volant des nains', en: 'Dwarven Thrower' },
    category: 'weapon',
    rarity: 'very rare',
    attunement: {
      fr: 'Harmonisation requise avec un nain ou une créature harmonisée avec un ceinturon des nains',
      en: 'Requires Attunement by a Dwarf or a Creature Attuned to a Belt of Dwarvenkind',
    },
    magicDescription: {
      fr: "Vous recevez un bonus de +3 aux jets d'attaque et de dégâts effectués avec cette arme magique. Elle est dotée de la propriété Lancer avec une portée normale de 6 m et une portée longue de 18 m. Lorsque vous touchez avec une attaque à distance à l'aide de cette arme, celle-ci inflige 1d8 dégâts de force supplémentaires (2d8 si la cible est un Géant). Aussitôt après avoir touché ou raté sa cible, l'arme revient dans votre main.",
      en: 'You gain a +3 bonus to attack rolls and damage rolls made with this magic weapon. It has the Thrown property with a normal range of 20 feet and a long range of 60 feet. When you hit with a ranged attack using this weapon, it deals an extra 1d8 Force damage, or an extra 2d8 Force damage if the target is a Giant. Immediately after hitting or missing, the weapon flies back to your hand.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'marteau-de-tonnerre',
    name: { fr: 'Marteau de tonnerre', en: 'Hammer of Thunderbolts' },
    category: 'weapon',
    rarity: 'legendary',
    attunement: true,
    magicDescription: {
      fr: "Vous recevez un bonus de +1 aux jets d'attaque et de dégâts effectués avec cette arme magique.\n\nL'arme dispose de 5 charges. Vous pouvez dépenser 1 charge et effectuer une attaque à distance avec cette arme, en la lançant comme si elle était dotée de la propriété Lancer avec une portée normale de 6 m et une portée longue de 18 m. Si l'attaque touche, l'arme fait retentir un coup de tonnerre audible dans un rayon de 90 m. La cible et toutes les créatures dans un rayon de 9 m d'elle doivent réussir un jet de sauvegarde de Constitution DD 17 sous peine de subir l'état Étourdi jusqu'à la fin de votre tour suivant. Aussitôt après avoir touché ou raté sa cible, l'arme revient dans votre main. L'arme récupère quotidiennement 1d4 + 1 charges dépensées, à l'aube.\n\nSouveraineté gigante. Tant que persiste votre Harmonisation avec l'arme et que vous portez un ceinturon de force de géant ou des gantelets de puissance d'ogre également soumis à votre Harmonisation, vous recevez les bénéfices suivants :\n\nFléau des géants. Lorsque vous obtenez un 20 sur le d20 d'un jet d'attaque effectué avec cette arme contre un Géant, la créature doit réussir un jet de sauvegarde de Constitution DD 17 sous peine de mourir sur le coup.\n\nPuissance gigante. La valeur de Force octroyée par votre ceinturon de force de géant ou vos gantelets de puissance d'ogre augmente de 4, jusqu'à un maximum de 30.",
      en: 'You gain a +1 bonus to attack rolls and damage rolls made with this magic weapon.\n\nThe weapon has 5 charges. You can expend 1 charge and make a ranged attack with the weapon, hurling it as if it had the Thrown property with a normal range of 20 feet and a long range of 60 feet. If the attack hits, the weapon unleashes a thunderclap audible out to 300 feet. The target and every creature within 30 feet of it other than you must succeed on a DC 17 Constitution saving throw or have the Stunned condition until the end of your next turn. Immediately after hitting or missing, the weapon flies back to your hand. The weapon regains 1d4 + 1 expended charges daily at dawn.\n\nGiant’s Bane. While you are attuned to the weapon and wearing either a Belt of Giant Strength or Gauntlets of Ogre Power to which you are also attuned, you gain the following benefits:\n\nGiants’ Bane. When you roll a 20 on the d20 for an attack roll made with this weapon against a Giant, the creature must succeed on a DC 17 Constitution saving throw or die.\n\nMight of Giants. The Strength score bestowed by your Belt of Giant Strength or Gauntlets of Ogre Power increases by 4, to a maximum of 30.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'masse-d-aneantissement',
    name: { fr: "Masse d'anéantissement", en: 'Mace of Disruption' },
    category: 'weapon',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: "Quand vous touchez un Fiélon ou un Mort-vivant avec cette arme magique, cette créature subit 2d6 dégâts radiants supplémentaires. S'il reste 25 points de vie ou moins à la cible après application de ces dégâts, elle doit réussir un jet de sauvegarde de Sagesse DD 15 sous peine d'être détruite. En cas de réussite, la créature subit toutefois l'état Effrayé jusqu'à la fin de votre tour suivant.\n\nLumière. Tant que vous tenez cette arme en main, elle émet une Lumière vive sur un rayon de 6 m et une Lumière faible sur 6 m de plus.",
      en: 'When you hit a Fiend or an Undead with this magic weapon, that creature takes an extra 2d6 Radiant damage. If the target has 25 Hit Points or fewer after taking this damage, it must succeed on a DC 15 Wisdom saving throw or be destroyed. On a successful save, the creature has the Frightened condition until the end of your next turn.\n\nLight. While you hold this weapon, it sheds Bright Light in a 20-foot radius and Dim Light for an additional 20 feet.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'masse-destructrice',
    name: { fr: 'Masse destructrice', en: 'Mace of Smiting' },
    category: 'weapon',
    rarity: 'rare',
    attunement: false,
    magicDescription: {
      fr: "Vous recevez un bonus de +1 aux jets d'attaque et de dégâts effectués avec cette arme magique. Ce bonus passe à +3 lorsque vous utilisez l'arme pour attaquer un Artificiel.\n\nLorsque vous obtenez un 20 sur un jet d'attaque effectué avec cette arme, la cible subit 7 dégâts contondants supplémentaires, ou 14 dégâts contondants supplémentaires s'il s'agit d'un Artificiel. Tout Artificiel qui se retrouve avec 25 points de vie ou moins après application de ces dégâts est détruit.",
      en: 'You gain a +1 bonus to attack rolls and damage rolls made with this magic weapon. The bonus increases to +3 when you use the weapon to attack a Construct.\n\nWhen you roll a 20 on an attack roll made with this weapon, the target takes an extra 7 Bludgeoning damage, or 14 Bludgeoning damage if it’s a Construct. If a Construct has 25 Hit Points or fewer after taking this damage, it is destroyed.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'masse-terrifiante',
    name: { fr: 'Masse terrifiante', en: 'Mace of Terror' },
    category: 'weapon',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: "Cette arme magique dispose de 3 charges et récupère quotidiennement 1d3 charges dépensées, à l'aube. En tenant l'arme, vous pouvez entreprendre l'action Magie et dépenser 1 charge pour en libérer une vague de terreur. Chaque créature de votre choix dans un rayon de 9 m doit réussir un jet de sauvegarde de Sagesse DD 15 sous peine de subir l'état Effrayé pendant 1 minute. Une créature ainsi Effrayée doit consacrer ses tours à tenter de s'éloigner le plus possible de vous, et elle ne peut pas effectuer d'attaques d'Opportunité. Dans le cadre d'une action, elle ne peut entreprendre que Pointe ou tenter de se libérer d'un effet qui l'empêche de se déplacer. Si elle n'a nulle part où aller, elle peut entreprendre l'action Esquive. La créature réitère le JS à la fin de chacun de ses tours et met un terme à l'effet sur elle-même en cas de réussite.",
      en: 'This magic weapon has 3 charges and regains 1d3 expended charges daily at dawn. While holding the weapon, you can take a Magic action and expend 1 charge to release a wave of terror from it. Each creature of your choice within 30 feet of you must succeed on a DC 15 Wisdom saving throw or have the Frightened condition for 1 minute. While Frightened in this way, a creature must spend its turns trying to move as far away from you as it can, and it can’t make Opportunity Attacks. For its action, it can use only the Dash action or try to escape from an effect that prevents it from moving. If it has nowhere it can move, the creature can take the Dodge action. At the end of each of its turns, a creature repeats the save, ending the effect on itself on a success.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
];

/** Compteurs figés (parse strict côté merge script). */
export const SRD_MAGIC_ITEMS_BLUDGEONING_COUNTS = {
  total: SRD_MAGIC_ITEMS_BLUDGEONING.length,
  rare: SRD_MAGIC_ITEMS_BLUDGEONING.filter((e) => e.rarity === 'rare').length,
  veryRare: SRD_MAGIC_ITEMS_BLUDGEONING.filter((e) => e.rarity === 'very rare').length,
  legendary: SRD_MAGIC_ITEMS_BLUDGEONING.filter((e) => e.rarity === 'legendary').length,
  attuned: SRD_MAGIC_ITEMS_BLUDGEONING.filter((e) => e.attunement !== false).length,
} as const;
