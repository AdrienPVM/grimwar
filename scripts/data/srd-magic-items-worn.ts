/**
 * SRD CC v5.2.1 — Objets portés (amulette, ceinturons, colliers, bracelets,
 * scarabée, perle) — 8 entrées.
 *
 * Batch D29.14 (backfill EN des magic-items grandfathered AideDD).
 *
 * Sources verbatim :
 *   - EN : `content-sources/extracted/raw/SRD_CC_v5.2.1.txt`
 *     (Bead of Force l. 21255, Belt of Dwarvenkind l. 21286, Belt of Giant
 *     Strength l. 21307, Bracers of Defense l. 21415, Necklace of Fireballs
 *     l. 23425, Necklace of Prayer Beads l. 23436, Periapt of Proof against
 *     Poison l. 23554, Scarab of Protection l. 24516)
 *   - FR : `content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt`
 *     (Amulette de protection contre le poison l. 24394, Bracelets de défense
 *     l. 25967, Ceinturon de force de géant l. 26132, Ceinturon des nains
 *     l. 26155, Chapelet mystique l. 26270, Collier de boules de feu l. 26369,
 *     Perle de force l. 27761, Scarabée de protection l. 28721)
 *
 * Correspondances de nom : `amulette-de-protection-contre-le-poison` =
 * **Periapt of Proof against Poison** (FR officiel « Amulette de protection
 * contre le poison » — pas de drift) ; `perle-de-force` = **Bead of Force**.
 *
 * Corrections issues du SRD :
 *   - `attunement` : 6 des 8 étaient `false` (héritage AideDD). Le SRD 5.2.1
 *     exige l'Harmonisation pour l'Amulette de protection contre le poison, les
 *     Bracelets de défense, les 2 ceinturons et le Scarabée de protection
 *     (simple → `true`) et pour le Chapelet mystique, qualifiée (« un Clerc,
 *     Druide ou Paladin »). Le Collier de boules de feu et la Perle de force
 *     n'en exigent AUCUNE → restent `false`.
 *   - `rarity` (DRIFT) : `ceinturon-de-force-de-geant` était `common` (erreur
 *     AideDD) → le SRD le classe « Rarity Varies » (Rare pour collines →
 *     Légendaire pour tempêtes). Fixé à **`rare`** (variante d'entrée, géant des
 *     collines) ; la table complète est détaillée dans la description.
 *   - `name.fr` (DRIFT) : « Collier de perles de prière » → **« Chapelet
 *     mystique »** (Necklace of Prayer Beads ; nom officiel WotC FR l. 26270).
 *     Slug préservé.
 *   - `magicDescription` : reformulé sur la VF officielle SRD. La table du
 *     Chapelet mystique **diverge entre éditions** (ordre + tranches différents) :
 *     chaque langue reproduit SA table officielle.
 *
 * Conventions (identiques aux modules D29.1→D29.13) : hyphénations / espacements
 * parasites retirés (« classe d'a r mu re » → « classe d'armure ») ; ordinaux
 * scindés recomposés ; apostrophes FR en ASCII, EN verbatim SRD (quotes courbes) ;
 * `\n\n` entre blocs ; tables inlinées.
 */

import type { SrdMagicItemEntry } from './srd-magic-items-potions';

export const SRD_MAGIC_ITEMS_WORN: SrdMagicItemEntry[] = [
  {
    id: 'amulette-de-protection-contre-le-poison',
    name: { fr: 'Amulette de protection contre le poison', en: 'Periapt of Proof against Poison' },
    category: 'gear',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: "Cette chaîne en argent délicatement ouvragée porte en sautoir une gemme noire magnifiquement taillée. Tant que vous la portez, vous bénéficiez de l'Immunité contre l'état Empoisonné et les dégâts de poison.",
      en: 'This delicate silver chain has a brilliant-cut black gem pendant. While you wear it, you have Immunity to the Poisoned condition and Poison damage.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'bracelets-de-defense',
    name: { fr: 'Bracelets de défense', en: 'Bracers of Defense' },
    category: 'gear',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: 'Tant que vous portez ces bracelets et ne portez ni armure ni bouclier, vous recevez un bonus de +2 à la CA.',
      en: 'While wearing these bracers, you gain a +2 bonus to Armor Class if you are wearing no armor and using no Shield.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // DRIFT rareté : `common` (AideDD) → `rare` (SRD « Rarity Varies », variante
    // d'entrée Géant des collines). Table complète dans la description.
    id: 'ceinturon-de-force-de-geant',
    name: { fr: 'Ceinturon de force de géant', en: 'Belt of Giant Strength' },
    category: 'gear',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: "Tant que vous portez ce ceinturon, votre valeur de Force devient celle octroyée par l'objet. Le type de géant détermine cette valeur (cf. table ci-dessous). Si votre Force est déjà supérieure ou égale à la valeur octroyée par le ceinturon, l'objet n'a aucun effet sur vous.\n\nCeinturon (Force, Rareté) : Ceinturon de force de géant (collines) 21, Rare ; (givre ou pierres) 23, Très rare ; (feu) 25, Très rare ; (nuages) 27, Légendaire ; (tempêtes) 29, Légendaire.",
      en: 'While wearing this belt, your Strength changes to a score granted by the belt. The type of giant determines the score (see the table below). The item has no effect on you if your Strength without the belt is equal to or greater than the belt’s score.\n\nBelt (Str., Rarity): Belt of Giant Strength (hill) 21, Rare; (frost or stone) 23, Very Rare; (fire) 25, Very Rare; (cloud) 27, Legendary; (storm) 29, Legendary.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'ceinturon-des-nains',
    name: { fr: 'Ceinturon des nains', en: 'Belt of Dwarvenkind' },
    category: 'gear',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: "Tant que vous portez ce ceinturon, vous recevez les bénéfices suivants :\n\nAmi des nains. Vous bénéficiez de l'Avantage aux tests de Charisme (Persuasion) effectués dans le cadre d'interactions avec des nains et des duergars.\n\nNain. Vous parlez et lisez le nain.\n\nRobustesse. Votre Constitution augmente de 2, jusqu'à un maximum de 20.\n\nEn outre et tant que vous êtes harmonisé avec le ceinturon, il y a chaque jour à l'aube 50 % de chances qu'une barbe fournie vous couvre le menton si votre physiologie vous le permet, ou que votre barbe épaississe si vous en arboriez déjà une.\n\nSi vous n'êtes ni nain ni duergar, vous recevez les bénéfices suivants tant que vous portez ce ceinturon :\n\nRésilience. Vous bénéficiez de la Résistance aux dégâts de poison. Vous avez en outre l'Avantage aux jets de sauvegarde visant à éviter l'état Empoisonné ou à y mettre un terme sur vous-même.\n\nVision dans le noir. Vous disposez de la Vision dans le noir sur 18 m.",
      en: 'While wearing this belt, you gain the following benefits:\n\nDwarvish. You know Dwarvish.\n\nFriend of Dwarvenkind. You have Advantage on Charisma (Persuasion) checks made to interact with dwarves and duergar.\n\nToughness. Your Constitution increases by 2, to a maximum of 20.\n\nIn addition, while attuned to the belt, you have a 50 percent chance each day at dawn of growing a full beard if you can grow one, or a thicker beard if you already have one.\n\nIf you aren’t a dwarf or duergar, you gain the following additional benefits while wearing the belt:\n\nDarkvision. You have Darkvision with a range of 60 feet.\n\nResilience. You have Resistance to Poison damage. You also have Advantage on saving throws you make to avoid or end the Poisoned condition.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'collier-de-boules-de-feu',
    name: { fr: 'Collier de boules de feu', en: 'Necklace of Fireballs' },
    category: 'gear',
    rarity: 'rare',
    attunement: false,
    magicDescription: {
      fr: "1d6 + 3 perles sont enfilées sur le collier. Vous pouvez entreprendre l'action Magie pour détacher une perle et la lancer jusqu'à 18 m. Quand la perle arrive en fin de trajectoire, elle détone en produisant l'équivalent du sort du 3e niveau boule de feu (DD de sauvegarde 15).\n\nVous pouvez lancer plusieurs perles, voire le collier entier, en une seule fois. Dans ce cas, augmentez les dégâts de la boule de feu de 1d6 pour chaque perle en plus de la première (maximum 12d6).",
      en: 'This necklace has 1d6 + 3 beads hanging from it. You can take a Magic action to detach a bead and throw it up to 60 feet away. When it reaches the end of its trajectory, the bead detonates as a level 3 Fireball (save DC 15).\n\nYou can hurl multiple beads, or even the whole necklace, at one time. When you do so, increase the damage of the Fireball by 1d6 for each bead after the first (maximum 12d6).',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // DRIFT nom : « Collier de perles de prière » → « Chapelet mystique ». Slug
    // préservé. Table des perles divergente entre EN et FR.
    id: 'collier-de-perles-de-priere',
    name: { fr: 'Chapelet mystique', en: 'Necklace of Prayer Beads' },
    category: 'gear',
    rarity: 'rare',
    attunement: {
      fr: 'Harmonisation requise avec un Clerc, Druide ou Paladin',
      en: 'Requires Attunement by a Cleric, Druid, or Paladin',
    },
    magicDescription: {
      fr: "Ce collier possède 1d4 + 2 perles magiques faites d'aigue-marine, de perle noire ou de topaze. Il possède en outre de nombreuses perles non magiques faites à partir de minéraux tels que l'ambre, l'héliotrope, la citrine, le corail, le jade, la perle ou le quartz. Si une perle magique est retirée du collier, celle-ci perd sa magie.\n\nIl existe six types de perle magique. Le MJ choisit le type de chaque perle ou le détermine aléatoirement selon la table ci-dessous. Ce chapelet peut posséder plusieurs perles du même type. Pour en utiliser une, vous devez porter le collier. Chaque perle renferme un sort que vous pouvez lancer par une action Bonus (en appliquant votre DD de sauvegarde des sorts si nécessaire). Une fois lancé le sort contenu dans une perle magique, celle-ci ne peut plus resservir avant l'aube suivante.\n\nPerle (1d20, Sort) : Perle de bénédiction 1-6, bénédiction ; Perle de châtiment 7-8, châtiment de révélation ; Perle de convocation 9, gardien de la foi ; Perle d'envolée divine 10, vent divin ; Perle de guérison 11-16, soins (au 2e niveau) ; Perle de rétablissement 17-20, restauration suprême.",
      en: 'This necklace has 1d4 + 2 magic beads made from aquamarine, black pearl, or topaz. It also has many nonmagical beads made from stones such as amber, bloodstone, citrine, coral, jade, pearl, or quartz. If a magic bead is removed from the necklace, that bead loses its magic.\n\nSix types of magic beads exist. The GM decides the type of each bead on the necklace or determines it randomly by rolling on the table below. A necklace can have more than one bead of the same type. To use one, you must be wearing the necklace. Each bead contains a spell that you can cast from it as a Bonus Action (using your spell save DC if a save is necessary). Once a magic bead’s spell is cast, that bead can’t be used again until the next dawn.\n\nBead (1d20, Spell): Bead of Blessing 1–6, Bless; Bead of Curing 7–12, Cure Wounds (level 2 version); Bead of Favor 13–16, Greater Restoration; Bead of Smiting 17–18, Shining Smite; Bead of Summons 19, Guardian of Faith; Bead of Wind Walking 20, Wind Walk.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'perle-de-force',
    name: { fr: 'Perle de force', en: 'Bead of Force' },
    category: 'gear',
    rarity: 'rare',
    attunement: false,
    magicDescription: {
      fr: "Cette petite sphère noire de 2 cm de diamètre pèse environ 30 g. Les perles de force se trouvent généralement par poignée de 1d4 + 4.\n\nEntreprendre l'action Magie permet de lancer la perle à une distance maximale de 18 m. La perle provoque une explosion à l'impact dans une Sphère de 3 m de rayon, ce qui la détruit. Chaque créature prise dans la Sphère doit réussir un jet de sauvegarde de Dextérité DD 15, sous peine de subir 5d4 dégâts de force. Une sphère de force transparente entoure la zone pendant 1 minute. Toute créature ayant raté le JS, si elle se trouve entièrement dans la zone, est piégée à l'intérieur de cette sphère. Les créatures qui ont réussi leur sauvegarde ou qui ne sont que partiellement dans la zone sont repoussées depuis le centre de la sphère jusqu'à se retrouver entièrement en dehors. Seul l'air respirable peut traverser la paroi de la sphère. Les attaques et autres effets, quels qu'ils soient, en sont incapables.\n\nUne créature piégée peut entreprendre l'action Utilisation pour pousser sur la paroi de la sphère, ce qui la fait rouler à concurrence de la moitié de sa propre Vitesse. On peut ramasser la sphère, qui ne pèse que 500 g en raison de sa magie, quel que soit le poids des créatures piégées à l'intérieur.",
      en: 'This small black sphere measures 3/4 of an inch in diameter and weighs an ounce. Typically, 1d4 + 4 Beads of Force are found together.\n\nYou can take a Magic action to throw the bead up to 60 feet. The bead explodes in a 10-foot-radius Sphere on impact and is destroyed. Each creature in the Sphere must succeed on a DC 15 Dexterity saving throw or take 5d4 Force damage. A sphere of transparent force then encloses the area for 1 minute. Any creature that failed the save and is completely within the area is trapped inside this sphere. Creatures that succeeded on the save or are partially within the area are pushed away from the center of the sphere until they are no longer inside it. Only breathable air can pass through the sphere’s wall. No attack or other effect can pass through.\n\nAn enclosed creature can take a Utilize action to push against the sphere’s wall, moving the sphere up to half the creature’s Speed. The sphere can be picked up, and its magic causes it to weigh only 1 pound, regardless of the weight of creatures inside.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'scarabee-de-protection',
    name: { fr: 'Scarabée de protection', en: 'Scarab of Protection' },
    category: 'gear',
    rarity: 'legendary',
    attunement: true,
    magicDescription: {
      fr: "Ce médaillon en forme de scarabée offre trois bénéfices lorsque vous le portez.\n\nDéfense. Vous recevez un bonus de +1 à la classe d'armure.\n\nPréservation. Le scarabée dispose de 12 charges. Si vous ratez un jet de sauvegarde contre un sort de Nécromancie ou un effet néfaste émanant d'un Mort-vivant, vous pouvez jouer votre Réaction pour dépenser 1 charge et transformer l'échec au JS en réussite. Le scarabée tombe en poussière, détruit à jamais, lorsque sa dernière charge est dépensée.\n\nRésistance aux sorts. Vous avez l'Avantage aux jets de sauvegarde contre les sorts.",
      en: 'This beetle-shaped medallion provides three benefits while it is on your person.\n\nDefense. You gain a +1 bonus to Armor Class.\n\nPreservation. The scarab has 12 charges. If you fail a saving throw against a Necromancy spell or a harmful effect originating from an Undead, you can take a Reaction to expend 1 charge and turn the failed save into a successful one. The scarab crumbles into powder and is destroyed when its last charge is expended.\n\nSpell Resistance. You have Advantage on saving throws against spells.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
];

/** Compteurs figés (parse strict côté merge script). */
export const SRD_MAGIC_ITEMS_WORN_COUNTS = {
  total: SRD_MAGIC_ITEMS_WORN.length,
  rare: SRD_MAGIC_ITEMS_WORN.filter((e) => e.rarity === 'rare').length,
  legendary: SRD_MAGIC_ITEMS_WORN.filter((e) => e.rarity === 'legendary').length,
  attuned: SRD_MAGIC_ITEMS_WORN.filter((e) => e.attunement !== false).length,
} as const;
