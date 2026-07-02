/**
 * SRD CC v5.2.1 — Objets planaires & légendaires (talismans, sphère, cubes,
 * puits, flasque) — 9 entrées.
 *
 * Batch D29.17 (backfill EN des magic-items grandfathered AideDD).
 *
 * Sources verbatim :
 *   - EN : `content-sources/extracted/raw/SRD_CC_v5.2.1.txt`
 *     (Cube of Force l. 21632, Cubic Gate l. 21649, Iron Flask l. 22925, Portable
 *     Hole l. 23632, Sphere of Annihilation l. 24673, Talisman of Pure Good
 *     l. 25136, Talisman of the Sphere l. 25165, Talisman of Ultimate Evil
 *     l. 25175, Well of Many Worlds l. 25581)
 *   - FR : `content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt`
 *     (Cube de force l. 26484, Cube des plans l. 26502, Flasque de fer l. 26859,
 *     Puits des mondes l. 28333, Puits portable l. 28349, Sphère d'annihilation
 *     l. 28967, Talisman du bien ultime l. 29051, Talisman de la sphère l. 29078,
 *     Talisman du mal absolu l. 29088)
 *
 * Corrections issues du SRD :
 *   - `attunement` : le Cube de force, le Talisman de la sphère et le Talisman du
 *     mal absolu étaient `false` (héritage AideDD) → le SRD 5.2.1 les marque
 *     « Requires Attunement » (simple → `true`). Le Talisman du bien ultime exige
 *     une Harmonisation qualifiée (« un Clerc ou Paladin »). Les 5 autres n'en
 *     exigent AUCUNE → restent `false`. Aucun drift de nom.
 *   - `magicDescription` : reformulé sur la VF officielle SRD. Tables (Faces du
 *     cube de force, Interactions de la sphère) inlinées. L'ordre des blocs de
 *     propriété des talismans diffère entre EN et FR (chaque langue reproduit SON
 *     ordre officiel).
 *
 * Arbitrage EN↔FR sur corruption d'extraction (règle CLAUDE.md) : l'extraction FR
 * du **Talisman du mal absolu** est **interleavée** par la table des leviers du
 * Submersible du Crabe (l. 29102-29141 insérées au milieu du bloc « Fin
 * irrévocable »). Le FR a été reconstruit à partir des fragments FR non corrompus
 * (l. 29090-29101 + l. 29142-29152), **vérifié croisé** contre le Talisman du bien
 * ultime (structure parallèle intacte) et contre l'EN (l. 25175-25199) pour la
 * mécanique. La formulation FR reste 100 % officielle (aucune fabrication).
 *
 * Conventions (identiques aux modules D29.1→D29.16) : hyphénations / sauts de page
 * retirés ; apostrophes FR en ASCII, EN verbatim SRD (quotes courbes) ; `\n\n`
 * entre blocs ; tables inlinées.
 */

import type { SrdMagicItemEntry } from './srd-magic-items-potions';

export const SRD_MAGIC_ITEMS_PLANAR: SrdMagicItemEntry[] = [
  {
    id: 'cube-de-force',
    name: { fr: 'Cube de force', en: 'Cube of Force' },
    category: 'gear',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: "Ce cube mesure 2 à 3 centimètres d'arête. Chaque face s'orne d'un symbole distinct. Il vous suffit d'appuyer sur une face et de dépenser le nombre de charges requis pour lancer le sort associé à cette face (DD de sauvegarde 17), comme indiqué sur la table « Faces du cube de force ».\n\nLe cube dispose de 10 charges et récupère quotidiennement 1d6 charges dépensées, à l'aube.\n\nFaces du cube de force (Sort, Coût en charges) : armure du mage 1 ; bouclier 1 ; petite hutte 3 ; sanctuaire privé 4 ; sphère résiliente 4 ; mur de force 5.",
      en: 'This cube is about an inch across. Each face has a distinct marking on it. You can press one of those faces, expend the number of charges required for it, and thereby cast the spell associated with it (save DC 17), as shown in the Cube of Force Faces table.\n\nThe cube starts with 10 charges, and it regains 1d6 expended charges daily at dawn.\n\nCube of Force Faces (Spell, Charge Cost): Mage Armor 1; Shield 1; Tiny Hut 3; Private Sanctum 4; Resilient Sphere 4; Wall of Force 5.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'cube-des-plans',
    name: { fr: 'Cube des plans', en: 'Cubic Gate' },
    category: 'gear',
    rarity: 'legendary',
    attunement: false,
    magicDescription: {
      fr: "Ce cube mesure 7,5 cm d'arête et diffuse une énergie magique palpable. Les six faces du cube sont chacune liées à un plan d'existence distinct, l'un d'eux étant le Plan Matériel. Les autres faces sont liées à des plans déterminés par le MJ.\n\nLe cube dispose de 3 charges et récupère quotidiennement 1d3 charges dépensées, à l'aube. Au prix de l'action Magie, vous pouvez dépenser 1 charge du cube pour lancer l'un des sorts ci-après par le biais du cube.\n\nChangement de plan. Appuyer deux fois sur une face du cube vous permet de lancer changement de plan, qui transporte les cibles sur le plan d'existence lié à cette face.\n\nPortail. Appuyer sur une face du cube vous permet de lancer portail, qui ouvre un portail vers le plan d'existence lié à cette face.",
      en: 'This cube is 3 inches across and radiates palpable magical energy. The six sides of the cube are each keyed to a different plane of existence, one of which is the Material Plane. The other sides are linked to planes determined by the GM.\n\nThe cube has 3 charges and regains 1d3 expended charges daily at dawn. As a Magic action, you can expend 1 of the cube’s charges to cast one of the following spells using the cube.\n\nGate. Pressing one side of the cube, you cast Gate, opening a portal to the plane of existence keyed to that side.\n\nPlane Shift. Pressing one side of the cube twice, you cast Plane Shift, transporting the targets to the plane of existence keyed to that side.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'flasque-de-fer',
    name: { fr: 'Flasque de fer', en: 'Iron Flask' },
    category: 'gear',
    rarity: 'legendary',
    attunement: false,
    magicDescription: {
      fr: "Lorsque vous tenez cette flasque de fer au bouchon de laiton, vous pouvez entreprendre l'action Magie pour cibler une créature que vous voyez dans un rayon de 18 m. Si la flasque est vide et que cette cible est originaire d'un plan d'existence autre que celui sur lequel vous vous trouvez, elle doit réussir un jet de sauvegarde de Sagesse DD 17 sous peine d'être emprisonnée dans la flasque. Une cible qui a déjà été séquestrée dans la flasque a l'Avantage à ce JS. Une fois emprisonnée, une créature reste confinée dans la flasque jusqu'à ce qu'elle en soit libérée. La flasque ne peut détenir qu'une créature à la fois. Une créature piégée dans la flasque ne vieillit pas et n'a pas besoin de respirer, manger ou boire.\n\nVous pouvez entreprendre l'action Magie pour retirer le bouchon de la flasque et libérer la créature qu'elle contient. La créature obéit alors à vos ordres pendant 1 heure ; elle les comprend même si elle ne connaît pas la langue dans laquelle ils sont formulés. Si vous ne donnez aucun ordre ou si vous lui intimez une activité susceptible d'entraîner sa mort ou son emprisonnement, la créature se défend mais ne prend aucune autre initiative. À la fin de cette durée, la créature se comporte à nouveau en accord avec sa personnalité et son alignement.\n\nLe sort identification révèle si la flasque contient une créature, mais seule l'ouverture du récipient permet d'en déterminer la nature exacte. Une flasque de fer qui vient d'être découverte peut déjà contenir une créature choisie par le MJ.",
      en: 'While holding this brass-stoppered iron flask, you can take a Magic action to target a creature that you can see within 60 feet of yourself. If the flask is empty and the target is native to a plane of existence other than the one you’re on, the target must succeed on a DC 17 Wisdom saving throw or be trapped in the flask. If the target has been trapped by the flask before, it has Advantage on the save. Once trapped, a creature remains in the flask until released. The flask can hold only one creature at a time. A creature trapped in the flask doesn’t age and doesn’t need to breathe, eat, or drink.\n\nYou can take a Magic action to remove the flask’s stopper and release the creature in the flask. The creature then obeys your commands for 1 hour, understanding those commands even if it doesn’t know the language in which the commands are given. If you issue no commands or give the creature a command that is likely to result in its death or imprisonment, it defends itself but otherwise takes no actions. At the end of the duration, the creature acts in accordance with its normal disposition and alignment.\n\nAn Identify spell reveals if the flask contains a creature, but the only way to determine the type of creature is to open the flask. A newly discovered Iron Flask might already contain a creature chosen by the GM.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'puits-des-mondes',
    name: { fr: 'Puits des mondes', en: 'Well of Many Worlds' },
    category: 'gear',
    rarity: 'legendary',
    attunement: false,
    magicDescription: {
      fr: "Ce pan d'étoffe noire et précieuse, aussi douce que de la soie, est plié aux dimensions d'un mouchoir de poche. Déplié, il forme un cercle de 1,80 m de diamètre.\n\nVous pouvez entreprendre l'action Magie pour déplier le puits des mondes en le plaçant sur une surface solide, où il forme un portail circulaire bidirectionnel de 1,80 m de diamètre vers un autre monde ou plan d'existence. Chaque fois que l'objet ouvre un portail, le MJ décide où il mène. Le portail reste ouvert jusqu'à ce qu'une créature dans un rayon de 1,50 m entreprenne l'action Magie pour le fermer en saisissant les bords du tissu et en le repliant.\n\nUne fois que le puits des mondes a ouvert un portail, il ne peut plus en rouvrir d'autres pendant 1d8 heures.",
      en: 'This fine black cloth, soft as silk, is folded up to the dimensions of a handkerchief. It unfolds into a circular sheet 6 feet in diameter.\n\nYou can take a Magic action to unfold the Well of Many Worlds and place it on a solid surface, whereupon it forms a two-way, 6-foot-diameter, circular portal to another world or plane of existence. Each time the item opens a portal, the GM decides where it leads. The portal remains open until a creature within 5 feet of it takes a Magic action to close it by taking hold of the edges of the cloth and folding it up.\n\nOnce the Well of Many Worlds has opened a portal, it can’t do so again for 1d8 hours.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'puits-portable',
    name: { fr: 'Puits portable', en: 'Portable Hole' },
    category: 'gear',
    rarity: 'rare',
    attunement: false,
    magicDescription: {
      fr: "Ce pan d'étoffe noire et précieuse, aussi douce que de la soie, est plié aux dimensions d'un mouchoir de poche. Déplié, il forme un cercle de 1,80 m de diamètre.\n\nVous pouvez entreprendre l'action Magie pour déplier un puits portable et le placer sur ou contre une surface solide. Le puits portable crée alors un trou extradimensionnel de 3 m de profondeur. L'espace cylindrique à l'intérieur du puits, qui existe sur un plan d'existence différent, ne peut pas être utilisé pour créer un passage. Toute créature à l'intérieur d'un puits portable ouvert peut en sortir en escaladant la paroi.\n\nVous pouvez consacrer l'action Magie à refermer un puits portable en saisissant les bords de l'étoffe et en le repliant. Plier le tissu ferme le puits. Toutes les créatures et tous les objets qu'il contient restent dans l'espace extradimensionnel. Quoi qu'il renferme, le puits ne pèse presque rien.\n\nSi le puits est replié, une créature à l'intérieur de l'espace extradimensionnel peut consacrer une action à effectuer un test de Force (Athlétisme) DD 10. En cas de réussite, elle se fraie un chemin et apparaît dans un rayon de 1,50 m du puits portable. Un puits portable fermé contient suffisamment d'air pour 1 heure de ventilation, à diviser par le nombre de créatures qui respirent à l'intérieur.\n\nPlacer un puits portable dans l'espace extradimensionnel créé par un sac sans fond, un havresac magique ou tout autre objet comparable détruit instantanément les deux objets et ouvre un portail vers le Plan Astral. Ce portail s'ouvre à l'endroit où l'objet a été placé dans l'autre. Toute créature dans un rayon de 3 m du portail, si elle ne dispose pas d'un Abri total, est aspirée et déposée en un lieu aléatoire du Plan Astral. Le portail se referme alors. Il est à sens unique et ne peut pas être rouvert.",
      en: 'This fine black cloth, soft as silk, is folded up to the dimensions of a handkerchief. It unfolds into a circular sheet 6 feet in diameter.\n\nYou can take a Magic action to unfold a Portable Hole and place it on or against a solid surface, whereupon the Portable Hole creates an extradimensional hole 10 feet deep. The cylindrical space within the hole exists on a different plane of existence, so it can’t be used to create open passages. Any creature inside an open Portable Hole can exit the hole by climbing out of it.\n\nYou can take a Magic action to close a Portable Hole by taking hold of the edges of the cloth and folding it up. Folding the cloth closes the hole, and any creatures or objects within remain in the extradimensional space. No matter what’s in it, the hole weighs next to nothing.\n\nIf the hole is folded up, a creature within the hole’s extradimensional space can take an action to make a DC 10 Strength (Athletics) check. On a successful check, the creature forces its way out and appears within 5 feet of the Portable Hole. A closed Portable Hole holds enough air for 1 hour of breathing, divided by the number of breathing creatures inside.\n\nPlacing a Portable Hole inside an extradimensional space created by a Bag of Holding, Handy Haversack, or similar item instantly destroys both items and opens a gate to the Astral Plane. The gate originates where the one item was placed inside the other. Any creature within 10 feet of the gate and not behind Total Cover is sucked through it and deposited in a random location on the Astral Plane. The gate then closes. The gate is one-way only and can’t be reopened.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'sphere-d-annihilation',
    name: { fr: "Sphère d'annihilation", en: 'Sphere of Annihilation' },
    category: 'gear',
    rarity: 'legendary',
    attunement: false,
    magicDescription: {
      fr: "Cette sphère noire de 60 cm de diamètre forme un trou dans le multivers en suspension dans l'espace, stabilisé par le champ magique qui l'entoure.\n\nLa sphère annihile toute matière qu'elle traverse et toute matière qui la traverse. Les Artefacts constituent la seule exception. Un Artefact qui n'est pas sensible aux dégâts d'une sphère d'annihilation la traverse sans dommage. Pour le reste, tout ce qui touche la sphère sans être entièrement englouti et annihilé par elle subit 8d10 dégâts de force.\n\nContrôler la sphère. Une sphère d'annihilation reste stationnaire jusqu'à ce que quelqu'un en prenne le contrôle. Si vous êtes dans un rayon de 18 m d'une sphère, vous pouvez entreprendre l'action Magie pour effectuer un test d'Intelligence (Arcanes) DD 25. En cas de réussite, vous contrôlez la sphère jusqu'au début de votre tour suivant. Si elle était sous le contrôle d'une autre créature, celle-ci en perd le contrôle. En cas d'échec, la sphère se déplace de 3 m en ligne droite vers vous.\n\nTant que vous contrôlez la sphère, vous pouvez consacrer une action Bonus à la déplacer dans la direction de votre choix d'une distance maximale en mètres égale à votre modificateur d'Intelligence x 1,5 (minimum 1,50 m). Si la sphère pénètre dans l'espace d'une créature, celle-ci doit réussir un jet de sauvegarde de Dextérité DD 19 sous peine d'être touchée par la sphère et de subir 8d10 dégâts de force. Une créature réduite à 0 point de vie par ces dégâts est annihilée, ne laissant derrière elle que ses biens, sans aucun autre vestige physique.\n\nInteractions avec la sphère. Si la sphère entre en contact avec un portail planaire comme celui créé par le sort portail ou un espace extradimensionnel comme celui d'un puits portable, le MJ détermine aléatoirement ce qui se passe, en recourant à la table ci-après.\n\nInteractions (1d100) : 01-50, La sphère est détruite ; 51-85, La sphère franchit le portail ou entre dans l'espace extradimensionnel ; 86-00, Une faille planaire propulse chaque créature et objet dans un rayon de 54 m de la sphère, cette dernière comprise, vers un plan d'existence aléatoire.",
      en: 'This 2-foot-diameter black sphere is a hole in the multiverse, hovering in space and stabilized by a magical field surrounding it.\n\nThe sphere obliterates all matter it passes through and all matter that passes through it. Artifacts are the exception. Unless an Artifact is susceptible to damage from a Sphere of Annihilation, it passes through the sphere unscathed. Anything else that touches the sphere but isn’t wholly engulfed and obliterated by it takes 8d10 Force damage.\n\nControlling the Sphere. A Sphere of Annihilation is stationary until someone takes control of it. If you are within 60 feet of a sphere, you can take a Magic action to make a DC 25 Intelligence (Arcana) check. On a successful check, you control the sphere until the start of your next turn, and if it was under another creature’s control, that creature loses control of the sphere. On a failed check, the sphere moves 10 feet toward you in a straight line.\n\nWhile in control of the sphere, you can take a Bonus Action to cause it to move in one direction of your choice, up to a number of feet equal to 5 times your Intelligence modifier (minimum 5 feet). Any creature whose space the sphere enters must succeed on a DC 19 Dexterity saving throw or be touched by it, taking 8d10 Force damage. A creature reduced to 0 Hit Points by this damage is obliterated, leaving its possessions behind but no other physical remains.\n\nSphere Interactions. If the sphere comes into contact with a planar portal (such as that created by the Gate spell) or an extradimensional space (such as that within a Portable Hole), the GM determines randomly what happens using the following table.\n\nSphere Interactions (1d100): 01–50, The sphere is destroyed; 51–85, The sphere moves through the portal or into the extradimensional space; 86–00, A spatial rift sends the sphere and each creature and object within 180 feet of the sphere to a random plane of existence.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'talisman-du-bien-ultime',
    name: { fr: 'Talisman du bien ultime', en: 'Talisman of Pure Good' },
    category: 'gear',
    rarity: 'legendary',
    attunement: {
      fr: 'Harmonisation requise avec un Clerc ou Paladin',
      en: 'Requires Attunement by a Cleric or Paladin',
    },
    magicDescription: {
      fr: "Ce talisman est un puissant symbole de bonté. Un Fiélon ou un Mort-vivant qui touche le talisman subit 8d6 dégâts radiants, et en subit autant chaque fois qu'il termine son tour en tenant ou en portant le talisman.\n\nRéprimande pure. Le talisman dispose de 7 charges. Lorsque vous portez ou tenez le talisman, vous pouvez entreprendre l'action Magie pour dépenser 1 charge et cibler une créature que vous voyez en contact avec le sol dans un rayon de 36 m. Une faille ardente s'ouvre sous la cible, qui effectue un jet de sauvegarde de Dextérité DD 20. Si la cible est un Fiélon ou un Mort-vivant, elle subit le Désavantage au JS. En cas d'échec, elle tombe dans la faille, ce qui la détruit sans en laisser la moindre trace. En cas de réussite, la cible n'est pas précipitée dans la faille mais l'épreuve lui inflige 4d6 dégâts psychiques. Dans un cas comme dans l'autre, la faille se referme alors, ne laissant aucune trace de son existence. Lorsque vous dépensez sa dernière charge, le talisman se désagrège en particules de lumière dorée, détruit à jamais.\n\nSymbole sacré. Vous pouvez utiliser le talisman comme symbole sacré. Vous recevez un bonus de +2 aux jets d'attaque de sort lorsque vous le portez ou le tenez.",
      en: 'This talisman is a mighty symbol of goodness. A Fiend or an Undead that touches the talisman takes 8d6 Radiant damage and takes the damage again each time it ends its turn holding or carrying the talisman.\n\nHoly Symbol. You can use the talisman as a Holy Symbol. You gain a +2 bonus to spell attack rolls while you wear or hold it.\n\nPure Rebuke. The talisman has 7 charges. While wearing or holding the talisman, you can take a Magic action to expend 1 charge and target one creature you can see on the ground within 120 feet of yourself. A flaming fissure opens under the target, and the target makes a DC 20 Dexterity saving throw. If the target is a Fiend or an Undead, it has Disadvantage on the save. On a failed save, the target falls into the fissure and is destroyed, leaving no remains. On a successful save, the target isn’t cast into the fissure but takes 4d6 Psychic damage from the ordeal. In either case, the fissure then closes, leaving no trace of its existence. When you expend the last charge, the talisman disperses into motes of golden light and is destroyed.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'talisman-de-la-sphere',
    name: { fr: 'Talisman de la sphère', en: 'Talisman of the Sphere' },
    category: 'gear',
    rarity: 'legendary',
    attunement: true,
    magicDescription: {
      fr: "Tant que vous tenez ou portez ce talisman, vous avez l'Avantage à tout test d'Intelligence (Arcanes) visant à contrôler une sphère d'annihilation. En outre, lorsque vous commencez votre tour en contrôlant une sphère d'annihilation, vous pouvez entreprendre l'action Magie pour la déplacer, en mètres, d'un maximum de 3 plus le triple de votre modificateur d'Intelligence. Ce déplacement n'est pas nécessairement en ligne droite.",
      en: 'While holding or wearing this talisman, you have Advantage on any Intelligence (Arcana) check you make to control a Sphere of Annihilation. In addition, when you start your turn in control of a Sphere of Annihilation, you can take a Magic action to move it 10 feet plus a number of additional feet equal to 10 times your Intelligence modifier. This movement doesn’t have to be in a straight line.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // Arbitrage EN↔FR : FR reconstruit (extraction interleavée par la table du
    // Submersible du Crabe l. 29102-29141). Cf. en-tête du module.
    id: 'talisman-du-mal-absolu',
    name: { fr: 'Talisman du mal absolu', en: 'Talisman of Ultimate Evil' },
    category: 'gear',
    rarity: 'legendary',
    attunement: true,
    magicDescription: {
      fr: "Cet objet symbolise la quintessence du mal. Toute créature autre qu'un Fiélon ou un Mort-vivant qui touche le talisman subit 8d6 dégâts nécrotiques, et en subit autant chaque fois qu'elle termine son tour en tenant ou en portant le talisman.\n\nFin irrévocable. Le talisman dispose de 6 charges. Lorsque vous portez ou tenez le talisman, vous pouvez entreprendre l'action Magie pour dépenser 1 charge et cibler une créature que vous voyez en contact avec le sol dans un rayon de 36 m. Une faille ardente s'ouvre sous la cible, qui effectue un jet de sauvegarde de Dextérité DD 20. Si la cible est un Céleste, elle subit le Désavantage au JS. En cas d'échec, elle tombe dans la faille, ce qui la détruit sans en laisser la moindre trace. En cas de réussite, la cible n'est pas précipitée dans la faille mais l'épreuve lui inflige 4d6 dégâts psychiques. Dans un cas comme dans l'autre, la faille se referme alors, ne laissant aucune trace de son existence. Lorsque vous dépensez sa dernière charge, le talisman se dissout en limon malodorant, détruit à jamais.\n\nSymbole sacré. Vous pouvez utiliser le talisman comme symbole sacré. Vous recevez un bonus de +2 aux jets d'attaque de sort lorsque vous le portez ou le tenez.",
      en: 'This item symbolizes unrepentant evil. A creature that isn’t a Fiend or an Undead that touches the talisman takes 8d6 Necrotic damage and takes the damage again each time it ends its turn holding or carrying the talisman.\n\nHoly Symbol. You can use the talisman as a Holy Symbol. You gain a +2 bonus to spell attack rolls while you wear or hold it.\n\nUltimate End. The talisman has 6 charges. While wearing or holding the talisman, you can take a Magic action to expend 1 charge and target one creature you can see on the ground within 120 feet of yourself. A flaming fissure opens under the target, and the target makes a DC 20 Dexterity saving throw. If the target is a Celestial, it has Disadvantage on the save. On a failed save, the target falls into the fissure and is destroyed, leaving no remains. On a successful save, the target isn’t cast into the fissure but takes 4d6 Psychic damage from the ordeal. In either case, the fissure then closes, leaving no trace of its existence. When you expend the last charge, the talisman dissolves into foul-smelling slime and is destroyed.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
];

/** Compteurs figés (parse strict côté merge script). */
export const SRD_MAGIC_ITEMS_PLANAR_COUNTS = {
  total: SRD_MAGIC_ITEMS_PLANAR.length,
  rare: SRD_MAGIC_ITEMS_PLANAR.filter((e) => e.rarity === 'rare').length,
  legendary: SRD_MAGIC_ITEMS_PLANAR.filter((e) => e.rarity === 'legendary').length,
  attuned: SRD_MAGIC_ITEMS_PLANAR.filter((e) => e.attunement !== false).length,
} as const;
