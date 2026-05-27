/**
 * SRD CC v5.2.1 — Potions Common + Uncommon (9 entrées).
 *
 * Sources verbatim :
 *   - EN : `content-sources/extracted/raw/SRD_CC_v5.2.1.txt` lignes 23671-23845
 *   - FR : `content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt` lignes 28067-28246
 *
 * Cf. plan `plans/C-magic-items-srd-common-uncommon.md` (tracer-bullet C.1).
 *
 * Politique :
 *   - Le `magicDescription` reprend la formulation officielle SRD FR (PDF FR CC v5.2.1).
 *   - En cas de corruption d'une extraction texte, arbitrage EN-mécanique /
 *     FR-formulation (règle CLAUDE.md).
 *   - Slugs conservés byte-identique aux entrées grandfathered du bundle pour
 *     éviter toute rupture référentielle ; `name.fr` aligné sur la traduction
 *     officielle WotC FR (notamment `Potion toxique` pour ce qui était nommé
 *     « Potion de poison »).
 *   - L'entrée `potion-de-force-de-geant` du SRD parent est étiquetée
 *     `rarity varies` ; seule la variante (collines) est uncommon. On garde le
 *     slug et on tag rarity=uncommon avec mention claire de la variante dans
 *     la description.
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

export const SRD_MAGIC_ITEMS_POTIONS: SrdMagicItemEntry[] = [
  // ─── Common (2) ────────────────────────────────────────────────────
  {
    id: 'potion-d-escalade',
    name: { fr: "Potion d'escalade", en: 'Potion of Climbing' },
    category: 'gear',
    rarity: 'common',
    attunement: false,
    magicDescription: {
      fr: "Lorsque vous buvez cette potion, vous recevez une Vitesse d'escalade égale à votre Vitesse pendant 1 heure. Pendant cette heure, vous avez l'Avantage aux tests de Force (Athlétisme) effectués pour l'escalade.\n\nLa potion est divisée en nappes brunes, argentées et grises évoquant des strates dans la roche. Ces couleurs ne se mélangent pas, même quand on secoue la bouteille.",
      en: 'When you drink this potion, you gain a Climb Speed equal to your Speed for 1 hour. During this time, you have Advantage on Strength (Athletics) checks to climb.\n\nThis potion is separated into brown, silver, and gray layers resembling bands of stone. Shaking the bottle fails to mix the colors.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'potion-de-guerison',
    name: { fr: 'Potion de guérison', en: 'Potion of Healing' },
    category: 'gear',
    rarity: 'common',
    attunement: false,
    magicDescription: {
      fr: 'Vous récupérez des points de vie en buvant cette potion. Le nombre de points de vie dépend de la rareté de la potion, comme indiqué sur la table ci-après.\n\nQuelle que soit la puissance de la potion, son liquide rouge étincelle lorsqu’on l’agite.\n\nPotion de guérison (courante) : 2d4 + 2 points de vie récupérés.\nPotion de guérison (importante, peu courante) : 4d4 + 4.\nPotion de guérison (supérieure, rare) : 8d4 + 8.\nPotion de guérison (suprême, très rare) : 10d4 + 20.',
      en: "You regain Hit Points when you drink this potion. The number of Hit Points depends on the potion's rarity, as shown in the table below.\n\nWhatever its potency, the potion's red liquid glimmers when agitated.\n\nPotion of Healing (Common): 2d4 + 2 HP regained.\nPotion of Healing (greater, Uncommon): 4d4 + 4.\nPotion of Healing (superior, Rare): 8d4 + 8.\nPotion of Healing (supreme, Very Rare): 10d4 + 20.",
    },
    description: null,
    source: 'srd-5.2.1',
  },

  // ─── Uncommon (7) ──────────────────────────────────────────────────
  {
    id: 'potion-d-amitie-avec-les-animaux',
    name: { fr: "Potion d'amitié avec les animaux", en: 'Potion of Animal Friendship' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Lorsque vous buvez cette potion, vous pouvez lancer le sort amitié avec les animaux au 3ᵉ niveau (DD de sauvegarde 13).\n\nAgiter ce liquide trouble permet de distinguer les menus objets qui y flottent : écaille de poisson, plume de colibri, griffe de chat, poil d'écureuil.",
      en: 'When you drink this potion, you can cast the level 3 version of the Animal Friendship spell (save DC 13).\n\nAgitating this potion’s muddy liquid brings little bits into view: a fish scale, a hummingbird feather, a cat claw, or a squirrel hair.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'potion-d-agrandissement',
    name: { fr: "Potion d'agrandissement", en: 'Potion of Growth' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Lorsque vous buvez cette potion, vous recevez l'effet « agrandissement » du sort agrandissement/rapetissement pendant 10 minutes (aucune Concentration requise).\n\nLa partie rouge du liquide de la potion se dilate et se contracte en boucle, d'une petite perle colorant le liquide incolore et vice-versa. Le processus ne s'interrompt pas, même quand on secoue la bouteille.",
      en: 'When you drink this potion, you gain the "enlarge" effect of the Enlarge/Reduce spell for 10 minutes (no Concentration required).\n\nThe red in the potion’s liquid continuously expands from a tiny bead to color the clear liquid around it and then contracts. Shaking the bottle fails to interrupt this process.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'potion-de-force-de-geant',
    name: { fr: 'Potion de force de géant (collines)', en: 'Potion of Giant Strength (hill)' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: 'Lorsque vous buvez cette potion, votre valeur de Force change pendant 1 heure. Le type de géant détermine cette valeur (cf. table ci-dessous). Si votre Force est déjà supérieure ou égale à la valeur octroyée par la potion, celle-ci n’a aucun effet sur vous.\n\nCe liquide transparent contient un éclat de lumière flottant qui évoque l’ongle d’un géant.\n\nPotion de force de géant (collines) : Force 21 — Peu courante.\n(Les variantes givre/pierres, feu, nuages et tempêtes existent en raretés Rare à Légendaire et sont hors scope de cette entrée.)',
      en: 'When you drink this potion, your Strength score changes for 1 hour. The type of giant determines the score (see the table below). The potion has no effect on you if your Strength is equal to or greater than that score.\n\nThis potion’s transparent liquid has floating in it a sliver of light resembling a giant’s fingernail.\n\nPotion of Giant Strength (hill): Strength 21 — Uncommon.\n(The frost/stone, fire, cloud, and storm variants exist at Rare through Legendary rarities and are out of scope for this entry.)',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'potion-de-guerison-importante',
    name: { fr: 'Potion de guérison (importante)', en: 'Potion of Healing (greater)' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: 'Vous récupérez 4d4 + 4 points de vie en buvant cette potion. Quelle que soit la puissance de la potion, son liquide rouge étincelle lorsqu’on l’agite.',
      en: 'You regain 4d4 + 4 Hit Points when you drink this potion. Whatever its potency, the potion’s red liquid glimmers when agitated.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // Slug `potion-de-poison` conservé byte-identique (stabilité référentielle) ;
    // `name.fr` aligné sur la traduction officielle WotC FR « Potion toxique ».
    id: 'potion-de-poison',
    name: { fr: 'Potion toxique', en: 'Potion of Poison' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Cette décoction a l'apparence, l'odeur et le goût d'une potion de guérison ou d'une autre potion bénéfique. Il s'agit toutefois d'un poison masqué par quelque illusion magique. Le sort identification révèle sa véritable nature.\n\nSi vous en buvez le contenu, vous subissez 4d6 dégâts de poison et devez réussir un jet de sauvegarde de Constitution DD 13 sous peine de subir l'état Empoisonné pendant 1 heure.",
      en: 'This concoction looks, smells, and tastes like a Potion of Healing or another beneficial potion. However, it is actually poison masked by illusion magic. Identify reveals its true nature.\n\nIf you drink this potion, you take 4d6 Poison damage and must succeed on a DC 13 Constitution saving throw or have the Poisoned condition for 1 hour.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'potion-de-resistance',
    name: { fr: 'Potion de résistance', en: 'Potion of Resistance' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: 'Lorsque vous buvez cette potion, vous recevez la Résistance à un type de dégâts pendant 1 heure. Le MJ en choisit le type ou le détermine aléatoirement selon la table suivante.\n\n1d10 — Type de dégâts : 1 Acide, 2 Feu, 3 Force, 4 Foudre, 5 Froid, 6 Nécrotiques, 7 Poison, 8 Psychiques, 9 Radiants, 10 Tonnerre.',
      en: 'When you drink this potion, you have Resistance to one type of damage for 1 hour. The GM chooses the type or determines it randomly by rolling on the following table.\n\n1d10 — Damage Type: 1 Acid, 2 Cold, 3 Fire, 4 Force, 5 Lightning, 6 Necrotic, 7 Poison, 8 Psychic, 9 Radiant, 10 Thunder.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'potion-de-respiration-aquatique',
    name: { fr: 'Potion de respiration aquatique', en: 'Potion of Water Breathing' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Vous pouvez respirer sous l'eau pendant 24 heures après avoir bu cette potion.\n\nCe liquide vert laiteux, dans lequel flotte une bulle aux allures de méduse (acalèphe), dégage des senteurs marines.",
      en: 'You can breathe underwater for 24 hours after drinking this potion.\n\nThis potion’s cloudy green fluid smells of the sea and has a jellyfish-like bubble floating in it.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
];

export const SRD_MAGIC_ITEMS_POTIONS_COUNTS = {
  total: SRD_MAGIC_ITEMS_POTIONS.length,
  common: SRD_MAGIC_ITEMS_POTIONS.filter((i) => i.rarity === 'common').length,
  uncommon: SRD_MAGIC_ITEMS_POTIONS.filter((i) => i.rarity === 'uncommon').length,
} as const;
