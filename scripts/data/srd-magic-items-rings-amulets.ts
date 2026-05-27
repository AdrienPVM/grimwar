/**
 * SRD CC v5.2.1 — Anneaux + amulettes/colliers/médaillon Common + Uncommon
 * (9 entrées).
 *
 * Sources verbatim :
 *   - EN : `content-sources/extracted/raw/SRD_CC_v5.2.1.txt`
 *     (section "Magic Items A–Z", ligne 20866)
 *   - FR : `content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt`
 *     (section "Objets magiques de A à Z", ligne 24359)
 *
 * Cf. plan `plans/C-magic-items-srd-common-uncommon.md` (tracer-bullet C.3).
 *
 * Scope C.3 :
 *   - 5 anneaux Uncommon : saut, barrière mentale, nage, chaleur constante,
 *     marche sur l'eau.
 *   - 4 wondrous "cou" Uncommon : Amulette d'antidétection, Amulette de
 *     cicatrisation, Collier d'adaptation, Médaillon des pensées.
 *
 * **Périapt de bonne santé (Periapt of Health) DIFFÉRÉ** : collision de slug
 * avec l'entrée AideDD grandfathered `amulette-de-sante` (uncommon, mécanique
 * "immunité aux maladies" — non-SRD). Le SRD officiel a 2 amulettes de santé :
 *   - "Amulette de bonne santé" (uncommon, Periapt of Health, 2d4+2 hp)
 *   - "Amulette de santé" (rare, Amulet of Health, Constitution = 19)
 *
 * Le bundle baseline AideDD a swappé les noms ET ajouté un homebrew "immunité
 * maladies" — résolution propre nécessite un cleanup global non-trivial
 * (tracker DEBT.md > D24).
 *
 * Politique :
 *   - Slugs préservés byte-identique aux entrées grandfathered.
 *   - `name.fr` aligné sur la traduction officielle WotC FR du SRD FR 5.2.1.
 *   - `magicDescription` reprend intégralement la formulation officielle SRD FR.
 *   - `attunement` aligné sur SRD (drift baseline corrigé là où nécessaire).
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

export const SRD_MAGIC_ITEMS_RINGS_AMULETS: SrdMagicItemEntry[] = [
  // ─── Anneaux Uncommon (5) ──────────────────────────────────────────
  {
    id: 'anneau-de-barriere-mentale',
    name: { fr: 'Anneau de barrière mentale', en: 'Ring of Mind Shielding' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: true,
    magicDescription: {
      fr: "Tant que vous portez cet anneau, vous êtes immunisé contre toute magie permettant à une autre créature de lire vos pensées, de déterminer si vous mentez, de connaître votre alignement ou de découvrir votre type de créature. Les créatures ne peuvent communiquer par télépathie avec vous que si vous les y autorisez.\n\nVous pouvez entreprendre l'action Magie pour que l'anneau devienne imperceptible jusqu'à ce que vous le rendiez à nouveau perceptible au prix d'une autre action Magie (ou que vous retiriez l'anneau, ou encore que vous mouriez).\n\nSi vous mourez en portant l'anneau, votre âme vient l'habiter, à moins qu'il abrite déjà une autre âme. Vous pouvez choisir de demeurer dans l'anneau ou de partir pour l'au-delà. Tant que votre âme réside dans l'anneau, vous pouvez communiquer par télépathie avec la créature qui le porte. Le porteur ne peut rien faire pour empêcher cette communication télépathique.",
      en: "While wearing this ring, you are immune to magic that allows other creatures to read your thoughts, determine whether you are lying, know your alignment, or know your creature type. Creatures can telepathically communicate with you only if you allow it.\n\nYou can take a Magic action to cause the ring to become imperceptible until you take another Magic action to make it perceptible, until you remove the ring, or until you die.\n\nIf you die while wearing the ring, your soul enters it, unless it already houses a soul. You can remain in the ring or depart for the afterlife. As long as your soul is in the ring, you can telepathically communicate with any creature wearing it. A wearer can't prevent this telepathic communication.",
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'anneau-de-chaleur-constante',
    name: { fr: 'Anneau de chaleur constante', en: 'Ring of Warmth' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: true,
    magicDescription: {
      fr: "Si vous subissez des dégâts de froid alors que vous portez l'anneau, il réduit ces dégâts de 2d8.\n\nEn outre et tant que vous portez cet anneau, vous-même et tout ce que vous portez êtes insensibles aux effets délétères des températures inférieures ou égales à –18 °C.",
      en: 'If you take Cold damage while wearing this ring, the ring reduces the damage you take by 2d8.\n\nIn addition, while wearing this ring, you and everything you wear and carry are unharmed by temperatures of 0 degrees Fahrenheit or lower.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'anneau-de-marche-sur-l-eau',
    name: { fr: "Anneau de marche sur l'eau", en: 'Ring of Water Walking' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Tant que vous portez cet anneau, vous lancez marche sur l'onde par son biais, en ne ciblant que vous-même.",
      en: 'While wearing this ring, you cast Water Walk from it, targeting only yourself.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'anneau-de-nage',
    name: { fr: 'Anneau de nage', en: 'Ring of Swimming' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Tant que vous portez cet anneau, vous disposez d'une Vitesse de nage de 12 m.",
      en: 'You have a Swim Speed of 40 feet while wearing this ring.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'anneau-de-saut',
    name: { fr: 'Anneau de saut', en: 'Ring of Jumping' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: true,
    magicDescription: {
      fr: "Tant que vous portez cet anneau, vous pouvez lancer saut par son intermédiaire, mais vous ne pouvez cibler que vous-même.",
      en: 'While wearing this ring, you can cast Jump from it, but can target only yourself when you do so.',
    },
    description: null,
    source: 'srd-5.2.1',
  },

  // ─── Amulettes + Collier + Médaillon (4) ──────────────────────────
  {
    id: 'amulette-d-antidetection',
    name: { fr: "Amulette d'antidétection", en: 'Amulet of Proof against Detection and Location' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: true,
    magicDescription: {
      fr: "Tant que vous portez cette amulette, vous ne pouvez ni être la cible d'un sort de divination ni perçu par un capteur de scrutation, sauf si vous le permettez.",
      en: "While wearing this amulet, you can't be targeted by Divination spells or perceived through magical scrying sensors unless you allow it.",
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'amulette-de-cicatrisation',
    name: { fr: 'Amulette de cicatrisation', en: 'Periapt of Wound Closure' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: true,
    magicDescription: {
      fr: "Tant que vous portez ce pendentif, vous recevez les bénéfices ci-après.\n\nPréservation de la vie. Chaque fois que vous effectuez un jet de sauvegarde contre la mort, vous pouvez transformer un résultat de 9 ou moins en 10, transformant ainsi un échec en réussite.\n\nStimulation de la guérison. Chaque fois que vous lancez un dé de vie pour récupérer des points de vie, vous doublez le nombre de points de vie que ce dé vous octroie.",
      en: 'While wearing this pendant, you gain the following benefits.\n\nLife Preservation. Whenever you make a Death Saving Throw, you can change a roll of 9 or lower to a 10, turning a failed save into a successful one.\n\nNatural Healing Boost. Whenever you roll a Hit Point Die to regain Hit Points, double the number of Hit Points it restores.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'collier-d-adaptation',
    name: { fr: "Collier d'adaptation", en: 'Necklace of Adaptation' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: true,
    magicDescription: {
      fr: "Tant que vous portez ce collier, vous pouvez respirer normalement dans n'importe quel environnement et bénéficiez de l'Avantage aux jets de sauvegarde visant à éviter l'état Empoisonné ou à y mettre fin.",
      en: 'While wearing this necklace, you can breathe normally in any environment, and you have Advantage on saving throws made to avoid or end the Poisoned condition.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'medaillon-des-pensees',
    name: { fr: 'Médaillon des pensées', en: 'Medallion of Thoughts' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: true,
    magicDescription: {
      fr: "Le médaillon dispose de 5 charges. Tant que vous le portez, vous pouvez dépenser 1 charge pour lancer détection des pensées (DD de sauvegarde 13) par son biais. Le médaillon récupère quotidiennement 1d4 charges dépensées, à l'aube.",
      en: 'The medallion has 5 charges. While wearing it, you can expend 1 charge to cast Detect Thoughts (save DC 13) from it. The medallion regains 1d4 expended charges daily at dawn.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
];

export const SRD_MAGIC_ITEMS_RINGS_AMULETS_COUNTS = {
  total: SRD_MAGIC_ITEMS_RINGS_AMULETS.length,
  common: SRD_MAGIC_ITEMS_RINGS_AMULETS.filter((i) => i.rarity === 'common').length,
  uncommon: SRD_MAGIC_ITEMS_RINGS_AMULETS.filter((i) => i.rarity === 'uncommon').length,
} as const;
