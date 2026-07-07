/**
 * SRD CC v5.2.1 — Consommables (huiles, élixirs, colle/solvant) — 6 entrées.
 *
 * Batch D29.15 (backfill EN des magic-items grandfathered AideDD).
 *
 * Sources verbatim :
 *   - EN : `content-sources/extracted/raw/SRD_CC_v5.2.1.txt`
 *     (Elixir of Health l. 22045, Oil of Etherealness l. 23500, Oil of Sharpness
 *     l. 23510, Potion of Longevity l. 23787, Sovereign Glue l. 24616, Universal
 *     Solvent l. 25274)
 *   - FR : `content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt`
 *     (Colle universelle l. 26349, Élixir de jouvence l. 26538, Élixir de santé
 *     l. 26551, Huile éthérée l. 27236, Huile d'affûtage l. 27248, Solvant
 *     universel l. 28957)
 *
 * Correspondance de nom notable : `elixir-de-jouvence` = **Potion of Longevity**
 * (FR officiel « Élixir de jouvence » l. 26538).
 *
 * Aucun drift : les 6 sont sans Harmonisation dans les deux éditions et leurs
 * raretés (rare / très rare / légendaire) sont déjà conformes au bundle. Backfill
 * EN + reformulation FR sur la VF officielle SRD.
 *
 * Conventions (identiques aux modules D29.1→D29.14) : hyphénations retirées ;
 * apostrophes FR en ASCII, EN verbatim SRD (quotes courbes) ; `\n\n` entre blocs.
 */

import type { SrdMagicItemEntry } from './srd-magic-items-potions';

export const SRD_MAGIC_ITEMS_CONSUMABLES: SrdMagicItemEntry[] = [
  {
    id: 'huile-etheree',
    name: { fr: 'Huile éthérée', en: 'Oil of Etherealness' },
    category: 'gear',
    rarity: 'rare',
    attunement: false,
    magicDescription: {
      fr: "Une fiole de cette huile suffit à enduire une créature de taille M ou inférieure, ainsi que tout l'équipement qu'elle porte (une fiole supplémentaire est nécessaire pour chaque catégorie de taille au-dessus de M). L'application de l'huile prend 10 minutes. La créature ointe reçoit l'effet du sort forme éthérée pendant 1 heure.\n\nDes gouttes perlées se forment sur la paroi extérieure de ce récipient rempli d'une huile grisâtre et trouble, et s'évaporent rapidement.",
      en: 'One vial of this oil can cover one Medium or smaller creature, along with the equipment it’s wearing and carrying (one additional vial is required for each size category above Medium). Applying the oil takes 10 minutes. The affected creature then gains the effect of the Etherealness spell for 1 hour.\n\nBeads of this cloudy, gray oil form on the outside of its container and quickly evaporate.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'huile-d-affutage',
    name: { fr: "Huile d'affûtage", en: 'Oil of Sharpness' },
    category: 'gear',
    rarity: 'very rare',
    attunement: false,
    magicDescription: {
      fr: "Une fiole de cette huile peut enduire une arme de corps à corps ou vingt projectiles, sachant que seules les munitions et les armes de corps à corps non magiques infligeant des dégâts perforants ou tranchants sont affectées. L'application de l'huile prend 1 minute, après quoi l'huile s'infiltre magiquement dans ce qu'elle recouvre, ce qui transforme l'arme enduite en arme +3 (les munitions enduites en projectiles +3).\n\nDans cette huile incolore et gélatineuse scintillent de minuscules paillettes d'argent.",
      en: 'One vial of this oil can coat one Melee weapon or twenty pieces of ammunition, but only ammunition and Melee weapons that are nonmagical and deal Slashing or Piercing damage are affected. Applying the oil takes 1 minute, after which the oil magically seeps into whatever it coats, turning the coated weapon into a +3 Weapon or the coated ammunition into +3 Ammunition.\n\nThis clear, gelatinous oil sparkles with tiny, ultrathin silver shards.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'elixir-de-sante',
    name: { fr: 'Élixir de santé', en: 'Elixir of Health' },
    category: 'gear',
    rarity: 'rare',
    attunement: false,
    magicDescription: {
      fr: "Boire cette potion vous guérit de toute contagion magique. Les états ci-après prennent en outre fin pour vous : Assourdi, Aveuglé, Empoisonné et Paralysé.\n\nCe liquide rouge limpide est constellé de petites bulles de lumière.",
      en: 'When you drink this potion, you are cured of all magical contagions. In addition, the following conditions end on you: Blinded, Deafened, Paralyzed, and Poisoned.\n\nThe clear, red liquid has tiny bubbles of light in it.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // elixir-de-jouvence = Potion of Longevity (FR officiel « Élixir de jouvence »).
    id: 'elixir-de-jouvence',
    name: { fr: 'Élixir de jouvence', en: 'Potion of Longevity' },
    category: 'gear',
    rarity: 'very rare',
    attunement: false,
    magicDescription: {
      fr: "Lorsque vous buvez cet élixir, votre âge physique diminue de 1d6 + 6 ans, jusqu'à un minimum de 13 ans. Chaque fois que vous ingérez un élixir de jouvence au-delà du premier, il y a 10 % de chances cumulatives que vous vieillissiez au contraire de 1d6 + 6 ans.\n\nUn minuscule cœur en suspension dans ce liquide ambré bat encore, contre toute logique. Ces ingrédients disparaissent à l'ouverture de la potion.",
      en: 'When you drink this potion, your physical age is reduced by 1d6 + 6 years, to a minimum of 13 years. Each time you subsequently drink a Potion of Longevity, there is 10 percent cumulative chance that you instead age by 1d6 + 6 years.\n\nSuspended in this amber liquid is a tiny heart that, against all reason, is still beating. These ingredients vanish when the potion is opened.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'colle-universelle',
    name: { fr: 'Colle universelle', en: 'Sovereign Glue' },
    category: 'gear',
    rarity: 'legendary',
    attunement: false,
    magicDescription: {
      fr: "Cette substance visqueuse d'un blanc laiteux permet de créer un lien adhésif permanent entre deux objets. Cette colle doit être stockée dans un pot ou une flasque dont on a préalablement enduit l'intérieur d'huile d'insaisissabilité. Lorsqu'on le découvre, un tel récipient contient 1d6 + 1 doses de 30 grammes.\n\nUne dose de colle suffit à couvrir une surface carrée de 30 cm de côté. L'application d'une dose de colle universelle requiert l'action Utilisation, sachant que la colle met 1 minute à sécher. Après cela, le lien qu'elle crée ne peut être défait que par l'application de solvant universel, d'huile éthérée ou par le sort souhait.",
      en: 'This viscous, milky-white substance can form a permanent adhesive bond between any two objects. It must be stored in a jar or flask that has been coated inside with Oil of Slipperiness. When found, a container contains 1d6 + 1 ounces.\n\nOne ounce of the glue can cover a 1-foot square surface. Applying an ounce of Sovereign Glue takes a Utilize action, and the applied glue takes 1 minute to set. Once it has done so, the bond it creates can be broken only by the application of Universal Solvent or Oil of Etherealness, or with a Wish spell.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'solvant-universel',
    name: { fr: 'Solvant universel', en: 'Universal Solvent' },
    category: 'gear',
    rarity: 'legendary',
    attunement: false,
    magicDescription: {
      fr: "Ce tube contient un liquide laiteux qui dégage une forte odeur d'alcool. Lorsqu'on le découvre, un tel récipient contient 1d6 + 1 doses de 30 g.\n\nVous pouvez entreprendre l'action Utilisation pour verser une ou plusieurs doses sur une surface à portée d'allonge. Le liquide dissout instantanément jusqu'à 30 x 30 cm d'adhésif qu'il touche, y compris de la colle universelle.",
      en: 'This tube holds milky liquid with a strong alcohol smell. When found, a tube contains 1d6 + 1 ounces.\n\nYou can take a Utilize action to pour 1 or more ounces of solvent from the tube onto a surface within reach. Each ounce instantly dissolves up to 1 square foot of adhesive it touches, including Sovereign Glue.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
];

/** Compteurs figés (parse strict côté merge script). */
export const SRD_MAGIC_ITEMS_CONSUMABLES_COUNTS = {
  total: SRD_MAGIC_ITEMS_CONSUMABLES.length,
  rare: SRD_MAGIC_ITEMS_CONSUMABLES.filter((e) => e.rarity === 'rare').length,
  veryRare: SRD_MAGIC_ITEMS_CONSUMABLES.filter((e) => e.rarity === 'very rare').length,
  legendary: SRD_MAGIC_ITEMS_CONSUMABLES.filter((e) => e.rarity === 'legendary').length,
  attuned: SRD_MAGIC_ITEMS_CONSUMABLES.filter((e) => e.attunement !== false).length,
} as const;
