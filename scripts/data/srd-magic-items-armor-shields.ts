/**
 * SRD CC v5.2.1 — Armures + boucliers Common + Uncommon (4 entrées).
 *
 * Sources verbatim :
 *   - EN : `content-sources/extracted/raw/SRD_CC_v5.2.1.txt`
 *   - FR : `content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt`
 *
 * Cf. plan `plans/C-magic-items-srd-common-uncommon.md` (tracer-bullet C.5).
 *
 * Scope C.5 :
 *   - 3 remplacements (slugs existants) : Armure en adamantium, Armure de mithral,
 *     Bouclier +1.
 *   - 1 nouveau slug : Bouclier sentinelle (Sentinel Shield — SRD officiel mais
 *     absent du bundle baseline AideDD).
 *
 * Hors scope : `armure-de-matelot` (Mariner's Armor) reste grandfathered car PAS
 * dans le SRD CC v5.2.1.
 *
 * Politique :
 *   - Slugs préservés byte-identique.
 *   - `name.fr` aligné sur SRD FR officiel ; drift corrigé sur Armure d'adamantium
 *     → "Armure en adamantium".
 *   - `category: 'armor'` (le bundle existant utilise `armor` même pour les boucliers,
 *     alignement avec baseline).
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

export const SRD_MAGIC_ITEMS_ARMOR_SHIELDS: SrdMagicItemEntry[] = [
  {
    // Slug stable ; name.fr corrigé : "Armure d'adamantium" → "Armure en adamantium" (SRD FR officiel).
    id: 'armure-d-adamantium',
    name: { fr: 'Armure en adamantium', en: 'Adamantine Armor' },
    category: 'armor',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Les parties en adamantium, l'un des matériaux les plus résistants qui existent, augmentent la solidité de cette armure. Tant que vous la portez, tout Coup critique contre vous devient un coup normal.",
      en: 'This suit of armor is reinforced with adamantine, one of the hardest substances in existence. While you’re wearing it, any Critical Hit against you becomes a normal hit.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'armure-de-mithral',
    name: { fr: 'Armure de mithral', en: 'Mithral Armor' },
    category: 'armor',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Le mithral est un métal léger et souple. Une armure fabriquée dans ce matériau peut être portée sous des vêtements normaux. Si l'armure dans sa version normale impose le Désavantage aux tests de Dextérité (Discrétion) ou requiert une valeur de Force minimale, ce n'est pas le cas de la version en mithral.",
      en: "Mithral is a light, flexible metal. Armor made of this substance can be worn under normal clothes. If the armor normally imposes Disadvantage on Dexterity (Stealth) checks or has a Strength requirement, the mithral version of the armor doesn't.",
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'bouclier-1-2-ou-3',
    name: { fr: 'Bouclier +1, +2 ou +3', en: 'Shield, +1, +2, or +3' },
    category: 'armor',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Tant que vous tenez ce bouclier, vous bénéficiez à la classe d'armure d'un bonus déterminé par la rareté du bouclier, en plus du bonus normal du bouclier à la CA.",
      en: 'While holding this Shield, you have a bonus to Armor Class determined by the Shield’s rarity, in addition to the Shield’s normal bonus to AC.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // Nouveau slug — Sentinel Shield absent du bundle baseline AideDD.
    id: 'bouclier-sentinelle',
    name: { fr: 'Bouclier sentinelle', en: 'Sentinel Shield' },
    category: 'armor',
    rarity: 'uncommon',
    attunement: false,
    magicDescription: {
      fr: "Tant que vous tenez ce bouclier, vous bénéficiez de l'Avantage aux jets d'Initiative et aux tests de Sagesse (Perception). Ce bouclier est orné d'un symbole représentant un œil.",
      en: 'While holding this Shield, you have Advantage on Initiative rolls and Wisdom (Perception) checks. The Shield is emblazoned with a symbol of an eye.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
];

export const SRD_MAGIC_ITEMS_ARMOR_SHIELDS_COUNTS = {
  total: SRD_MAGIC_ITEMS_ARMOR_SHIELDS.length,
  common: SRD_MAGIC_ITEMS_ARMOR_SHIELDS.filter((i) => i.rarity === 'common').length,
  uncommon: SRD_MAGIC_ITEMS_ARMOR_SHIELDS.filter((i) => i.rarity === 'uncommon').length,
} as const;
