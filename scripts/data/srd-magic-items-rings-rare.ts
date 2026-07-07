/**
 * SRD CC v5.2.1 — Anneaux ≥ Rare (17 entrées).
 *
 * Batch D29.1 (backfill EN des magic-items ≥rare grandfathered AideDD).
 *
 * Sources verbatim :
 *   - EN : `content-sources/extracted/raw/SRD_CC_v5.2.1.txt`
 *     (section "Magic Items A–Z", anneaux lignes 23882–24180)
 *   - FR : `content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt`
 *     (section "Objets magiques de A à Z", anneaux lignes 24435–24765)
 *
 * Pourquoi un module ≥rare distinct de `srd-magic-items-rings-amulets.ts`
 * (C.3, qui couvre les 5 anneaux + 4 amulettes Uncommon) : ce batch traite la
 * dette D29 (`plans/DEBT.md`) — les anneaux ≥Rare grandfathered AideDD n'avaient
 * ni `name.en` ni `magicDescription.en`, et leur prose FR provenait d'AideDD
 * (souvent **édition 2014**, mécaniquement divergente du SRD 5.2.1 — ex.
 * `anneau-de-controle-des-elementaires` décrivait « domination de monstre » au
 * lieu de Fléau/Coercition/Affinité élémentaire). On remplace donc l'entrée
 * grandfathered **intégralement** par la version officielle SRD 5.2.1 bilingue.
 *
 * Politique (identique à C.3) :
 *   - Slugs `id` préservés byte-identique aux entrées grandfathered.
 *   - `name.fr` aligné sur la traduction officielle WotC FR du SRD FR 5.2.1
 *     (corrige les drifts : « influence sur les animaux » → « influence
 *     animale » ; « contrôle des élémentaires » → « maîtrise élémentaire » ;
 *     « stockage de sort » → « stockage de sorts »).
 *   - `magicDescription` reprend la formulation officielle SRD FR / SRD EN.
 *   - `attunement` aligné sur la ligne de type SRD (corrige les drifts du
 *     bundle : Anneau de protection / convocation de djinn / maîtrise
 *     élémentaire étaient `false`, le SRD exige l'Harmonisation → `true`).
 *
 * EXCLU de ce module : `anneau-de-resistance-au-poison` (tag `basic-rules`) —
 * ce n'est PAS un objet SRD distinct mais une ligne de la table de gemmes de
 * l'Anneau de résistance (Poison = Améthyste). Reste en repli FR, décision
 * d'arbitrage (fusion / re-tag) laissée à Adrien — cf. `plans/DEBT.md > D29`.
 *
 * Hyphénations de fin de ligne et artefacts de saut de page (« System
 * Reference Document … », « Document de Référence … ») retirés ; apostrophes
 * courbes U+2019 du PDF converties en apostrophes ASCII (convention des
 * modules magic-items + bundle existant) ; tables rendues en ligne lisible.
 */

import type { SrdMagicItemEntry } from './srd-magic-items-rings-amulets';

export const SRD_MAGIC_ITEMS_RINGS_RARE: SrdMagicItemEntry[] = [
  // ─── Rare ────────────────────────────────────────────────────────────
  {
    id: 'anneau-d-action-libre',
    name: { fr: "Anneau d'action libre", en: 'Ring of Free Action' },
    category: 'gear',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: "Tant que vous portez cet anneau, le Terrain difficile ne vous coûte aucun déplacement supplémentaire. En outre, aucune magie ne peut réduire vos Vitesses ni vous imposer l'état Paralysé ou Entravé.",
      en: "While you wear this ring, Difficult Terrain doesn't cost you extra movement. In addition, magic can neither reduce any of your Speeds nor cause you to have the Paralyzed or Restrained condition.",
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'anneau-d-esquive-totale',
    name: { fr: "Anneau d'esquive totale", en: 'Ring of Evasion' },
    category: 'gear',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: "Cet anneau dispose de 3 charges et récupère quotidiennement 1d3 charges dépensées, à l'aube. Lorsque vous ratez un jet de sauvegarde de Dextérité en portant l'anneau, vous pouvez jouer votre Réaction pour dépenser 1 charge et finalement réussir ce JS.",
      en: 'This ring has 3 charges, and it regains 1d3 expended charges daily at dawn. When you fail a Dexterity saving throw while wearing the ring, you can take a Reaction to expend 1 charge to succeed on that save instead.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'anneau-d-influence-sur-les-animaux',
    name: { fr: "Anneau d'influence animale", en: 'Ring of Animal Influence' },
    category: 'gear',
    rarity: 'rare',
    attunement: false,
    magicDescription: {
      fr: "Cet anneau dispose de 3 charges et récupère quotidiennement 1d3 charges dépensées, à l'aube. Tant que vous portez l'anneau, vous pouvez en dépenser 1 charge pour lancer l'un des sorts suivants (DD de sauvegarde 13) par son intermédiaire :\n\n• amitié avec les animaux\n• terreur (affecte uniquement les Bêtes)\n• communication avec les animaux",
      en: 'This ring has 3 charges, and it regains 1d3 expended charges daily at dawn. While wearing the ring, you can expend 1 charge to cast one of the following spells (save DC 13) from it:\n\n• Animal Friendship\n• Fear (affects Beasts only)\n• Speak with Animals',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'anneau-de-feuille-morte',
    name: { fr: 'Anneau de feuille morte', en: 'Ring of Feather Falling' },
    category: 'gear',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: 'Quand vous tombez alors que vous portez cet anneau, vous descendez de 18 m par round sans subir de dégâts de chute.',
      en: 'When you fall while wearing this ring, you descend 60 feet per round and take no damage from falling.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'anneau-de-protection',
    name: { fr: 'Anneau de protection', en: 'Ring of Protection' },
    category: 'gear',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: 'Vous recevez un bonus de +1 à la CA et aux jets de sauvegarde tant que vous portez cet anneau.',
      en: 'You gain a +1 bonus to Armor Class and saving throws while wearing this ring.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'anneau-de-rayons-x',
    name: { fr: 'Anneau de rayons X', en: 'Ring of X-ray Vision' },
    category: 'gear',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: "Tant que vous portez cet anneau, vous pouvez entreprendre l'action Magie pour recevoir la vision aux rayons X sur 9 m pendant 1 minute. Pour vous, les objets solides dans ce rayon apparaissent transparents et ne bloquent pas la lumière. Cette vision pénètre 30 cm de pierre, 2,5 cm de métal courant et jusqu'à 90 cm de bois ou de terre. Des substances plus denses ou une fine feuille de plomb bloquent la vision.\n\nChaque fois que vous réutilisez cet anneau sans avoir pris de Repos long, vous devez réussir un jet de sauvegarde de Constitution DD 15 sous peine de recevoir un niveau d'Épuisement.",
      en: 'While wearing this ring, you can take a Magic action to gain X-ray vision with a range of 30 feet for 1 minute. To you, solid objects within that radius appear transparent and don\'t prevent light from passing through them. The vision can penetrate 1 foot of stone, 1 inch of common metal, or up to 3 feet of wood or dirt. Thicker substances or a thin sheet of lead block the vision.\n\nWhenever you use the ring again before taking a Long Rest, you must succeed on a DC 15 Constitution saving throw or gain 1 Exhaustion level.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'anneau-de-resistance',
    name: { fr: 'Anneau de résistance', en: 'Ring of Resistance' },
    category: 'gear',
    rarity: 'rare',
    attunement: false,
    magicDescription: {
      fr: 'Tant que vous portez cet anneau, vous bénéficiez de la Résistance à un type de dégâts. La gemme de l\'anneau indique le type, que le MJ choisit ou détermine aléatoirement selon la table suivante.\n\nAcide (Perle), Feu (Grenat), Force (Saphir), Foudre (Citrine), Froid (Tourmaline), Nécrotiques (Jais), Poison (Améthyste), Psychiques (Jade), Radiants (Topaze), Tonnerre (Spinelle).',
      en: 'You have Resistance to one damage type while wearing this ring. The gemstone in the ring indicates the type, which the GM chooses or determines randomly by rolling on the following table.\n\nAcid (Pearl), Cold (Tourmaline), Fire (Garnet), Force (Sapphire), Lightning (Citrine), Necrotic (Jet), Poison (Amethyst), Psychic (Jade), Radiant (Topaz), Thunder (Spinel).',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'anneau-de-stockage-de-sort',
    name: { fr: 'Anneau de stockage de sorts', en: 'Ring of Spell Storing' },
    category: 'gear',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: "Cet anneau stocke les sorts qui sont lancés sur lui et les conserve jusqu'à ce que le porteur harmonisé les utilise. L'anneau peut stocker jusqu'à 5 niveaux de sort à la fois. Quand on le trouve, il contient 1d6 − 1 niveaux de sort choisis par le MJ.\n\nToute créature peut lancer un sort du 1er au 5e niveau dans l'anneau à condition de le toucher au moment de l'incantation. Le sort ne produit aucun effet hormis celui d'être stocké dans l'anneau. Si l'anneau ne peut pas contenir ce sort, celui-ci est dépensé sans effet. Le niveau de l'emplacement utilisé pour lancer le sort détermine la quantité d'espace qu'il utilise.\n\nTant que vous portez cet anneau, vous pouvez lancer l'un des sorts qui y sont stockés. Ce sort utilise le niveau d'emplacement de sort, le DD de sauvegarde des sorts, le bonus d'attaque de sort et la caractéristique d'incantation de l'incantateur d'origine, mais il est par ailleurs traité comme si vous le lanciez. Le sort lancé par l'anneau n'y est plus stocké et libère l'espace correspondant.",
      en: "This ring stores spells cast into it, holding them until the attuned wearer uses them. The ring can store up to 5 levels worth of spells at a time. When found, it contains 1d6 − 1 levels of stored spells chosen by the GM.\n\nAny creature can cast a spell of level 1 through 5 into the ring by touching the ring as the spell is cast. The spell has no effect other than to be stored in the ring. If the ring can't hold the spell, the spell is expended without effect. The level of the slot used to cast the spell determines how much space it uses.\n\nWhile wearing this ring, you can cast any spell stored in it. The spell uses the slot level, spell save DC, spell attack bonus, and spellcasting ability of the original caster but is otherwise treated as if you cast the spell. The spell cast from the ring is no longer stored in it, freeing up space.",
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'anneau-du-belier',
    name: { fr: 'Anneau du bélier', en: 'Ring of the Ram' },
    category: 'gear',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: "Cet anneau dispose de 3 charges et récupère quotidiennement 1d3 charges dépensées, à l'aube. Tant que vous le portez, vous pouvez entreprendre l'action Magie pour en dépenser 1 à 3 charges et effectuer une attaque de sort à distance contre une créature que vous voyez dans un rayon de 18 m. L'anneau produit une tête de bélier spectrale et effectue son jet d'attaque avec un bonus de +7. Si l'attaque touche, la cible subit 2d10 dégâts de force pour chaque charge dépensée, et elle est repoussée de 1,50 m de vous.\n\nAu lieu de cela, vous pouvez dépenser 1 à 3 des charges de l'anneau au prix de l'action Magie pour tenter de briser un objet non magique que vous voyez dans un rayon de 18 m, à condition qu'il ne soit porté par personne. L'anneau effectue un test de Force avec un bonus de +5 par charge dépensée.",
      en: "This ring has 3 charges and regains 1d3 expended charges daily at dawn. While wearing the ring, you can take a Magic action to expend 1 to 3 charges to make a ranged spell attack against one creature you can see within 60 feet of yourself. The ring produces a spectral ram's head and makes its attack roll with a +7 bonus. On a hit, for each charge you spend, the target takes 2d10 Force damage and is pushed 5 feet away from you.\n\nAlternatively, you can expend 1 to 3 of the ring's charges as a Magic action to try to break a nonmagical object you can see within 60 feet of yourself that isn't being worn or carried. The ring makes a Strength check with a +5 bonus for each charge you spend.",
    },
    description: null,
    source: 'srd-5.2.1',
  },
  // ─── Very Rare ───────────────────────────────────────────────────────
  {
    id: 'anneau-de-feu-d-etoiles',
    name: { fr: "Anneau de feu d'étoiles", en: 'Ring of Shooting Stars' },
    category: 'gear',
    rarity: 'very rare',
    attunement: true,
    magicDescription: {
      fr: "Vous pouvez lancer lumières dansantes ou lumière par le biais de l'anneau.\n\nL'anneau dispose de 6 charges et récupère quotidiennement 1d6 charges dépensées, à l'aube. Vous pouvez en dépenser les charges pour utiliser les propriétés ci-dessous.\n\nÉtoiles filantes. Vous pouvez dépenser 1 à 3 charges au prix de l'action Magie. Pour chaque charge dépensée, vous faites jaillir une particule de lumière incandescente depuis l'anneau vers un point que vous voyez dans un rayon de 18 m. Chaque créature prise dans un Cube de 4,50 m ayant ce point pour origine subit une pluie d'étincelles. Elle effectue un jet de sauvegarde de Dextérité DD 15 et subit 5d4 dégâts radiants en cas d'échec, la moitié en cas de réussite.\n\nLueurs féeriques. Dépensez 1 charge pour lancer lueurs féeriques par l'anneau.\n\nSphères de foudre. Dépensez 2 charges au prix de l'action Magie pour créer un maximum de quatre sphères de foudre de 90 cm de diamètre.\n\nChaque sphère apparaît en un espace inoccupé que vous voyez, dans un rayon de 36 m. Les sphères persistent tant que vous maintenez votre Concentration, jusqu'à 1 minute. Chaque sphère émet une Lumière faible dans un rayon de 9 m.\n\nPar une action Bonus, vous pouvez déplacer chaque sphère d'un maximum de 9 m à condition qu'elles restent dans un rayon de 36 m de vous. La première fois qu'une sphère arrive à 1,50 m ou moins d'une créature autre que vous et que celle-ci ne bénéficie pas d'un Abri total, la sphère libère un éclair sur la créature et disparaît. Cette créature effectue un jet de sauvegarde de Dextérité DD 15. En cas d'échec, elle subit des dégâts de foudre dépendant du nombre de sphères créées, comme indiqué sur la table suivante. En cas de réussite, la créature subit la moitié de ces dégâts.\n\n1 sphère : 4d12 ; 2 sphères : 5d4 ; 3 sphères : 2d6 ; 4 sphères : 2d4.",
      en: "You can cast Dancing Lights or Light from the ring.\n\nThe ring has 6 charges and regains 1d6 expended charges daily at dawn. You can expend its charges to use the properties below.\n\nFaerie Fire. You can expend 1 charge to cast Faerie Fire from the ring.\n\nLightning Spheres. You can expend 2 charges as a Magic action to create up to four 3-foot-diameter spheres of lightning.\n\nEach sphere appears in an unoccupied space you can see within 120 feet of yourself. The spheres last as long as you maintain Concentration, up to 1 minute. Each sphere sheds Dim Light in a 30-foot radius.\n\nAs a Bonus Action, you can move each sphere up to 30 feet, but no farther than 120 feet away from yourself. The first time the sphere comes within 5 feet of a creature other than you that isn't behind Total Cover, the sphere discharges lightning at that creature and disappears. That creature makes a DC 15 Dexterity saving throw. On a failed save, the creature takes Lightning damage based on the number of spheres you created, as shown in the following table. On a successful save, the creature takes half as much damage.\n\n1 sphere: 4d12; 2 spheres: 5d4; 3 spheres: 2d6; 4 spheres: 2d4.\n\nShooting Stars. You can expend 1 to 3 charges as a Magic action. For every charge you expend, you launch a glowing mote of light from the ring at a point you can see within 60 feet of yourself. Each creature in a 15-foot Cube originating from that point is showered in sparks and makes a DC 15 Dexterity saving throw, taking 5d4 Radiant damage on a failed save or half as much damage on a successful one.",
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'anneau-de-regeneration',
    name: { fr: 'Anneau de régénération', en: 'Ring of Regeneration' },
    category: 'gear',
    rarity: 'very rare',
    attunement: true,
    magicDescription: {
      fr: "Tant que vous portez cet anneau, vous récupérez 1d6 points de vie toutes les 10 minutes à condition qu'il vous reste au moins 1 point de vie. Si vous perdez une partie de votre corps, l'anneau fait repousser la partie manquante qui retrouve ses pleines fonctions au bout de 1d6 + 1 jours, à condition que vous conserviez au moins 1 point de vie pendant tout ce temps.",
      en: 'While wearing this ring, you regain 1d6 Hit Points every 10 minutes if you have at least 1 Hit Point. If you lose a body part, the ring causes the missing part to regrow and return to full functionality after 1d6 + 1 days if you have at least 1 Hit Point the whole time.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'anneau-de-telekinesie',
    name: { fr: 'Anneau de télékinésie', en: 'Ring of Telekinesis' },
    category: 'gear',
    rarity: 'very rare',
    attunement: true,
    magicDescription: {
      fr: "Tant que vous portez cet anneau, vous pouvez lancer télékinésie par son intermédiaire.",
      en: 'While wearing this ring, you can cast Telekinesis from it.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  // ─── Legendary ───────────────────────────────────────────────────────
  {
    id: 'anneau-d-invisibilite',
    name: { fr: "Anneau d'invisibilité", en: 'Ring of Invisibility' },
    category: 'gear',
    rarity: 'legendary',
    attunement: true,
    magicDescription: {
      fr: "Tant que vous portez cet anneau, vous pouvez entreprendre l'action Magie pour recevoir l'état Invisible. Vous restez Invisible jusqu'à ce que l'anneau soit retiré ou que vous entrepreniez une action Bonus pour redevenir visible.",
      en: 'While wearing this ring, you can take a Magic action to give yourself the Invisible condition. You remain Invisible until the ring is removed or until you take a Bonus Action to become visible again.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'anneau-de-controle-des-elementaires',
    name: { fr: 'Anneau de maîtrise élémentaire', en: 'Ring of Elemental Command' },
    category: 'gear',
    rarity: 'legendary',
    attunement: true,
    magicDescription: {
      fr: "Chaque anneau de maîtrise élémentaire est lié à l'un des quatre Plans Élémentaires. Le MJ choisit ou laisse le hasard décider à quel plan il est lié. Par exemple, un anneau de maîtrise élémentaire (air) est lié au Plan Élémentaire de l'Air.\n\nChaque anneau de maîtrise élémentaire est doté des deux propriétés suivantes :\n\nFléau élémentaire. Tant que vous portez cet anneau, vous avez l'Avantage aux jets d'attaque contre les Élémentaires originaires du plan lié, qui subissent le Désavantage à leurs jets d'attaque contre vous.\n\nCoercition élémentaire. Tant que vous portez l'anneau, vous pouvez entreprendre l'action Magie pour tenter de contraindre un Élémentaire que vous voyez dans un rayon de 18 m. L'Élémentaire effectue un jet de sauvegarde de Sagesse DD 18. En cas d'échec, il subit l'état Charmé jusqu'au début de votre tour suivant, et vous déterminez comment il consacre son déplacement et son action à son tour suivant.\n\nAffinité élémentaire. Tant que vous portez l'anneau, vous bénéficiez de propriétés supplémentaires correspondant au Plan Élémentaire qui y est lié :\n\nAir. Vous parlez l'aérien, bénéficiez de la Résistance aux dégâts de foudre, ainsi que d'une Vitesse de vol égale à votre Vitesse (avec le vol stationnaire).\n\nEau. Vous parlez l'aquatique, recevez une Vitesse de nage de 18 m et pouvez respirer sous l'eau.\n\nFeu. Vous parlez l'igné et bénéficiez de l'Immunité contre les dégâts de feu.\n\nTerre. Vous parlez le terreux et bénéficiez de la Résistance aux dégâts d'acide. Les sols composés ou jonchés de gravats, de roches ou de terre ne constituent pas un Terrain difficile pour vous. Vous pouvez en outre traverser la terre ou la roche solide comme s'il s'agissait d'un simple Terrain difficile, sans même perturber la matière traversée. Si vous terminez votre tour dans la terre ou la roche solide, vous êtes expulsé vers l'espace inoccupé le plus proche parmi ceux que vous venez d'occuper.\n\nSorts. L'anneau dispose de 5 charges et récupère quotidiennement 1d4 + 1 charges dépensées, à l'aube. Tant que vous portez l'anneau, vous pouvez lancer un sort par son intermédiaire. Choisissez le sort dans la liste des sorts disponibles, comme indiqué dans la table suivante (selon le Plan Élémentaire auquel l'anneau est lié). La table indique le nombre de charges à dépenser pour lancer le sort, dont le DD de sauvegarde est de 18.\n\nAir : bourrasque (2 charges), chaîne d'éclairs (3 charges), feuille morte (0 charge), mur de vent (1 charge).\nEau : création ou destruction d'eau (1 charge), marche sur l'onde (2 charges), mur de glace (3 charges), tempête de grêle (2 charges), tsunami (5 charges).\nFeu : boule de feu (2 charges), mains brûlantes (1 charge), mur de feu (3 charges), tempête de feu (4 charges).\nTerre : façonnage de la pierre (2 charges), mur de pierre (3 charges), peau de pierre (3 charges), tremblement de terre (5 charges).",
      en: "Each Ring of Elemental Command is linked to one of the four Elemental Planes. The GM chooses or randomly determines the linked plane. For example, a Ring of Elemental Command (air) is linked to the Elemental Plane of Air.\n\nEvery Ring of Elemental Command has the following two properties:\n\nElemental Bane. While wearing the ring, you have Advantage on attack rolls against Elementals and they have Disadvantage on attack rolls against you.\n\nElemental Compulsion. While wearing the ring, you can take a Magic action to try to compel an Elemental you see within 60 feet of yourself. The Elemental makes a DC 18 Wisdom saving throw. On a failed save, the Elemental has the Charmed condition until the start your next turn, and you determine what it does with its move and action on its next turn.\n\nElemental Focus. While wearing the ring, you benefit from additional properties corresponding to the ring's linked Elemental Plane:\n\nAir. You know Auran, you have Resistance to Lightning damage, and you have a Fly Speed equal to your Speed and can hover.\n\nEarth. You know Terran, and you have Resistance to Acid damage. Terrain composed of rubble, rocks, or dirt isn't Difficult Terrain for you. In addition, you can move through solid earth or rock as if those areas were Difficult Terrain without disturbing the matter through which you pass. If you end your turn in solid earth or rock, you are shunted out to the nearest unoccupied space you last occupied.\n\nFire. You know Ignan, and you have Immunity to Fire damage.\n\nWater. You know Aquan, you gain a Swim Speed of 60 feet, and you can breathe underwater.\n\nSpellcasting. The ring has 5 charges and regains 1d4 + 1 expended charges daily at dawn. While wearing the ring, you can cast a spell from it. Choose the spell from the list of available spells based on the Elemental Plane the ring is linked to, as shown in the following table. The table indicates how many charges you must expend to cast the spell, which has a save DC of 18.\n\nAir: Chain Lightning (3 charges), Feather Fall (0 charges), Gust of Wind (2 charges), Wind Wall (1 charge).\nEarth: Earthquake (5 charges), Stone Shape (2 charges), Stoneskin (3 charges), Wall of Stone (3 charges).\nFire: Burning Hands (1 charge), Fireball (2 charges), Fire Storm (4 charges), Wall of Fire (3 charges).\nWater: Create or Destroy Water (1 charge), Ice Storm (2 charges), Tsunami (5 charges), Wall of Ice (3 charges), Water Walk (2 charges).",
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'anneau-de-convocation-de-djinn',
    name: { fr: 'Anneau de convocation de djinn', en: 'Ring of Djinni Summoning' },
    category: 'gear',
    rarity: 'legendary',
    attunement: true,
    magicDescription: {
      fr: "Tant que vous portez cet anneau, vous pouvez entreprendre l'action Magie pour convoquer un djinn spécifique originaire du Plan Élémentaire de l'Air. Ce djinn apparaît en un espace inoccupé de votre choix, dans un rayon de 36 m de vous. Il reste aussi longtemps que vous maintenez la Concentration, jusqu'à un maximum de 1 heure, mais disparaît s'il tombe à 0 point de vie.\n\nAinsi convoqué, le djinn est Amical envers vous et vos compagnons, et il se soumet à vos ordres. En l'absence d'instructions précises, le djinn se défend contre les assaillants mais n'entreprend aucune autre action.\n\nAprès le départ du djinn, il ne peut plus être convoqué pendant 24 heures et l'anneau devient non magique si ce djinn meurt.\n\nLes anneaux de convocation de djinn sont souvent créés par les djinns qu'ils invoquent, puis offerts aux mortels en gage d'amitié ou d'estime.",
      en: "While wearing this ring, you can take a Magic action to summon a particular Djinni from the Elemental Plane of Air. The djinni appears in an unoccupied space you choose within 120 feet of yourself. It remains as long as you maintain Concentration, to a maximum of 1 hour, or until it drops to 0 Hit Points.\n\nWhile summoned, the djinni is Friendly to you and your allies, and it obeys your commands. If you fail to command it, the djinni defends itself against attackers but takes no other actions.\n\nAfter the djinni departs, it can't be summoned again for 24 hours, and the ring becomes nonmagical if the djinni dies.\n\nRings of Djinni Summoning are often created by the djinn they summon and given to mortals as gifts of friendship or tokens of esteem.",
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'anneau-de-renvoi-des-sorts',
    name: { fr: 'Anneau de renvoi des sorts', en: 'Ring of Spell Turning' },
    category: 'gear',
    rarity: 'legendary',
    attunement: true,
    magicDescription: {
      fr: "Tant que vous portez cet anneau, vous avez l'Avantage aux jets de sauvegarde contre les sorts. Si vous réussissez le JS contre un sort du 7e niveau ou inférieur, ce sort n'a aucun effet sur vous. Si ce sort ne ciblait que vous sans créer de zone d'effet, vous pouvez jouer votre Réaction pour le retourner vers son lanceur ; l'incantateur effectue un JS contre le sort en prenant son propre DD de sauvegarde des sorts.",
      en: "While wearing this ring, you have Advantage on saving throws against spells. If you succeed on the save for a spell of level 7 or lower, the spell has no effect on you. If that spell targeted only you and didn't create an area of effect, you can take a Reaction to deflect the spell back at the spell's caster; the caster must make a saving throw against the spell using their own spell save DC.",
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'anneau-de-triple-souhait',
    name: { fr: 'Anneau de triple souhait', en: 'Ring of Three Wishes' },
    category: 'gear',
    rarity: 'legendary',
    attunement: false,
    magicDescription: {
      fr: "Tant que vous portez cet anneau, vous pouvez dépenser 1 de ses 3 charges pour lancer souhait par son biais. L'anneau devient non magique lorsque vous dépensez sa dernière charge.",
      en: 'While wearing this ring, you can expend 1 of its 3 charges to cast Wish from it. The ring becomes nonmagical when you use the last charge.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
];

/** Compteurs figés (parse strict côté merge script). */
export const SRD_MAGIC_ITEMS_RINGS_RARE_COUNTS = {
  total: SRD_MAGIC_ITEMS_RINGS_RARE.length,
  rare: SRD_MAGIC_ITEMS_RINGS_RARE.filter((e) => e.rarity === 'rare').length,
  veryRare: SRD_MAGIC_ITEMS_RINGS_RARE.filter((e) => e.rarity === 'very rare').length,
  legendary: SRD_MAGIC_ITEMS_RINGS_RARE.filter((e) => e.rarity === 'legendary').length,
} as const;
