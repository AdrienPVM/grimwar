/**
 * SRD CC v5.2.1 — Reliquat Common + Uncommon (8 entrées) — CLÔTURE C.
 *
 * Sources verbatim :
 *   - EN : `content-sources/extracted/raw/SRD_CC_v5.2.1.txt`
 *   - FR : `content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt`
 *
 * Cf. plan `plans/C-magic-items-srd-common-uncommon.md` (tracer-bullet C.7
 * — clôture).
 *
 * Scope C.7 (reliquat) :
 *   - 1 catégorie spéciale : Parchemin de sort (Common/Uncommon variants).
 *   - 5 wondrous uncommon : Corde d'ascension, Éventail enchanté, Pierre
 *     porte-bonheur, Pierres messagères (NOUVEAU), Sceptre inamovible.
 *   - 2 potions uncommon : Huile d'insaisissabilité, Philtre d'amour.
 *
 * Politique :
 *   - Slugs préservés byte-identique (7 remplacements + 1 nouveau `pierres-messageres`).
 *   - `name.fr` aligné sur SRD FR officiel ; drift sur "Corde d'escalade" corrigé.
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

export const SRD_MAGIC_ITEMS_RELIQUAT: SrdMagicItemEntry[] = [
  {
    // Parchemin de sort — Common pour sort mineur/L1 ; Uncommon pour L2-3.
    // On garde le slug stable `parchemin-de-sort` tagué `common` (la version
    // de base la plus courante). Le détail des raretés par niveau est dans
    // la description.
    id: 'parchemin-de-sort',
    name: { fr: 'Parchemin de sort', en: 'Spell Scroll' },
    category: 'gear',
    rarity: 'common',
    attunement: false,
    magicDescription: {
      fr: "Un parchemin de sort renferme la formule d'un sort unique, rédigée dans un code ésotérique. Si ce sort figure dans votre liste de sorts, vous pouvez lire le parchemin pour en lancer le sort sans composantes matérielles. Sans cela, le parchemin reste illisible. Lancer le sort par le biais du parchemin requiert le temps d'incantation normal. Une fois le sort lancé, le parchemin tombe en poussière. Si l'incantation est interrompue, le parchemin n'est pas perdu.\n\nSi le sort figure bien dans votre liste, mais qu'il est d'un niveau supérieur à ce que vous pouvez normalement lancer, vous effectuez un test de caractéristique avec votre caractéristique d'incantation pour savoir si vous parvenez à le lancer. Le DD est égal à 10 + le niveau du sort. En cas d'échec, le sort s'efface du parchemin et il ne se passe rien d'autre.\n\nRareté par niveau : Sort mineur/L1 → courant, DD 13, +5 ; L2-3 → peu courant, DD 13-15, +5/+7 ; L4-5 → rare, DD 15-17, +7/+9 ; L6-8 → très rare ; L9 → légendaire.\n\nCopier un parchemin dans un grimoire : un sort de Magicien peut être copié dans un grimoire — test d'Intelligence (Arcanes) DD 10 + niveau du sort. Le parchemin est détruit dans tous les cas.",
      en: 'A Spell Scroll bears the words of a single spell, written in a mystical cipher. If the spell is on your spell list, you can read the scroll and cast its spell without Material components. Otherwise, the scroll is unintelligible. Casting the spell by reading the scroll requires the spell\'s normal casting time. Once the spell is cast, the scroll crumbles to dust. If the casting is interrupted, the scroll isn\'t lost.\n\nIf the spell is on your spell list but of a higher level than you can normally cast, you make an ability check using your spellcasting ability. The DC equals 10 plus the spell\'s level. On a failed check, the spell disappears from the scroll with no other effect.\n\nRarity by level: Cantrip/L1 → Common, DC 13, +5 ; L2-3 → Uncommon, DC 13-15, +5/+7 ; L4-5 → Rare, DC 15-17, +7/+9 ; L6-8 → Very Rare ; L9 → Legendary.\n\nCopying a Scroll into a Spellbook: a Wizard spell can be copied into a spellbook — Intelligence (Arcana) check DC 10 + spell level. The scroll is destroyed either way.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // Drift FR : "Corde d'escalade" → "Corde d'ascension" (officiel WotC FR).
    id: 'corde-d-escalade',
    name: { fr: "Corde d'ascension", en: 'Rope of Climbing' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Cette corde de 18 m de long peut supporter jusqu'à 1 500 kg. En tenant une extrémité de la corde, vous pouvez entreprendre l'action Magie pour ordonner à l'autre extrémité de s'animer et de se déplacer vers la destination de votre choix, dans les limites de la longueur de la corde. L'extrémité animée se déplace de 3 m à votre tour la première fois et de 3 m supplémentaires au début de chacun de vos tours suivants jusqu'à avoir atteint sa destination ou que vous lui ordonniez de s'arrêter. Vous pouvez en outre ordonner à la corde de se nouer solidement à un objet, de se détacher, de passer de corde lisse à corde à nœuds (et inversement), ou de s'enrouler pour le transport.\n\nSi vous optez pour une corde à nœuds, des nœuds épais apparaissent tous les 30 cm. Sous sa forme à nœuds, la corde ne mesure plus que 15 m de long et octroie l'Avantage aux tests de caractéristique effectués pour grimper.\n\nProfil : CA 20, 20 pv, Immunité contre les dégâts psychiques et de poison. Tant qu'il lui reste au moins 1 pv, elle récupère 1 pv toutes les 5 minutes. Corde à 0 pv = détruite.",
      en: 'This 60-foot length of rope can hold up to 3,000 pounds. While holding one end of the rope, you can take a Magic action to command the other end of the rope to animate and move toward a destination you choose, up to the rope\'s length away from you. That end moves 10 feet on your turn when you first command it and 10 feet at the start of each of your subsequent turns until reaching its destination or until you tell it to stop. You can also tell the rope to fasten itself securely to an object or to unfasten itself, to knot or unknot itself, or to coil itself for carrying.\n\nIf you tell the rope to knot, large knots appear at 1-foot intervals along the rope. While knotted, the rope shortens to a 50-foot length and grants Advantage on ability checks made to climb using the rope.\n\nThe rope has AC 20, HP 20, and Immunity to Poison and Psychic damage. It regains 1 Hit Point every 5 minutes as long as it has at least 1 Hit Point. If the rope drops to 0 Hit Points, it is destroyed.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'eventail-enchante',
    name: { fr: 'Éventail enchanté', en: 'Wind Fan' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Lorsque vous tenez cet éventail, vous pouvez lancer bourrasque (DD de sauvegarde 13) par son biais. Cependant, chaque nouvelle utilisation avant l'aube suivante fragilise l'objet : les risques qu'il se désagrège augmentent de 20 % à chaque fois. Si cela se produit, il est réduit à l'état de lambeaux non magiques inutilisables.",
      en: 'While holding this fan, you can cast Gust of Wind (save DC 13) from it. Each subsequent time the fan is used before the next dawn, it has a cumulative 20 percent chance of not working; if the fan fails to work, it tears into useless, nonmagical tatters.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'huile-d-insaisissabilite',
    name: { fr: "Huile d'insaisissabilité", en: 'Oil of Slipperiness' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Une fiole de cette huile suffit à enduire une créature de taille M ou inférieure, ainsi que tout l'équipement qu'elle porte (une fiole supplémentaire est nécessaire pour chaque catégorie de taille au-dessus de M). L'application de l'huile prend 10 minutes. La créature ointe reçoit l'effet du sort liberté de mouvement pendant 8 heures.\n\nAu lieu de cela, l'huile peut être versée au sol au prix de l'action Magie, auquel cas elle couvre un carré de 3 m et reproduit l'effet du sort graisse dans cette zone pendant 8 heures.\n\nCet onguent noir et gluant, épais et lourd, s'écoule pourtant très vite.",
      en: 'Once a vial of this oil is applied to a Medium or smaller creature, along with whatever equipment it is wearing or carrying (one additional vial is required for each size category above Medium), the creature gains the effect of the Freedom of Movement spell for 8 hours. Applying the oil takes 10 minutes.\n\nAlternatively, the oil can be poured on the ground as a Magic action, where it covers a 10-foot square and replicates the effect of the Grease spell in that area for 8 hours.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'philtre-d-amour',
    name: { fr: "Philtre d'amour", en: 'Philter of Love' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "La première fois que vous voyez une créature dans les 10 minutes après avoir bu ce philtre, vous êtes séduit par cette créature et recevez l'état Charmé pendant 1 heure.\n\nCe liquide rosé effervescent contient une imperceptible bulle en forme de cœur.",
      en: 'The next time you see a creature within 10 minutes after drinking this philter, you are charmed by that creature and have the Charmed condition for 1 hour.\n\nThis rose-hued, effervescent liquid contains one easy-to-miss bubble shaped like a heart.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'pierre-porte-bonheur',
    name: { fr: 'Pierre porte-bonheur', en: 'Stone of Good Luck (Luckstone)' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: true,
    magicDescription: {
      fr: "Tant que vous portez sur vous cette agate polie, vous recevez un bonus de +1 aux tests de caractéristique et aux jets de sauvegarde.",
      en: 'While this polished agate is on your person, you gain a +1 bonus to ability checks and saving throws.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // Nouveau slug — Sending Stones absentes du bundle baseline AideDD.
    id: 'pierres-messageres',
    name: { fr: 'Pierres messagères', en: 'Sending Stones' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Les pierres messagères vont par deux, les motifs ciselés à la surface de chacune étant assortis et facilement reconnaissables. En tenant l'une des pierres, vous pouvez lancer communication à distance par son biais. La cible du sort est le porteur de l'autre pierre. Si aucune créature ne porte l'autre pierre, vous l'apprenez dès que vous cherchez à vous servir de la vôtre, et vous ne lancez pas le sort.\n\nUne fois que communication à distance est lancé par l'une des pierres, celles-ci ne peuvent plus resservir avant l'aube suivante. Si l'une des pierres de la paire est détruite, l'autre devient non magique.",
      en: 'Sending Stones come in pairs, with each stone carved to match the other so the pairing is easily recognized. While you touch one stone, you can cast Sending from it. The target is the bearer of the other stone. If no creature bears the other stone, you know that fact as soon as you use the stone, and you don\'t cast the spell.\n\nOnce Sending is cast using either stone, the stones can\'t be used again until the next dawn. If one of the stones in a pair is destroyed, the other one becomes nonmagical.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'sceptre-inamovible',
    name: { fr: 'Sceptre inamovible', en: 'Immovable Rod' },
    category: 'gear',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Ce sceptre en fer présente un poussoir à une extrémité. Consacrer l'action Utilisation à appuyer sur le poussoir a pour conséquence de figer magiquement le sceptre sur place. Jusqu'à ce que vous-même ou une autre créature consacriez l'action Utilisation à appuyer de nouveau sur le poussoir, le sceptre ne bouge pas, même si sa position défie les lois de la gravité. Le sceptre peut supporter un maximum de 4 000 kg. Un poids supérieur provoque la désactivation du sceptre et sa chute. Une créature peut consacrer l'action Utilisation à effectuer un test de Force (Athlétisme) DD 30, et déplace le sceptre figé d'un maximum de 3 m en cas de réussite.",
      en: 'This iron rod has a button on one end. You can take a Utilize action to press the button, which causes the rod to become magically fixed in place. Until you or another creature takes a Utilize action to push the button again, the rod doesn\'t move, even if it defies gravity. The rod can hold up to 8,000 pounds of weight. More weight causes the rod to deactivate and fall. A creature can take a Utilize action to make a DC 30 Strength (Athletics) check, moving the fixed rod up to 10 feet on a successful check.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
];

export const SRD_MAGIC_ITEMS_RELIQUAT_COUNTS = {
  total: SRD_MAGIC_ITEMS_RELIQUAT.length,
  common: SRD_MAGIC_ITEMS_RELIQUAT.filter((i) => i.rarity === 'common').length,
  uncommon: SRD_MAGIC_ITEMS_RELIQUAT.filter((i) => i.rarity === 'uncommon').length,
} as const;
