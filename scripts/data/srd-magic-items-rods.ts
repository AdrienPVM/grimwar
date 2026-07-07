/**
 * SRD CC v5.2.1 — Sceptres / Rods (5 entrées).
 *
 * Batch D29.5 (backfill EN des magic-items grandfathered AideDD).
 *
 * Sources verbatim :
 *   - EN : `content-sources/extracted/raw/SRD_CC_v5.2.1.txt`
 *     (section "Magic Items A–Z", rods lignes 24287–24467)
 *   - FR : `content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt`
 *     (section "Objets magiques de A à Z", sceptres lignes 28736–28941)
 *
 * Comme D29.1→D29.4, on **remplace l'entrée grandfathered intégralement** par la
 * version officielle SRD 5.2.1 bilingue. Couverture : les 5 sceptres SRD encore
 * sans `name.en` dans le bundle (le Sceptre de résurrection / Rod of Resurrection
 * est déjà bilingue hors de ce batch ; le Sceptre inamovible / Immovable Rod est
 * couvert par le module utility C.6).
 *
 * Corrections issues du SRD :
 *   - `attunement` : 4 des 5 sceptres étaient `false` dans le bundle (héritage
 *     AideDD). Le SRD 5.2.1 exige l'Harmonisation pour **Absorption**, **Puissance
 *     seigneuriale**, **Suzeraineté** et **Vigilance** (« Requires Attunement » /
 *     « Harmonisation requise », sans restriction de classe → `attunement: true`).
 *     Le **Sceptre de sécurité** ne l'exige PAS (EN « Rod, Very Rare » l. 24441 ;
 *     FR « Sceptre, très rare » l. 28869, sans mention d'Harmonisation) → reste
 *     `false`. Corrigé.
 *   - `name.fr` : aucun drift — les 5 noms FR du bundle correspondent déjà à la
 *     traduction officielle WotC FR (vérifié l. 28736–28914). Slugs `id` préservés
 *     byte-identique.
 *   - `magicDescription` : reformulé sur la VF officielle SRD (le bundle portait
 *     la formulation AideDD divergente, ex. « utiliser votre réaction » vs
 *     « jouer votre Réaction » ; mention parasite d'une « lanière » sur le Sceptre
 *     de vigilance, absente du SRD).
 *
 * Hors scope (item non-SRD, à signaler à Adrien) : le « Sceptre tentacule »
 * (rare) du bundle est un héritage AideDD/2014 — « Tentacle Rod » est **absent du
 * SRD 5.2.1** (ni EN ni FR ; « tentacle/tentacule » n'apparaît dans les deux
 * extractions que pour le sort Tentacules noirs et des blocs de stats de
 * monstres). Pas de source verbatim → non backfillé. Reste sans `name.en`.
 *
 * Conventions (identiques aux modules D29.1→D29.4) : hyphénations de fin de ligne
 * et artefacts de saut de page retirés (« System Reference Document 5.2.1 / 242 »,
 * « Document de Référence du Système 5.2.1 / 260 » + « / 261 » ; ordinaux scindés
 * « 5\ne\n niveau » → « 5e niveau ») ; apostrophes FR en ASCII, EN verbatim SRD
 * (quotes courbes + tiret cadratin) ; `\n\n` entre blocs de propriété ; listes de
 * sorts à puces inlinées en énumération séparée par des virgules.
 */

import type { SrdMagicItemEntry } from './srd-magic-items-potions';

export const SRD_MAGIC_ITEMS_RODS: SrdMagicItemEntry[] = [
  {
    id: 'sceptre-d-absorption',
    name: { fr: "Sceptre d'absorption", en: 'Rod of Absorption' },
    category: 'gear',
    rarity: 'very rare',
    attunement: true,
    magicDescription: {
      fr: "Tant que vous tenez ce sceptre, vous pouvez jouer votre Réaction pour absorber un sort qui ne cible que vous et ne produit pas de zone d'effet. L'effet du sort absorbé est annulé et son énergie est stockée dans le sceptre (mais pas le sort lui-même). L'énergie est du même niveau que le sort à son incantation. Un sort ainsi annulé se dissipe sans produire d'effet ; toutes les ressources engagées par l'incantation sont gaspillées. Le sceptre peut absorber et stocker jusqu'à 50 niveaux d'énergie au cours de son existence. Une fois que ce sceptre a absorbé 50 niveaux d'énergie, il ne peut plus en absorber. Si vous êtes la cible d'un sort que le sceptre ne peut pas stocker, l'objet n'a aucun effet sur ce sort.\n\nEn vous harmonisant avec le sceptre, vous savez combien de niveaux d'énergie il a absorbés au cours de son existence et combien de niveaux d'énergie de sort sont actuellement stockés à l'intérieur.\n\nSi vous êtes un incantateur et tenez le sceptre, vous pouvez convertir l'énergie qu'il contient en emplacements de sort afin de lancer des sorts que vous avez préparés ou que vous connaissez. Vous ne pouvez créer que des emplacements de sort d'un niveau inférieur ou égal à vos propres emplacements de sort, sans dépasser le 5e niveau. Vous utilisez les niveaux stockés à la place de vos propres emplacements, mais pour tout le reste, ces sorts sont lancés normalement. Vous pouvez par exemple utiliser 3 niveaux stockés dans le sceptre comme emplacement de sort du 3e niveau.\n\nUn sceptre nouvellement découvert contient généralement 1d10 niveaux d'énergie de sort. Un sceptre qui ne peut plus absorber l'énergie des sorts et qui n'a plus d'énergie en stock devient non magique.",
      en: 'While holding this rod, you can take a Reaction to absorb a spell that is targeting only you and doesn’t create an area of effect. The absorbed spell’s effect is canceled, and the spell’s energy—not the spell itself—is stored in the rod. The energy has the same level as the spell when it was cast. A canceled spell dissipates with no effect, and any resources used to cast it are wasted. The rod can absorb and store up to 50 levels of energy over the course of its existence. Once the rod absorbs 50 levels of energy, it can’t absorb more. If you are targeted by a spell that the rod can’t store, the rod has no effect on that spell.\n\nWhen you become attuned to the rod, you know how many levels of energy the rod has absorbed over the course of its existence and how many levels of spell energy it currently has stored.\n\nIf you are a spellcaster holding the rod, you can convert energy stored in it into spell slots to cast spells you have prepared or know. You can create spell slots only of a level equal to or lower than your own spell slots, up to a maximum of level 5. You use the stored levels in place of your slots but otherwise cast the spell as normal. For example, you can use 3 levels stored in the rod as a level 3 spell slot.\n\nA newly found rod typically has 1d10 levels of spell energy stored in it. A rod that can no longer absorb spell energy and has no energy remaining becomes nonmagical.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'sceptre-de-puissance-seigneuriale',
    name: { fr: 'Sceptre de puissance seigneuriale', en: 'Rod of Lordly Might' },
    category: 'gear',
    rarity: 'legendary',
    attunement: true,
    magicDescription: {
      fr: "Les jets d'attaque et de dégâts que vous effectuez avec ce sceptre à ailettes, considéré comme une masse d'armes magique, reçoivent un bonus de +3. Le sceptre possède des propriétés associées à six boutons différents étagés le long du manche. Il est aussi doté de trois autres propriétés, détaillées ci-après.\n\nBoutons-poussoirs. Vous pouvez appuyer sur l'un des boutons suivants par une action Bonus. L'effet d'un bouton dure jusqu'à ce que vous pressiez un autre bouton ou jusqu'à ce que vous réappuyiez sur le même bouton, ce qui fait revenir le sceptre à sa forme normale.\n\nBouton 1. Une lame ardente surgit de l'extrémité opposée à la tête à ailettes du sceptre. Les flammes émettent une Lumière vive dans un rayon de 12 m et une Lumière faible sur 12 m de plus. La lame fonctionne comme une épée longue ou une épée courte magique (choisissez) qui inflige 2d6 dégâts de feu supplémentaires si l'attaque touche.\n\nBouton 2. La tête à ailettes du sceptre se replie et laisse la place à deux lames en croissant de lune ; les jets d'attaque et de dégâts que vous effectuez avec cette arme considérée comme une hache d'armes magique reçoivent un bonus de +3.\n\nBouton 3. La tête à ailettes du sceptre se replie et un fer de lance surgit de l'extrémité tandis que le manche s'allonge pour former une hampe de 1,80 m ; les jets d'attaque et de dégâts que vous effectuez avec cette arme considérée comme une lance magique reçoivent un bonus de +3.\n\nBouton 4. Le sceptre se transforme en un mât d'escalade pouvant atteindre 15 m de long (vous spécifiez la longueur). Les boutons du sceptre restent à votre portée. Ce mât s'ancre dans toute surface aussi dure que le granit, par l'intermédiaire d'une pointe à la base et de trois crochets au sommet. Des barreaux horizontaux de 7,5 cm de long se déploient sur les côtés, à 30 cm d'écart, formant une échelle. Le mât supporte un poids maximal de 2 000 kg. Un poids excessif ou un ancrage insuffisant font revenir le sceptre à sa forme normale.\n\nBouton 5. Le sceptre se transforme en bélier portable qui octroie à son utilisateur un bonus de +10 aux tests de Force (Athlétisme) visant à défoncer une porte, une barricade ou toute autre barrière.\n\nBouton 6. Le sceptre retrouve ou conserve son aspect normal et indique le nord magnétique. (Rien ne se passe si cette fonction du sceptre est utilisée en un lieu dépourvu de nord magnétique.) Le sceptre vous fournit en outre une estimation de votre profondeur sous terre ou de votre altitude à la surface.\n\nAbsorption de vie. Lorsque vous touchez une créature avec une attaque de corps à corps en utilisant le sceptre, vous pouvez soumettre la cible à un jet de sauvegarde de Constitution DD 17. En cas d'échec, la cible subit 4d6 dégâts nécrotiques supplémentaires et vous récupérez autant de points de vie que la moitié des dégâts nécrotiques ainsi infligés. Une fois utilisée, cette propriété ne peut plus resservir jusqu'à l'aube suivante.\n\nParalysie. Lorsque vous touchez une créature avec une attaque de corps à corps en utilisant le sceptre, vous pouvez soumettre la cible à un jet de sauvegarde de Constitution DD 17. En cas d'échec, la cible subit l'état Paralysé pendant 1 minute. La cible réitère le JS à la fin de chacun de ses tours et met un terme à l'effet sur elle-même en cas de réussite. Une fois utilisée, cette propriété ne peut plus resservir jusqu'à l'aube suivante.\n\nTerreur. Tant que vous brandissez le sceptre, vous pouvez entreprendre l'action Magie pour soumettre chaque créature que vous voyez dans un rayon de 9 m à un jet de sauvegarde de Sagesse DD 17. En cas d'échec, la cible subit l'état Effrayé pendant 1 minute. Chaque cible Effrayée réitère le JS à la fin de chacun de ses tours et met un terme à l'effet sur elle-même en cas de réussite. Une fois utilisée, cette propriété ne peut plus resservir jusqu'à l'aube suivante.",
      en: "This rod has a flanged head, and it functions as a magic Mace that grants a +3 bonus to attack rolls and damage rolls made with it. The rod has properties associated with six different buttons that are set in a row along the haft. It has three other properties as well, detailed below.\n\nButtons. You can press one of the following buttons as a Bonus Action; a button’s effect lasts until you push a different button or until you push the same button again, which causes the rod to revert to its normal form:\n\nButton 1. A fiery blade sprouts from the end opposite the rod’s flanged head. The flames shed Bright Light in a 40-foot radius and Dim Light for an additional 40 feet, and the blade functions as a magic Longsword or Shortsword (your choice) that deals an extra 2d6 Fire damage on a hit.\n\nButton 2. The rod’s flanged head folds down and two crescent-shaped blades spring out, transforming the rod into a magic Battleaxe that grants a +3 bonus to attack rolls and damage rolls made with it.\n\nButton 3. The rod’s flanged head folds down, a spear point springs from the rod’s tip, and the rod’s handle lengthens into a 6-foot haft, transforming the rod into a magic Spear that grants a +3 bonus to attack rolls and damage rolls made with it.\n\nButton 4. The rod transforms into a climbing pole up to 50 feet long (you specify the length), though the rod’s buttons remain within your reach. In surfaces as hard as granite, a spike at the bottom and three hooks at the top anchor the pole. Horizontal bars 3 inches long fold out from the sides, 1 foot apart, forming a ladder. The pole can bear up to 4,000 pounds. More weight or lack of solid anchoring causes the rod to revert to its normal form.\n\nButton 5. The rod transforms into a handheld battering ram and grants its user a +10 bonus to Strength (Athletics) checks made to break through doors, barricades, and other barriers.\n\nButton 6. The rod assumes or remains in its normal form and indicates magnetic north. (Nothing happens if this function of the rod is used in a location that has no magnetic north.) The rod also gives you knowledge of your approximate depth beneath the ground or your height above it.\n\nDrain Life. When you hit a creature with a melee attack using the rod, you can force the target to make a DC 17 Constitution saving throw. On a failed save, the target takes an extra 4d6 Necrotic damage, and you regain a number of Hit Points equal to half that Necrotic damage. Once used, this property can’t be used again until the next dawn.\n\nParalyze. When you hit a creature with a melee attack using the rod, you can force the target to make a DC 17 Constitution saving throw. On a failed save, the target has the Paralyzed condition for 1 minute. The target repeats the save at the end of each of its turns, ending the effect on a success. Once used, this property can’t be used again until the next dawn.\n\nTerrify. While holding the rod, you can take a Magic action to force each creature you can see within 30 feet of yourself to make a DC 17 Wisdom saving throw. On a failed save, a target has the Frightened condition for 1 minute. A Frightened target repeats the save at the end of each of its turns, ending the effect on itself on a success. Once used, this property can’t be used again until the next dawn.",
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'sceptre-de-suzerainete',
    name: { fr: 'Sceptre de suzeraineté', en: 'Rod of Rulership' },
    category: 'gear',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: "Vous pouvez entreprendre l'action Magie pour brandir le sceptre et exiger l'obéissance de toutes les créatures de votre choix parmi celles que vous voyez dans un rayon de 36 m. Chaque cible doit réussir un jet de sauvegarde de Sagesse DD 15 sous peine de subir l'état Charmé pendant 8 heures. Tant qu'elle est Charmée de la sorte, une créature se fie à votre autorité. Si elle est blessée par vous ou vos alliés, ou s'il lui est donné l'ordre de commettre un acte contraire à sa nature, une cible cesse d'être ainsi Charmée. Une fois utilisée, cette propriété ne peut plus resservir avant l'aube suivante.",
      en: 'You can take a Magic action to present the rod and command obedience from each creature of your choice that you can see within 120 feet of yourself. Each target must succeed on a DC 15 Wisdom saving throw or have the Charmed condition for 8 hours. While Charmed in this way, the creature regards you as its trusted leader. If harmed by you or your allies or commanded to do something contrary to its nature, a target ceases to be Charmed in this way. Once used, this property can’t be used again until the next dawn.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'sceptre-de-securite',
    name: { fr: 'Sceptre de sécurité', en: 'Rod of Security' },
    category: 'gear',
    rarity: 'very rare',
    attunement: false,
    magicDescription: {
      fr: "Quand vous tenez ce sceptre, vous pouvez entreprendre l'action Magie pour l'activer. Le sceptre vous transporte alors instantanément, ainsi qu'un maximum de 199 autres créatures consentantes que vous voyez, vers un demi-plan. Choisissez la forme prise par ce demi-plan. Il peut s'agir d'un jardin tranquille, d'une taverne joyeuse, d'un immense palais, d'une île tropicale, d'un carnaval fantastique ou de tout autre lieu tiré de votre imagination. Quelle que soit sa nature, le demi-plan contient suffisamment d'eau et de nourriture pour subvenir aux besoins de ses visiteurs, et son environnement ne peut pas nuire à ses occupants. Tout ce avec quoi il est possible d'y interagir n'existe que là-bas. Une fleur cueillie dans un jardin, par exemple, disparaît si elle est emportée hors du demi-plan.\n\nPour chaque heure passée dans le demi-plan, un visiteur récupère autant de points de vie que s'il avait dépensé 1 dé de vie. En outre, les créatures ne vieillissent pas pendant leur séjour, bien que le temps s'écoule normalement. Les visiteurs peuvent y rester un total de 200 jours divisés par le nombre de créatures présentes (arrondir à l'inférieur).\n\nQuand le temps est écoulé ou si vous consacrez l'action Magie à mettre fin à l'effet, tous les visiteurs réapparaissent à l'emplacement qu'ils occupaient lorsque vous avez activé le sceptre, ou à défaut dans l'espace inoccupé le plus proche. Une fois utilisée, cette propriété ne peut plus resservir avant que 10 jours ne se soient écoulés.",
      en: 'While holding this rod, you can take a Magic action to activate it. The rod then instantly transports you and up to 199 other willing creatures you can see to a demiplane. You choose the form the demiplane takes. It could be a tranquil garden, a cheery tavern, an immense palace, a tropical island, a fantastic carnival, or whatever else you can imagine. Regardless of its nature, the demiplane contains enough water and food to sustain its visitors, and the demiplane’s environment can’t harm its occupants. Everything else that can be interacted with there can exist only there. For example, a flower picked from a garden there disappears if it is taken outside the demiplane.\n\nFor each hour spent in the demiplane, a visitor regains Hit Points as if it had spent 1 Hit Point Die. Also, creatures don’t age while there, although time passes normally. Visitors can remain there for up to 200 days divided by the number of creatures present (round down).\n\nWhen the time runs out or you take a Magic action to end the effect, all visitors reappear in the location they occupied when you activated the rod or an unoccupied space nearest that location. Once used, this property can’t be used again until 10 days have passed.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'sceptre-de-vigilance',
    name: { fr: 'Sceptre de vigilance', en: 'Rod of Alertness' },
    category: 'gear',
    rarity: 'very rare',
    attunement: true,
    magicDescription: {
      fr: "Ce sceptre possède les propriétés suivantes.\n\nVigilance. Tant que vous tenez ce sceptre, vous avez l'Avantage aux tests de Sagesse (Perception) et aux jets d'Initiative.\n\nSorts. En tenant le sceptre, vous pouvez lancer les sorts suivants par son intermédiaire : détection du mal et du bien, détection de la magie, détection du poison et des maladies, détection de l'invisibilité.\n\nAura de protection. Au prix de l'action Magie, vous pouvez planter le manche du sceptre dans le sol, auquel cas sa tête émet une Lumière vive sur un rayon de 18 m et une Lumière faible sur 18 m de plus. Dans cette Lumière vive, vous et vos alliés recevez un bonus de +1 à la CA et aux jets de sauvegarde, et vous percevez la position de toute créature Invisible également présente dans la Lumière vive. La tête du sceptre cesse de briller et l'effet prend fin au bout de 10 minutes (plus tôt si une créature consacre l'action Magie à l'arracher du sol). Une fois utilisée, cette propriété ne peut plus resservir jusqu'à l'aube suivante.",
      en: 'This rod has the following properties.\n\nAlertness. While holding the rod, you have Advantage on Wisdom (Perception) checks and on Initiative rolls.\n\nSpells. While holding the rod, you can cast the following spells from it: Detect Evil and Good, Detect Magic, Detect Poison and Disease, See Invisibility.\n\nProtective Aura. As a Magic action, you can plant the haft end of the rod in the ground, whereupon the rod’s head sheds Bright Light in a 60-foot radius and Dim Light for an additional 60 feet. While in that Bright Light, you and your allies gain a +1 bonus to Armor Class and saving throws and can sense the location of any Invisible creature that is also in the Bright Light. The rod’s head stops glowing and the effect ends after 10 minutes or when a creature takes a Magic action to pull the rod from the ground. Once used, this property can’t be used again until the next dawn.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
];

/** Compteurs figés (parse strict côté merge script). */
export const SRD_MAGIC_ITEMS_RODS_COUNTS = {
  total: SRD_MAGIC_ITEMS_RODS.length,
  rare: SRD_MAGIC_ITEMS_RODS.filter((e) => e.rarity === 'rare').length,
  veryRare: SRD_MAGIC_ITEMS_RODS.filter((e) => e.rarity === 'very rare').length,
  legendary: SRD_MAGIC_ITEMS_RODS.filter((e) => e.rarity === 'legendary').length,
  attuned: SRD_MAGIC_ITEMS_RODS.filter((e) => e.attunement !== false).length,
} as const;
