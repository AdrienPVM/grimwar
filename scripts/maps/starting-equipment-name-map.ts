/**
 * Resolution map : SRD prose item names → items.json itemIds.
 *
 * Le texte SRD pour Starting Equipment utilise des noms en prose EN
 * (singuliers + pluriels, parfois avec parenthèse de variant). Cette map
 * canonicalise vers les itemIds de items.json.
 *
 * Si un nom dans la prose SRD n'a pas d'entrée ici, le parser FAIL LOUD.
 */

export interface StartingItemMapEntry {
  /** Singular noun matched in the SRD prose (also matches plural). */
  singular: string;
  /** Resolved items.json itemId. */
  itemId: string;
  /** Optional plural form (when not just `${singular}s`). */
  plural?: string;
}

/** Direct name-to-id map for the items mentioned in class startingEquipment. */
export const STARTING_ITEM_MAP: readonly StartingItemMapEntry[] = [
  // Weapons
  { singular: 'Greataxe', itemId: 'greataxe' },
  { singular: 'Handaxe', itemId: 'handaxe' },
  { singular: 'Dagger', itemId: 'dagger' },
  { singular: 'Mace', itemId: 'mace' },
  { singular: 'Sickle', itemId: 'sickle' },
  { singular: 'Greatsword', itemId: 'greatsword' },
  { singular: 'Flail', itemId: 'flail' },
  { singular: 'Javelin', itemId: 'javelin' },
  { singular: 'Scimitar', itemId: 'scimitar' },
  { singular: 'Shortsword', itemId: 'shortsword' },
  { singular: 'Short sword', itemId: 'shortsword' },
  { singular: 'Longbow', itemId: 'longbow' },
  { singular: 'Shortbow', itemId: 'shortbow' },
  { singular: 'Spear', itemId: 'spear' },
  { singular: 'Longsword', itemId: 'longsword' },
  { singular: 'Quarterstaff', itemId: 'quarterstaff' },
  // Armor / shield
  { singular: 'Leather Armor', itemId: 'leather-armor' },
  { singular: 'Studded Leather Armor', itemId: 'studded-leather-armor' },
  { singular: 'Chain Shirt', itemId: 'chain-shirt' },
  { singular: 'Chain Mail', itemId: 'chain-mail' },
  { singular: 'Shield', itemId: 'shield' },
  // Ammunition
  { singular: 'Arrow', itemId: 'ammunition-arrows' },
  { singular: 'Quiver', itemId: 'quiver' },
  // Packs
  { singular: 'Explorer’s Pack', itemId: 'explorers-pack' },
  { singular: "Explorer's Pack", itemId: 'explorers-pack' },
  { singular: 'Entertainer’s Pack', itemId: 'entertainers-pack' },
  { singular: "Entertainer's Pack", itemId: 'entertainers-pack' },
  { singular: 'Priest’s Pack', itemId: 'priests-pack' },
  { singular: "Priest's Pack", itemId: 'priests-pack' },
  { singular: 'Dungeoneer’s Pack', itemId: 'dungeoneers-pack' },
  { singular: "Dungeoneer's Pack", itemId: 'dungeoneers-pack' },
  { singular: 'Burglar’s Pack', itemId: 'burglars-pack' },
  { singular: "Burglar's Pack", itemId: 'burglars-pack' },
  { singular: 'Scholar’s Pack', itemId: 'scholars-pack' },
  { singular: "Scholar's Pack", itemId: 'scholars-pack' },
  // Tools / focuses (parent or variant)
  { singular: 'Holy Symbol', itemId: 'holy-symbol' },
  { singular: 'Druidic Focus (Quarterstaff)', itemId: 'druidic-focus-wooden-staff' },
  { singular: 'Druidic Focus (sprig of mistletoe)', itemId: 'druidic-focus-mistletoe' },
  { singular: 'Arcane Focus (crystal)', itemId: 'arcane-focus-crystal' },
  { singular: 'Arcane Focus (orb)', itemId: 'arcane-focus-orb' },
  { singular: 'Arcane Focus (Quarterstaff)', itemId: 'arcane-focus-staff' },
  { singular: 'Herbalism Kit', itemId: 'herbalism-kit' },
  { singular: 'Thieves’ Tools', itemId: 'thieves-tools' },
  { singular: "Thieves' Tools", itemId: 'thieves-tools' },
  { singular: 'Musical Instrument', itemId: 'musical-instrument' },
  { singular: 'Artisan’s Tools', itemId: 'artisans-tools' },
  { singular: "Artisan's Tools", itemId: 'artisans-tools' },
  // Misc
  { singular: 'Robe', itemId: 'robe' },
  { singular: 'Book', itemId: 'book' },
  { singular: 'Spellbook', itemId: 'spellbook' },
];

/** Lookup helper (handles plural by stripping trailing 's'). */
export function resolveStartingItemId(rawName: string): string | null {
  const cleaned = rawName.replace(/\s+/g, ' ').trim();
  // Strip plain plural 's' if not present in map.
  for (const entry of STARTING_ITEM_MAP) {
    if (cleaned === entry.singular) return entry.itemId;
    if (entry.plural && cleaned === entry.plural) return entry.itemId;
    if (cleaned === entry.singular + 's') return entry.itemId;
    // Common irregular pluralizations not covered above.
  }
  return null;
}
