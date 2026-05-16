/**
 * Tools — FR↔EN explicit map.
 *
 * Pourquoi : la section "Outils" du SRD n'est pas un tableau mais une liste
 * d'entrées au format key:value (Caractéristique / Utilisation / Artisanat /
 * Variantes). Le tuple mécanique (cost, weight) ne suffit pas à dédupliquer.
 * On utilise un name map explicite, dans la même discipline que gear-fr-en.
 *
 * Couverture exhaustive du SRD 5.2.1 :
 *   - 17 Artisan's Tools / Outils d'artisan
 *   - 8  Other Tools / Autres outils
 *   - 4  Gaming Set variants / variantes Boîte de jeux
 *   - 10 Musical Instrument variants / variantes Instrument de musique
 *
 * Si une entrée du PDF n'a pas de match dans ce dict, le parser FAIL LOUD.
 */

import type { GearMapEntry } from './gear-fr-en';

/** 25 outils principaux (Artisan + Other). */
export const TOOLS_MAP: readonly GearMapEntry[] = [
  // Artisan's Tools — 17
  { id: 'alchemists-supplies', en: "Alchemist’s Supplies", fr: "Matériel d’alchimiste", enAliases: ["Alchemist's Supplies"], frAliases: ["Matériel d'alchimiste"] },
  { id: 'brewers-supplies', en: "Brewer’s Supplies", fr: 'Matériel de brasseur', enAliases: ["Brewer's Supplies"] },
  { id: 'calligraphers-supplies', en: "Calligrapher’s Supplies", fr: 'Matériel de calligraphe', enAliases: ["Calligrapher's Supplies"] },
  { id: 'carpenters-tools', en: "Carpenter’s Tools", fr: 'Outils de charpentier', enAliases: ["Carpenter's Tools"] },
  { id: 'cartographers-tools', en: "Cartographer’s Tools", fr: 'Outils de cartographe', enAliases: ["Cartographer's Tools"] },
  { id: 'cobblers-tools', en: "Cobbler’s Tools", fr: 'Outils de cordonnier', enAliases: ["Cobbler's Tools"] },
  { id: 'cooks-utensils', en: "Cook’s Utensils", fr: 'Ustensiles de cuisinier', enAliases: ["Cook's Utensils"] },
  { id: 'glassblowers-tools', en: "Glassblower’s Tools", fr: 'Outils de souffleur de verre', enAliases: ["Glassblower's Tools"] },
  { id: 'jewelers-tools', en: "Jeweler’s Tools", fr: 'Outils de joaillier', enAliases: ["Jeweler's Tools"] },
  { id: 'leatherworkers-tools', en: "Leatherworker’s Tools", fr: 'Outils de tanneur', enAliases: ["Leatherworker's Tools"] },
  { id: 'masons-tools', en: "Mason’s Tools", fr: 'Outils de maçon', enAliases: ["Mason's Tools"] },
  { id: 'painters-supplies', en: "Painter’s Supplies", fr: 'Matériel de peintre', enAliases: ["Painter's Supplies"] },
  { id: 'potters-tools', en: "Potter’s Tools", fr: 'Outils de potier', enAliases: ["Potter's Tools"] },
  { id: 'smiths-tools', en: "Smith’s Tools", fr: 'Outils de forgeron', enAliases: ["Smith's Tools"] },
  { id: 'tinkers-tools', en: "Tinker’s Tools", fr: 'Outils de bricoleur', enAliases: ["Tinker's Tools"] },
  { id: 'weavers-tools', en: "Weaver’s Tools", fr: 'Outils de tisserand', enAliases: ["Weaver's Tools"] },
  { id: 'woodcarvers-tools', en: "Woodcarver’s Tools", fr: 'Outils de menuisier', enAliases: ["Woodcarver's Tools"] },

  // Other Tools — 8 (Gaming Set + Musical Instrument exposés en parents,
  // les variantes ont leur propre dict ci-dessous).
  { id: 'disguise-kit', en: 'Disguise Kit', fr: 'Accessoires de déguisement' },
  { id: 'forgery-kit', en: 'Forgery Kit', fr: 'Matériel de contrefaçon' },
  { id: 'gaming-set', en: 'Gaming Set', fr: 'Boîte de jeux' },
  { id: 'herbalism-kit', en: 'Herbalism Kit', fr: "Matériel d’herboriste", frAliases: ["Matériel d'herboriste"] },
  { id: 'musical-instrument', en: 'Musical Instrument', fr: 'Instrument de musique' },
  { id: 'navigators-tools', en: "Navigator’s Tools", fr: 'Instruments de navigateur', enAliases: ["Navigator's Tools"] },
  { id: 'poisoners-kit', en: "Poisoner’s Kit", fr: "Matériel d’empoisonneur", enAliases: ["Poisoner's Kit"], frAliases: ["Matériel d'empoisonneur"] },
  { id: 'thieves-tools', en: "Thieves’ Tools", fr: 'Outils de voleur', enAliases: ["Thieves' Tools"] },
];

/** 4 variantes Gaming Set / Boîte de jeux. */
export const GAMING_SET_VARIANTS_MAP: readonly GearMapEntry[] = [
  { id: 'gaming-set-dice', en: 'Dice', fr: 'Dés' },
  { id: 'gaming-set-dragonchess', en: 'Dragonchess', fr: 'Échecs draconiques' },
  { id: 'gaming-set-playing-cards', en: 'Playing cards', fr: 'Cartes à jouer' },
  { id: 'gaming-set-three-dragon-ante', en: 'Three-dragon ante', fr: 'Jeu des dragons' },
];

/** 10 variantes Musical Instrument / Instrument de musique. */
export const MUSICAL_INSTRUMENT_VARIANTS_MAP: readonly GearMapEntry[] = [
  { id: 'musical-instrument-bagpipes', en: 'Bagpipes', fr: 'Cornemuse' },
  { id: 'musical-instrument-drum', en: 'Drum', fr: 'Tambour' },
  { id: 'musical-instrument-dulcimer', en: 'Dulcimer', fr: 'Tympanon' },
  { id: 'musical-instrument-flute', en: 'Flute', fr: 'Flûte' },
  { id: 'musical-instrument-horn', en: 'Horn', fr: 'Cor' },
  { id: 'musical-instrument-lute', en: 'Lute', fr: 'Luth' },
  { id: 'musical-instrument-lyre', en: 'Lyre', fr: 'Lyre' },
  { id: 'musical-instrument-pan-flute', en: 'Pan flute', fr: 'Flûte de pan' },
  { id: 'musical-instrument-shawm', en: 'Shawm', fr: 'Chalemie' },
  { id: 'musical-instrument-viol', en: 'Viol', fr: 'Viole' },
];
