/**
 * SRD CC v5.2.1 — Wondrous utilitaires Common + Uncommon (15 entrées).
 *
 * Sources verbatim :
 *   - EN : `content-sources/extracted/raw/SRD_CC_v5.2.1.txt`
 *   - FR : `content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt`
 *
 * Cf. plan `plans/C-magic-items-srd-common-uncommon.md` (tracer-bullet C.6).
 *
 * Scope C.6 : wondrous "utilitaires" (sacs, balais, carafe, cartes, poudres,
 * gemmes, lanterne, pipes, perle, bead). 15 entrées Common+Uncommon.
 *
 * Hors scope C.6 (réservé C.7 reliquat) : Rope of Climbing, Sending Stones,
 * Stone of Good Luck (Luckstone), Wind Fan, Spell Scroll, Philter of Love.
 *
 * Politique :
 *   - Slugs préservés byte-identique (15 remplacements + 1 nouveau common
 *     `perle-nutritive`).
 *   - `name.fr` aligné sur SRD FR officiel ; 4 drifts terminologiques corrigés.
 *   - Tables longues (Sac à malices, Tarot fantasmagorique) résumées dans la
 *     description avec renvoi explicite au SRD page X.
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

export const SRD_MAGIC_ITEMS_UTILITY: SrdMagicItemEntry[] = [
  // ─── Common (1) — premier item common hors potions ─────────────────
  {
    // Nouveau slug — Bead of Nourishment absent du bundle baseline AideDD.
    id: 'perle-nutritive',
    name: { fr: 'Perle nutritive', en: 'Bead of Nourishment' },
    category: 'gear',
    rarity: 'common',
    attunement: false,
    magicDescription: {
      fr: "Cette perle gélatineuse sans saveur fond sur la langue et fournit l'équivalent nutritif de 1 jour de rations.",
      en: 'This flavorless, gelatinous bead dissolves on your tongue and provides as much nourishment as 1 day of Rations.',
    },
    description: null,
    source: 'srd-5.2.1',
  },

  // ─── Uncommon (14) ─────────────────────────────────────────────────
  {
    // Drift FR : "Bouteille fumigène" → "Urne fumigène" (officiel WotC FR).
    id: 'bouteille-fumigene',
    name: { fr: 'Urne fumigène', en: 'Eversmoking Bottle' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Au prix de l'action Magie, vous ouvrez ou refermez cette urne.\n\nL'ouvrir provoque l'expulsion d'une fumée épaisse qui génère un nuage sous forme d'une Émanation de 18 m centrée sur l'urne. La zone enfumée est à Visibilité nulle.\n\nChaque minute que l'urne reste ouverte, la taille de l'Émanation augmente de 3 m jusqu'à avoir atteint sa taille maximale de 36 m.\n\nLa fermeture de l'urne provoque l'immobilisation du nuage, qui se disperse au bout de 10 minutes. Un vent fort (tel que celui créé par le sort bourrasque) disperse le nuage en 1 minute.",
      en: 'As a Magic action, you can open or close this bottle.\n\nOpening the bottle causes thick smoke to billow out, forming a cloud that fills a 60-foot Emanation originating from the bottle. The area within the smoke is Heavily Obscured.\n\nEach minute the bottle remains open, the size of the Emanation increases by 10 feet until it reaches its maximum size of 120 feet.\n\nClosing the bottle causes the cloud to become fixed in place until it disperses after 10 minutes. A strong wind (such as that created by the Gust of Wind spell) disperses the cloud after 1 minute.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'carafe-intarissable',
    name: { fr: 'Carafe intarissable', en: 'Decanter of Endless Water' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Ce récipient muni d'un bouchon clapote quand on l'agite, comme s'il contenait de l'eau. La carafe pèse 1 kg.\n\nVous pouvez consacrer l'action Magie à retirer le bouchon et prononcer l'un des trois mots de commande, après quoi une quantité d'eau douce ou d'eau salée (au choix) s'écoule de la carafe. L'eau cesse de couler au début de votre tour suivant.\n\nÉclaboussure : 4 litres d'eau.\nFontaine : 20 litres d'eau.\nGeyser : 120 litres en Ligne de 9 m × 30 cm (cible JS Force DD 13 ou 1d4 contondants + À terre ; objet ≤ 100 kg renversé).",
      en: "This stoppered flask sloshes when shaken, as if it contains water. The decanter weighs 2 pounds.\n\nYou can take a Magic action to remove the stopper and issue one of three command words: fresh or salt water pours out (your choice). The water stops at the start of your next turn.\n\nSplash: 1 gallon. Fountain: 5 gallons. Geyser: 30 gallons in a 30-foot Line, 1 foot wide (creature DC 13 Strength save or 1d4 Bludgeoning + Prone; ≤ 200 lb object knocked over).",
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // Drift FR : "Carquois d'Ehlonna" → "Carquois efficace" (officiel WotC FR 2024+).
    id: 'carquois-d-ehlonna',
    name: { fr: 'Carquois efficace', en: 'Efficient Quiver' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Chacun des trois compartiments de ce carquois est lié à un espace extradimensionnel qui permet au carquois de contenir de nombreux objets sans jamais peser plus de 1 kg. Le compartiment court peut contenir jusqu'à 60 flèches, carreaux ou objets comparables. Le compartiment de taille intermédiaire peut contenir jusqu'à 18 javelines ou objets comparables. Le compartiment long peut contenir jusqu'à 6 objets longs de type arc, bâton de combat ou lance.\n\nVous pouvez extraire n'importe quel objet contenu dans le carquois comme si vous le tiriez d'un carquois ou d'un fourreau ordinaire.",
      en: 'Each of the quiver’s three compartments connects to an extradimensional space that allows the quiver to hold numerous items while never weighing more than 2 pounds. The shortest compartment can hold up to 60 Arrows, Bolts, or similar objects. The midsize compartment holds up to 18 Javelins or similar objects. The longest compartment holds up to 6 long objects, such as bows, Quarterstaffs, or Spears.\n\nYou can draw any item the quiver contains as if doing so from a regular quiver or scabbard.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // Drift FR : "Cartes d'illusion" → "Tarot fantasmagorique" (officiel WotC FR).
    id: 'cartes-d-illusion',
    name: { fr: 'Tarot fantasmagorique', en: 'Deck of Illusions' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Cette boîte contient un jeu de cartes. Un jeu complet se compose de 34 cartes (« lames ») : 32 représentent des créatures spécifiques, les deux dernières ont une surface réfléchissante. Il manque généralement 1d20 − 1 cartes à un jeu trouvé comme trésor.\n\nLa magie du tarot n'opère que si les lames sont piochées au hasard. Vous pouvez consacrer l'action Magie à piocher une lame au hasard et à la jeter au sol, en un point situé dans un rayon de 9 m. L'illusion d'une créature (table « Tarot fantasmagorique » SRD p. 240) se forme au-dessus de la carte et persiste jusqu'à dissipation. La créature illusoire ressemble à une vraie créature de son espèce et se comporte comme telle, mais elle est parfaitement inoffensive.\n\nTant que vous êtes dans un rayon de 36 m et que vous la voyez, vous pouvez consacrer l'action Magie à la déplacer en n'importe quel point situé dans un rayon de 9 m de sa carte d'origine.\n\nToute interaction physique perce l'illusion (intangible). Action Étude + test d'Intelligence (Investigation) DD 15 = perce l'illusion. L'illusion persiste jusqu'à sa dissipation (sort dissipation de la magie) ou que sa carte soit déplacée. Carte usée = image effacée, carte inutilisable.",
      en: 'This box contains a set of cards. A full deck has 34 cards: 32 depicting specific creatures and two with a mirrored surface. A deck found as treasure is usually missing 1d20 − 1 cards.\n\nThe magic of the deck functions only if its cards are drawn at random. You can take a Magic action to draw a card at random from the deck and throw it to the ground at a point within 30 feet. An illusion of a creature (Deck of Illusions table, SRD p. 217) forms over the thrown card and remains until dispelled.\n\nWhile you are within 120 feet of the illusory creature and can see it, you can take a Magic action to move it anywhere within 30 feet of its card.\n\nAny physical interaction reveals it to be false. A Study action + DC 15 Intelligence (Investigation) check identifies it as an illusion. The illusion lasts until its card is moved or dispelled. When the illusion ends, the card image disappears and the card can\'t be used again.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'gemme-d-illumination',
    name: { fr: "Gemme d'illumination", en: 'Gem of Brightness' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Ce prisme dispose de 50 charges. Tant que vous le tenez, vous pouvez consacrer l'action Magie à prononcer l'un de ses trois mots de commande afin de lui faire produire l'un des effets suivants :\n\nPremier mot de commande. La gemme projette une Lumière vive sur un rayon de 9 m, et une Lumière faible sur 9 m de plus. Cet effet ne consomme pas de charge.\n\nDeuxième mot de commande. Vous dépensez 1 charge et projetez un faisceau de lumière éclatante sur une créature que vous voyez dans un rayon de 18 m. La créature doit réussir un jet de sauvegarde de Constitution DD 15 sous peine de subir l'état Aveuglé pendant 1 minute.\n\nTroisième mot de commande. Dépensez 5 charges : la gemme projette une lumière aveuglante dans un Cône de 9 m. Chaque créature prise dans le Cône effectue le même JS Constitution DD 15.\n\nUne fois toutes les charges dépensées, la gemme devient un joyau non magique d'une valeur de 50 po.",
      en: "This prism has 50 charges. While you are holding it, you can take a Magic action and use one of three command words.\n\nFirst Command Word. The gem sheds Bright Light in a 30-foot radius and Dim Light for an additional 30 feet. This effect doesn't expend a charge.\n\nSecond Command Word. You expend 1 charge and fire a brilliant beam of light at one creature you can see within 60 feet. DC 15 Constitution save or Blinded for 1 minute.\n\nThird Command Word. You expend 5 charges and flare with intense light in a 30-foot Cone. Each creature in the Cone makes the same save.\n\nWhen all charges are expended, the gem becomes a nonmagical jewel worth 50 GP.",
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'gemme-elementaire',
    name: { fr: 'Gemme élémentaire', en: 'Elemental Gem' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Cette gemme contient une particule d'énergie élémentaire. Lorsque vous entreprenez l'action Utilisation pour briser la gemme, cela convoque un élémentaire et la gemme perd sa magie. L'élémentaire apparaît en un espace inoccupé aussi près que possible de la gemme brisée, comprend les mêmes langues que vous, obéit à vos ordres et joue son tour juste après vous à votre rang d'initiative. Il disparaît au bout de 1 heure, s'il meurt, ou si vous le révoquez par une action Bonus.\n\nType de gemme → Élémentaire : Corindon rouge → feu ; Diamant jaune → terre ; Émeraude → eau ; Saphir bleu → air.",
      en: 'This gem contains a mote of elemental energy. When you take a Utilize action to break the gem, an elemental is summoned, and the gem ceases to be magical. The elemental appears in an unoccupied space as close to the broken gem as possible, understands your languages, obeys your commands, and takes its turn immediately after you on your Initiative count. The elemental disappears after 1 hour, when it dies, or when you dismiss it as a Bonus Action.\n\nGem → Elemental: Blue sapphire → Air; Emerald → Water; Red corundum → Fire; Yellow diamond → Earth.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'lanterne-de-revelation',
    name: { fr: 'Lanterne de révélation', en: 'Lantern of Revealing' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Lorsqu'elle est allumée, cette lanterne à capote brûle pendant 6 heures avec 50 cl d'huile, en projetant une Lumière vive dans un rayon de 9 m et une Lumière faible sur 9 m supplémentaires. Les créatures et objets Invisibles sont visibles sous la Lumière vive de la lanterne. Vous pouvez entreprendre l'action Utilisation pour abaisser la capote, ce qui réduit la lumière de la lanterne à une Lumière faible dans un rayon de 1,50 m.",
      en: 'While lit, this hooded lantern burns for 6 hours on 1 pint of oil, shedding Bright Light in a 30-foot radius and Dim Light for an additional 30 feet. Invisible creatures and objects are visible as long as they are in the lantern’s Bright Light. You can take a Utilize action to lower the hood, reducing the lantern’s light to Dim Light in a 5-foot radius.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // Drift FR : "Perle de pouvoir" → "Perle de thaumaturgie" (officiel WotC FR).
    id: 'perle-de-pouvoir',
    name: { fr: 'Perle de thaumaturgie', en: 'Pearl of Power' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: true,
    magicDescription: {
      fr: "Tant que cette perle est sur vous, vous pouvez entreprendre l'action Magie pour récupérer un emplacement de sort dépensé du 3ᵉ niveau ou inférieur. Une fois la perle utilisée, vous ne pouvez plus y recourir avant l'aube suivante.",
      en: 'While this pearl is on your person, you can take a Magic action to regain one expended spell slot of level 3 or lower. Once you use the pearl, it can’t be used again until the next dawn.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'flute-des-egouts',
    name: { fr: 'Flûte des égouts', en: 'Pipes of the Sewers' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: true,
    magicDescription: {
      fr: "Tant que cette flûte est sur vous, les rats ordinaires et les rats géants vous sont Indifférents et ne vous attaqueront pas, sauf si vous les menacez ou leur faites du mal.\n\nCette flûte dispose de 3 charges et récupère quotidiennement 1d3 charges dépensées, à l'aube. Si vous en jouez au prix de l'action Magie, vous pouvez dépenser 1 à 3 charges par une action Bonus, appelant à vous une nuée de rats pour chaque charge dépensée (rayon 750 m). Chaque nuée de rats arrivant dans un rayon de 9 m effectue un JS Sagesse DD 15. Réussite : la nuée se comporte normalement et est immunisée 24 h. Échec : la nuée est envoûtée et devient Amicale envers vous et vos alliés tant que vous continuez à jouer chaque round.",
      en: "While these pipes are on your person, ordinary rats and giant rats are Indifferent toward you and won't attack you unless you threaten or harm them.\n\nThe pipes have 3 charges and regain 1d3 expended charges daily at dawn. If you play the pipes as a Magic action, you can take a Bonus Action to expend 1 to 3 charges, calling forth one Swarm of Rats with each expended charge (half a mile range). Each swarm coming within 30 feet makes a DC 15 Wisdom save: success = behaves normally + immune 24h; failure = becomes Friendly to you and your allies for as long as you continue playing each round.",
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'flute-terrifiante',
    name: { fr: 'Flûte terrifiante', en: 'Pipes of Haunting' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Cette flûte dispose de 3 charges et récupère quotidiennement 1d3 charges dépensées, à l'aube. Vous pouvez entreprendre l'action Magie pour en jouer et dépenser 1 charge afin de faire naître une mélodie envoûtante. Chaque créature de votre choix dans un rayon de 9 m doit réussir un jet de sauvegarde de Sagesse DD 15 sous peine de subir l'état Effrayé pendant 1 minute. En cas d'échec, la créature peut réitérer ce JS à la fin de chacun de ses tours. En cas de réussite, la créature est immunisée contre l'effet de cette flûte pendant 24 heures.",
      en: 'These pipes have 3 charges and regain 1d3 expended charges daily at dawn. You can take a Magic action to play them and expend 1 charge to create an eerie, spellbinding tune. Each creature of your choice within 30 feet of you must succeed on a DC 15 Wisdom saving throw or have the Frightened condition for 1 minute. A creature that fails the save repeats it at the end of each of its turns. A creature that succeeds is immune to the effect of these pipes for 24 hours.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'poudre-a-eternuer',
    name: { fr: 'Poudre à éternuer', en: 'Dust of Sneezing and Choking' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Trouvée dans un petit récipient, cette fine poudre ressemble à de la poussière de disparition, même le sort identification la percevant comme telle. Il y en a assez pour une utilisation.\n\nAu prix de l'action Utilisation, vous pouvez lancer cette poudre en l'air, ce qui vous soumet ainsi que chaque créature prise dans une Émanation de 9 m centrée sur vous à un jet de sauvegarde de Constitution DD 15. Artificiels, Élémentaires, Morts-vivants, Plantes et Vases réussissent automatiquement ce JS.\n\nEn cas d'échec, une créature se met à éternuer de façon incontrôlable ; elle subit l'état Neutralisé et s'asphyxie. La créature réitère le JS à la fin de chacun de ses tours et met un terme à l'effet en cas de réussite. L'effet prend également fin sur toute créature cible du sort restauration partielle.",
      en: 'Found in a small container, this powder resembles Dust of Disappearance, and Identify reveals it to be such. There is enough of it for one use.\n\nAs a Utilize action, you can throw the dust into the air, forcing yourself and every creature in a 30-foot Emanation originating from you to make a DC 15 Constitution saving throw. Constructs, Elementals, Oozes, Plants, and Undead succeed on the save automatically.\n\nOn a failed save, a creature begins sneezing uncontrollably; it has the Incapacitated condition and is suffocating. The creature repeats the save at the end of each of its turns, ending the effect on itself on a success. The effect also ends on any creature targeted by a Lesser Restoration spell.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // Drift FR : "Poussière dessiccative" → "Poudre dessiccative" (officiel WotC FR).
    id: 'poussiere-dessiccative',
    name: { fr: 'Poudre dessiccative', en: 'Dust of Dryness' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Cette petite pochette contient 1d6 + 4 pincées de poudre. Au prix de l'action Utilisation, vous dispersez une pincée de cette poudre sur de l'eau, transformant un Cube d'eau de 4,50 m en une boulette de la taille d'une bille, qui flotte ou repose près de l'endroit où la poudre a été appliquée. Le poids de la boulette est négligeable. Une créature qui projette violemment la boulette contre une surface dure provoque son éclatement, ce qui libère la quantité d'eau absorbée.\n\nAu prix de l'action Utilisation, vous pouvez disperser une pincée de cette poudre sur un Élémentaire essentiellement composé d'eau situé dans un rayon de 1,50 m. Exposée à une pincée, la créature effectue un jet de sauvegarde de Constitution DD 13 et subit 10d6 dégâts nécrotiques en cas d'échec, la moitié en cas de réussite.",
      en: 'This small packet contains 1d6 + 4 pinches of dust. As a Utilize action, you can sprinkle a pinch of the dust over water, turning up to a 15-foot Cube of water into one marble-sized pellet, which floats or rests near where the dust was sprinkled. A creature can take a Utilize action to smash the pellet against a hard surface, causing the pellet to shatter and release the water.\n\nAs a Utilize action, you can sprinkle a pinch of the dust on an Elemental within 5 feet of yourself that is composed mostly of water. Such a creature makes a DC 13 Constitution saving throw, taking 10d6 Necrotic damage on a failed save or half as much damage on a successful one.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'poussiere-de-disparition',
    name: { fr: 'Poussière de disparition', en: 'Dust of Disappearance' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Cette poudre ressemble à du sable fin. Il y en a assez pour une utilisation. Lorsque vous entreprenez l'action Utilisation pour lancer la poudre en l'air, vous-même et chaque créature ou objet pris dans une Émanation de 3 m centrée sur vous recevez l'état Invisible pendant 2d4 minutes. La durée est la même pour tous les sujets, et la poussière est détruite quand sa magie s'active. Aussitôt après qu'une créature affectée effectue un jet d'attaque, inflige des dégâts ou lance un sort, l'état Invisible prend fin pour elle.",
      en: 'This powder resembles fine sand. There is enough of it for one use. When you take a Utilize action to throw the dust into the air, you and each creature and object within a 10-foot Emanation originating from you have the Invisible condition for 2d4 minutes. The duration is the same for all subjects, and the dust is consumed when its magic takes effect. Immediately after an affected creature makes an attack roll, deals damage, or casts a spell, the Invisible condition ends for that creature.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'sac-a-malices',
    name: { fr: 'Sac à malices', en: 'Bag of Tricks' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Ce sac en toile grise, rouille ou brune, semble vide. Pourtant, pour peu que l'on fouille à l'intérieur du sac, on sent la présence d'un petit objet pelucheux.\n\nEntreprendre l'action Magie permet d'extraire du sac l'objet pelucheux et de le lancer à une distance maximale de 6 m. Quand il retombe, il se transforme en une créature que vous déterminez en lançant le dé selon la table « Sac à malices » SRD p. 213 (3 tables selon couleur : gris/rouille/brun). La créature disparaît à l'aube suivante, ou plus tôt si elle est réduite à 0 point de vie.\n\nAmicale envers vous et vos alliés, la créature agit juste après vous. Par une action Bonus, vous pouvez diriger son déplacement et son action.\n\nUne fois que trois objets pelucheux ont été sortis du sac, celui-ci ne peut plus être réutilisé avant l'aube suivante.",
      en: 'This bag made from gray, rust, or tan cloth appears empty. Reaching inside the bag reveals the presence of a small, fuzzy object.\n\nYou can take a Magic action to pull the fuzzy object from the bag and throw it up to 20 feet. When the object lands, it transforms into a creature you determine by rolling on the Bag of Tricks tables (3 tables per color: Gray/Rust/Tan, SRD p. 213). The creature vanishes at the next dawn or when it is reduced to 0 Hit Points.\n\nThe creature is Friendly to you and your allies, and it acts immediately after you. You can take a Bonus Action to command its movement and action.\n\nOnce three fuzzy objects have been pulled from the bag, the bag can\'t be used again until the next dawn.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'sac-sans-fond',
    name: { fr: 'Sac sans fond', en: 'Bag of Holding' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "L'espace de stockage de ce sac est considérablement plus grand que le laissent penser ses dimensions extérieures : 1,20 m de profondeur pour 60 cm de section. Le sac peut contenir jusqu'à 250 kg, pour un volume maximal de 1 800 litres. Il pèse 2,5 kg quel que soit son contenu. Récupérer un objet nécessite l'action Utilisation.\n\nS'il est surchargé, troué ou déchiré, il est détruit. Son contenu est alors disséminé sur le Plan Astral. Si le sac est retourné comme un gant, son contenu se déverse sans que rien ne se brise, mais le sac doit être remis à l'endroit avant de pouvoir être réutilisé. Le sac contient suffisamment d'air pour 10 minutes de ventilation, divisées par le nombre de créatures qui respirent à l'intérieur.\n\nPlacer un sac sans fond dans l'espace extradimensionnel créé par un havresac magique, un puits portable ou tout autre objet comparable détruit instantanément les deux objets et ouvre un portail vers le Plan Astral.",
      en: 'This bag has an interior space considerably larger than its outside dimensions — roughly 2 feet square and 4 feet deep on the inside. The bag can hold up to 500 pounds, not exceeding a volume of 64 cubic feet. The bag weighs 5 pounds, regardless of its contents. Retrieving an item from the bag requires a Utilize action.\n\nIf the bag is overloaded, pierced, or torn, it is destroyed, and its contents are scattered in the Astral Plane. If the bag is turned inside out, its contents spill forth unharmed, but the bag must be put right before it can be used again. The bag holds enough air for 10 minutes of breathing, divided by the number of breathing creatures inside.\n\nPlacing a Bag of Holding inside an extradimensional space created by a Handy Haversack, Portable Hole, or similar item instantly destroys both items and opens a gate to the Astral Plane.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
];

export const SRD_MAGIC_ITEMS_UTILITY_COUNTS = {
  total: SRD_MAGIC_ITEMS_UTILITY.length,
  common: SRD_MAGIC_ITEMS_UTILITY.filter((i) => i.rarity === 'common').length,
  uncommon: SRD_MAGIC_ITEMS_UTILITY.filter((i) => i.rarity === 'uncommon').length,
} as const;
