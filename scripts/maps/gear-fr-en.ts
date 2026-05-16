/**
 * Adventuring Gear & Ammunition & Focus & Holy Symbol — FR↔EN explicit map.
 *
 * Pourquoi : le tuple mécanique (poids, prix) n'est pas unique sur cette table
 * (~80 entrées dont plusieurs partagent le même couple). Adrien a approuvé
 * l'option (b) — name map hand-authored — pour garantir un join déterministe
 * et auditable, dans la même discipline que le map des ancestries.
 *
 * Le name map ne fournit PAS de mécaniques : seulement la correspondance
 * FR↔EN. Les mécaniques (cost, weight, description) viennent toujours du
 * parse PDF (parseAdventuringGear / parseAmmunition / parseFocus).
 *
 * Couverture exhaustive du SRD 5.2.1 :
 *   - 82 lignes du tableau "Adventuring Gear" / "Matériel d'aventurier"
 *   - 5 variantes Arcane Focus / "Focaliseurs arcaniques"
 *   - 3 variantes Druidic Focus / "Focaliseurs druidiques"
 *   - 3 variantes Holy Symbol / "Symboles sacrés"
 *   - 5 variantes Ammunition / "Munitions"
 *
 * Si une entrée du PDF n'a pas de match dans ce dict, le parser FAIL LOUD.
 * Si une entrée du dict n'est pas trouvée dans le PDF, le parser FAIL LOUD.
 */

export interface GearMapEntry {
  /** Stable kebab-case ID (use as items.json id). */
  id: string;
  /** Exact line label as it appears in the EN PDF table. */
  en: string;
  /** Exact line label as it appears in the FR PDF table. */
  fr: string;
  /** When the EN label appears split across columns / wrapped, alt forms can be
   *  added here for matching. Keep first letter capitalized. */
  enAliases?: string[];
  frAliases?: string[];
}

/** 82 entrées du tableau principal "Adventuring Gear" / "Matériel d'aventurier". */
export const GEAR_TABLE_MAP: readonly GearMapEntry[] = [
  { id: 'acid', en: 'Acid', fr: 'Acide' },
  { id: 'alchemists-fire', en: "Alchemist’s Fire", fr: 'Feu grégeois', enAliases: ["Alchemist's Fire"] },
  { id: 'ammunition', en: 'Ammunition', fr: 'Munitions' },
  { id: 'antitoxin', en: 'Antitoxin', fr: 'Antidote' },
  { id: 'arcane-focus', en: 'Arcane Focus', fr: 'Focaliseur arcanique' },
  { id: 'backpack', en: 'Backpack', fr: 'Sac à dos' },
  { id: 'ball-bearings', en: 'Ball Bearings', fr: 'Billes' },
  { id: 'barrel', en: 'Barrel', fr: 'Tonneau' },
  { id: 'basket', en: 'Basket', fr: 'Panier' },
  { id: 'bedroll', en: 'Bedroll', fr: 'Sac de couchage' },
  { id: 'bell', en: 'Bell', fr: 'Cloche' },
  { id: 'blanket', en: 'Blanket', fr: 'Couverture' },
  { id: 'block-and-tackle', en: 'Block and Tackle', fr: 'Palan' },
  { id: 'book', en: 'Book', fr: 'Livre' },
  { id: 'bottle-glass', en: 'Bottle, Glass', fr: 'Bouteille, verre' },
  { id: 'bucket', en: 'Bucket', fr: 'Seau' },
  { id: 'burglars-pack', en: "Burglar’s Pack", fr: 'Paquetage de cambrioleur', enAliases: ["Burglar's Pack"] },
  { id: 'caltrops', en: 'Caltrops', fr: 'Chausse-trappes' },
  { id: 'candle', en: 'Candle', fr: 'Bougie' },
  { id: 'case-crossbow-bolt', en: 'Case, Crossbow Bolt', fr: "Étui pour carreaux d’arbalète", frAliases: ["Étui pour carreaux d'arbalète"] },
  { id: 'case-map-or-scroll', en: 'Case, Map or Scroll', fr: 'Étui à cartes ou à parchemins' },
  { id: 'chain', en: 'Chain', fr: 'Chaîne' },
  { id: 'chest', en: 'Chest', fr: 'Coffre' },
  { id: 'climbers-kit', en: "Climber’s Kit", fr: "Matériel d’escalade", enAliases: ["Climber's Kit"], frAliases: ["Matériel d'escalade"] },
  { id: 'clothes-fine', en: 'Clothes, Fine', fr: 'Beaux habits' },
  { id: 'clothes-travelers', en: "Clothes, Traveler’s", fr: 'Tenue de voyage', enAliases: ["Clothes, Traveler's"] },
  { id: 'component-pouch', en: 'Component Pouch', fr: 'Sacoche à composantes' },
  { id: 'costume', en: 'Costume', fr: 'Costume' },
  { id: 'crowbar', en: 'Crowbar', fr: 'Pied-de-biche' },
  { id: 'diplomats-pack', en: "Diplomat’s Pack", fr: 'Paquetage de diplomate', enAliases: ["Diplomat's Pack"] },
  { id: 'druidic-focus', en: 'Druidic Focus', fr: 'Focaliseur druidique' },
  { id: 'dungeoneers-pack', en: "Dungeoneer’s Pack", fr: "Paquetage d’exploration souterraine", enAliases: ["Dungeoneer's Pack"], frAliases: ["Paquetage d'exploration souterraine"] },
  { id: 'entertainers-pack', en: "Entertainer’s Pack", fr: "Paquetage d’artiste", enAliases: ["Entertainer's Pack"], frAliases: ["Paquetage d'artiste"] },
  { id: 'explorers-pack', en: "Explorer’s Pack", fr: "Paquetage d’explorateur", enAliases: ["Explorer's Pack"], frAliases: ["Paquetage d'explorateur"] },
  { id: 'flask', en: 'Flask', fr: 'Flasque' },
  { id: 'grappling-hook', en: 'Grappling Hook', fr: 'Grappin' },
  { id: 'healers-kit', en: "Healer’s Kit", fr: 'Trousse de soins', enAliases: ["Healer's Kit"] },
  { id: 'holy-symbol', en: 'Holy Symbol', fr: 'Symbole sacré' },
  { id: 'holy-water', en: 'Holy Water', fr: 'Eau bénite' },
  { id: 'hunting-trap', en: 'Hunting Trap', fr: 'Piège à mâchoires' },
  { id: 'ink', en: 'Ink', fr: 'Encre' },
  { id: 'ink-pen', en: 'Ink Pen', fr: 'Porte-plume' },
  { id: 'jug', en: 'Jug', fr: 'Cruche' },
  { id: 'ladder', en: 'Ladder', fr: 'Échelle' },
  { id: 'lamp', en: 'Lamp', fr: 'Lampe' },
  { id: 'lantern-bullseye', en: 'Lantern, Bullseye', fr: 'Lanterne sourde' },
  { id: 'lantern-hooded', en: 'Lantern, Hooded', fr: 'Lanterne à capote' },
  { id: 'lock', en: 'Lock', fr: 'Cadenas' },
  { id: 'magnifying-glass', en: 'Magnifying Glass', fr: 'Loupe' },
  { id: 'manacles', en: 'Manacles', fr: 'Menottes' },
  { id: 'map', en: 'Map', fr: 'Carte' },
  { id: 'mirror', en: 'Mirror', fr: 'Miroir' },
  { id: 'net', en: 'Net', fr: 'Filet' },
  { id: 'oil', en: 'Oil', fr: 'Huile' },
  { id: 'paper', en: 'Paper', fr: 'Papier' },
  { id: 'parchment', en: 'Parchment', fr: 'Parchemin' },
  { id: 'perfume', en: 'Perfume', fr: 'Parfum' },
  { id: 'poison-basic', en: 'Poison, Basic', fr: 'Poison standard' },
  { id: 'pole', en: 'Pole', fr: 'Perche' },
  { id: 'pot-iron', en: 'Pot, Iron', fr: 'Pot en fer' },
  { id: 'potion-of-healing', en: 'Potion of Healing', fr: 'Potion de guérison' },
  { id: 'pouch', en: 'Pouch', fr: 'Sacoche' },
  { id: 'priests-pack', en: "Priest’s Pack", fr: "Paquetage d’ecclésiastique", enAliases: ["Priest's Pack"], frAliases: ["Paquetage d'ecclésiastique"] },
  { id: 'quiver', en: 'Quiver', fr: 'Carquois' },
  { id: 'ram-portable', en: 'Ram, Portable', fr: 'Bélier portable' },
  { id: 'rations', en: 'Rations', fr: 'Rations' },
  { id: 'robe', en: 'Robe', fr: 'Robe' },
  { id: 'rope', en: 'Rope', fr: 'Corde' },
  { id: 'sack', en: 'Sack', fr: 'Sac' },
  { id: 'scholars-pack', en: "Scholar’s Pack", fr: "Paquetage d’érudit", enAliases: ["Scholar's Pack"], frAliases: ["Paquetage d'érudit"] },
  { id: 'shovel', en: 'Shovel', fr: 'Pelle' },
  { id: 'signal-whistle', en: 'Signal Whistle', fr: 'Sifflet' },
  { id: 'spell-scroll-cantrip', en: 'Spell Scroll (Cantrip)', fr: 'Parchemin de sort (sort mineur)' },
  { id: 'spell-scroll-level-1', en: 'Spell Scroll (Level 1)', fr: 'Parchemin de sort (1er niveau)' },
  { id: 'spikes-iron', en: 'Spikes, Iron', fr: 'Pointes en fer' },
  { id: 'spyglass', en: 'Spyglass', fr: 'Longue-vue' },
  { id: 'string', en: 'String', fr: 'Ficelle' },
  { id: 'tent', en: 'Tent', fr: 'Tente' },
  { id: 'tinderbox', en: 'Tinderbox', fr: 'Boîte à amadou' },
  { id: 'torch', en: 'Torch', fr: 'Torche' },
  { id: 'vial', en: 'Vial', fr: 'Fiole' },
  { id: 'waterskin', en: 'Waterskin', fr: 'Outre' },
];

/** Variantes Arcane Focus (5). */
export const ARCANE_FOCUS_VARIANTS_MAP: readonly GearMapEntry[] = [
  { id: 'arcane-focus-crystal', en: 'Crystal', fr: 'Cristal' },
  { id: 'arcane-focus-orb', en: 'Orb', fr: 'Orbe' },
  { id: 'arcane-focus-rod', en: 'Rod', fr: 'Sceptre' },
  {
    id: 'arcane-focus-staff',
    en: 'Staff',
    fr: 'Bâton',
    enAliases: ['Staff (also a Quarterstaff)'],
    frAliases: ['Bâton (également bâton de combat)'],
  },
  { id: 'arcane-focus-wand', en: 'Wand', fr: 'Baguette' },
];

/** Variantes Druidic Focus (3). */
export const DRUIDIC_FOCUS_VARIANTS_MAP: readonly GearMapEntry[] = [
  { id: 'druidic-focus-mistletoe', en: 'Sprig of mistletoe', fr: 'Branche de houx' },
  {
    id: 'druidic-focus-wooden-staff',
    en: 'Wooden staff',
    fr: 'Bâton en bois',
    enAliases: ['Wooden staff (also a Quarterstaff)'],
    frAliases: ['Bâton en bois (également bâton de combat)'],
  },
  { id: 'druidic-focus-yew-wand', en: 'Yew wand', fr: "Baguette d’if", frAliases: ["Baguette d'if"] },
];

/** Variantes Holy Symbol (3) — la table SRD ajoute un descriptif "(worn or held)" / "(borne on fabric or a Shield)" / "(held)" entre parenthèses. */
export const HOLY_SYMBOL_VARIANTS_MAP: readonly GearMapEntry[] = [
  {
    id: 'holy-symbol-amulet',
    en: 'Amulet',
    fr: 'Amulette',
    enAliases: ['Amulet (worn or held)'],
    frAliases: ['Amulette (portée ou tenue)'],
  },
  {
    id: 'holy-symbol-emblem',
    en: 'Emblem',
    fr: 'Emblème',
    enAliases: ['Emblem (borne on fabric or a Shield)'],
    frAliases: ['Emblème (cousu sur une étoffe ou fixé un bouclier)'],
  },
  {
    id: 'holy-symbol-reliquary',
    en: 'Reliquary',
    fr: 'Reliquaire',
    enAliases: ['Reliquary (held)'],
    frAliases: ['Reliquaire (tenu)'],
  },
];

/** Variantes Ammunition (5). */
export const AMMUNITION_VARIANTS_MAP: readonly GearMapEntry[] = [
  { id: 'ammunition-arrows', en: 'Arrows', fr: 'Flèches' },
  { id: 'ammunition-bolts', en: 'Bolts', fr: 'Carreaux' },
  { id: 'ammunition-firearm-bullets', en: 'Bullets, Firearm', fr: "Balles d’arme à feu", frAliases: ["Balles d'arme à feu"] },
  { id: 'ammunition-sling-bullets', en: 'Bullets, Sling', fr: 'Billes de fronde' },
  { id: 'ammunition-needles', en: 'Needles', fr: 'Dards' },
];

/**
 * Normalisation conservative pour le matching exact :
 * - normalise NFC (unicode forms),
 * - garde la casse,
 * - convertit les apostrophes courbes en droites,
 * - garde les accents,
 * - "1/2" déjà géré par le parser, hors de scope ici.
 */
export function normalizeLabel(s: string): string {
  return s.normalize('NFC').replace(/[’]/g, "'").trim();
}
