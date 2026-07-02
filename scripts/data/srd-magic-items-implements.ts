/**
 * SRD CC v5.2.1 — Heaumes, gemmes & instruments (9 entrées).
 *
 * Batch D29.16 (backfill EN des magic-items grandfathered AideDD).
 *
 * Sources verbatim :
 *   - EN : `content-sources/extracted/raw/SRD_CC_v5.2.1.txt`
 *     (Crystal Ball l. 21602, Chime of Opening l. 21520, Dimensional Shackles
 *     l. 21823, Gem of Seeing l. 22416, Helm of Brilliance l. 22618, Helm of
 *     Teleportation l. 22673, Iron Bands l. 22901, Mirror of Life Trapping
 *     l. 23140, Rope of Entanglement l. 24489)
 *   - FR : `content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt`
 *     (Boule de cristal l. 25901, Carillon d'ouverture l. 26109, Corde
 *     d'enchevêtrement l. 26458, Gemme de vision l. 27051, Heaume de
 *     téléportation l. 27181, Heaume scintillant l. 27187, Liens de fer l. 27347,
 *     Menottes dimensionnelles l. 27582, Miroir d'emprisonnement l. 27599)
 *
 * Corrections issues du SRD :
 *   - `attunement` : le Heaume de téléportation, le Heaume scintillant, la Gemme
 *     de vision et la Boule de cristal étaient `false` (héritage AideDD) → le SRD
 *     5.2.1 les marque « Requires Attunement » (simple → `true`). Les 5 autres
 *     n'en exigent AUCUNE → restent `false`.
 *   - `name.fr` (DRIFT) : « Liens de fer de Bilarro » → **« Liens de fer »**
 *     (Iron Bands ; le SRD 5.2.1 a laissé tomber le nom propre « Bilarro » ; nom
 *     officiel WotC FR l. 27347). Slug préservé.
 *   - `magicDescription` : reformulé sur la VF officielle SRD. L'ordre des blocs
 *     de propriété du Heaume scintillant diffère entre EN et FR (chaque langue
 *     reproduit SON ordre officiel).
 *
 * Conventions (identiques aux modules D29.1→D29.15) : hyphénations / espacements
 * parasites retirés ; apostrophes FR en ASCII, EN verbatim SRD (quotes courbes) ;
 * `\n\n` entre blocs de propriété.
 */

import type { SrdMagicItemEntry } from './srd-magic-items-potions';

export const SRD_MAGIC_ITEMS_IMPLEMENTS: SrdMagicItemEntry[] = [
  {
    id: 'boule-de-cristal',
    name: { fr: 'Boule de cristal', en: 'Crystal Ball' },
    category: 'gear',
    rarity: 'very rare',
    attunement: true,
    magicDescription: {
      fr: 'Tant que vous touchez cet orbe de cristal, vous pouvez lancer scrutation (DD de sauvegarde 17) par son biais.',
      en: 'While touching this crystal orb, you can cast Scrying (save DC 17) with it.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'carillon-d-ouverture',
    name: { fr: "Carillon d'ouverture", en: 'Chime of Opening' },
    category: 'gear',
    rarity: 'rare',
    attunement: false,
    magicDescription: {
      fr: "Ce tube de métal creux, long d'environ 30 cm, pèse 500 g. Au prix de l'action Magie, vous pouvez tinter le carillon pour lancer déblocage. Le son habituel du sort est remplacé par le tintement clair du carillon, audible à 90 m.\n\nLe carillon peut être utilisé 10 fois. Il se fissure et devient inutilisable après la dixième utilisation.",
      en: 'This hollow metal tube measures about 1 foot long and weighs 1 pound. As a Magic action, you can strike the chime to cast Knock. The spell’s customary knocking sound is replaced by the clear, ringing tone of the chime, which is audible out to 300 feet.\n\nThe chime can be used 10 times. After the tenth time, it cracks and becomes useless.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'corde-d-enchevetrement',
    name: { fr: "Corde d'enchevêtrement", en: 'Rope of Entanglement' },
    category: 'gear',
    rarity: 'rare',
    attunement: false,
    magicDescription: {
      fr: "Cette corde est longue de 9 m. En tenant une extrémité de la corde, vous pouvez entreprendre l'action Magie pour ordonner à l'autre extrémité de se projeter en avant afin d'enchevêtrer une créature que vous voyez dans un rayon de 6 m. La cible doit réussir un jet de sauvegarde de Dextérité DD 15 sous peine de subir l'état Entravé. Vous pouvez libérer la cible en lâchant votre extrémité de la corde (qui se love alors spontanément dans l'espace de la cible) ou en répétant l'ordre par une action Bonus (la corde s'enroule alors dans votre main).\n\nUne cible Entravée par la corde peut consacrer une action à effectuer, au choix, un test de Force (Athlétisme) ou de Dextérité (Acrobaties) DD 15. En cas de réussite, elle n'est plus Entravée par la corde. Si vous tenez toujours la corde lorsqu'une cible s'en échappe, vous pouvez jouer votre Réaction pour ordonner à la corde de s'enrouler dans votre main ; sans cela, elle se love dans l'espace de la cible.\n\nElle présente le profil suivant : CA 20, 20 pv, Immunité contre les dégâts psychiques et de poison. Tant qu'il lui reste au moins 1 point de vie, elle récupère 1 pv toutes les 5 minutes. Une corde qui tombe à 0 pv est détruite.",
      en: 'This rope is 30 feet long. While holding one end of the rope, you can take a Magic action to command the other end to dart forward and entangle one creature you can see within 20 feet of yourself. The target must succeed on a DC 15 Dexterity saving throw or have the Restrained condition. You can release the target by letting go of your end of the rope (causing the rope to coil up in the target’s space) or by using a Bonus Action to repeat the command (causing the rope to coil up in your hand).\n\nA target Restrained by the rope can take an action to make its choice of a DC 15 Strength (Athletics) or Dexterity (Acrobatics) check. On a successful check, the target is no longer Restrained by the rope. If you’re still holding onto the rope when a target escapes from it, you can take a Reaction to command the rope to coil up in your hand; otherwise, the rope coils up in the target’s space.\n\nThe rope has AC 20, HP 20, and Immunity to Poison and Psychic damage. It regains 1 Hit Point every 5 minutes as long as it has at least 1 Hit Point. If the rope drops to 0 Hit Points, it is destroyed.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'gemme-de-vision',
    name: { fr: 'Gemme de vision', en: 'Gem of Seeing' },
    category: 'gear',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: "Cette gemme dispose de 3 charges. Au prix de l'action Magie, vous pouvez dépenser 1 charge. Pendant les 10 prochaines minutes, vous disposez de la Vision lucide sur 36 m lorsque vous regardez à travers la gemme.\n\nLa gemme récupère quotidiennement 1d3 charges dépensées, à l'aube.",
      en: 'This gem has 3 charges. As a Magic action, you can expend 1 charge. For the next 10 minutes, you have Truesight out to 120 feet when you peer through the gem.\n\nThe gem regains 1d3 expended charges daily at dawn.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'heaume-de-teleportation',
    name: { fr: 'Heaume de téléportation', en: 'Helm of Teleportation' },
    category: 'gear',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: "Ce heaume dispose de 3 charges. Tant que vous le portez, vous pouvez dépenser 1 charge pour lancer téléportation par son biais. Le heaume récupère quotidiennement 1d3 charges dépensées, à l'aube.",
      en: 'This helm has 3 charges. While wearing it, you can expend 1 charge to cast Teleport from it. The helm regains 1d3 expended charges daily at dawn.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'heaume-scintillant',
    name: { fr: 'Heaume scintillant', en: 'Helm of Brilliance' },
    category: 'gear',
    rarity: 'very rare',
    attunement: true,
    magicDescription: {
      fr: "Ce heaume étincelant est serti de 1d10 diamants, 2d10 rubis, 3d10 opales de feu et 4d10 opales. Toute gemme extraite du heaume tombe en poussière. Lorsque toutes les gemmes ont été extraites ou détruites, le heaume perd sa magie.\n\nTant que vous portez ce heaume, vous recevez les bénéfices suivants :\n\nFlammes d'opale de feu. Tant qu'il reste au moins une opale de feu au heaume, vous pouvez consacrer l'action Magie à nimber de flammes une arme que vous tenez. Ces flammes émettent une Lumière vive dans un rayon de 3 m et une Lumière faible sur 3 m de plus. Les flammes sont inoffensives pour vous et pour l'arme. Lorsque vous touchez une cible avec l'arme enflammée, elle subit 1d6 dégâts de feu supplémentaires. Les flammes persistent jusqu'à ce que vous les éteigniez par une action Bonus ou que vous rengainiez ou lâchiez l'arme.\n\nLumière diamantine. Tant qu'il lui reste au moins un diamant, le heaume diffuse une Émanation de 9 m. Lorsqu'au moins un Mort-vivant est présent dans cette zone, l'Émanation est remplie de Lumière faible. Tout Mort-vivant qui débute son tour dans cette zone subit 1d6 dégâts radiants.\n\nRésistance rubis. Tant qu'il reste au moins un rubis au heaume, vous bénéficiez de la Résistance aux dégâts de feu.\n\nSorts. Vous pouvez lancer l'un des sorts suivants (DD de sauvegarde 18), en utilisant comme composante l'une des gemmes du heaume du type spécifié : boule de feu (opale de feu), embruns prismatiques (diamant), lumière du jour (opale) ou mur de feu (rubis). La gemme concernée est détruite et disparaît du heaume lorsque le sort est lancé.\n\nSubir des dégâts de feu. Lancez 1d20 si vous portez le heaume et subissez des dégâts de feu après avoir raté un jet de sauvegarde contre un sort. Sur un résultat de 1, le heaume émet des faisceaux de lumière depuis les gemmes restantes, puis il est détruit. Chaque créature prise dans une Émanation de 18 m centrée sur vous doit réussir un jet de sauvegarde de Dextérité DD 17 sous peine d'être frappée par un faisceau lumineux et de subir autant de dégâts radiants que le heaume compte de gemmes.",
      en: 'This helm is set with 1d10 diamonds, 2d10 rubies, 3d10 fire opals, and 4d10 opals. Any gem pried from the helm crumbles to dust. When all the gems are removed or destroyed, the helm loses its magic.\n\nYou gain the following benefits while wearing the helm.\n\nDiamond Light. As long as it has at least one diamond, the helm emits a 30-foot Emanation. When at least one Undead is within that area, the Emanation is filled with Dim Light. Any Undead that starts its turn in that area takes 1d6 Radiant damage.\n\nFire Opal Flames. As long as the helm has at least one fire opal, you can take a Magic action to cause one weapon you are holding to burst into flames. The flames emit Bright Light in a 10-foot radius and Dim Light for an additional 10 feet. The flames are harmless to you and the weapon. When you hit with an attack using the blazing weapon, the target takes an extra 1d6 Fire damage. The flames last until you take a Bonus Action to extinguish them or until you drop or stow the weapon.\n\nRuby Resistance. As long as the helm has at least one ruby, you have Resistance to Fire damage.\n\nSpells. You can cast one of the following spells (save DC 18), using one of the helm’s gems of the specified type as a component: Daylight (opal), Fireball (fire opal), Prismatic Spray (diamond), or Wall of Fire (ruby). The gem is destroyed when the spell is cast and disappears from the helm.\n\nTaking Fire Damage. Roll 1d20 if you are wearing the helm and take Fire damage as a result of failing a saving throw against a spell. On a roll of 1, the helm emits beams of light from its remaining gems and is then destroyed. Each creature within a 60-foot Emanation originating from you must succeed on a DC 17 Dexterity saving throw or be struck by a beam, taking Radiant damage equal to the number of gems in the helm.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // DRIFT nom : « Liens de fer de Bilarro » → « Liens de fer » (le SRD 5.2.1 a
    // laissé tomber le nom propre). Slug préservé.
    id: 'liens-de-fer-de-bilarro',
    name: { fr: 'Liens de fer', en: 'Iron Bands' },
    category: 'gear',
    rarity: 'rare',
    attunement: false,
    magicDescription: {
      fr: "Cette sphère de fer rouillé, d'un diamètre de 7,5 cm, pèse 500 g. Vous pouvez entreprendre l'action Magie pour jeter la sphère sur une créature de taille TG ou inférieure que vous voyez dans un rayon de 18 m. À mesure que la sphère vole vers sa cible, elle se déplie pour former un enchevêtrement de bandes métalliques.\n\nEffectuez un jet d'attaque à distance, le bonus d'attaque étant égal à votre modificateur de Dextérité plus votre bonus de maîtrise. Si l'attaque touche, la cible subit l'état Entravé jusqu'à ce que vous consacriez une action Bonus à la libérer d'une simple instruction. Si vous libérez la cible ou si l'attaque la rate, les bandes se contractent pour reformer la sphère.\n\nUne créature, y compris celle qui est Entravée, peut consacrer une action à toucher les liens de fer pour effectuer un test de Force (Athlétisme) DD 20 afin de les briser. En cas de réussite, l'objet est détruit et la créature Entravée est libérée. En cas d'échec, toutes les autres tentatives de cette même créature échouent automatiquement jusqu'à ce que 24 heures se soient écoulées.\n\nUne fois ces liens utilisés, ils ne peuvent plus resservir avant l'aube suivante.",
      en: 'This rusty iron sphere measures 3 inches in diameter and weighs 1 pound. You can take a Magic action to throw the sphere at a Huge or smaller creature you can see within 60 feet of yourself. As the sphere moves through the air, it opens into a tangle of metal bands.\n\nMake a ranged attack roll with an attack bonus equal to your Dexterity modifier plus your Proficiency Bonus. On a hit, the target has the Restrained condition until you take a Bonus Action to issue a command that releases it. Doing so or missing with the attack causes the bands to contract and become a sphere once more.\n\nA creature that can touch the bands, including the one Restrained, can take an action to make a DC 20 Strength (Athletics) check to break the iron bands. On a successful check, the item is destroyed, and the Restrained creature is freed. On a failed check, any further attempts made by that creature automatically fail until 24 hours have elapsed.\n\nOnce the bands are used, they can’t be used again until the next dawn.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'menottes-dimensionnelles',
    name: { fr: 'Menottes dimensionnelles', en: 'Dimensional Shackles' },
    category: 'gear',
    rarity: 'rare',
    attunement: false,
    magicDescription: {
      fr: "L'action Utilisation vous permet d'employer cet objet pour menotter une créature subissant l'état Neutralisé. Les menottes s'ajustent à toute créature de taille P, M ou G. Ces menottes empêchent la créature menottée de recourir à tout moyen de déplacement extradimensionnel, y compris la téléportation ou le voyage vers un autre plan d'existence. Elles n'empêchent toutefois pas la créature de traverser un portail interdimensionnel.\n\nVous-même et toute créature que vous désignez lorsque vous utilisez ces menottes pouvez consacrer l'action Utilisation à les retirer. Une fois tous les 30 jours, la créature menottée peut effectuer un test de Force (Athlétisme) DD 30. En cas de réussite, elle se libère et détruit les menottes.",
      en: 'You can take a Utilize action to place these shackles on a creature that has the Incapacitated condition. The shackles adjust to fit a creature of Small to Large size. The shackles prevent a creature bound by them from using any method of extradimensional movement, including teleportation or travel to a different plane of existence. They don’t prevent the creature from passing through an interdimensional portal.\n\nYou and any creature you designate when you use the shackles can take a Utilize action to remove them. Once every 30 days, the bound creature can make a DC 30 Strength (Athletics) check. On a successful check, the creature breaks free and destroys the shackles.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'miroir-d-emprisonnement',
    name: { fr: "Miroir d'emprisonnement", en: 'Mirror of Life Trapping' },
    category: 'gear',
    rarity: 'very rare',
    attunement: false,
    magicDescription: {
      fr: "Quand on regarde indirectement dans ce miroir de 1,20 m de haut pour 60 cm de large, on y distingue des reflets fugitifs de créatures. Le miroir pèse 25 kg avec le profil suivant : CA 11, 10 pv, Immunité contre les dégâts psychiques et de poison, Vulnérabilité aux dégâts contondants. Réduit à 0 point de vie, il se brise en mille morceaux, définitivement détruit.\n\nSi le miroir est accroché à une surface verticale et que vous vous trouvez à 1,50 m ou moins de lui, vous pouvez entreprendre l'action Magie et prononcer un mot de commande pour l'activer. Il reste activé jusqu'à ce que vous entrepreniez l'action Magie et répétiez le mot de commande pour le désactiver.\n\nToute créature autre que vous qui voit son reflet dans le miroir activé alors qu'elle se tient dans un rayon de 9 m de l'objet doit réussir un jet de sauvegarde de Charisme DD 15 sous peine d'être emprisonnée, avec tout ce qu'elle porte, dans l'un des douze cachots extradimensionnels du miroir. Une créature qui connaît la nature du miroir effectue ce jet de sauvegarde avec l'Avantage, tandis que les Artificiels réussissent automatiquement le JS.\n\nUn cachot extradimensionnel est un espace infini dans lequel flotte un épais brouillard qui réduit la visibilité à 3 m. Les créatures prisonnières du miroir peuvent se passer de nourriture, de boisson et de sommeil et elles ne vieillissent pas. Une créature prisonnière d'un cachot peut s'en échapper si elle recourt à une magie qui permet de voyager entre les plans. Dans le cas contraire, cette créature est prisonnière du cachot jusqu'à ce qu'elle en soit libérée.\n\nSi le miroir piège une créature alors que ses douze cachots extradimensionnels sont occupés, l'objet libère au hasard une créature emprisonnée pour accueillir le nouveau prisonnier. Une créature libérée apparaît dans un espace inoccupé en vue du miroir, mais de dos par rapport à lui. Si le miroir est brisé, toutes les créatures qu'il emprisonne sont libérées et apparaissent dans des espaces inoccupés à proximité.\n\nDans un rayon de 1,50 m du miroir, vous pouvez entreprendre l'action Magie pour prononcer le nom d'une créature emprisonnée ou le numéro d'un cachot. La créature nommée ou prisonnière du cachot annoncé apparaît sous la forme d'un reflet à la surface du miroir. Vous-même et la créature pouvez alors communiquer.\n\nDe même, vous pouvez entreprendre l'action Magie et utiliser un second mot de commande pour libérer une créature piégée dans le miroir. La créature libérée apparaît, avec tout son équipement, dans l'espace inoccupé le plus proche du miroir, en lui tournant le dos.\n\nPlacer le miroir dans un espace extradimensionnel créé par un sac sans fond, un puits portable ou un objet similaire détruit instantanément les deux objets et ouvre un portail vers le Plan Astral. Ce portail s'ouvre à l'endroit où l'objet a été placé dans l'autre. Toute créature dans un rayon de 3 m du portail, si elle ne dispose pas d'un Abri total, est aspirée et se retrouve en un lieu aléatoire du Plan Astral. Le portail se referme alors. Il est à sens unique et ne peut pas être rouvert.",
      en: 'When this 4-foot-tall, 2-foot-wide mirror is viewed indirectly, its surface shows faint images of creatures. The mirror weighs 50 pounds, and it has AC 11, HP 10, Immunity to Poison and Psychic damage, and Vulnerability to Bludgeoning damage. It shatters and is destroyed when reduced to 0 Hit Points.\n\nIf the mirror is hanging on a vertical surface and you are within 5 feet of it, you can take a Magic action and use a command word to activate it. It remains activated until you take a Magic action and repeat the command word to deactivate it.\n\nAny creature other than you that sees its reflection in the activated mirror while within 30 feet of the mirror must succeed on a DC 15 Charisma saving throw or be trapped, along with anything it is wearing or carrying, in one of the mirror’s twelve extradimensional cells. A creature that knows the mirror’s nature makes the save with Advantage, and Constructs succeed on the save automatically.\n\nAn extradimensional cell is an infinite expanse filled with thick fog that reduces visibility to 10 feet. Creatures trapped in the mirror’s cells don’t age, and they don’t need to eat, drink, or sleep. A creature trapped within a cell can escape using magic that permits planar travel. Otherwise, the creature is confined to the cell until freed.\n\nIf the mirror traps a creature but its twelve extradimensional cells are already occupied, the mirror frees one trapped creature at random to accommodate the new prisoner. A freed creature appears in an unoccupied space within sight of the mirror but facing away from it. If the mirror is shattered, all creatures it contains are freed and appear in unoccupied spaces near it.\n\nWhile within 5 feet of the mirror, you can take a Magic action to name one creature trapped in it or call out a particular cell by number. The creature named or contained in the named cell appears as an image on the mirror’s surface. You and the creature can then communicate.\n\nIn a similar way, you can take a Magic action and use a second command word to free one creature trapped in the mirror. The freed creature appears, along with its possessions, in the unoccupied space nearest to the mirror and facing away from it.\n\nPlacing the mirror inside an extradimensional space created by a Bag of Holding, Portable Hole, or similar item instantly destroys both items and opens a gate to the Astral Plane. The gate originates where the one item was placed inside the other. Any creature within 10 feet of the gate and not behind Total Cover is sucked through it to a random location on the Astral Plane. The gate then closes. The gate is one-way only and can’t be reopened.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
];

/** Compteurs figés (parse strict côté merge script). */
export const SRD_MAGIC_ITEMS_IMPLEMENTS_COUNTS = {
  total: SRD_MAGIC_ITEMS_IMPLEMENTS.length,
  rare: SRD_MAGIC_ITEMS_IMPLEMENTS.filter((e) => e.rarity === 'rare').length,
  veryRare: SRD_MAGIC_ITEMS_IMPLEMENTS.filter((e) => e.rarity === 'very rare').length,
  attuned: SRD_MAGIC_ITEMS_IMPLEMENTS.filter((e) => e.attunement !== false).length,
} as const;
