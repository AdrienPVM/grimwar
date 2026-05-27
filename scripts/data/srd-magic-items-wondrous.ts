/**
 * SRD CC v5.2.1 — Wondrous wearables Common + Uncommon (24 entrées).
 *
 * Sources verbatim :
 *   - EN : `content-sources/extracted/raw/SRD_CC_v5.2.1.txt`
 *     (section "Magic Items A–Z", ligne 20866)
 *   - FR : `content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt`
 *     (section "Objets magiques de A à Z", ligne 24359)
 *
 * Cf. plan `plans/C-magic-items-srd-common-uncommon.md` (tracer-bullet C.2).
 *
 * Scope C.2 : wondrous items portés sur le corps (bottes, gants, gantelets,
 * heaumes, capes, chapeaux, broches, bracelets, bandeaux, robes, lunettes,
 * yeux, chaussons, diadèmes). Les wondrous "utilitaires" (sacs, balais,
 * carafes, poudres, gemmes, pipes, etc.) iront en C.6. Anneaux + amulettes
 * iront en C.3.
 *
 * Politique :
 *   - Slugs préservés byte-identique aux entrées grandfathered du bundle pour
 *     éviter toute rupture référentielle (cf. C.1 pattern). Aucune création
 *     de slug nouveau quand un slug existant matche le concept SRD.
 *   - `name.fr` aligné sur la traduction officielle WotC FR du SRD FR 5.2.1.
 *     Drifts corrigés :
 *       * `lunettes-de-nuit` : "Lunettes de nuit" → "Lunettes du nyctalope"
 *       * `yeux-grossissants` : "Yeux grossissants" → "Lentilles de netteté"
 *   - `magicDescription` reprend intégralement la formulation officielle SRD FR.
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

export const SRD_MAGIC_ITEMS_WONDROUS: SrdMagicItemEntry[] = [
  // ─── Bandeau / Bracelets / Broche ─────────────────────────────────
  {
    id: 'bandeau-d-intelligence',
    name: { fr: "Bandeau d'intelligence", en: 'Headband of Intellect' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: true,
    magicDescription: {
      fr: 'Votre Intelligence est de 19 tant que vous portez ce bandeau. Il est sans effet sur vous si votre Intelligence est déjà supérieure ou égale à 19.',
      en: 'Your Intelligence is 19 while you wear this headband. It has no effect on you if your Intelligence is 19 or higher without it.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'bracelets-d-archer',
    name: { fr: "Bracelets d'archer", en: 'Bracers of Archery' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: true,
    magicDescription: {
      fr: "Tant que vous portez ces bracelets, vous avez la maîtrise de l'arc long et de l'arc court, et recevez un bonus de +2 aux jets de dégâts effectués avec ces armes.",
      en: 'While wearing these bracers, you have proficiency with the Longbow and Shortbow, and you gain a +2 bonus to damage rolls made with such weapons.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'broche-de-defense',
    name: { fr: 'Broche de défense', en: 'Brooch of Shielding' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: true,
    magicDescription: {
      fr: "Tant que vous portez cette broche, vous bénéficiez de la Résistance aux dégâts de force et de l'Immunité contre les dégâts du sort projectile magique.",
      en: 'While wearing this brooch, you have Resistance to Force damage, and you have Immunity to damage from the Magic Missile spell.',
    },
    description: null,
    source: 'srd-5.2.1',
  },

  // ─── Bottes (4) ────────────────────────────────────────────────────
  {
    id: 'bottes-ailees',
    name: { fr: 'Bottes ailées', en: 'Winged Boots' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: true,
    magicDescription: {
      fr: "Ces bottes disposent de 4 charges et récupèrent quotidiennement 1d4 charges dépensées, à l'aube. Tant qu'elles vous chaussent, vous pouvez entreprendre l'action Magie pour dépenser 1 charge et recevoir une Vitesse de vol de 9 m pendant 1 heure. Si vous volez au moment où la durée expire, vous descendez à une vitesse de 9 m par round jusqu'à ce que vous touchiez terre.",
      en: 'These boots have 4 charges and regain 1d4 expended charges daily at dawn. While wearing the boots, you can take a Magic action to expend 1 charge, gaining a Fly Speed of 30 feet for 1 hour. If you are flying when the duration expires, you descend at a rate of 30 feet per round until you land.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'bottes-de-sept-lieues',
    name: { fr: 'Bottes de sept lieues', en: 'Boots of Striding and Springing' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: true,
    magicDescription: {
      fr: "Tant que vous portez ces bottes, votre Vitesse devient 9 m sauf si elle est déjà supérieure, et elle n'est pas réduite par le fait de porter un poids supérieur à votre capacité de charge ni une armure lourde.\n\nUne fois à chacun de vos tours, vous pouvez effectuer un saut de 9 m maximum en ne dépensant que 3 m de déplacement.",
      en: "While you wear these boots, your Speed becomes 30 feet unless your Speed is higher, and your Speed isn't reduced by you carrying weight in excess of your carrying capacity or wearing Heavy Armor.\n\nOnce on each of your turns, you can jump up to 30 feet by spending only 10 feet of movement.",
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'bottes-des-terres-gelees',
    name: { fr: 'Bottes des terres gelées', en: 'Boots of the Winterlands' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: true,
    magicDescription: {
      fr: "Ces confortables bottes fourrées gardent les pieds au chaud. Tant que vous les portez, vous recevez les bénéfices suivants :\n\nArpenteur de l'hiver. Vous ne tenez pas compte du Terrain difficile créé par la glace et la neige.\n\nRésistance au froid. Vous bénéficiez de la Résistance aux dégâts de froid et tolérez les températures inférieures à –18 °C sans protection supplémentaire.",
      en: 'These furred boots are snug and feel warm. While wearing them, you gain the following benefits.\n\nCold Resistance. You have Resistance to Cold damage and can tolerate temperatures of 0 degrees Fahrenheit or lower without any additional protection.\n\nWinter Strider. You ignore Difficult Terrain created by ice or snow.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'bottes-elfiques',
    name: { fr: 'Bottes elfiques', en: 'Boots of Elvenkind' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Tant que vous portez ces bottes, vos pas restent silencieux, quelle que soit la surface que vous foulez. Vous avez l'Avantage aux tests de Dextérité (Discrétion).",
      en: 'While you wear these boots, your steps make no sound, regardless of the surface you are moving across. You also have Advantage on Dexterity (Stealth) checks.',
    },
    description: null,
    source: 'srd-5.2.1',
  },

  // ─── Capes (3) ─────────────────────────────────────────────────────
  {
    id: 'cape-de-la-raie-manta',
    name: { fr: 'Cape de la raie manta', en: 'Cloak of the Manta Ray' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: true,
    magicDescription: {
      fr: "Tant que vous portez cette cape, vous pouvez respirer sous l'eau et disposez d'une Vitesse de nage de 18 m.",
      en: 'While wearing this cloak, you can breathe underwater, and you have a Swim Speed of 60 feet.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'cape-de-protection',
    name: { fr: 'Cape de protection', en: 'Cloak of Protection' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: true,
    magicDescription: {
      fr: "Vous recevez un bonus de +1 à la classe d'armure et aux jets de sauvegarde tant que vous portez cette cape.",
      en: 'You gain a +1 bonus to Armor Class and saving throws while you wear this cloak.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'cape-elfique',
    name: { fr: 'Cape elfique', en: 'Cloak of Elvenkind' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: true,
    magicDescription: {
      fr: "Tant que vous portez cette cape, tout test de Sagesse (Perception) effectué pour vous repérer subit le Désavantage, et vous bénéficiez de l'Avantage à vos tests de Dextérité (Discrétion).",
      en: 'While you wear this cloak, Wisdom (Perception) checks made to perceive you have Disadvantage, and you have Advantage on Dexterity (Stealth) checks.',
    },
    description: null,
    source: 'srd-5.2.1',
  },

  // ─── Chapeau / Chaussons / Diadème ────────────────────────────────
  {
    id: 'chapeau-de-deguisement',
    name: { fr: 'Chapeau de déguisement', en: 'Hat of Disguise' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: true,
    magicDescription: {
      fr: 'Tant que vous portez ce chapeau sur la tête, vous pouvez lancer le sort déguisement. Le sort prend fin si vous ne coiffez plus le chapeau.',
      en: 'While wearing this hat, you can cast the Disguise Self spell. The spell ends if the hat is removed.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'chaussons-de-pattes-d-araignee',
    name: { fr: "Chaussons de l'araignée", en: 'Slippers of Spider Climbing' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: true,
    magicDescription: {
      fr: "Tant que vous portez ces chaussures légères, vous pouvez vous déplacer dans toutes les directions le long des surfaces verticales, ainsi que sur les plafonds, tout en gardant les mains libres. Vous bénéficiez d'une Vitesse d'escalade égale à votre Vitesse. Toutefois, ces chaussons ne facilitent en rien les déplacements sur une surface glissante, couverte d'huile ou de glace par exemple.",
      en: "While you wear these light shoes, you can move up, down, and across vertical surfaces and along ceilings, while leaving your hands free. You have a Climb Speed equal to your Speed. However, the slippers don't allow you to move this way on a slippery surface, such as one covered by ice or oil.",
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'diademe-de-destruction',
    name: { fr: 'Diadème de destruction', en: 'Circlet of Blasting' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Tant que vous portez ce diadème, vous pouvez lancer rayon ardent par son biais (+5 pour toucher). Le diadème ne peut alors plus relancer ce sort avant l'aube suivante.",
      en: 'While wearing this circlet, you can cast Scorching Ray with it (+5 to hit). The circlet can’t cast this spell again until the next dawn.',
    },
    description: null,
    source: 'srd-5.2.1',
  },

  // ─── Gantelets / Gants (4) ─────────────────────────────────────────
  {
    id: 'gantelets-de-puissance-d-ogre',
    name: { fr: "Gantelets de puissance d'ogre", en: 'Gauntlets of Ogre Power' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: true,
    magicDescription: {
      fr: 'Votre Force passe à 19 tant que vous portez ces gantelets. Ils restent sans effet sur vous si votre Force est supérieure ou égale à 19 sans que vous les portiez.',
      en: 'Your Strength is 19 while you wear these gauntlets. They have no effect on you if your Strength is 19 or higher without them.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'gants-de-nage-et-d-escalade',
    name: { fr: "Gants de nage et d'escalade", en: 'Gloves of Swimming and Climbing' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: true,
    magicDescription: {
      fr: "Tant que vous portez ces gants, vous recevez une Vitesse d'escalade et une Vitesse de nage égales à votre Vitesse, ainsi qu'un bonus de +5 aux tests de Force (Athlétisme) visant à escalader ou nager.",
      en: 'While wearing these gloves, you have a Climb Speed and a Swim Speed equal to your Speed, and you gain a +5 bonus to Strength (Athletics) checks made to climb or swim.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // Nouveau slug (Gloves of Thievery absent du bundle baseline AideDD).
    id: 'gants-de-chapardeur',
    name: { fr: 'Gants de chapardeur', en: 'Gloves of Thievery' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: 'Une fois enfilés, ces gants sont imperceptibles. Tant que vous les portez, vous recevez un bonus de +5 à vos tests de Dextérité (Escamotage).',
      en: 'These gloves are imperceptible while worn. While wearing them, you gain a +5 bonus to Dexterity (Sleight of Hand) checks.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'gants-piegeurs-de-projectiles',
    name: { fr: 'Gants piégeurs de projectiles', en: 'Gloves of Missile Snaring' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: true,
    magicDescription: {
      fr: "Si un jet d'attaque vous touche avec une arme à distance ou dotée de la propriété Lancer alors que vous portez ces gants, jouer votre Réaction vous permet de réduire les dégâts subis de 1d10 + votre modificateur de Dextérité à condition d'avoir une main libre. Si vous réduisez ces dégâts à 0, vous pouvez attraper l'arme (ou le projectile) si ses dimensions vous permettent de la tenir.",
      en: "If you're hit by an attack roll made with a Ranged or Thrown weapon while wearing these gloves, you can take a Reaction to reduce the damage by 1d10 plus your Dexterity modifier if you have a free hand. If you reduce the damage to 0, you can catch the ammunition or weapon if it is small enough for you to hold in that hand.",
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // Slug `regard-charmeur` correspond à "Eyes of Charming" — pas un gant
    // mais un wondrous oculaire ; classé ici car SRD le regroupe avec les
    // autres "Eyes of X". Gardé byte-identique.
    id: 'regard-charmeur',
    name: { fr: 'Regard charmeur', en: 'Eyes of Charming' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: true,
    magicDescription: {
      fr: "Ces lentilles en cristal s'appliquent sur les yeux. Elles disposent de 3 charges. Tant que vous les portez, vous pouvez dépenser 1 ou plusieurs charges pour lancer charme-personne (DD de sauvegarde 13). Avec 1 charge, vous lancez le sort au 1ᵉʳ niveau. Chaque charge supplémentaire que vous dépensez augmente de 1 le niveau du sort. Les lentilles récupèrent quotidiennement toutes les charges dépensées, à l'aube.",
      en: "These crystal lenses fit over the eyes. They have 3 charges. While wearing them, you can expend 1 or more charges to cast Charm Person (save DC 13). For 1 charge, you cast the level 1 version of the spell. You increase the spell's level by one for each additional charge you expend. The lenses regain all expended charges daily at dawn.",
    },
    description: null,
    source: 'srd-5.2.1',
  },

  // ─── Heaumes (2) ───────────────────────────────────────────────────
  {
    id: 'heaume-de-comprehension-des-langues',
    name: { fr: 'Heaume de compréhension des langues', en: 'Helm of Comprehending Languages' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: 'Tant que vous portez ce heaume, vous pouvez lancer compréhension des langues par son biais.',
      en: 'While wearing this helm, you can cast Comprehend Languages from it.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'heaume-de-telepathie',
    name: { fr: 'Heaume de télépathie', en: 'Helm of Telepathy' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: true,
    magicDescription: {
      fr: "Tant que vous portez ce heaume, vous bénéficiez de la télépathie à une portée de 9 m, et pouvez lancer détection des pensées ou suggestion (DD de sauvegarde 13) par le biais du heaume. Dès que l'un de ces sorts a été lancé par le biais du heaume, il ne peut plus être lancé via cet objet avant l'aube suivante.",
      en: "While wearing this helm, you have telepathy with a range of 30 feet, and you can cast Detect Thoughts or Suggestion (save DC 13) from the helm. Once either spell is cast from the helm, that spell can't be cast from it again until the next dawn.",
    },
    description: null,
    source: 'srd-5.2.1',
  },

  // ─── Lunettes + Yeux (3) ──────────────────────────────────────────
  {
    // Drift FR corrigé : "Lunettes de nuit" → "Lunettes du nyctalope" (officiel WotC FR).
    id: 'lunettes-de-nuit',
    name: { fr: 'Lunettes du nyctalope', en: 'Goggles of Night' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: 'Tant que vous chaussez ces lunettes teintées, vous bénéficiez de la Vision dans le noir à 18 m. Si vous disposiez déjà de la Vision dans le noir, le port de ces lunettes en augmente la portée de 18 m.',
      en: 'While wearing these dark lenses, you have Darkvision out to 60 feet. If you already have Darkvision, wearing the goggles increases its range by 60 feet.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'yeux-de-lynx',
    name: { fr: 'Yeux de lynx', en: 'Eyes of the Eagle' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Ces lentilles en cristal s'appliquent sur les yeux. Tant que vous les portez, vous avez l'Avantage aux tests de Sagesse (Perception) qui reposent sur la vue. Dans des conditions de bonne visibilité, vous pouvez distinguer les détails de créatures et d'objets à très longue distance, tant que leur largeur est d'au moins 60 cm.",
      en: 'These crystal lenses fit over the eyes. While wearing them, you have Advantage on Wisdom (Perception) checks that rely on sight. In conditions of clear visibility, you can make out details of even extremely distant creatures and objects as small as 2 feet across.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // Drift FR corrigé : "Yeux grossissants" → "Lentilles de netteté" (officiel WotC FR).
    id: 'yeux-grossissants',
    name: { fr: 'Lentilles de netteté', en: 'Eyes of Minute Seeing' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Ces lentilles en cristal s'appliquent sur les yeux. Tant que vous les portez, votre vision s'améliore nettement jusqu'à 30 cm, vous octroyant la Vision dans le noir à cette portée et l'Avantage aux tests d'Intelligence (Investigation) effectués pour examiner quelque chose à cette même portée.",
      en: 'These crystal lenses fit over the eyes. While wearing them, your vision improves significantly out to a range of 1 foot, granting you Darkvision within that range and Advantage on Intelligence (Investigation) checks made to examine something within that range.',
    },
    description: null,
    source: 'srd-5.2.1',
  },

  // ─── Robe ─────────────────────────────────────────────────────────
  {
    // Slug `robe-de-camelot` conservé byte-identique ; FR SRD officiel "Robe
    // du camelot" (genre commun en FR), mais "de" vs "du" est trop mince pour
    // justifier un rename de slug. On corrige juste `name.fr`.
    id: 'robe-de-camelot',
    name: { fr: 'Robe du camelot', en: 'Robe of Useful Items' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Des pièces d'étoffe de formes et de couleurs diverses sont cousues sur cette robe. Lorsque vous portez la robe, vous pouvez entreprendre l'action Magie pour détacher l'une de ces pièces qui devient l'objet ou la créature qu'elle représente. Une fois la dernière pièce détachée, la robe devient un vêtement ordinaire.\n\nSur la robe sont cousus deux exemplaires de chacune des pièces suivantes : Corde (enroulée), Dague, Lanterne sourde (remplie d'huile et allumée), Miroir, Perche, Sac.\n\n4d4 autres pièces sont elles aussi cousues sur la robe. Le MJ en choisit le type ou le détermine aléatoirement selon une table (cf. SRD 5.2.1 p. 257).",
      en: "This robe has cloth patches of various shapes and colors covering it. While wearing the robe, you can take a Magic action to detach one of the patches, causing it to become the object or creature it represents. Once the last patch is removed, the robe becomes an ordinary garment.\n\nThe robe has two of each of the following patches: Bullseye Lantern (filled and lit), Dagger, Mirror, Pole, Rope (coiled), Sack.\n\nIn addition, the robe has 4d4 other patches. The GM chooses the patches or determines them randomly by rolling on a table (see SRD 5.2.1 p. 241).",
    },
    description: null,
    source: 'srd-5.2.1',
  },
];

export const SRD_MAGIC_ITEMS_WONDROUS_COUNTS = {
  total: SRD_MAGIC_ITEMS_WONDROUS.length,
  common: SRD_MAGIC_ITEMS_WONDROUS.filter((i) => i.rarity === 'common').length,
  uncommon: SRD_MAGIC_ITEMS_WONDROUS.filter((i) => i.rarity === 'uncommon').length,
} as const;
