/**
 * SRD CC v5.2.1 — Potions ≥ Rare (10 entrées).
 *
 * Batch D29.4 (backfill EN des magic-items grandfathered AideDD).
 *
 * Sources verbatim :
 *   - EN : `content-sources/extracted/raw/SRD_CC_v5.2.1.txt`
 *     (section "Magic Items A–Z", potions lignes 23671–23845)
 *   - FR : `content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt`
 *     (section "Objets magiques de A à Z", potions lignes 28087–28217)
 *
 * Comme D29.1→D29.3, on **remplace l'entrée grandfathered intégralement** par
 * la version officielle SRD 5.2.1 bilingue. Le module C.1 (`srd-magic-items-
 * potions.ts`) couvre les potions Common + Uncommon ; ce module D29.4 couvre les
 * potions ≥ Rare restantes (7 rare + 3 very rare). Aucun slug en commun avec C.1.
 *
 * Corrections issues du SRD :
 *   - `rarity` : la **Potion d'invisibilité** était `very rare` dans le bundle
 *     (héritage AideDD/2014). Le SRD 5.2.1 la classe **Rare** dans les DEUX
 *     éditions (EN « Potion, Rare » l. 23775 ; FR « Potion, rare » l. 28106).
 *     Corrigée vers `rare`.
 *   - `name.fr` : aucun drift — les 10 noms FR du bundle correspondent déjà à la
 *     traduction officielle WotC FR (vérifié l. 28097–28207). Slugs `id`
 *     préservés byte-identique.
 *   - `magicDescription` : reformulé sur la VF officielle SRD (le bundle portait
 *     la formulation AideDD divergente).
 *
 * Hors scope (item non-SRD, à signaler à Adrien) : la « Potion de souffle
 * enflammé » (uncommon) du bundle est un héritage AideDD/2014 — « Potion of Fire
 * Breath » est **absente du SRD 5.2.1** (ni EN ni FR). Pas de source verbatim →
 * non backfillée. Reste sans `name.en` jusqu'à arbitrage.
 *
 * Conventions (identiques aux modules D29.1→D29.3) : hyphénations de fin de ligne
 * et artefacts de saut de page retirés (la VF l. 28129 portait « r equ i se » →
 * « requise ») ; apostrophes FR en ASCII, EN verbatim SRD (quotes courbes) ;
 * `\n\n` entre paragraphe mécanique et paragraphe d'apparence.
 */

import type { SrdMagicItemEntry } from './srd-magic-items-potions';

export const SRD_MAGIC_ITEMS_POTIONS_RARE: SrdMagicItemEntry[] = [
  // ─── Rare (7) ──────────────────────────────────────────────────────────
  {
    id: 'potion-de-clairvoyance',
    name: { fr: 'Potion de clairvoyance', en: 'Potion of Clairvoyance' },
    category: 'gear',
    rarity: 'rare',
    attunement: false,
    magicDescription: {
      fr: "Lorsque vous buvez cette potion, vous recevez l'effet du sort clairvoyance (aucune Concentration requise).\n\nLe globe oculaire qui flotte dans ce liquide jaunâtre disparaît quand la potion est ouverte.",
      en: 'When you drink this potion, you gain the effect of the Clairvoyance spell (no Concentration required).\n\nAn eyeball bobs in this potion’s yellowish liquid but vanishes when the potion is opened.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'potion-de-diminution',
    name: { fr: 'Potion de diminution', en: 'Potion of Diminution' },
    category: 'gear',
    rarity: 'rare',
    attunement: false,
    magicDescription: {
      fr: "Lorsque vous buvez cette potion, vous recevez l'effet « rapetissement » du sort agrandissement/rapetissement pendant 1d4 heures (aucune Concentration requise).\n\nLa partie rouge du liquide de la potion se contracte continuellement en une boule minuscule, puis se dilate pour colorer le fluide incolore qui l'entoure. Le processus ne s'interrompt pas, même quand on secoue la bouteille.",
      en: 'When you drink this potion, you gain the “reduce” effect of the Enlarge/Reduce spell for 1d4 hours (no Concentration required).\n\nThe red in the potion’s liquid continuously contracts to a tiny bead and then expands to color the clear liquid around it. Shaking the bottle fails to interrupt this process.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'potion-de-forme-gazeuse',
    name: { fr: 'Potion de forme gazeuse', en: 'Potion of Gaseous Form' },
    category: 'gear',
    rarity: 'rare',
    attunement: false,
    magicDescription: {
      fr: "Lorsque vous buvez cette potion, vous recevez l'effet du sort forme gazeuse pendant 1 heure (aucune Concentration requise) ou jusqu'à ce que vous mettiez fin à cet effet par une action Bonus.\n\nLe récipient de cette potion semble contenir du brouillard dont la fluidité est cependant celle de l'eau.",
      en: 'When you drink this potion, you gain the effect of the Gaseous Form spell for 1 hour (no Concentration required) or until you end the effect as a Bonus Action.\n\nThis potion’s container seems to hold fog that moves and pours like water.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'potion-d-heroisme',
    name: { fr: "Potion d'héroïsme", en: 'Potion of Heroism' },
    category: 'gear',
    rarity: 'rare',
    attunement: false,
    magicDescription: {
      fr: "Lorsque vous buvez cette potion, vous recevez 10 points de vie temporaires qui persistent 1 heure. Pendant cette heure, vous êtes sous l'effet du sort bénédiction (aucune Concentration requise).\n\nCe liquide bleu bouillonne et fume comme s'il était en ébullition.",
      en: 'When you drink this potion, you gain 10 Temporary Hit Points that last for 1 hour. For the same duration, you are under the effect of the Bless spell (no Concentration required).\n\nThis potion’s blue liquid bubbles and steams as if boiling.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'potion-d-invisibilite',
    name: { fr: "Potion d'invisibilité", en: 'Potion of Invisibility' },
    category: 'gear',
    rarity: 'rare',
    attunement: false,
    magicDescription: {
      fr: "Le récipient de cette potion paraît vide, tout en donnant étrangement l'impression de contenir un liquide. Lorsque vous buvez la potion, vous recevez l'état Invisible pendant 1 heure. Cet effet prend fin prématurément si vous effectuez un jet d'attaque, infligez des dégâts ou lancez un sort.",
      en: 'This potion’s container looks empty but feels as though it holds liquid. When you drink the potion, you have the Invisible condition for 1 hour. The effect ends early if you make an attack roll, deal damage, or cast a spell.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'potion-d-invulnerabilite',
    name: { fr: "Potion d'invulnérabilité", en: 'Potion of Invulnerability' },
    category: 'gear',
    rarity: 'rare',
    attunement: false,
    magicDescription: {
      fr: 'Pendant 1 minute après avoir bu cette potion, vous bénéficiez de la Résistance à tous les dégâts.\n\nCe liquide sirupeux ressemble à du fer liquide.',
      en: 'For 1 minute after you drink this potion, you have Resistance to all damage.\n\nThis potion’s syrupy liquid looks like liquefied iron.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'potion-de-lecture-des-pensees',
    name: { fr: 'Potion de lecture des pensées', en: 'Potion of Mind Reading' },
    category: 'gear',
    rarity: 'rare',
    attunement: false,
    magicDescription: {
      fr: "Lorsque vous buvez cette potion, vous recevez l'effet du sort détection des pensées (DD de sauvegarde 13) pendant 10 minutes (aucune Concentration requise).\n\nDans ce liquide dense et pourpre flotte un nuage ovoïde et rose.",
      en: 'When you drink this potion, you gain the effect of the Detect Thoughts spell (save DC 13) for 10 minutes (no Concentration required).\n\nThis potion’s dense, purple liquid has an ovoid cloud of pink floating in it.',
    },
    description: null,
    source: 'srd-5.2.1',
  },

  // ─── Very rare (3) ─────────────────────────────────────────────────────
  {
    id: 'potion-de-vol',
    name: { fr: 'Potion de vol', en: 'Potion of Flying' },
    category: 'gear',
    rarity: 'very rare',
    attunement: false,
    magicDescription: {
      fr: "Lorsque vous buvez cette potion, vous recevez une Vitesse de vol égale à votre Vitesse pendant 1 heure et pouvez évoluer en vol stationnaire. Si vous êtes en vol au moment où la potion cesse de faire effet, vous tombez si vous ne disposez d'aucun autre moyen de vous maintenir dans les airs.\n\nLe liquide translucide de cette potion flotte dans la partie supérieure du récipient, troublé par des impuretés blanches.",
      en: 'When you drink this potion, you gain a Fly Speed equal to your Speed for 1 hour and can hover. If you’re in the air when the potion wears off, you fall unless you have some other means of staying aloft.\n\nThis potion’s clear liquid floats at the top of its container and has cloudy white impurities drifting in it.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'potion-de-vitesse',
    name: { fr: 'Potion de vitesse', en: 'Potion of Speed' },
    category: 'gear',
    rarity: 'very rare',
    attunement: false,
    magicDescription: {
      fr: "Lorsque vous buvez cette potion, vous recevez l'effet du sort hâte pendant 1 minute (aucune Concentration requise) sans subir la vague de léthargie qui survient habituellement à la fin de l'effet.\n\nLe liquide jaune de la potion, strié de noir, tourbillonne sans qu'on l'agite.",
      en: 'When you drink this potion, you gain the effect of the Haste spell for 1 minute (no Concentration required) without suffering the wave of lethargy that typically occurs when the effect ends.\n\nThis potion’s yellow fluid is streaked with black and swirls on its own.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'potion-de-vitalite',
    name: { fr: 'Potion de vitalité', en: 'Potion of Vitality' },
    category: 'gear',
    rarity: 'very rare',
    attunement: false,
    magicDescription: {
      fr: "Lorsque vous buvez cette potion, elle supprime tous vos niveaux d'Épuisement et met fin à l'éventuel état Empoisonné qui vous affecte. Pendant 24 heures, vous récupérez le maximum de points de vie pour chaque dé de vie dépensé.\n\nCe liquide cramoisi palpite régulièrement d'une lueur sourde, tel un battement de cœur.",
      en: 'When you drink this potion, it removes any Exhaustion levels you have and ends the Poisoned condition on you. For the next 24 hours, you regain the maximum number of Hit Points for any Hit Point Die you spend.\n\nThis potion’s crimson liquid regularly pulses with dull light, calling to mind a heartbeat.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
];

/** Compteurs figés (parse strict côté merge script). */
export const SRD_MAGIC_ITEMS_POTIONS_RARE_COUNTS = {
  total: SRD_MAGIC_ITEMS_POTIONS_RARE.length,
  rare: SRD_MAGIC_ITEMS_POTIONS_RARE.filter((e) => e.rarity === 'rare').length,
  veryRare: SRD_MAGIC_ITEMS_POTIONS_RARE.filter((e) => e.rarity === 'very rare').length,
} as const;
