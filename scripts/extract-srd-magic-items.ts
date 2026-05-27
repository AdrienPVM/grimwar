/**
 * scripts/extract-srd-magic-items.ts — tracer-bullets C.1 (potions) + C.2 (wondrous wearables).
 *
 * Régénère `public/data/magic-items.json` en :
 *   - Mergeant les entrées SRD-sourced de `scripts/data/srd-magic-items-*.ts`
 *     (potions C.1 + wondrous wearables C.2 ; autres modules pour C.3..C.7).
 *   - Préservant byte-identique tous les autres items du bundle existant
 *     (les ≥ Rare grandfathered AideDD restent intouchés — pattern explicitement
 *     validé par le decision log « Pass-through (reformulation D17 #2) »).
 *
 * L'item est identifié par son `id` (slug). Si un item SRD-sourced a le même
 * slug qu'un item existant, l'entrée SRD **remplace** l'existante intégralement.
 *
 * Pattern : sortie déterministe triée par id, idempotent, refus explicite de
 * toute lecture en dehors des 2 PDFs SRD (politique CLAUDE.md « LOCKED »).
 *
 * Run : `pnpm tsx scripts/extract-srd-magic-items.ts`
 */
import { readFile, writeFile } from 'node:fs/promises';

import {
  SRD_MAGIC_ITEMS_POTIONS,
  SRD_MAGIC_ITEMS_POTIONS_COUNTS,
  type SrdMagicItemEntry,
} from './data/srd-magic-items-potions';
import {
  SRD_MAGIC_ITEMS_WONDROUS,
  SRD_MAGIC_ITEMS_WONDROUS_COUNTS,
} from './data/srd-magic-items-wondrous';
import {
  SRD_MAGIC_ITEMS_RINGS_AMULETS,
  SRD_MAGIC_ITEMS_RINGS_AMULETS_COUNTS,
} from './data/srd-magic-items-rings-amulets';
import {
  SRD_MAGIC_ITEMS_WEAPONS,
  SRD_MAGIC_ITEMS_WEAPONS_COUNTS,
} from './data/srd-magic-items-weapons';
import {
  SRD_MAGIC_ITEMS_ARMOR_SHIELDS,
  SRD_MAGIC_ITEMS_ARMOR_SHIELDS_COUNTS,
} from './data/srd-magic-items-armor-shields';
import {
  SRD_MAGIC_ITEMS_UTILITY,
  SRD_MAGIC_ITEMS_UTILITY_COUNTS,
} from './data/srd-magic-items-utility';

const MAGIC_ITEMS_PATH = 'public/data/magic-items.json';

interface MagicItemJsonEntry {
  id: string;
  name: { fr: string; en?: string };
  category: string;
  rarity: string;
  attunement: boolean | { fr: string; en?: string };
  magicDescription: { fr: string; en?: string };
  description: { fr: string; en?: string } | null;
  source: string;
  [k: string]: unknown;
}

function toJsonEntry(entry: SrdMagicItemEntry): MagicItemJsonEntry {
  return {
    id: entry.id,
    name: entry.name,
    category: entry.category,
    rarity: entry.rarity,
    attunement: entry.attunement,
    magicDescription: entry.magicDescription,
    description: entry.description,
    source: entry.source,
  };
}

async function main(): Promise<void> {
  // 1. Charger le bundle existant.
  const raw = await readFile(MAGIC_ITEMS_PATH, 'utf-8');
  const existing = JSON.parse(raw) as MagicItemJsonEntry[];
  if (!Array.isArray(existing)) {
    throw new Error(`[extract-srd-magic-items] ${MAGIC_ITEMS_PATH} doit être un tableau`);
  }

  // 2. Collecter les modules SRD-sourced (C.1 → C.6).
  const srdEntries: SrdMagicItemEntry[] = [
    ...SRD_MAGIC_ITEMS_POTIONS,
    ...SRD_MAGIC_ITEMS_WONDROUS,
    ...SRD_MAGIC_ITEMS_RINGS_AMULETS,
    ...SRD_MAGIC_ITEMS_WEAPONS,
    ...SRD_MAGIC_ITEMS_ARMOR_SHIELDS,
    ...SRD_MAGIC_ITEMS_UTILITY,
  ];

  // Garde-fou : aucun slug ne doit être déclaré dans plus d'un module SRD.
  const seenIds = new Set<string>();
  for (const entry of srdEntries) {
    if (seenIds.has(entry.id)) {
      throw new Error(
        `[extract-srd-magic-items] PARSE STRICT FAIL — slug "${entry.id}" déclaré dans plus d'un module SRD.`,
      );
    }
    seenIds.add(entry.id);
  }

  const srdById = new Map(srdEntries.map((e) => [e.id, e] as const));

  // 3. Fusion : pour chaque entrée existante, remplacer si elle a un override SRD ;
  //    sinon conserver byte-identique.
  const replacedIds = new Set<string>();
  const merged: MagicItemJsonEntry[] = existing.map((item) => {
    const override = srdById.get(item.id);
    if (override) {
      replacedIds.add(item.id);
      return toJsonEntry(override);
    }
    return item;
  });

  // 4. Ajouter les SRD-sourced sans correspondance existante (nouveaux slugs).
  for (const entry of srdEntries) {
    if (!replacedIds.has(entry.id)) {
      merged.push(toJsonEntry(entry));
    }
  }

  // 5. Parse strict : compteurs.
  if (SRD_MAGIC_ITEMS_POTIONS_COUNTS.total !== SRD_MAGIC_ITEMS_POTIONS.length) {
    throw new Error('[extract-srd-magic-items] PARSE STRICT FAIL — compteur potions désynchronisé');
  }
  if (SRD_MAGIC_ITEMS_POTIONS_COUNTS.common !== 2 || SRD_MAGIC_ITEMS_POTIONS_COUNTS.uncommon !== 7) {
    throw new Error(
      `[extract-srd-magic-items] PARSE STRICT FAIL — potions C.1 attendu 2 common + 7 uncommon, trouvé ${SRD_MAGIC_ITEMS_POTIONS_COUNTS.common} + ${SRD_MAGIC_ITEMS_POTIONS_COUNTS.uncommon}.`,
    );
  }
  if (SRD_MAGIC_ITEMS_WONDROUS_COUNTS.total !== SRD_MAGIC_ITEMS_WONDROUS.length) {
    throw new Error(
      '[extract-srd-magic-items] PARSE STRICT FAIL — compteur wondrous wearables désynchronisé',
    );
  }
  if (SRD_MAGIC_ITEMS_WONDROUS_COUNTS.common !== 0 || SRD_MAGIC_ITEMS_WONDROUS_COUNTS.uncommon !== 24) {
    throw new Error(
      `[extract-srd-magic-items] PARSE STRICT FAIL — wondrous wearables C.2 attendu 0 common + 24 uncommon, trouvé ${SRD_MAGIC_ITEMS_WONDROUS_COUNTS.common} + ${SRD_MAGIC_ITEMS_WONDROUS_COUNTS.uncommon}.`,
    );
  }
  if (SRD_MAGIC_ITEMS_RINGS_AMULETS_COUNTS.total !== SRD_MAGIC_ITEMS_RINGS_AMULETS.length) {
    throw new Error(
      '[extract-srd-magic-items] PARSE STRICT FAIL — compteur rings/amulets désynchronisé',
    );
  }
  if (SRD_MAGIC_ITEMS_RINGS_AMULETS_COUNTS.common !== 0 || SRD_MAGIC_ITEMS_RINGS_AMULETS_COUNTS.uncommon !== 9) {
    throw new Error(
      `[extract-srd-magic-items] PARSE STRICT FAIL — rings/amulets C.3 attendu 0 common + 9 uncommon, trouvé ${SRD_MAGIC_ITEMS_RINGS_AMULETS_COUNTS.common} + ${SRD_MAGIC_ITEMS_RINGS_AMULETS_COUNTS.uncommon}.`,
    );
  }
  if (SRD_MAGIC_ITEMS_WEAPONS_COUNTS.total !== SRD_MAGIC_ITEMS_WEAPONS.length) {
    throw new Error('[extract-srd-magic-items] PARSE STRICT FAIL — compteur weapons désynchronisé');
  }
  if (SRD_MAGIC_ITEMS_WEAPONS_COUNTS.common !== 0 || SRD_MAGIC_ITEMS_WEAPONS_COUNTS.uncommon !== 5) {
    throw new Error(
      `[extract-srd-magic-items] PARSE STRICT FAIL — weapons C.4 attendu 0 common + 5 uncommon, trouvé ${SRD_MAGIC_ITEMS_WEAPONS_COUNTS.common} + ${SRD_MAGIC_ITEMS_WEAPONS_COUNTS.uncommon}.`,
    );
  }
  if (SRD_MAGIC_ITEMS_ARMOR_SHIELDS_COUNTS.total !== SRD_MAGIC_ITEMS_ARMOR_SHIELDS.length) {
    throw new Error('[extract-srd-magic-items] PARSE STRICT FAIL — compteur armor-shields désynchronisé');
  }
  if (SRD_MAGIC_ITEMS_ARMOR_SHIELDS_COUNTS.common !== 0 || SRD_MAGIC_ITEMS_ARMOR_SHIELDS_COUNTS.uncommon !== 4) {
    throw new Error(
      `[extract-srd-magic-items] PARSE STRICT FAIL — armor/shields C.5 attendu 0 common + 4 uncommon, trouvé ${SRD_MAGIC_ITEMS_ARMOR_SHIELDS_COUNTS.common} + ${SRD_MAGIC_ITEMS_ARMOR_SHIELDS_COUNTS.uncommon}.`,
    );
  }
  if (SRD_MAGIC_ITEMS_UTILITY_COUNTS.total !== SRD_MAGIC_ITEMS_UTILITY.length) {
    throw new Error('[extract-srd-magic-items] PARSE STRICT FAIL — compteur utility désynchronisé');
  }
  if (SRD_MAGIC_ITEMS_UTILITY_COUNTS.common !== 1 || SRD_MAGIC_ITEMS_UTILITY_COUNTS.uncommon !== 15) {
    throw new Error(
      `[extract-srd-magic-items] PARSE STRICT FAIL — utility C.6 attendu 1 common + 15 uncommon, trouvé ${SRD_MAGIC_ITEMS_UTILITY_COUNTS.common} + ${SRD_MAGIC_ITEMS_UTILITY_COUNTS.uncommon}.`,
    );
  }

  // 6. Tri déterministe par id (stable, l'array existant ne l'était pas
  //    forcément — on canonicalise ici pour idempotence pleine).
  merged.sort((a, b) => a.id.localeCompare(b.id));

  // 7. Écriture stable.
  const next = JSON.stringify(merged, null, 2) + '\n';
  await writeFile(MAGIC_ITEMS_PATH, next, 'utf-8');

  console.log(
    `[extract-srd-magic-items] OK — ${merged.length} entrées total, ` +
      `${srdEntries.length} SRD-sourced (C.1 → C.6 ; ${replacedIds.size} remplacées + ${
        srdEntries.length - replacedIds.size
      } nouvelles).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
