/**
 * SRD CC v5.2.1 — Conteneurs, véhicules & objets utilitaires (10 entrées).
 *
 * Batch D29.18 (backfill EN des magic-items grandfathered AideDD).
 *
 * Sources verbatim :
 *   - EN : `content-sources/extracted/raw/SRD_CC_v5.2.1.txt`
 *     (Bag of Devouring l. 21162, Broom of Flying l. 21436, Candle of Invocation
 *     l. 21452, Carpet of Flying l. 21492, Efreeti Bottle l. 22001, Feather Token
 *     l. 22139, Folding Boat l. 22347, Handy Haversack l. 22498, Instant Fortress
 *     l. 22778, Marvelous Pigments l. 23103)
 *   - FR : `content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt`
 *     (Balai volant l. 25287, Bateau pliable l. 25310, Bouteille du mauvais génie
 *     l. 25935, Cierge d'invocation l. 26309, Forteresse instantanée l. 26943,
 *     Havresac magique l. 27133, Pigments merveilleux l. 27955, Plume magique
 *     l. 27988, Sac dévoreur l. 28659, Tapis volant l. 29153)
 *
 * Corrections issues du SRD :
 *   - `attunement` : le Balai volant, le Cierge d'invocation et la Forteresse
 *     instantanée étaient `false` (héritage AideDD) → le SRD 5.2.1 les marque
 *     « Requires Attunement » (simple → `true`). Les 7 autres n'en exigent
 *     AUCUNE → restent `false`.
 *   - `name.fr` (DRIFT — noms propres 2024 abandonnés ou reformulés) :
 *       • « Bouteille de l'éfrit » → **« Bouteille du mauvais génie »** (Efreeti
 *         Bottle, l. 25935)
 *       • « Havresac magique d'Hévard » → **« Havresac magique »** (Handy
 *         Haversack — « Heward's » abandonné, l. 27133)
 *       • « Forteresse instantanée de Daern » → **« Forteresse instantanée »**
 *         (Instant Fortress — « Daern's » abandonné, l. 26943)
 *       • « Pigments merveilleux de Nolzur » → **« Pigments merveilleux »**
 *         (Marvelous Pigments — « Nolzur's » abandonné, l. 27955)
 *       • « Plume de Quaal » → **« Plume magique »** (Feather Token — « Quaal's »
 *         abandonné, l. 27988). Slugs préservés byte-identique.
 *   - `rarity` : le Feather Token / la Plume magique est « Rarity Varies »
 *     (peu courant → rare selon le type) ; conservé `rare` (valeur représentative,
 *     table détaillée dans la description).
 *   - `magicDescription` : reformulé sur la VF officielle SRD. **Tables
 *     divergentes entre éditions** (ordre + tranches différents, chaque langue
 *     reproduit SA table officielle) : Cierge d'invocation (Plan Extérieur) et
 *     Plume magique (types de plume). Tables inlinées.
 *
 * Conventions (identiques aux modules D29.1→D29.17) : hyphénations / sauts de page
 * retirés ; apostrophes FR en ASCII, EN verbatim SRD (quotes courbes) ; `\n\n`
 * entre blocs ; tables inlinées.
 */

import type { SrdMagicItemEntry } from './srd-magic-items-potions';

export const SRD_MAGIC_ITEMS_CONTAINERS: SrdMagicItemEntry[] = [
  {
    id: 'balai-volant',
    name: { fr: 'Balai volant', en: 'Broom of Flying' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: true,
    magicDescription: {
      fr: "Ce balai en bois remplit la fonction de balai ordinaire jusqu'à ce que vous le chevauchiez et entrepreniez l'action Magie pour le placer en vol stationnaire au-dessous de vous, faisant de lui une monture aérienne. Sa Vitesse de vol est de 15 m. Il peut transporter jusqu'à 200 kg, mais sa Vitesse de vol est réduite à 9 m s'il porte plus de 100 kg. Le balai cesse son vol stationnaire quand vous posez les pieds au sol ou ne le chevauchez plus.\n\nAu prix de l'action Magie, vous pouvez envoyer le balai voler seul vers une destination située dans un rayon de 1,5 km si vous nommez l'emplacement et connaissez cet endroit. Le balai revient à vous quand vous entreprenez l'action Magie et prononcez le mot de commande correspondant, à condition qu'il se trouve toujours dans un rayon de 1,5 km.",
      en: 'This wooden broom functions like a mundane broom until you stand astride it and take a Magic action to make it hover beneath you, at which time it can be ridden in the air. It has a Fly Speed of 50 feet. It can carry up to 400 pounds, but its Fly Speed becomes 30 feet while carrying over 200 pounds. The broom stops hovering when you land or when you’re no longer riding it.\n\nAs a Magic action, you can send the broom to travel alone to a destination within 1 mile of you if you name the location and are familiar with it. The broom comes back to you when you take a Magic action and use a command word if the broom is still within 1 mile of you.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'bateau-pliable',
    name: { fr: 'Bateau pliable', en: 'Folding Boat' },
    category: 'gear',
    rarity: 'rare',
    attunement: false,
    magicDescription: {
      fr: "Cet objet apparaît d'emblée comme une caisse oblongue en bois, longue de 30 cm pour une largeur et une hauteur de 15 cm. Elle pèse 2 kg et flotte. Il est possible de l'ouvrir et de ranger des objets à l'intérieur. L'objet est aussi doté de trois mots de commande, chacun nécessitant l'action Magie :\n\nPremier mot de commande. La caisse se déplie pour former une barque.\n\nDeuxième mot de commande. La caisse se déplie pour former une barge.\n\nTroisième mot de commande. Le bateau pliable se replie et retrouve sa forme de caisse si aucune créature ne se trouve à bord. Les objets restés à bord et qui ne tiennent pas dans cette caisse se retrouvent à l'extérieur de celle-ci lorsqu'elle se replie. Tout objet resté à bord du navire et qui tient dans la caisse y est rangé.\n\nLorsque la caisse se transforme en véhicule, son poids devient celui d'un bâtiment normal de son gabarit, et tout ce qui était rangé dans la caisse reste à bord.\n\nLes profils de la barque et de la barge sont disponibles en section « Équipement ». Si l'un ou l'autre véhicule est réduit à 0 point de vie, le bateau pliable est détruit.",
      en: 'This object appears as a wooden box that measures 12 inches long, 6 inches wide, and 6 inches deep. It weighs 4 pounds and floats. It can be opened to store items inside. This item also has three command words, each requiring a Magic action to use:\n\nFirst Command Word. The box unfolds into a Rowboat.\n\nSecond Command Word. The box unfolds into a Keelboat.\n\nThird Command Word. The Folding Boat folds back into a box if no creatures are aboard. Any objects in the vessel that can’t fit inside the box remain outside the box as it folds. Any objects in the vessel that can fit inside the box do so.\n\nWhen the box becomes a vessel, its weight becomes that of a normal vessel its size, and anything that was stored in the box remains in the boat.\n\nStatistics for the Rowboat and Keelboat appear in “Equipment.” If either vessel is reduced to 0 Hit Points, the Folding Boat is destroyed.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // DRIFT nom : « Bouteille de l'éfrit » → « Bouteille du mauvais génie ».
    id: 'bouteille-de-l-efrit',
    name: { fr: 'Bouteille du mauvais génie', en: 'Efreeti Bottle' },
    category: 'gear',
    rarity: 'very rare',
    attunement: false,
    magicDescription: {
      fr: "Lorsque vous consacrez l'action Magie à retirer le bouchon, un épais nuage de fumée s'échappe de cette bouteille en bronze peint. À la fin de votre tour, la fumée se dissipe dans une gerbe de feu inoffensive et un éfrit apparaît en un espace inoccupé dans un rayon de 9 m.\n\nLa première fois que la bouteille est ouverte, le MJ jette le dé et consulte la table ci-après pour déterminer ce qui se produit.\n\nEffet (1d10) : 1, L'éfrit vous attaque. Après 5 rounds de combat, l'éfrit disparaît et la bouteille perd sa magie. 2-9, L'éfrit comprend les mêmes langues que vous et obéit à vos ordres pendant 1 heure, après quoi il retourne dans la bouteille, scellée par un nouveau bouchon. La bouteille ne peut pas être débouchée pendant 24 heures. Lors des deux prochains débouchages de la bouteille, le même effet se produit. Si l'on ouvre la bouteille une quatrième fois, l'éfrit s'enfuit, disparaît et la bouteille perd sa magie. 10, L'éfrit comprend les mêmes langues que vous et peut lancer souhait une fois pour vous. Il disparaît après avoir exaucé le souhait (au bout de 1 heure sans cela) et la bouteille perd sa magie.",
      en: 'When you take a Magic action to remove the stopper of this painted brass bottle, a cloud of thick smoke flows out of it. At the end of your turn, the smoke disappears with a flash of harmless fire, and an Efreeti appears in an unoccupied space within 30 feet of you.\n\nThe first time the bottle is opened, the GM rolls on the following table to determine what happens.\n\nEffect (1d10): 1, The efreeti attacks you. After fighting for 5 rounds, the efreeti disappears, and the bottle loses its magic. 2–9, The efreeti understands your languages and obeys your commands for 1 hour, after which it returns to the bottle, and a new stopper contains it. The stopper can’t be removed for 24 hours. The next two times the bottle is opened, the same effect occurs. If the bottle is opened a fourth time, the efreeti escapes and disappears, and the bottle loses its magic. 10, The efreeti understands your languages and can cast Wish once for you. It disappears when it grants the wish or after 1 hour, and the bottle loses its magic.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'cierge-d-invocation',
    name: { fr: "Cierge d'invocation", en: 'Candle of Invocation' },
    category: 'gear',
    rarity: 'very rare',
    attunement: true,
    magicDescription: {
      fr: "La magie du cierge est activée lorsque celui-ci est allumé, ce qui nécessite l'action Magie. Après avoir brûlé 4 heures, le cierge est détruit. Vous pouvez l'éteindre auparavant, afin de le réutiliser par la suite. Déduisez le temps de combustion par incréments de 1 minute de son temps de combustion total.\n\nTant qu'il brûle, le cierge émet une Lumière faible dans un rayon de 9 m. Dans cette lumière, vous bénéficiez de l'Avantage aux Tests d20. En outre, tout Clerc ou Druide dans sa lumière peut lancer ses sorts du 1er niveau préparés sans dépenser d'emplacements de sort.\n\nUne autre option, lorsque vous allumez le cierge pour la première fois, consiste à lancer le sort portail. Dans ce cas, le cierge est détruit. Le portail créé par le sort ouvre sur un Plan Extérieur spécifique choisi par le MJ ou déterminé par le hasard selon la table ci-après.\n\nPlan Extérieur (1d100) : Abysses 01-05 ; Achéron 06-10 ; Arborée 11-17 ; Arcadie 18-25 ; Bytopie 26-33 ; Carcères 34-38 ; Élysée 39-46 ; Géhenne 47-51 ; Hadès 52-56 ; Limbes 57-61 ; Méchanus 62-69 ; Mont Céleste 70-77 ; Neuf Enfers 78-82 ; Pandémonium 83-87 ; Terres des Bêtes 88-95 ; Ysgard 96-00.",
      en: 'This candle’s magic is activated when the candle is lit, which requires a Magic action. After burning for 4 hours, the candle is destroyed. You can snuff it out early for use at a later time. Deduct the time it burned in increments of 1 minute from its total burn time.\n\nWhile lit, the candle sheds Dim Light in a 30-foot radius. While you are within that light, you have Advantage on D20 Tests. In addition, a Cleric or Druid in the light can cast level 1 spells they have prepared without expending spell slots.\n\nAlternatively, when you light the candle for the first time, you can cast Gate with it. Doing so destroys the candle. The portal created by the spell links to a particular Outer Plane chosen by the GM or determined by rolling on the following table.\n\nOuter Plane (1d100): Abyss 01–05; Acheron 06–10; Arborea 11–17; Arcadia 18–25; Beastlands 26–33; Bytopia 34–41; Carceri 42–46; Elysium 47–54; Gehenna 55–59; Hades 60–64; Limbo 65–69; Mechanus 70–77; Mount Celestia 78–85; Nine Hells 86–90; Pandemonium 91–95; Ysgard 96–00.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // DRIFT nom : « Forteresse instantanée de Daern » → « Forteresse instantanée ».
    id: 'forteresse-instantanee-de-daern',
    name: { fr: 'Forteresse instantanée', en: 'Instant Fortress' },
    category: 'gear',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: "Au prix de l'action Magie, vous placez au sol cette statuette en adamantium de 2,5 cm puis, en prononçant le mot de commande, provoquez sa croissance rapide en tour en adamantium de section carrée. Répéter le mot de commande fait revenir la tour à sa forme de statuette, ce qui ne fonctionne que lorsque la tour est inoccupée. Chaque créature se trouvant dans la zone où la tour apparaît est repoussée dans un espace inoccupé extérieur à la tour, mais adjacent à elle. Tout objet présent dans la zone et n'étant porté par personne est lui aussi repoussé par la tour.\n\nLa tour est large de 6 m et haute de 9 m, avec des meurtrières sur tous les flancs et un crénelage en son sommet. Son intérieur se divise en deux étages reliés par une échelle, un escalier ou un plan incliné (à votre guise). L'échelle, escalier ou plan incliné aboutit à une trappe qui ouvre sur le toit. À sa création, la tour présente une seule porte au rez-de-chaussée, orientée vers vous. Cette porte ne s'ouvre que sur votre ordre, que vous pouvez prononcer par une action Bonus. Elle est immunisée contre le sort déblocage et toute magie comparable.\n\nSa magie empêche la tour de basculer. Toit, porte et murs ont chacun le profil suivant : CA 20, 100 pv ; Immunité contre les dégâts contondants, perforants et tranchants sauf ceux des armes de siège ; Résistance à tous les autres dégâts. Rendre sa taille de statuette à la tour ne répare pas les dégâts qu'elle a subis. Seul le sort souhait peut réparer la tour (cette utilisation du sort compte comme la reproduction d'un sort du 8e niveau ou inférieur). Chaque incantation de souhait fait regagner tous ses points de vie à la tour.",
      en: 'As a Magic action, you can place this 1-inch adamantine statuette on the ground and, using a command word, cause it to grow rapidly into a square adamantine tower. Repeating the command word causes the tower to revert to statuette form, which works only if the tower is empty. Each creature in the area where the tower appears is pushed to an unoccupied space outside but next to the tower. Objects in the area that aren’t being worn or carried are also pushed clear of the tower.\n\nThe tower is 20 feet on a side and 30 feet high, with arrow slits on all sides and a battlement atop it. Its interior is divided into two floors, with a ladder, staircase, or ramp (your choice) connecting them. This ladder, staircase, or ramp ends at a trapdoor leading to the roof. When created, the tower has a single door at ground level on the side facing you. The door opens only at your command, which you can issue as a Bonus Action. It is immune to the Knock spell and similar magic.\n\nMagic prevents the tower from being tipped over. The roof, the door, and the walls each have AC 20; HP 100; Immunity to Bludgeoning, Piercing, and Slashing damage except that which is dealt by siege equipment; and Resistance to all other damage. Shrinking the tower back down to statuette form doesn’t repair damage to the tower. Only a Wish spell can repair the tower (this use of the spell counts as replicating a spell of level 8 or lower). Each casting of Wish causes the tower to regain all its Hit Points.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // DRIFT nom : « Havresac magique d'Hévard » → « Havresac magique ».
    id: 'havresac-magique-d-hevard',
    name: { fr: 'Havresac magique', en: 'Handy Haversack' },
    category: 'gear',
    rarity: 'rare',
    attunement: false,
    magicDescription: {
      fr: "Ce sac à dos se compose d'une poche centrale et de deux poches latérales, chacune ouvrant sur un espace extradimensionnel. Chaque poche latérale peut contenir 100 kg de matériel pour un volume maximal de 700 litres. La poche centrale peut contenir 250 kg de matériel pour un volume maximal de 1 800 litres. Le havresac ne pèse que 2,5 kg, quel que soit son contenu.\n\nRécupérer un objet dans le havresac nécessite l'action Utilisation ou une action Bonus (à votre guise). Lorsque vous plongez la main dans le havresac en quête d'un objet spécifique, celui-ci se trouve toujours magiquement au-dessus.\n\nSi l'une de ses poches est surchargée, percée ou déchirée, le havresac éclate et il est détruit. Si le havresac est détruit, son contenu est perdu à jamais (un Artefact finit cependant toujours par réapparaître quelque part). Si le havresac est retourné comme un gant, son contenu se déverse sans que rien ne se brise ; il doit être remis à l'endroit avant de pouvoir être réutilisé.\n\nChaque poche du havresac contient suffisamment d'air pour 10 minutes de ventilation, divisées par le nombre de créatures qui respirent à l'intérieur.\n\nPlacer ce havresac dans l'espace extradimensionnel créé par un sac sans fond, un puits portable ou tout autre objet équivalent détruit instantanément les deux objets et ouvre un portail vers le Plan Astral. Ce portail s'ouvre à l'endroit où l'objet a été placé dans l'autre. Toute créature dans un rayon de 3 m du portail, si elle ne dispose pas d'un Abri total, est aspirée et déposée en un lieu aléatoire du Plan Astral. Le portail se referme alors. Il est à sens unique et ne peut pas être rouvert.",
      en: 'This backpack has a central pouch and two side pouches, each of which is an extradimensional space. Each side pouch can hold up to 200 pounds of material, not exceeding a volume of 25 cubic feet. The central pouch can hold up to 500 pounds of material, not exceeding a volume of 64 cubic feet. The haversack always weighs 5 pounds, regardless of its contents.\n\nRetrieving an item from the haversack requires a Utilize action or a Bonus Action (your choice). When you reach into the haversack for a specific item, the item is always magically on top.\n\nIf any of its pouches is overloaded, pierced, or torn, the haversack ruptures and is destroyed. If the haversack is destroyed, its contents are lost forever, although an Artifact always turns up again somewhere. If the haversack is turned inside out, its contents spill forth unharmed, and the haversack must be put right before it can be used again.\n\nEach pouch of the haversack holds enough air for 10 minutes of breathing, divided by the number of breathing creatures inside.\n\nPlacing the haversack inside an extradimensional space created by a Bag of Holding, Portable Hole, or similar item instantly destroys both items and opens a gate to the Astral Plane. The gate originates where the one item was placed inside the other. Any creature within 10 feet of the gate and not behind Total Cover is sucked through it and deposited in a random location on the Astral Plane. The gate then closes. The gate is one-way only and can’t be reopened.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // DRIFT nom : « Pigments merveilleux de Nolzur » → « Pigments merveilleux ».
    id: 'pigments-merveilleux-de-nolzur',
    name: { fr: 'Pigments merveilleux', en: 'Marvelous Pigments' },
    category: 'gear',
    rarity: 'very rare',
    attunement: false,
    magicDescription: {
      fr: "Cette belle boîte en bois contient 1d4 pots de pigments et un pinceau (pour un poids total de 500 g).\n\nEn utilisant le pinceau et en dépensant 1 pot de pigments, vous pouvez peindre un nombre illimité d'objets tridimensionnels et d'éléments de terrain (tels que murs, portes, arbres, fleurs, armes, toiles d'araignée et fosses), à condition que ces éléments tiennent tous dans un Cube de 6 m. L'opération prend 10 minutes (quel que soit le nombre d'éléments que vous créez), pendant lesquelles vous devez rester dans le Cube, et nécessite votre Concentration. Si votre Concentration est rompue ou que vous quittez le Cube avant que le travail ne soit terminé, tous les éléments peints disparaissent et le pot de pigments est gaspillé.\n\nUne fois le travail terminé, tous les objets et éléments de terrain peints deviennent réels. Ainsi, peindre une porte sur un mur crée-t-il une vraie porte qu'on peut ouvrir sur ce qui se trouve au-delà du mur. Peindre une fosse crée une véritable fosse, dont la profondeur totale doit se trouver dans le Cube de 6 m.\n\nAucun objet créé par un pot de pigments ne peut avoir une valeur supérieure à 25 po, tandis que la valeur totale de tous les objets créés par un même pot de pigments ne peut dépasser 500 po. Si vous tracez des objets de plus grande valeur (comme un gros tas d'or), ils paraissent authentiques, mais un examen attentif révèle qu'ils sont faits de pâte, de biscuits ou de quelque autre matériau sans valeur.\n\nSi vous peignez une forme d'énergie comme le feu ou la foudre, l'énergie se dissipe sitôt la peinture achevée, sans rien endommager.",
      en: 'This fine wooden box contains 1d4 pots of pigment and a brush (weighing 1 pound in total).\n\nUsing the brush and expending 1 pot of pigment, you can paint any number of three-dimensional objects and terrain features (such as walls, doors, trees, flowers, weapons, webs, and pits), provided these elements are all confined to a 20-foot Cube. The effort takes 10 minutes (regardless of the number of elements you create), during which time you must remain in the Cube, and requires Concentration. If your Concentration is broken or you leave the Cube before the work is done, all the painted elements vanish, and the pot of pigment is wasted.\n\nWhen the work is done, all the painted objects and terrain features become real. Thus, painting a door on a wall creates an actual door, which can be opened to whatever is beyond. Painting a pit creates a real pit, the entire depth of which must lie within the 20-foot Cube.\n\nNo object created by a pot of pigment can have a value greater than 25 GP, and the total value of all objects created by a pot of pigment can’t exceed 500 GP. If you paint objects of greater value (such as a large pile of gold), they look authentic, but close inspection reveals they’re made from paste, cookies, or some other worthless material.\n\nIf you paint a form of energy such as fire or lightning, the energy dissipates as soon as you complete the painting, doing no harm.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // DRIFT nom : « Plume de Quaal » → « Plume magique ». Rarity Varies (rare
    // conservé). Types de plume divergents entre EN et FR.
    id: 'plume-de-quaal',
    name: { fr: 'Plume magique', en: 'Feather Token' },
    category: 'gear',
    rarity: 'rare',
    attunement: false,
    magicDescription: {
      fr: "Cet objet ressemble à une plume. Il existe divers types de plume magique, chacun avec un effet à usage unique différent. Le MJ choisit le type de plume ou le détermine aléatoirement selon la table « Plumes magiques ». Le type de plume en définit la rareté.\n\nAncre (peu courante). Vous pouvez consacrer l'action Magie à mettre la plume en contact avec un bateau ou un navire. Pendant les prochaines 24 heures, le navire ne peut en aucun cas être déplacé. Remettre la plume en contact avec le bateau met fin à l'effet d'immobilisation. Quand cet effet se termine, la plume disparaît.\n\nArbre (peu courant). Vous devez être en extérieur pour utiliser cette plume. Vous pouvez entreprendre l'action Magie pour mettre la plume en contact avec un espace inoccupé au sol. La plume disparaît ; à sa place pousse un chêne non magique. L'arbre mesure 18 m de haut et son tronc 1,50 m de diamètre, la ramure au sommet atteignant 6 m de rayon.\n\nBateau-cygne (rare). Vous pouvez consacrer l'action Magie à mettre la plume en contact avec une étendue d'eau dont le diamètre est supérieur ou égal à 18 m. La plume disparaît, remplacée par un bateau de 15 m de long et 6 m de large en forme de cygne géant. Ce bateau est autopropulsé et se déplace sur l'eau à une vitesse de 9 km par heure. Tant que vous êtes à bord, vous pouvez entreprendre l'action Magie pour lui ordonner de se déplacer ou de virer d'un maximum de 90 degrés. Le bateau persiste pendant 24 heures puis disparaît. Vous pouvez révoquer l'embarcation au prix de l'action Magie.\n\nÉventail (peu courant). Si vous êtes à bord d'un bateau à voile, vous pouvez consacrer l'action Magie à lancer cette plume en l'air, à une hauteur maximale de 3 m. La plume disparaît, remplacée par un éventail géant qui s'agite spontanément. L'éventail flotte et crée un vent fort. Ce vent gonfle les voiles du navire, augmentant sa vitesse de 7,5 km/h pendant 8 heures. Vous pouvez révoquer l'éventail au prix de l'action Magie.\n\nFouet (rare). Vous pouvez consacrer l'action Magie à lancer la plume à une distance maximale de 3 m. La plume disparaît, remplacée par un fouet flottant. Vous pouvez ensuite, par une action Bonus, effectuer une attaque de sort au corps à corps contre une créature située dans un rayon de 3 m du fouet avec un bonus à l'attaque de +9. Si l'attaque touche, la cible subit 1d6 + 5 dégâts de force. Par une action Bonus, vous pouvez déplacer le fouet flottant d'un maximum de 6 m et réitérer l'attaque contre une créature située dans un rayon de 3 m de l'arme. Le fouet disparaît au bout de 1 heure, lorsque vous entreprenez une action Magie pour le révoquer, ou lorsque vous mourez ou subissez l'état Neutralisé.\n\nOiseau (rare). Vous pouvez consacrer l'action Magie à lancer cette plume en l'air, à une hauteur de 1,50 m. La plume disparaît, remplacée par un énorme oiseau multicolore. L'oiseau, qui reprend le profil du rukh, ne peut pas porter d'attaque. Il obéit à vos ordres et peut transporter jusqu'à 250 kg en vol à sa vitesse maximale (24 km/heure, pour un maximum de 216 km par jour avec 1 heure de repos toutes les 3 heures de vol), ou 500 kg à la moitié de cette vitesse. L'oiseau disparaît après avoir volé sur sa distance maximale pour la journée (même chose s'il tombe à 0 point de vie). Vous pouvez révoquer l'oiseau au prix de l'action Magie.\n\nPlumes magiques (1d100) : Ancre 01-20, peu courante ; Arbre 21-45, peu courante ; Bateau-cygne 46-60, rare ; Éventail 61-75, peu courante ; Fouet 76-85, rare ; Oiseau 86-00, rare.",
      en: 'This object looks like a feather. Different types of feather tokens exist, each with a different single-use effect. The GM chooses the kind of token or determines it randomly by rolling on the Feather Tokens table. The type of token determines its rarity.\n\nAnchor (Uncommon). You can take a Magic action to touch the token to a boat or ship. For the next 24 hours, the vessel can’t be moved by any means. Touching the token to the vessel again ends the effect. When the effect ends, the token disappears.\n\nBird (Rare). You can take a Magic action to toss the token 5 feet into the air. The token disappears and an enormous, multicolored bird takes its place. The bird has the statistics of a Roc, but it can’t attack. It obeys your simple commands and can carry up to 500 pounds while flying at its maximum speed (16 miles per hour for a maximum of 144 miles per day, with a 1-hour rest for every 3 hours of flying) or 1,000 pounds at half that speed. The bird disappears after flying its maximum distance for a day or if it drops to 0 Hit Points. You can dismiss the bird as a Magic action.\n\nFan (Uncommon). If you are on a boat or ship, you can take a Magic action to toss the token up to 10 feet in the air. The token disappears, and a giant flapping fan takes its place. The fan floats and creates a strong wind. This wind can fill the sails of one ship, increasing its speed by 5 miles per hour for 8 hours. You can dismiss the fan as a Magic action.\n\nSwan Boat (Rare). You can take a Magic action to touch the token to a body of water at least 60 feet in diameter. The token disappears, and a 50-foot-long, 20-foot-wide boat shaped like a swan takes its place. The boat is self-propelled and moves across water at a speed of 6 miles per hour. You can take a Magic action while on the boat to command it to move or to turn up to 90 degrees. The boat remains for 24 hours and then disappears. You can dismiss the boat as a Magic action.\n\nTree (Uncommon). You must be outdoors to use this token. You can take a Magic action to touch it to an unoccupied space on the ground. The token disappears, and in its place a nonmagical oak tree springs into existence. The tree is 60 feet tall and has a 5-foot-diameter trunk, and its branches at the top spread out in a 20-foot radius.\n\nWhip (Rare). You can take a Magic action to throw the token to a point within 10 feet of yourself. The token disappears, and a floating whip takes its place. You can then take a Bonus Action to make a melee spell attack against a creature within 10 feet of the whip, with an attack bonus of +9. On a hit, the target takes 1d6 + 5 Force damage. As a Bonus Action, you can direct the whip to fly up to 20 feet and repeat the attack against a creature within 10 feet of the whip. The whip disappears after 1 hour, when you take a Magic action to dismiss it, or when you die or have the Incapacitated condition.\n\nFeather Tokens (1d100): Anchor 01–20, Uncommon; Bird 21–35, Rare; Fan 36–50, Uncommon; Swan boat 51–65, Rare; Tree 66–90, Uncommon; Whip 91–00, Rare.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'sac-devoreur',
    name: { fr: 'Sac dévoreur', en: 'Bag of Devouring' },
    category: 'gear',
    rarity: 'very rare',
    attunement: false,
    magicDescription: {
      fr: "Ce sac, qui ressemble de prime abord à un sac sans fond, est en réalité la gueule par laquelle s'alimente une gigantesque créature extradimensionnelle. Retourner le sac comme un gant obstrue l'orifice.\n\nLa créature extradimensionnelle attachée au sac a conscience de tout ce qui est placé à l'intérieur. Toute matière d'origine animale ou végétale placée en totalité dans le sac est dévorée et perdue à jamais. Quand une partie d'une créature vivante est placée dans le sac, comme cela se produit lorsque l'on plonge la main à l'intérieur, cette créature a 50 % de risque d'être happée à l'intérieur. Une créature à l'intérieur du sac peut entreprendre une action pour tenter de s'échapper, ce qui lui demande de réussir un test de Force (Athlétisme) DD 15. Une autre créature peut entreprendre une action pour plonger le bras dans le sac afin d'en extraire une créature, ce qui lui demande de réussir un test de Force (Athlétisme) DD 20, à la condition de ne pas avoir été d'abord happée elle-même par le sac. Toute créature qui commence son tour à l'intérieur du sac est dévorée et son corps est détruit.\n\nLes objets inanimés peuvent être stockés dans le sac, qui peut contenir 30 litres de matière inerte. Cependant, une fois par jour, le sac avale tous les objets qu'il contient et les recrache sur un autre plan d'existence. Le MJ détermine l'heure et le plan d'existence.\n\nLe sac est détruit s'il est troué ou déchiré. Tout son contenu est alors transporté vers un lieu aléatoire du Plan Astral.",
      en: 'This bag resembles a Bag of Holding but is a feeding orifice for a gigantic extradimensional creature. Turning the bag inside out closes the orifice.\n\nThe extradimensional creature attached to the bag can sense whatever is placed inside the bag. Animal or vegetable matter placed wholly in the bag is devoured and lost forever. When part of a living creature is placed in the bag, as happens when someone reaches inside it, there is a 50 percent chance that the creature is pulled inside the bag. A creature inside the bag can take an action to try to escape, doing so with a successful DC 15 Strength (Athletics) check. Another creature can take an action to reach into the bag to pull a creature out, doing so with a successful DC 20 Strength (Athletics) check, provided the puller isn’t pulled inside the bag first. Any creature that starts its turn inside the bag is devoured, its body destroyed.\n\nInanimate objects can be stored in the bag, which can hold a cubic foot of such material. However, once each day, the bag swallows any objects inside it and spits them out into another plane of existence. The GM determines the time and plane.\n\nIf the bag is pierced or torn, it is destroyed, and anything contained within it is transported to a random location on the Astral Plane.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'tapis-volant',
    name: { fr: 'Tapis volant', en: 'Carpet of Flying' },
    category: 'gear',
    rarity: 'very rare',
    attunement: false,
    magicDescription: {
      fr: "Ce tapis devient volant et entre en vol stationnaire si vous entreprenez l'action Magie et prononcez son mot de commande. Il se déplace au gré de vos instructions à condition que vous restiez dans un rayon de 9 m.\n\nIl existe quatre tailles de tapis volant. Le MJ en choisit le type ou laisse le hasard décider sur la table ci-après. Un tapis peut transporter jusqu'au double du poids qui figure sur la table, mais sa Vitesse de vol est réduite de moitié s'il transporte plus que sa capacité normale.\n\nTaille (1d100, Capacité, Vitesse de vol) : 01-20, 90 cm x 1,50 m, 100 kg, 24 m ; 21-55, 1,20 m x 1,80 m, 200 kg, 18 m ; 56-80, 1,50 m x 2,10 m, 300 kg, 12 m ; 81-00, 1,80 m x 2,70 m, 400 kg, 9 m.",
      en: 'You can make this carpet hover and fly by taking a Magic action and using the carpet’s command word. It moves according to your directions if you are within 30 feet of it.\n\nFour sizes of Carpet of Flying exist. The GM chooses the size of a given carpet or determines it randomly by rolling on the following table. A carpet can carry up to twice the weight shown on the table, but its Fly Speed is halved if it carries more than its normal capacity.\n\nSize (1d100, Capacity, Fly Speed): 01–20, 3 ft. × 5 ft., 200 lb., 80 feet; 21–55, 4 ft. × 6 ft., 400 lb., 60 feet; 56–80, 5 ft. × 7 ft., 600 lb., 40 feet; 81–00, 6 ft. × 9 ft., 800 lb., 30 feet.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
];

/** Compteurs figés (parse strict côté merge script). */
export const SRD_MAGIC_ITEMS_CONTAINERS_COUNTS = {
  total: SRD_MAGIC_ITEMS_CONTAINERS.length,
  uncommon: SRD_MAGIC_ITEMS_CONTAINERS.filter((e) => e.rarity === 'uncommon').length,
  rare: SRD_MAGIC_ITEMS_CONTAINERS.filter((e) => e.rarity === 'rare').length,
  veryRare: SRD_MAGIC_ITEMS_CONTAINERS.filter((e) => e.rarity === 'very rare').length,
  attuned: SRD_MAGIC_ITEMS_CONTAINERS.filter((e) => e.attunement !== false).length,
} as const;
