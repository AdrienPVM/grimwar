/**
 * SRD CC v5.2.1 — Baguettes (13 entrées).
 *
 * Batch D29.2 (backfill EN des magic-items grandfathered AideDD).
 *
 * Sources verbatim :
 *   - EN : `content-sources/extracted/raw/SRD_CC_v5.2.1.txt`
 *     (section "Magic Items A–Z", baguettes lignes 25307–25559)
 *   - FR : `content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt`
 *     (section "Objets magiques de A à Z", baguettes lignes 25004–25286)
 *
 * Comme pour le batch D29.1 (anneaux ≥rare), on **remplace l'entrée
 * grandfathered intégralement** par la version officielle SRD 5.2.1 bilingue —
 * la prose FR d'origine venait d'AideDD (souvent édition 2014) et plusieurs
 * champs étaient faux dans le bundle :
 *
 *   - `attunement` : le bundle marquait les 13 baguettes `false`, alors que le
 *     SRD 5.2.1 exige l'Harmonisation pour 8 d'entre elles (dont 6 « par un
 *     incantateur »). Corrigé d'après la ligne de type SRD. Les 6 « par un
 *     incantateur » utilisent la forme objet `{ fr, en }` (l'UI la rend telle
 *     quelle via `localize()` — cf. `magic-item-browser.tsx`), les 2 simples
 *     utilisent `true`, les 5 sans harmonisation restent `false`.
 *   - `name.fr` : aligné sur la traduction officielle WotC FR du SRD FR 5.2.1.
 *     Corrige 2 drifts : « Baguette de peur » → « Baguette de terreur » (le
 *     sort est *terreur*) ; « Baguette de toile d'araignée » → « Baguette des
 *     toiles ». Les slugs `id` restent byte-identiques aux entrées existantes.
 *
 * Note de divergence officielle EN/FR (Baguette des merveilles, plage 01–20) :
 * les deux éditions officielles mappent les mêmes 5 sorts au 1d10 dans un ordre
 * différent (EN : 1–2 Darkness… ; FR : 1–2 boule de feu…). Ce n'est pas une
 * corruption d'extraction mais une divergence des sources WotC ; mécaniquement
 * équivalent (même set, probabilités égales). On conserve chaque langue
 * verbatim plutôt que de « corriger » la FR sur l'EN.
 *
 * Conventions (identiques aux modules C.x / D29.1) : hyphénations de fin de
 * ligne et artefacts de saut de page (« System Reference Document … »,
 * « Document de Référence … ») retirés ; apostrophes courbes U+2019 → ASCII ;
 * guillemets courbes EN → ASCII droits ; tables rendues en ligne lisible ;
 * `\n\n` entre paragraphes.
 */

import type { SrdMagicItemEntry } from './srd-magic-items-rings-amulets';

/** Harmonisation « par un incantateur » — forme objet rendue telle quelle. */
const ATTUNE_SPELLCASTER = {
  fr: 'Harmonisation requise avec un incantateur',
  en: 'Requires Attunement by a Spellcaster',
} as const;

/** Paragraphe « Récupération des charges » récurrent (variante « cendres »). */
const REGAIN_FR =
  "Récupération des charges. La baguette récupère quotidiennement 1d6 + 1 charges dépensées, à l'aube. Si vous dépensez la dernière charge, lancez 1d20. Sur un résultat de 1, la baguette se réduit en cendres, à jamais détruite.";
const REGAIN_EN =
  "Regaining Charges. The wand regains 1d6 + 1 expended charges daily at dawn. If you expend the wand's last charge, roll 1d20. On a 1, the wand crumbles into ashes and is destroyed.";

export const SRD_MAGIC_ITEMS_WANDS: SrdMagicItemEntry[] = [
  // ─── Uncommon ──────────────────────────────────────────────────────────
  {
    id: 'baguette-de-detection-de-la-magie',
    name: { fr: 'Baguette de détection de la magie', en: 'Wand of Magic Detection' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Cette baguette dispose de 3 charges. Lorsque vous la tenez, vous pouvez dépenser 1 charge pour lancer détection de la magie par son biais. La baguette récupère quotidiennement 1d3 charges dépensées, à l'aube.",
      en: 'This wand has 3 charges. While holding it, you can expend 1 charge to cast Detect Magic from it. The wand regains 1d3 expended charges daily at dawn.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'baguette-de-projectiles-magiques',
    name: { fr: 'Baguette de projectiles magiques', en: 'Wand of Magic Missiles' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: `Cette baguette dispose de 7 charges. Lorsque vous la tenez, vous pouvez dépenser jusqu'à 3 charges pour lancer projectile magique par son biais. Avec 1 charge, vous lancez le sort au 1er niveau. Vous augmentez le niveau du sort d'un cran par charge additionnelle dépensée.\n\n${REGAIN_FR}`,
      en: `This wand has 7 charges. While holding it, you can expend no more than 3 charges to cast Magic Missile from it. For 1 charge, you cast the level 1 version of the spell. You can increase the spell's level by 1 for each additional charge you expend.\n\n${REGAIN_EN}`,
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'baguette-des-secrets',
    name: { fr: 'Baguette des secrets', en: 'Wand of Secrets' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Cette baguette dispose de 3 charges et récupère quotidiennement 1d3 charges dépensées, à l'aube. Tant que vous la tenez, vous pouvez entreprendre l'action Magie pour dépenser 1 charge ; si un passage secret ou un piège se trouve dans un rayon de 18 m de vous, la baguette émet des impulsions et pointe en direction de l'élément détecté le plus proche.",
      en: 'This wand has 3 charges and regains 1d3 expended charges daily at dawn. While holding it, you can take a Magic action to expend 1 charge, and if a secret door or trap is within 60 feet of you, the wand pulses and points at the one nearest to you.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'baguette-de-toile-d-araignee',
    name: { fr: 'Baguette des toiles', en: 'Wand of Web' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: ATTUNE_SPELLCASTER,
    magicDescription: {
      fr: `Cette baguette dispose de 7 charges. Lorsque vous la tenez, vous pouvez dépenser 1 charge pour lancer toile d'araignée (DD de sauvegarde 13).\n\n${REGAIN_FR}`,
      en: `This wand has 7 charges. While holding it, you can expend 1 charge to cast Web (save DC 13) from it.\n\n${REGAIN_EN}`,
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'baguette-du-mage-de-guerre-1-2-ou-3',
    name: { fr: 'Baguette du mage de guerre +1, +2 ou +3', en: 'Wand of the War Mage, +1, +2, or +3' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: ATTUNE_SPELLCASTER,
    magicDescription: {
      fr: "Tant que vous la tenez, vous recevez aux jets d'attaque de sort un bonus déterminé par la rareté de cette baguette. Par ailleurs, vos jets d'attaque de sort ne tiennent pas compte de l'Abri partiel des cibles.",
      en: "While holding this wand, you gain a bonus to spell attack rolls determined by the wand's rarity. In addition, you ignore Half Cover when making a spell attack roll.",
    },
    description: null,
    source: 'srd-5.2.1',
  },
  // ─── Rare ────────────────────────────────────────────────────────────
  {
    id: 'baguette-d-eclairs',
    name: { fr: "Baguette d'éclairs", en: 'Wand of Lightning Bolts' },
    category: 'gear',
    rarity: 'rare',
    attunement: ATTUNE_SPELLCASTER,
    magicDescription: {
      fr: `Cette baguette dispose de 7 charges. Lorsque vous la tenez, vous pouvez dépenser jusqu'à 3 charges pour lancer éclair (DD de sauvegarde 15). Avec 1 charge, vous lancez le sort au 3e niveau. Vous augmentez le niveau du sort d'un cran par charge additionnelle dépensée.\n\n${REGAIN_FR}`,
      en: `This wand has 7 charges. While holding it, you can expend no more than 3 charges to cast Lightning Bolt (save DC 15) from it. For 1 charge, you cast the level 3 version of the spell. You can increase the spell's level by 1 for each additional charge you expend.\n\n${REGAIN_EN}`,
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'baguette-de-boules-de-feu',
    name: { fr: 'Baguette de boules de feu', en: 'Wand of Fireballs' },
    category: 'gear',
    rarity: 'rare',
    attunement: ATTUNE_SPELLCASTER,
    magicDescription: {
      fr: `Cette baguette dispose de 7 charges. Lorsque vous la tenez, vous pouvez dépenser jusqu'à 3 charges pour lancer boule de feu (DD de sauvegarde 15). Avec 1 charge, vous lancez le sort au 3e niveau. Vous augmentez le niveau du sort d'un cran par charge additionnelle dépensée.\n\n${REGAIN_FR}`,
      en: `This wand has 7 charges. While holding it, you can expend no more than 3 charges to cast Fireball (save DC 15) from it. For 1 charge, you cast the level 3 version of the spell. You can increase the spell's level by 1 for each additional charge you expend.\n\n${REGAIN_EN}`,
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'baguette-de-detection-de-l-ennemi',
    name: { fr: "Baguette de détection de l'ennemi", en: 'Wand of Enemy Detection' },
    category: 'gear',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: `Cette baguette dispose de 7 charges. Lorsque vous la tenez, vous pouvez entreprendre l'action Magie pour dépenser 1 charge. Pendant 1 minute, vous connaissez la direction dans laquelle se trouve la créature Hostile la plus proche dans un rayon de 18 m, mais pas la distance qui vous en sépare. La baguette détecte la présence de créatures Hostiles qui sont éthérées, Invisibles, déguisées ou cachées, ainsi que celles exposées à la vue de tous. L'effet se termine si vous cessez de tenir la baguette.\n\n${REGAIN_FR}`,
      en: `This wand has 7 charges. While holding it, you can take a Magic action to expend 1 charge. For 1 minute, you know the direction of the nearest creature Hostile to you within 60 feet, but not its distance from you. The wand can sense the presence of Hostile creatures that are Invisible, ethereal, disguised, or hidden, as well as those in plain sight. The effect ends if you stop holding the wand.\n\n${REGAIN_EN}`,
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'baguette-de-paralysie',
    name: { fr: 'Baguette de paralysie', en: 'Wand of Paralysis' },
    category: 'gear',
    rarity: 'rare',
    attunement: ATTUNE_SPELLCASTER,
    magicDescription: {
      fr: `Cette baguette dispose de 7 charges. Tant que vous la tenez, vous pouvez entreprendre l'action Magie pour dépenser 1 de ses charges afin de produire un fin rayon bleuté qui jaillit de la pointe vers une créature que vous voyez dans un rayon de 18 m. La cible doit réussir un jet de sauvegarde de Constitution DD 15 sous peine de subir l'état Paralysé pendant 1 minute. À la fin de chacun de ses tours, la cible réitère le JS et met un terme à l'effet sur elle-même en cas de réussite.\n\n${REGAIN_FR}`,
      en: `This wand has 7 charges. While holding it, you can take a Magic action to expend 1 charge to cause a thin blue ray to streak from the tip toward a creature you can see within 60 feet of yourself. The target must succeed on a DC 15 Constitution saving throw or have the Paralyzed condition for 1 minute. At the end of each of the target's turns, it repeats the save, ending the effect on itself on a success.\n\n${REGAIN_EN}`,
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'baguette-de-peur',
    name: { fr: 'Baguette de terreur', en: 'Wand of Fear' },
    category: 'gear',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: `Cette baguette dispose de 7 charges.\n\nSorts. Lorsque vous tenez la baguette, vous pouvez lancer l'un des sorts de la table suivante (DD de sauvegarde 15). La table indique le nombre de charges à dépenser pour lancer le sort.\n\ninjonction (« fuis » ou « rampe » uniquement) : 1 charge ; terreur (Cône de 18 m) : 3 charges.\n\n${REGAIN_FR}`,
      en: `This wand has 7 charges.\n\nSpells. While holding the wand, you can cast one of the spells (save DC 15) on the following table from it. The table indicates how many charges you must expend to cast the spell.\n\nCommand ("flee" or "grovel" only): 1 charge; Fear (60-foot Cone): 3 charges.\n\n${REGAIN_EN}`,
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'baguette-des-entraves',
    name: { fr: 'Baguette des entraves', en: 'Wand of Binding' },
    category: 'gear',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: `Cette baguette dispose de 7 charges.\n\nSorts. Lorsque vous tenez la baguette, vous pouvez lancer l'un des sorts de la table suivante (DD de sauvegarde 17). La table indique le nombre de charges à dépenser pour lancer le sort.\n\nimmobilisation de monstre : 5 charges ; immobilisation de personne : 2 charges.\n\n${REGAIN_FR}`,
      en: `This wand has 7 charges.\n\nSpells. While holding the wand, you can cast one of the spells (save DC 17) on the following table from it. The table indicates how many charges you must expend to cast the spell.\n\nHold Monster: 5 charges; Hold Person: 2 charges.\n\n${REGAIN_EN}`,
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'baguette-des-merveilles',
    name: { fr: 'Baguette des merveilles', en: 'Wand of Wonder' },
    category: 'gear',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: "Cette baguette dispose de 7 charges. Lorsque vous la tenez, vous pouvez entreprendre l'action Magie pour dépenser 1 charge en choisissant un point dans un rayon de 36 m. Ce lieu devient le point d'origine d'un sort ou d'un autre effet magique déterminé aléatoirement selon la table « Effets de baguette des merveilles ». Le DD de sauvegarde des sorts lancés par la baguette est de 15. Quand la portée maximale d'un sort est normalement inférieure à 36 m, elle passe à 36 m lorsqu'il est lancé par la baguette. Quand un effet a plusieurs cibles potentielles, le MJ détermine aléatoirement lesquelles sont affectées.\n\nRécupération des charges. La baguette récupère quotidiennement 1d6 + 1 charges dépensées, à l'aube. Si vous dépensez la dernière charge, lancez 1d20. Sur un résultat de 1, la baguette tombe en poussière, à jamais détruite.\n\nEffets de baguette des merveilles (1d100) :\n01–20 Vous lancez un sort émanant du point d'origine choisi. Lancez 1d10 pour déterminer le sort : 1–2, boule de feu ; 3–4, lenteur ; 5–6, lueurs féeriques ; 7–8, nuage nauséabond ; 9–10, ténèbres.\n21–25 Rien ne se passe au point d'origine. Au lieu de cela, vous subissez l'état Étourdi jusqu'au début de votre tour suivant, convaincu qu'un événement extraordinaire se produit sous vos yeux.\n26–30 Vous lancez bourrasque. La Ligne créée par le sort s'étend de vous jusqu'au point d'origine.\n31–35 Rien ne se passe au point d'origine. Au lieu de cela, vous subissez 1d6 dégâts psychiques.\n36–40 Une pluie torrentielle s'abat pendant 1 minute dans un Cylindre de 36 m de haut et 18 m de rayon centré sur le point d'origine. Pendant cette durée, la zone d'effet est à Visibilité réduite.\n41–45 Une nuée de 600 papillons surdimensionnés emplit un Cylindre de 18 m de haut et 9 m de rayon centré sur le point d'origine. Les papillons restent pendant 10 minutes, durant lesquelles la zone d'effet est à Visibilité nulle.\n46–50 Vous lancez éclair. La Ligne créée par le sort s'étend de vous jusqu'au point d'origine.\n51–55 La créature la plus proche du point d'origine est agrandie comme si vous aviez lancé sur elle agrandissement/rapetissement. Si vous n'êtes pas cette cible et que celle-ci ne peut pas être affectée par ce sort, c'est vous qui en devenez la cible.\n56–60 Une créature formée magiquement apparaît dans un espace inoccupé aussi près que possible du point d'origine. Elle n'est pas sous votre contrôle, agit normalement et disparaît après 1 heure ou lorsqu'elle tombe à 0 point de vie. Lancez 1d4 pour déterminer quelle créature apparaît. Sur un 1, un rhinocéros se présente ; 2, un éléphant ; 3–4, un rat.\n61–64 De l'herbe recouvre un cercle de 18 m de rayon au sol, le centre de ce cercle étant aussi proche que possible du point d'origine. Si de l'herbe était déjà présente, elle grandit jusqu'à atteindre dix fois sa taille normale et demeure ainsi pendant 1 minute.\n65–68 Un objet au choix du MJ disparaît dans le Plan Éthéré. L'objet ne doit être porté par personne, doit se trouver dans un rayon de 36 m du point d'origine et ne doit pas mesurer plus de 3 m de long, de large ou de haut. S'il n'y a aucun objet de la sorte à portée, rien ne se passe.\n69–72 Rien ne se passe au point d'origine. À la place, vous rapetissez comme si vous aviez lancé agrandissement/rapetissement sur vous-même et restez dans cet état pendant 1 minute.\n73–77 Des feuilles poussent sur la créature la plus proche du point d'origine. À moins d'être arrachées avant, ces feuilles brunissent et tombent au bout de 24 heures.\n78–82 Rien ne se passe au point d'origine. Au lieu de cela, une explosion de lumière colorée et scintillante s'étend depuis vous dans une Émanation de 9 m. Chaque créature prise dans la zone doit réussir un jet de sauvegarde de Constitution DD 15 sous peine de subir l'état Aveuglé pendant 1 minute. Une créature affectée réitère le JS à la fin de chacun de ses tours, et met un terme à l'effet sur elle-même en cas de réussite.\n83–87 Rien ne se passe au point d'origine. Au lieu de cela, vous lancez invisibilité sur vous-même.\n88–92 Rien ne se passe au point d'origine. Au lieu de cela, un torrent de 1d4 × 10 gemmes, chacune d'une valeur de 1 po, jaillit de la pointe de la baguette vers le point d'origine en formant une Ligne de 9 m de long sur 1,50 m de large. Chaque gemme inflige 1 dégât contondant ; les dégâts totaux infligés par les gemmes se divisent équitablement entre toutes les créatures présentes sur cette Ligne.\n93–97 Vous lancez métamorphose, en ciblant la créature la plus proche du point d'origine. Lancez 1d4 pour déterminer la nouvelle forme de la cible. 1, la nouvelle forme est un ours noir ; 2, une guêpe géante ; 3–4, une grenouille.\n98–00 La créature la plus proche du point d'origine effectue un jet de sauvegarde de Constitution DD 15. En cas d'échec, elle subit l'état Entravé et commence à se pétrifier. Tant qu'elle est ainsi Entravée, la créature réitère le JS à la fin de son tour suivant. En cas de réussite, l'effet prend fin. En cas d'échec, la créature subit l'état Pétrifié qui remplace l'état Entravé. La pétrification persiste jusqu'à ce que la créature en soit affranchie par le sort restauration suprême ou une magie équivalente.",
      en: "This wand has 7 charges. While holding it, you can take a Magic action to expend 1 charge while choosing a point within 120 feet of yourself. That location becomes the point of origin of a spell or other magical effect determined by rolling on the Wand of Wonder Effects table. Spells cast from the wand have a save DC of 15. If a spell's maximum range is normally less than 120 feet, it becomes 120 feet when cast from the wand. If an effect has multiple possible subjects, the GM determines randomly which among them are affected.\n\nRegaining Charges. The wand regains 1d6 + 1 expended charges daily at dawn. If you expend the wand's last charge, roll 1d20. On a 1, the wand crumbles into dust and is destroyed.\n\nWand of Wonder Effects (1d100):\n01–20 You cast a spell originating from the chosen point. Roll 1d10 to determine the spell: on a 1–2, Darkness; on a 3–4, Faerie Fire; on a 5–6, Fireball; on a 7–8, Slow; on a 9–10, Stinking Cloud.\n21–25 Nothing happens at the chosen point of origin. Instead, you have the Stunned condition until the start of your next turn, believing something awesome just happened.\n26–30 You cast Gust of Wind. The Line created by the spell extends from you to the chosen point of origin.\n31–35 Nothing happens at the chosen point of origin. Instead, you take 1d6 Psychic damage.\n36–40 Heavy rain falls for 1 minute in a 120-foot-high, 60-foot-radius Cylinder centered on the chosen point of origin. During that time, the area of effect is Lightly Obscured.\n41–45 A cloud of 600 oversized butterflies fills a 60-foot-high, 30-foot-radius Cylinder centered on the chosen point of origin. The butterflies remain for 10 minutes, during which time the area of effect is Heavily Obscured.\n46–50 You cast Lightning Bolt. The Line created by the spell extends from you to the chosen point of origin.\n51–55 The creature closest to the chosen point of origin is enlarged as if you had cast Enlarge/Reduce on it. If the target isn't you and can't be affected by that spell, you become the target instead.\n56–60 A magically formed creature appears in an unoccupied space as close to the chosen point of origin as possible. The creature isn't under your control, acts as it normally would, and disappears after 1 hour or when it drops to 0 Hit Points. Roll 1d4 to determine which creature appears. On a 1, a Rhinoceros appears; on a 2, an Elephant appears; and on a 3–4, a Rat appears.\n61–64 Grass covers a 60-foot-radius circle of ground, with the center of that circle as close to the chosen point of origin as possible. Grass that's already there grows to ten times its normal size and remains overgrown for 1 minute.\n65–68 An object of the GM's choice disappears into the Ethereal Plane. The object must be neither worn nor carried, within 120 feet of the chosen point of origin, and no larger than 10 feet in any dimension. If there are no such objects in range, nothing happens.\n69–72 Nothing happens at the chosen point of origin. Instead, you shrink as if you had cast Enlarge/Reduce on yourself and remain in that state for 1 minute.\n73–77 Leaves grow from the creature nearest to the chosen point of origin. Unless they are picked off, the leaves turn brown and fall off after 24 hours.\n78–82 Nothing happens at the chosen point of origin. Instead, a burst of colorful, shimmering light extends from you in a 30-foot Emanation. Each creature in the area must succeed on a DC 15 Constitution saving throw or have the Blinded condition for 1 minute. A creature repeats the save at the end of each of its turns, ending the effect on itself on a success.\n83–87 Nothing happens at the chosen point of origin. Instead, you cast Invisibility on yourself.\n88–92 Nothing happens at the chosen point of origin. Instead, a stream of 1d4 × 10 gems, each worth 1 GP, shoots from the wand's tip in a Line 30 feet long and 5 feet wide toward the chosen point of origin. Each gem deals 1 Bludgeoning damage, and the total damage of the gems is divided equally among all creatures in the Line.\n93–97 You cast Polymorph, targeting the creature closest to the chosen point of origin. Roll 1d4 to determine the target's new form. On a 1, the new form is a Black Bear; on a 2, the new form is a Giant Wasp; on a 3–4, the new form is a Frog.\n98–00 The creature closest to the chosen point of origin makes a DC 15 Constitution saving throw. On a failed save, the creature has the Restrained condition and begins to turn to stone. While Restrained in this way, the creature repeats the save at the end of its next turn. On a successful save, the effect ends. On a failed save, the creature has the Petrified condition instead of the Restrained condition. The petrification lasts until the creature is freed by the Greater Restoration spell or similar magic.",
    },
    description: null,
    source: 'srd-5.2.1',
  },
  // ─── Very Rare ───────────────────────────────────────────────────────
  {
    id: 'baguette-de-metamorphose',
    name: { fr: 'Baguette de métamorphose', en: 'Wand of Polymorph' },
    category: 'gear',
    rarity: 'very rare',
    attunement: ATTUNE_SPELLCASTER,
    magicDescription: {
      fr: `Cette baguette dispose de 7 charges. Lorsque vous la tenez, vous pouvez dépenser 1 charge pour lancer métamorphose (DD de sauvegarde 15) par son biais.\n\n${REGAIN_FR}`,
      en: `This wand has 7 charges. While holding it, you can expend 1 charge to cast Polymorph (save DC 15) from it.\n\n${REGAIN_EN}`,
    },
    description: null,
    source: 'srd-5.2.1',
  },
];

/** Compteurs figés (parse strict côté merge script). */
export const SRD_MAGIC_ITEMS_WANDS_COUNTS = {
  total: SRD_MAGIC_ITEMS_WANDS.length,
  uncommon: SRD_MAGIC_ITEMS_WANDS.filter((e) => e.rarity === 'uncommon').length,
  rare: SRD_MAGIC_ITEMS_WANDS.filter((e) => e.rarity === 'rare').length,
  veryRare: SRD_MAGIC_ITEMS_WANDS.filter((e) => e.rarity === 'very rare').length,
} as const;
