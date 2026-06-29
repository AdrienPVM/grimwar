/**
 * SRD CC v5.2.1 — Bâtons (12 entrées).
 *
 * Batch D29.3 (backfill EN des magic-items grandfathered AideDD).
 *
 * Sources verbatim :
 *   - EN : `content-sources/extracted/raw/SRD_CC_v5.2.1.txt`
 *     (section "Magic Items A–Z", bâtons lignes 24719–25069)
 *   - FR : `content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt`
 *     (section "Objets magiques de A à Z", bâtons lignes 25339–25754)
 *
 * Comme D29.1/D29.2, on **remplace l'entrée grandfathered intégralement** par
 * la version officielle SRD 5.2.1 bilingue. Corrections issues du SRD :
 *   - `attunement` : le bundle marquait les 12 bâtons `false`, alors que le SRD
 *     5.2.1 exige l'Harmonisation pour TOUS. 8 sont restreints à des classes
 *     (forme objet { fr, en } rendue verbatim par l'UI via `localize()`), les 4
 *     autres utilisent `true` (« Harmonisation requise » générique).
 *   - `name.fr` : aligné sur la traduction officielle WotC FR. 1 drift corrigé :
 *     « Bâton de grand essaim » → « Bâton du grand essaim ». Slugs `id`
 *     préservés byte-identique. (« Bâton du thaumaturge » = Staff of the Magi :
 *     le nom FR officiel conserve « thaumaturge », pas de drift.)
 *
 * Note (orphelin FR, hors scope) : le SRD FR comporte un « Bâton de l'acrobate »
 * (= Quarterstaff of the Acrobat, arme à forme variable) absent de la section EN
 * du SRD et absent du bundle — non traité ici, à signaler à Adrien.
 *
 * Conventions (identiques aux modules C.x / D29.1/D29.2) : hyphénations de fin
 * de ligne et artefacts de saut de page retirés ; apostrophes courbes U+2019 →
 * ASCII ; tables de sorts rendues en ligne lisible (« sort : N charge(s) ; … ») ;
 * `\n\n` entre paragraphes.
 */

import type { SrdMagicItemEntry } from './srd-magic-items-rings-amulets';

// Harmonisations restreintes par classe — forme objet rendue telle quelle par
// l'UI. Formulation FR officielle (SRD FR 5.2.1), liste de classes verbatim.
const A_BARD_CLERIC_DRUID_SORC_WARLOCK_WIZARD = {
  fr: 'Harmonisation requise avec un Barde, Clerc, Druide, Ensorceleur, Magicien ou Occultiste',
  en: 'Requires Attunement by a Bard, Cleric, Druid, Sorcerer, Warlock, or Wizard',
} as const;
const A_DRUID_SORC_WARLOCK_WIZARD = {
  fr: 'Harmonisation requise avec un Druide, Ensorceleur, Magicien ou Occultiste',
  en: 'Requires Attunement by a Druid, Sorcerer, Warlock, or Wizard',
} as const;
const A_BARD_CLERIC_DRUID = {
  fr: 'Harmonisation requise avec un Barde, Clerc ou Druide',
  en: 'Requires Attunement by a Bard, Cleric, or Druid',
} as const;
const A_SORC_WARLOCK_WIZARD = {
  fr: 'Harmonisation requise avec un Ensorceleur, Magicien ou Occultiste',
  en: 'Requires Attunement by a Sorcerer, Warlock, or Wizard',
} as const;
const A_DRUID = {
  fr: 'Harmonisation requise avec un Druide',
  en: 'Requires Attunement by a Druid',
} as const;

export const SRD_MAGIC_ITEMS_STAVES: SrdMagicItemEntry[] = [
  // ─── Uncommon ──────────────────────────────────────────────────────────
  {
    id: 'baton-du-python',
    name: { fr: 'Bâton du python', en: 'Staff of the Python' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: true,
    magicDescription: {
      fr: "Au prix de l'action Magie, vous pouvez lancer ce bâton pour qu'il atterrisse en un espace inoccupé dans un rayon de 3 m et s'y transforme en serpent constricteur géant. Le serpent, sous votre contrôle, partage votre rang d'initiative et joue son tour juste après le vôtre.\n\nÀ votre tour, vous pouvez donner un ordre mental au serpent (pas d'action requise) s'il se trouve dans un rayon de 18 m de vous et si vous ne subissez pas l'état Neutralisé. Vous décidez quelle action le serpent entreprend et où il se déplacera à son tour, ou pouvez vous contenter de lui donner une instruction plus générale, comme veiller sur un lieu ou attaquer vos ennemis. En l'absence d'ordres de votre part, le serpent se défend.\n\nPar une action Bonus, vous pouvez ordonner au serpent de reprendre sa forme de bâton dans son espace actuel, après quoi vous ne pouvez plus utiliser la propriété du bâton pendant 1 heure. Si le serpent tombe à 0 point de vie, il meurt et retrouve sa forme de bâton ; le bâton se détruit alors en se brisant. Si le serpent retrouve sa forme de bâton avant d'avoir perdu tous ses points de vie, il les récupère tous.",
      en: "As a Magic action, you can throw this staff so that it lands in an unoccupied space within 10 feet of you, causing the staff to become a Giant Constrictor Snake in that space. The snake is under your control and shares your Initiative count, taking its turn immediately after yours.\n\nOn your turn, you can mentally command the snake (no action required) if it is within 60 feet of you and you don't have the Incapacitated condition. You decide what action the snake takes and where it moves during its turn, or you can issue it a general command, such as to attack your enemies or guard a location. Absent commands from you, the snake defends itself.\n\nAs a Bonus Action, you can command the snake to revert to staff form in its current space, and you can't use the staff's property again for 1 hour. If the snake is reduced to 0 Hit Points, it dies and reverts to its staff form; the staff then shatters and is destroyed. If the snake reverts to staff form before losing all its Hit Points, it regains all of them.",
    },
    description: null,
    source: 'srd-5.2.1',
  },
  // ─── Rare ────────────────────────────────────────────────────────────
  {
    id: 'baton-d-envoutement',
    name: { fr: "Bâton d'envoûtement", en: 'Staff of Charming' },
    category: 'gear',
    rarity: 'rare',
    attunement: A_BARD_CLERIC_DRUID_SORC_WARLOCK_WIZARD,
    magicDescription: {
      fr: "Ce bâton dispose de 10 charges. Tant que vous tenez ce bâton, vous pouvez recourir à ses propriétés :\n\nIncantation. Vous pouvez dépenser 1 charge du bâton pour lancer charme-personne, compréhension des langues ou injonction en prenant votre DD de sauvegarde des sorts.\n\nRenvoi d'enchantement. Si vous réussissez un JS contre un sort d'Enchantement qui ne cible que vous, vous pouvez jouer votre Réaction pour dépenser 1 charge du bâton, ce qui renvoie le sort sur son incantateur comme si vous aviez lancé le sort.\n\nRésistance aux enchantements. Si vous ratez un jet de sauvegarde contre un sort d'Enchantement qui ne cible que vous, vous pouvez transformer cet échec en réussite. Cette propriété du bâton ne peut plus resservir avant l'aube suivante.\n\nRécupération des charges. Le bâton récupère quotidiennement 1d8 + 2 charges dépensées, à l'aube. Si vous dépensez la dernière charge, lancez 1d20. Sur un résultat de 1, le bâton est réduit en poussière.",
      en: "This staff has 10 charges. While holding the staff, you can use any of its properties:\n\nCast Spell. You can expend 1 of the staff's charges to cast Charm Person, Command, or Comprehend Languages from it using your spell save DC.\n\nReflect Enchantment. If you succeed on a saving throw against an Enchantment spell that targets only you, you can take a Reaction to expend 1 charge from the staff and turn the spell back on its caster as if you had cast the spell.\n\nResist Enchantment. If you fail a saving throw against an Enchantment spell that targets only you, you can turn your failed save into a successful one. You can't use this property of the staff again until the next dawn.\n\nRegaining Charges. The staff regains 1d8 + 2 expended charges daily at dawn. If you expend the last charge, roll 1d20. On a 1, the staff crumbles to dust and is destroyed.",
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'baton-de-fletrissement',
    name: { fr: 'Bâton de flétrissement', en: 'Staff of Withering' },
    category: 'gear',
    rarity: 'rare',
    attunement: true,
    magicDescription: {
      fr: "Ce bâton dispose de 3 charges et récupère quotidiennement 1d3 charges dépensées, à l'aube.\n\nIl peut également servir de bâton de combat magique. Une attaque qui touche avec ce bâton inflige les dégâts d'un bâton de combat normal, sachant que vous pouvez dépenser 1 charge pour qu'il inflige 2d10 dégâts nécrotiques supplémentaires à la cible et lui impose un jet de sauvegarde de Constitution DD 15. En cas d'échec, la cible subit le Désavantage pendant 1 heure à tout test de caractéristique et jet de sauvegarde basé sur la Force ou la Constitution.",
      en: 'This staff has 3 charges and regains 1d3 expended charges daily at dawn.\n\nThe staff can be wielded as a magic Quarterstaff. On a hit, it deals damage as a normal Quarterstaff, and you can expend 1 charge to deal an extra 2d10 Necrotic damage to the target and force it to make a DC 15 Constitution saving throw. On a failed save, the target has Disadvantage for 1 hour on any ability check or saving throw that uses Strength or Constitution.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'baton-de-grand-essaim',
    name: { fr: 'Bâton du grand essaim', en: 'Staff of Swarming Insects' },
    category: 'gear',
    rarity: 'rare',
    attunement: A_BARD_CLERIC_DRUID_SORC_WARLOCK_WIZARD,
    magicDescription: {
      fr: "Ce bâton dispose de 10 charges.\n\nNuage d'insectes. Lorsque vous tenez le bâton, vous pouvez entreprendre l'action Magie et dépenser 1 charge pour faire apparaître un essaim d'insectes volants inoffensifs dans une Émanation de 9 m centrée sur vous. Les insectes persistent pendant 10 minutes, rendant la Visibilité nulle dans la zone pour toutes les créatures autres que vous. Un vent fort (comme celui créé par bourrasque) disperse l'essaim et met fin à l'effet.\n\nSorts. Lorsque vous tenez le bâton, vous pouvez lancer l'un des sorts de la table suivante en prenant votre DD de sauvegarde des sorts et votre modificateur d'attaque des sorts. La table indique le nombre de charges à dépenser pour lancer le sort.\n\ninsecte géant : 4 charges ; fléau d'insectes : 5 charges.\n\nRécupération des charges. Le bâton récupère quotidiennement 1d6 + 4 charges dépensées, à l'aube. Si vous dépensez la dernière charge, lancez 1d20. Sur un résultat de 1, une nuée d'insectes dévore le bâton et le détruit avant de se disperser.",
      en: 'This staff has 10 charges.\n\nInsect Cloud. While holding the staff, you can take a Magic action and expend 1 charge to cause a swarm of harmless flying insects to fill a 30-foot Emanation originating from you. The insects remain for 10 minutes, making the area Heavily Obscured for creatures other than you. A strong wind (like that created by Gust of Wind) disperses the swarm and ends the effect.\n\nSpells. While holding the staff, you can cast one of the spells on the following table from it, using your spell save DC and spell attack modifier. The table indicates how many charges you must expend to cast the spell.\n\nGiant Insect: 4 charges; Insect Plague: 5 charges.\n\nRegaining Charges. The staff regains 1d6 + 4 expended charges daily at dawn. If you expend the last charge, roll 1d20. On a 1, a swarm of insects consumes and destroys the staff, then disperses.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'baton-de-guerison',
    name: { fr: 'Bâton de guérison', en: 'Staff of Healing' },
    category: 'gear',
    rarity: 'rare',
    attunement: A_BARD_CLERIC_DRUID,
    magicDescription: {
      fr: "Ce bâton dispose de 10 charges. Lorsque vous tenez le bâton, vous pouvez lancer l'un des sorts de la table suivante en prenant votre modificateur de caractéristique d'incantation. La table indique le nombre de charges à dépenser pour lancer le sort.\n\nsoins : 1 charge par niveau de sort (maximum 4 pour un sort du 4e niveau) ; restauration partielle : 2 charges ; soins de groupe : 5 charges.\n\nRécupération des charges. Le bâton récupère quotidiennement 1d6 + 4 charges dépensées, à l'aube. Si vous dépensez la dernière charge, lancez 1d20. Sur un résultat de 1, le bâton disparaît dans un éclat de lumière, perdu à jamais.",
      en: 'This staff has 10 charges. While holding the staff, you can cast one of the spells on the following table from it, using your spellcasting ability modifier. The table indicates how many charges you must expend to cast the spell.\n\nCure Wounds: 1 charge per spell level (maximum 4 for a level 4 spell); Lesser Restoration: 2 charges; Mass Cure Wounds: 5 charges.\n\nRegaining Charges. The staff regains 1d6 + 4 expended charges daily at dawn. If you expend the last charge, roll 1d20. On a 1, the staff vanishes in a flash of light, lost forever.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'baton-des-forets',
    name: { fr: 'Bâton des forêts', en: 'Staff of the Woodlands' },
    category: 'gear',
    rarity: 'rare',
    attunement: A_DRUID,
    magicDescription: {
      fr: "Ce bâton, qui dispose de 6 charges, peut se manier comme un bâton de combat magique octroyant un bonus de +2 aux jets d'attaque et de dégâts. Tant que vous le tenez, vous recevez un bonus de +2 aux jets d'attaque de sort.\n\nSorts. Lorsque vous tenez le bâton, vous pouvez lancer l'un des sorts de la table suivante en prenant votre DD de sauvegarde des sorts. La table indique le nombre de charges à dépenser pour lancer le sort.\n\namitié avec les animaux : 1 charge ; communication avec les animaux : 1 charge ; communication avec les plantes : 3 charges ; éveil : 5 charges ; localisation d'animaux ou de plantes : 2 charges ; mur d'épines : 6 charges ; passage sans trace : 2 charges ; peau d'écorce : 2 charges.\n\nForme d'arbre. Vous pouvez entreprendre l'action Magie pour planter une extrémité du bâton dans une terre fertile en un espace inoccupé et dépenser 1 charge pour transformer le bâton en un arbre vigoureux. L'arbre mesure 18 m de haut et son tronc 1,50 m de diamètre, la ramure au sommet atteignant 6 m de rayon. L'arbre semble ordinaire, mais dégage une faible aura de magie de Transmutation détectable par le sort détection de la magie. En touchant l'arbre et en entreprenant l'action Magie, vous ramenez le bâton à sa forme normale. Toute créature perchée dans l'arbre tombe lorsque celui-ci redevient un bâton.\n\nRécupération des charges. Le bâton récupère quotidiennement 1d6 charges dépensées, à l'aube. Si vous dépensez la dernière charge, lancez 1d20. Sur un résultat de 1, le bâton perd ses propriétés et devient un bâton de combat non magique.",
      en: 'This staff has 6 charges and can be wielded as a magic Quarterstaff that grants a +2 bonus to attack rolls and damage rolls made with it. While holding it, you have a +2 bonus to spell attack rolls.\n\nSpells. While holding the staff, you can cast one of the spells on the following table from it, using your spell save DC. The table indicates how many charges you must expend to cast the spell.\n\nAnimal Friendship: 1 charge; Awaken: 5 charges; Barkskin: 2 charges; Locate Animals or Plants: 2 charges; Pass without Trace: 2 charges; Speak with Animals: 1 charge; Speak with Plants: 3 charges; Wall of Thorns: 6 charges.\n\nTree Form. You can take a Magic action to plant one end of the staff in earth in an unoccupied space and expend 1 charge to transform the staff into a healthy tree. The tree is 60 feet tall and has a 5-foot-diameter trunk, and its branches at the top spread out in a 20-foot radius. The tree appears ordinary but radiates a faint aura of Transmutation magic that can be discerned with the Detect Magic spell. While touching the tree and using a Magic action, you return the staff to its normal form. Any creature in the tree falls when the tree reverts to a staff.\n\nRegaining Charges. The staff regains 1d6 expended charges daily at dawn. If you expend the last charge, roll 1d20. On a 1, the staff loses its properties and becomes a nonmagical Quarterstaff.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  // ─── Very Rare ───────────────────────────────────────────────────────
  {
    id: 'baton-de-feu',
    name: { fr: 'Bâton de feu', en: 'Staff of Fire' },
    category: 'gear',
    rarity: 'very rare',
    attunement: A_DRUID_SORC_WARLOCK_WIZARD,
    magicDescription: {
      fr: "Vous bénéficiez de la Résistance aux dégâts de feu tant que vous tenez ce bâton.\n\nSorts. Le bâton dispose de 10 charges. Lorsque vous tenez le bâton, vous pouvez lancer l'un des sorts de la table suivante en prenant votre DD de sauvegarde des sorts. La table indique le nombre de charges à dépenser pour lancer le sort.\n\nmains brûlantes : 1 charge ; boule de feu : 3 charges ; mur de feu : 4 charges.\n\nRécupération des charges. Le bâton récupère quotidiennement 1d6 + 4 charges dépensées, à l'aube. Si vous dépensez la dernière charge, lancez 1d20. Sur un résultat de 1, le bâton est réduit en cendres.",
      en: 'You have Resistance to Fire damage while you hold this staff.\n\nSpells. The staff has 10 charges. While holding the staff, you can cast one of the spells on the following table from it, using your spell save DC. The table indicates how many charges you must expend to cast the spell.\n\nBurning Hands: 1 charge; Fireball: 3 charges; Wall of Fire: 4 charges.\n\nRegaining Charges. The staff regains 1d6 + 4 expended charges daily at dawn. If you expend the last charge, roll 1d20. On a 1, the staff crumbles into cinders and is destroyed.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'baton-de-givre',
    name: { fr: 'Bâton de givre', en: 'Staff of Frost' },
    category: 'gear',
    rarity: 'very rare',
    attunement: A_DRUID_SORC_WARLOCK_WIZARD,
    magicDescription: {
      fr: "Vous bénéficiez de la Résistance aux dégâts de froid tant que vous tenez ce bâton.\n\nSorts. Le bâton dispose de 10 charges. Lorsque vous tenez le bâton, vous pouvez lancer l'un des sorts de la table suivante en prenant votre DD de sauvegarde des sorts. La table indique le nombre de charges à dépenser pour lancer le sort.\n\ncône de froid : 5 charges ; nappe de brouillard : 1 charge ; tempête de grêle : 4 charges ; mur de glace : 4 charges.\n\nRécupération des charges. Le bâton récupère quotidiennement 1d6 + 4 charges dépensées, à l'aube. Si vous dépensez la dernière charge, lancez 1d20. Sur un résultat de 1, le bâton se liquéfie et il est détruit.",
      en: 'You have Resistance to Cold damage while you hold this staff.\n\nSpells. The staff has 10 charges. While holding the staff, you can cast one of the spells on the following table from it, using your spell save DC. The table indicates how many charges you must expend to cast the spell.\n\nCone of Cold: 5 charges; Fog Cloud: 1 charge; Ice Storm: 4 charges; Wall of Ice: 4 charges.\n\nRegaining Charges. The staff regains 1d6 + 4 expended charges daily at dawn. If you expend the last charge, roll 1d20. On a 1, the staff turns to water and is destroyed.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'baton-de-surpuissance',
    name: { fr: 'Bâton de surpuissance', en: 'Staff of Power' },
    category: 'gear',
    rarity: 'very rare',
    attunement: A_SORC_WARLOCK_WIZARD,
    magicDescription: {
      fr: "Ce bâton, qui dispose de 20 charges, peut se manier comme un bâton de combat magique octroyant un bonus de +2 aux jets d'attaque et de dégâts. Tant que vous le tenez, vous recevez un bonus de +2 à la classe d'armure, aux jets de sauvegarde et aux jets d'attaque de sort.\n\nSorts. Lorsque vous tenez le bâton, vous pouvez lancer l'un des sorts de la table suivante en prenant votre DD de sauvegarde des sorts. La table indique le nombre de charges à dépenser pour lancer le sort.\n\nboule de feu (au 5e niveau) : 5 charges ; cône de froid : 5 charges ; éclair (au 5e niveau) : 5 charges ; globe d'invulnérabilité : 6 charges ; immobilisation de monstre : 5 charges ; lévitation : 2 charges ; mur de force : 5 charges ; projectile magique : 1 charge ; rayon affaiblissant : 1 charge.\n\nRécupération des charges. Le bâton récupère quotidiennement 2d8 + 4 charges dépensées, à l'aube. Si vous dépensez la dernière charge, lancez 1d20. Sur un résultat de 1, le bâton conserve son bonus de +2 aux jets d'attaque et de dégâts, mais perd toutes ses autres propriétés. Sur un résultat de 20, il récupère 1d8 + 2 charges.\n\nExplosion vengeresse. Vous pouvez entreprendre l'action Magie pour rompre le bâton sur votre genou ou contre une surface solide. Le bâton se détruit alors en libérant sa magie dans une explosion qui emplit une Émanation de 9 m, dont il est l'origine. Vous avez 50 % de chances d'être propulsé instantanément vers un plan d'existence aléatoire et d'éviter ainsi l'explosion. Si vous n'évitez pas l'effet, vous subissez autant de dégâts de force que 16 fois le nombre de charges que contient le bâton. Chaque autre créature de la zone effectue un jet de sauvegarde de Dextérité DD 17. En cas d'échec, une créature subit autant de dégâts de force que 4 fois le nombre de charges contenues dans le bâton. En cas de réussite, elle ne subit que la moitié de ces dégâts.",
      en: 'This staff has 20 charges and can be wielded as a magic Quarterstaff that grants a +2 bonus to attack rolls and damage rolls made with it. While holding it, you gain a +2 bonus to Armor Class, saving throws, and spell attack rolls.\n\nSpells. While holding the staff, you can cast one of the spells on the following table from it, using your spell save DC. The table indicates how many charges you must expend to cast the spell.\n\nCone of Cold: 5 charges; Fireball (level 5 version): 5 charges; Globe of Invulnerability: 6 charges; Hold Monster: 5 charges; Levitate: 2 charges; Lightning Bolt (level 5 version): 5 charges; Magic Missile: 1 charge; Ray of Enfeeblement: 1 charge; Wall of Force: 5 charges.\n\nRegaining Charges. The staff regains 2d8 + 4 expended charges daily at dawn. If you expend the last charge, roll 1d20. On a 1, the staff retains its +2 bonus to attack rolls and damage rolls but loses all other properties. On a 20, the staff regains 1d8 + 2 charges.\n\nRetributive Strike. You can take a Magic action to break the staff over your knee or against a solid surface. The staff is destroyed and releases its magic in an explosion that fills a 30-foot Emanation originating from itself. You have a 50 percent chance to instantly travel to a random plane of existence, avoiding the explosion. If you fail to avoid the effect, you take Force damage equal to 16 times the number of charges in the staff. Each other creature in the area makes a DC 17 Dexterity saving throw. On a failed save, a creature takes Force damage equal to 4 times the number of charges in the staff. On a successful save, a creature takes half as much damage.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'baton-de-tonnerre-et-de-foudre',
    name: { fr: 'Bâton de tonnerre et de foudre', en: 'Staff of Thunder and Lightning' },
    category: 'gear',
    rarity: 'very rare',
    attunement: true,
    magicDescription: {
      fr: "Ce bâton peut se manier comme un bâton de combat magique qui octroie un bonus de +2 aux jets d'attaque et de dégâts. Il dispose en outre des propriétés supplémentaires suivantes. Une fois que l'une de ces propriétés est utilisée, vous ne pouvez plus y recourir avant l'aube suivante.\n\nFoudre. Lorsque vous touchez une cible avec une attaque de corps à corps utilisant le bâton, vous pouvez lui infliger 2d6 dégâts de foudre supplémentaires (pas d'action requise).\n\nTonnerre. Lorsque vous touchez avec une attaque de corps à corps utilisant le bâton, vous pouvez faire produire à celui-ci un éclat de tonnerre audible à 90 m (pas d'action requise). La cible que vous avez touchée doit réussir un jet de sauvegarde de Constitution DD 17 sous peine de subir l'état Étourdi jusqu'à la fin de votre tour suivant.\n\nTonnerre et foudre. Aussitôt après avoir touché une cible avec une attaque de corps à corps utilisant le bâton, vous pouvez entreprendre une action Bonus pour utiliser simultanément les propriétés Foudre et Tonnerre (voir ci-dessus). Cela ne dépense pas l'utilisation quotidienne de ces deux propriétés, seulement celle de « Tonnerre et foudre ».\n\nTrait de foudre. Vous pouvez entreprendre l'action Magie pour faire jaillir la foudre de la pointe du bâton sur une Ligne de 1,50 m de large et 36 m de long. Chaque créature prise dans cette Ligne effectue un jet de sauvegarde de Dextérité DD 17 et subit 9d6 dégâts de foudre en cas d'échec, la moitié en cas de réussite.\n\nCoup de tonnerre. Vous pouvez entreprendre l'action Magie pour que le bâton produise un coup de tonnerre audible à 180 m. Chaque créature dans une Émanation de 18 m centrée sur vous effectue un jet de sauvegarde de Constitution DD 17. En cas d'échec, une créature subit 2d6 dégâts de tonnerre, ainsi que l'état Assourdi pendant 1 minute. En cas de réussite, elle subit uniquement la moitié de ces dégâts.",
      en: "This staff can be wielded as a magic Quarterstaff that grants a +2 bonus to attack rolls and damage rolls made with it. It also has the following additional properties. Once one of these properties is used, it can't be used again until the next dawn.\n\nLightning. When you hit with a melee attack using the staff, you can cause the target to take an extra 2d6 Lightning damage (no action required).\n\nThunder. When you hit with a melee attack using the staff, you can cause the staff to emit a crack of thunder audible out to 300 feet (no action required). The target you hit must succeed on a DC 17 Constitution saving throw or have the Stunned condition until the end of your next turn.\n\nThunder and Lightning. Immediately after you hit with a melee attack using the staff, you can take a Bonus Action to use the Lightning and Thunder properties (see above) at the same time. Doing so doesn't expend the daily use of those properties, only the use of this one.\n\nLightning Strike. You can take a Magic action to cause a bolt of lightning to leap from the staff's tip in a Line that is 5 feet wide and 120 feet long. Each creature in that Line makes a DC 17 Dexterity saving throw, taking 9d6 Lightning damage on a failed save or half as much damage on a successful one.\n\nThunderclap. You can take a Magic action to cause the staff to produce a thunderclap audible out to 600 feet. Every creature within a 60-foot Emanation originating from you makes a DC 17 Constitution saving throw. On a failed save, a creature takes 2d6 Thunder damage and has the Deafened condition for 1 minute. On a successful save, a creature takes half as much damage only.",
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'baton-percussif',
    name: { fr: 'Bâton percussif', en: 'Staff of Striking' },
    category: 'gear',
    rarity: 'very rare',
    attunement: true,
    magicDescription: {
      fr: "Ce bâton peut se manier comme un bâton de combat magique qui octroie un bonus de +3 aux jets d'attaque et de dégâts.\n\nLe bâton dispose de 10 charges. Lorsque vous touchez avec une attaque de corps à corps par son intermédiaire, vous pouvez dépenser jusqu'à 3 charges. Pour chaque charge dépensée, la cible subit 1d6 dégâts de force supplémentaires.\n\nRécupération des charges. Le bâton récupère quotidiennement 1d6 + 4 charges dépensées, à l'aube. Si vous dépensez la dernière charge, lancez 1d20. Sur un résultat de 1, le bâton devient un bâton de combat non magique.",
      en: 'This staff can be wielded as a magic Quarterstaff that grants a +3 bonus to attack rolls and damage rolls made with it.\n\nThe staff has 10 charges. When you hit with a melee attack using it, you can expend up to 3 charges. For each charge you expend, the target takes an extra 1d6 Force damage.\n\nRegaining Charges. The staff regains 1d6 + 4 expended charges daily at dawn. If you expend the last charge, roll 1d20. On a 1, the staff becomes a nonmagical Quarterstaff.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  // ─── Legendary ───────────────────────────────────────────────────────
  {
    id: 'baton-du-thaumaturge',
    name: { fr: 'Bâton du thaumaturge', en: 'Staff of the Magi' },
    category: 'gear',
    rarity: 'legendary',
    attunement: A_SORC_WARLOCK_WIZARD,
    magicDescription: {
      fr: "Ce bâton, qui dispose de 50 charges, peut se manier comme un bâton de combat magique octroyant un bonus de +2 aux jets d'attaque et de dégâts. Tant que vous le tenez, vous recevez un bonus de +2 aux jets d'attaque de sort.\n\nAbsorption de sort. Tant que vous tenez le bâton, vous avez l'Avantage aux jets de sauvegarde contre les sorts. Vous pouvez en outre jouer votre Réaction lorsqu'une autre créature lance un sort qui ne cible que vous. Dans ce cas, le bâton absorbe la magie du sort, ce qui en annule l'effet ; le bâton reçoit alors un nombre de charges égal au niveau du sort absorbé. Cependant, si cela amène le nombre total de charges du bâton au-dessus de 50, l'objet explose comme si vous aviez activé son Explosion vengeresse (voir ci-après).\n\nSorts. Lorsque vous tenez le bâton, vous pouvez lancer l'un des sorts de la table suivante en prenant votre DD de sauvegarde des sorts. La table indique le nombre de charges à dépenser pour lancer le sort.\n\nverrou magique : 0 charge ; invocation d'élémentaire : 7 charges ; détection de la magie : 0 charge ; dissipation de la magie : 3 charges ; agrandissement/rapetissement : 0 charge ; boule de feu (au 7e niveau) : 7 charges ; sphère de feu : 2 charges ; tempête de grêle : 4 charges ; invisibilité : 2 charges ; déblocage : 2 charges ; lumière : 0 charge ; éclair (au 7e niveau) : 7 charges ; main du mage : 0 charge ; passe-muraille : 5 charges ; changement de plan : 7 charges ; protection contre le mal et le bien : 0 charge ; télékinésie : 5 charges ; mur de feu : 4 charges ; toile d'araignée : 2 charges.\n\nRécupération des charges. Le bâton récupère quotidiennement 4d6 + 2 charges dépensées, à l'aube. Si vous dépensez la dernière charge, lancez 1d20. Sur un résultat de 20, le bâton récupère 1d12 + 1 charges.\n\nExplosion vengeresse. Vous pouvez entreprendre l'action Magie pour rompre le bâton sur votre genou ou contre une surface solide. Le bâton se détruit alors en libérant sa magie dans une explosion qui emplit une Émanation de 9 m, dont il est l'origine. Vous avez 50 % de chances d'être propulsé instantanément vers un plan d'existence aléatoire et d'éviter ainsi l'explosion. Si vous n'évitez pas l'effet, vous subissez autant de dégâts de force que 16 fois le nombre de charges que contient le bâton. Chaque autre créature de la zone effectue un jet de sauvegarde de Dextérité DD 17. En cas d'échec, une créature subit des dégâts de force égaux à 6 fois le nombre de charges contenues dans le bâton. En cas de réussite, elle ne subit que la moitié de ces dégâts.",
      en: "This staff has 50 charges and can be wielded as a magic Quarterstaff that grants a +2 bonus to attack rolls and damage rolls made with it. While you hold it, you gain a +2 bonus to spell attack rolls.\n\nSpell Absorption. While holding the staff, you have Advantage on saving throws against spells. In addition, you can take a Reaction when another creature casts a spell that targets only you. If you do, the staff absorbs the magic of the spell, canceling its effect and gaining a number of charges equal to the absorbed spell's level. However, if doing so brings the staff's total number of charges above 50, the staff explodes as if you activated its Retributive Strike (see below).\n\nSpells. While holding the staff, you can cast one of the spells on the following table from it, using your spell save DC. The table indicates how many charges you must expend to cast the spell.\n\nArcane Lock: 0 charges; Conjure Elemental: 7 charges; Detect Magic: 0 charges; Dispel Magic: 3 charges; Enlarge/Reduce: 0 charges; Fireball (level 7 version): 7 charges; Flaming Sphere: 2 charges; Ice Storm: 4 charges; Invisibility: 2 charges; Knock: 2 charges; Light: 0 charges; Lightning Bolt (level 7 version): 7 charges; Mage Hand: 0 charges; Passwall: 5 charges; Plane Shift: 7 charges; Protection from Evil and Good: 0 charges; Telekinesis: 5 charges; Wall of Fire: 4 charges; Web: 2 charges.\n\nRegaining Charges. The staff regains 4d6 + 2 expended charges daily at dawn. If you expend the last charge, roll 1d20. On a 20, the staff regains 1d12 + 1 charges.\n\nRetributive Strike. You can take a Magic action to break the staff over your knee or against a solid surface. The staff is destroyed and releases its magic in an explosion that fills a 30-foot Emanation originating from itself. You have a 50 percent chance to instantly travel to a random plane of existence, avoiding the explosion. If you fail to avoid the effect, you take Force damage equal to 16 times the number of charges in the staff. Each other creature in the area makes a DC 17 Dexterity saving throw. On a failed save, a creature takes Force damage equal to 6 times the number of charges in the staff. On a successful save, a creature takes half as much damage.",
    },
    description: null,
    source: 'srd-5.2.1',
  },
];

/** Compteurs figés (parse strict côté merge script). */
export const SRD_MAGIC_ITEMS_STAVES_COUNTS = {
  total: SRD_MAGIC_ITEMS_STAVES.length,
  uncommon: SRD_MAGIC_ITEMS_STAVES.filter((e) => e.rarity === 'uncommon').length,
  rare: SRD_MAGIC_ITEMS_STAVES.filter((e) => e.rarity === 'rare').length,
  veryRare: SRD_MAGIC_ITEMS_STAVES.filter((e) => e.rarity === 'very rare').length,
  legendary: SRD_MAGIC_ITEMS_STAVES.filter((e) => e.rarity === 'legendary').length,
} as const;
