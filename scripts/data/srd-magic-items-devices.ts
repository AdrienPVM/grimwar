/**
 * SRD CC v5.2.1 — Contrôle d'élémentaires, cors, fers & bottes (10 entrées).
 *
 * Batch D29.13 (backfill EN des magic-items grandfathered AideDD).
 *
 * Sources verbatim :
 *   - EN : `content-sources/extracted/raw/SRD_CC_v5.2.1.txt`
 *     (Boots of Levitation l. 21360, Boots of Speed l. 21367, Bowl of Commanding
 *     Water Elementals l. 21396, Brazier of Commanding Fire Elementals l. 21420,
 *     Censer of Controlling Air Elementals l. 21509, Horn of Blasting l. 22692,
 *     Horn of Valhalla l. 22708, Horseshoes of a Zephyr l. 22738, Horseshoes of
 *     Speed l. 22757, Stone of Controlling Earth Elementals l. 25070)
 *   - FR : `content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt`
 *     (Bottes de lévitation l. 25771, Bottes de rapidité l. 25775, Brasero de
 *     contrôle des élémentaires du feu l. 25971, Cor de dévastation l. 26382,
 *     Cor du Valhalla l. 26397, Encensoir de contrôle des élémentaires de l'air
 *     l. 26558, Fers de rapidité l. 26698, Fers du zéphyr l. 26707, Jatte de
 *     contrôle des élémentaires de l'eau l. 27276, Pierre de contrôle des
 *     élémentaires de la terre l. 27813)
 *
 * Corrections issues du SRD :
 *   - `attunement` : les Bottes de lévitation et de rapidité étaient `false`
 *     (héritage AideDD) → le SRD 5.2.1 les marque « Requires Attunement »
 *     (simple → `true`). Les 8 autres n'exigent AUCUNE Harmonisation → restent
 *     `false`.
 *   - `name.fr` (DRIFT) : « Fers de zéphyr » → **« Fers du zéphyr »**
 *     (Horseshoes of a Zephyr ; nom officiel WotC FR l. 26707). Slug préservé.
 *   - `rarity` : le Cor du Valhalla (rare→légendaire selon le métal) et les Fers
 *     du zéphyr conservent la rareté du bundle (`very rare`, valeur représentative
 *     unique — le champ n'accepte pas de rareté variable ; la variabilité du Cor
 *     est détaillée dans la description).
 *   - `magicDescription` : reformulé sur la VF officielle SRD ; tables (Cor du
 *     Valhalla) inlinées.
 *
 * Conventions (identiques aux modules D29.1→D29.12) : hyphénations de fin de ligne
 * et espacements parasites de titre retirés ; apostrophes FR en ASCII, EN verbatim
 * SRD (quotes courbes) ; `\n\n` entre blocs de propriété.
 */

import type { SrdMagicItemEntry } from './srd-magic-items-potions';

export const SRD_MAGIC_ITEMS_DEVICES: SrdMagicItemEntry[] = [
  {
    id: 'bottes-de-levitation',
    name: { fr: 'Bottes de lévitation', en: 'Boots of Levitation' },
    category: 'gear',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: 'Porter ces bottes vous permet de lancer le sort lévitation sur vous-même.',
      en: 'While you wear these boots, you can cast Levitate on yourself.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'bottes-de-rapidite',
    name: { fr: 'Bottes de rapidité', en: 'Boots of Speed' },
    category: 'gear',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: "Tant que vous portez ces bottes, vous pouvez consacrer une action Bonus à faire claquer vos talons l'un contre l'autre. Dès lors, les bottes doublent votre Vitesse et toute créature qui effectue une attaque d'Opportunité contre vous subit le Désavantage à son jet d'attaque. Cet effet prend fin si vous faites de nouveau claquer vos talons.\n\nQuand la propriété des bottes a été utilisée pendant un total de 10 minutes, leur magie cesse de fonctionner jusqu'à ce que vous ayez terminé un Repos long.",
      en: 'While you wear these boots, you can take a Bonus Action to click the boots’ heels together. If you do, the boots double your Speed, and any creature that makes an Opportunity Attack against you has Disadvantage on the attack roll. If you click your heels together again, you end the effect.\n\nWhen you’ve used the boots’ property for a total of 10 minutes, the magic ceases to function for you until you finish a Long Rest.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'brasero-de-controle-des-elementaires-du-feu',
    name: { fr: 'Brasero de contrôle des élémentaires du feu', en: 'Brazier of Commanding Fire Elementals' },
    category: 'gear',
    rarity: 'rare',
    attunement: false,
    magicDescription: {
      fr: "Tant que ce brasero se trouve dans un rayon de 1,50 m de vous, vous pouvez entreprendre l'action Magie pour convoquer un élémentaire du feu. L'élémentaire apparaît en un espace inoccupé aussi près que possible du brasero, comprend les mêmes langues que vous, obéit à vos ordres et joue son tour juste après vous à votre rang d'initiative. Il disparaît au bout de 1 heure, s'il meurt, ou si vous le révoquez par une action Bonus. Le brasero ne peut plus être utilisé de cette manière avant l'aube suivante.",
      en: 'While you are within 5 feet of this brazier, you can take a Magic action to summon a Fire Elemental. The elemental appears in an unoccupied space as close to the brazier as possible, understands your languages, obeys your commands, and takes its turn immediately after you on your Initiative count. The elemental disappears after 1 hour, when it dies, or when you dismiss it as a Bonus Action. The brazier can’t be used this way again until the next dawn.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'encensoir-de-controle-des-elementaires-de-l-air',
    name: { fr: "Encensoir de contrôle des élémentaires de l'air", en: 'Censer of Controlling Air Elementals' },
    category: 'gear',
    rarity: 'rare',
    attunement: false,
    magicDescription: {
      fr: "Entreprendre l'action Magie tout en faisant osciller cet encensoir vous permet de convoquer un élémentaire de l'air. L'élémentaire apparaît en un espace inoccupé aussi près que possible de l'encensoir, comprend les mêmes langues que vous, obéit à vos ordres et joue son tour juste après vous à votre rang d'initiative. Il disparaît au bout de 1 heure ; plus tôt s'il meurt ou si vous le révoquez par une action Bonus. L'encensoir ne peut plus être utilisé de cette manière avant l'aube suivante.",
      en: 'While gently swinging this censer, you can take a Magic action to summon an Air Elemental. The elemental appears in an unoccupied space as close to the censer as possible, understands your languages, obeys your commands, and takes its turn immediately after you on your Initiative count. The elemental disappears after 1 hour, when it dies, or when you dismiss it as a Bonus Action. The censer can’t be used this way again until the next dawn.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'jatte-de-controle-des-elementaires-de-l-eau',
    name: { fr: "Jatte de contrôle des élémentaires de l'eau", en: 'Bowl of Commanding Water Elementals' },
    category: 'gear',
    rarity: 'rare',
    attunement: false,
    magicDescription: {
      fr: "Tant que cette jatte est remplie d'eau et se trouve dans un rayon de 1,50 m, vous pouvez entreprendre l'action Magie pour convoquer un élémentaire de l'eau. L'élémentaire apparaît en un espace inoccupé aussi près que possible de la jatte, comprend les mêmes langues que vous, obéit à vos ordres et joue son tour juste après vous à votre rang d'initiative. Il disparaît au bout de 1 heure, s'il meurt, ou si vous le révoquez par une action Bonus. La jatte ne peut plus être utilisée de cette manière avant l'aube suivante.\n\nLa jatte mesure environ 30 cm de diamètre et 15 de profondeur. Sa contenance est de 12 litres environ.",
      en: 'While this bowl is filled with water and you are within 5 feet of it, you can take a Magic action to summon a Water Elemental. The elemental appears in an unoccupied space as close to the bowl as possible, understands your languages, obeys your commands, and takes its turn immediately after you on your Initiative count. The elemental disappears after 1 hour, when it dies, or when you dismiss it as a Bonus Action. The bowl can’t be used this way again until the next dawn.\n\nThe bowl is about 1 foot in diameter and half as deep. It holds about 3 gallons.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'pierre-de-controle-des-elementaires-de-la-terre',
    name: { fr: 'Pierre de contrôle des élémentaires de la terre', en: 'Stone of Controlling Earth Elementals' },
    category: 'gear',
    rarity: 'rare',
    attunement: false,
    magicDescription: {
      fr: "En maintenant le contact avec cette pierre posée au sol de 2,5 kg, vous pouvez entreprendre l'action Magie pour convoquer un élémentaire de la terre. L'élémentaire apparaît en un espace inoccupé de votre choix dans un rayon de 9 m, obéit à vos ordres et joue son tour aussitôt après vous dans l'ordre d'Initiative. Il disparaît au bout de 1 heure ; plus tôt s'il meurt ou si vous le révoquez par une action Bonus. La pierre ne peut plus resservir de cette manière avant l'aube suivante.",
      en: 'While touching this 5-pound stone to the ground, you can take a Magic action to summon an Earth Elemental. The elemental appears in an unoccupied space you choose within 30 feet of yourself, obeys your commands, and takes its turn immediately after you on your Initiative count. The elemental disappears after 1 hour, when it dies, or when you dismiss it as a Bonus Action. The stone can’t be used this way again until the next dawn.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'cor-de-devastation',
    name: { fr: 'Cor de dévastation', en: 'Horn of Blasting' },
    category: 'gear',
    rarity: 'rare',
    attunement: false,
    magicDescription: {
      fr: "Vous pouvez entreprendre l'action Magie pour souffler dans ce cor, qui émet dans un Cône de 9 m un son tonitruant audible à 180 m. Chaque créature prise dans le Cône effectue un jet de sauvegarde de Constitution DD 15. En cas d'échec, une créature subit 5d8 dégâts de tonnerre, ainsi que l'état Assourdi pendant 1 minute. En cas de réussite, elle subit uniquement la moitié de ces dégâts. Les objets en verre ou en cristal présents dans le Cône et n'étant portés par personne subissent 10d8 dégâts de tonnerre.\n\nChaque utilisation de la magie du cor a 20 % de chances d'en provoquer l'explosion. L'explosion inflige 10d6 dégâts de force à l'utilisateur et détruit le cor.",
      en: 'You can take a Magic action to blow the horn, which emits a thunderous blast in a 30-foot Cone that is audible out to 600 feet. Each creature in the Cone makes a DC 15 Constitution saving throw. On a failed save, a creature takes 5d8 Thunder damage and has the Deafened condition for 1 minute. On a successful save, a creature takes half as much damage only. Glass or crystal objects in the Cone that aren’t being worn or carried take 10d8 Thunder damage.\n\nEach use of the horn’s magic has a 20 percent chance of causing the horn to explode. The explosion deals 10d6 Force damage to the user and destroys the horn.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'cor-du-valhalla',
    name: { fr: 'Cor du Valhalla', en: 'Horn of Valhalla' },
    category: 'gear',
    rarity: 'very rare',
    attunement: false,
    magicDescription: {
      fr: "Souffler dans le cor s'effectue au prix de l'action Magie. En réponse, des esprits guerriers du plan d'Ysgard apparaissent en des espaces inoccupés dans un rayon de 18 m de vous. Chaque esprit utilise le profil berserker et retourne en Ysgard au bout de 1 heure, ou quand il tombe à 0 point de vie. Ces esprits ont l'aspect de combattants vivants et respirants, et bénéficient de l'Immunité contre les états Charmé et Effrayé. Une fois ce cor utilisé, il ne peut plus resservir pendant 7 jours.\n\nQuatre types de cor du Valhalla sont connus, chacun fait d'un métal différent. Le type de cor détermine combien d'esprits répondent à l'invocation, ainsi que l'éventuel prérequis pour son utilisation. Le MJ en choisit le type ou le détermine aléatoirement selon la table suivante.\n\nSi vous soufflez dans le cor sans répondre au prérequis, les esprits invoqués vous attaquent. Si vous remplissez le prérequis, ils sont Amicaux envers vous et vos alliés, et obéissent à vos ordres.\n\nType de cor (1d100) : Argent 01-40, 2 esprits, Aucun ; Airain 41-75, 3 esprits, Maîtrise de toutes les armes courantes ; Bronze 76-90, 4 esprits, Formation au port de toutes les armures intermédiaires ; Fer 91-00, 5 esprits, Maîtrise de toutes les armes de guerre.",
      en: 'You can take a Magic action to blow this horn. In response, warrior spirits from the plane of Ysgard appear in unoccupied spaces within 60 feet of you. Each spirit uses the Berserker stat block and returns to Ysgard after 1 hour or when it drops to 0 Hit Points. The spirits look like living, breathing warriors, and they have Immunity to the Charmed and Frightened conditions. Once you use the horn, it can’t be used again until 7 days have passed.\n\nFour types of Horn of Valhalla are known to exist, each made of a different metal. The horn’s type determines how many spirits it summons, as well as the requirement for its use. The GM chooses the horn’s type or determines it randomly by rolling on the following table.\n\nIf you blow the horn without meeting its requirement, the summoned spirits attack you. If you meet the requirement, they are Friendly to you and your allies and follow your commands.\n\nHorn Type (1d100): Silver 01–40, 2 spirits, None; Brass 41–75, 3 spirits, Proficiency with all Simple weapons; Bronze 76–90, 4 spirits, Training with all Medium armor; Iron 91–00, 5 spirits, Proficiency with all Martial weapons.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'fers-de-rapidite',
    name: { fr: 'Fers de rapidité', en: 'Horseshoes of Speed' },
    category: 'gear',
    rarity: 'rare',
    attunement: false,
    magicDescription: {
      fr: "Ces fers à cheval vont par quatre. Au prix de l'action Magie, vous pouvez mettre l'un des fers au contact du sabot d'un cheval ou d'une créature équivalente : le fer se fixe au sabot. Retirer un fer nécessite également l'action Magie.\n\nSi les quatre fers sont fixés aux sabots de la même créature, la Vitesse de celle-ci augmente de 9 m.",
      en: 'These horseshoes come in a set of four. As a Magic action, you can touch one of the horseshoes to the hoof of a horse or similar creature, whereupon the horseshoe affixes itself to the hoof. Removing a horseshoe also takes a Magic action.\n\nWhile all four horseshoes are attached to the same creature, its Speed is increased by 30 feet.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // DRIFT : « Fers de zéphyr » → « Fers du zéphyr ». Slug préservé.
    id: 'fers-de-zephyr',
    name: { fr: 'Fers du zéphyr', en: 'Horseshoes of a Zephyr' },
    category: 'gear',
    rarity: 'very rare',
    attunement: false,
    magicDescription: {
      fr: "Ces fers à cheval vont par quatre. Au prix de l'action Magie, vous pouvez mettre l'un des fers au contact du sabot d'un cheval ou d'une créature équivalente : le fer se fixe au sabot. Retirer un fer nécessite également l'action Magie.\n\nSi les quatre fers sont fixés aux sabots d'un cheval ou d'une créature équivalente, ils permettent à cette créature de se déplacer normalement tout en flottant 10 cm au-dessus du sol. Cet effet signifie que la créature peut traverser ou survoler des surfaces non solides ou instables, comme l'eau ou la lave. La créature ferrée ne laisse aucune trace et n'est pas soumise au Terrain difficile. Elle peut en outre voyager pendant 12 heures par jour sans recevoir de niveau d'Épuisement.",
      en: 'These horseshoes come in a set of four. As a Magic action, you can touch one of the horseshoes to the hoof of a horse or similar creature, whereupon the horseshoe affixes itself to the hoof. Removing a horseshoe also takes a Magic action.\n\nWhile all four shoes are affixed to the hooves of a horse or similar creature, they allow the creature to move normally while floating 4 inches above a surface. This effect means the creature can cross or stand above nonsolid or unstable surfaces, such as water or lava. The creature leaves no tracks and ignores Difficult Terrain. In addition, the creature can travel for up to 12 hours a day without gaining Exhaustion levels from extended travel.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
];

/** Compteurs figés (parse strict côté merge script). */
export const SRD_MAGIC_ITEMS_DEVICES_COUNTS = {
  total: SRD_MAGIC_ITEMS_DEVICES.length,
  rare: SRD_MAGIC_ITEMS_DEVICES.filter((e) => e.rarity === 'rare').length,
  veryRare: SRD_MAGIC_ITEMS_DEVICES.filter((e) => e.rarity === 'very rare').length,
  attuned: SRD_MAGIC_ITEMS_DEVICES.filter((e) => e.attunement !== false).length,
} as const;
