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
import {
  SRD_MAGIC_ITEMS_RELIQUAT,
  SRD_MAGIC_ITEMS_RELIQUAT_COUNTS,
} from './data/srd-magic-items-reliquat';
import {
  SRD_MAGIC_ITEMS_RINGS_RARE,
  SRD_MAGIC_ITEMS_RINGS_RARE_COUNTS,
} from './data/srd-magic-items-rings-rare';
import {
  SRD_MAGIC_ITEMS_WANDS,
  SRD_MAGIC_ITEMS_WANDS_COUNTS,
} from './data/srd-magic-items-wands';
import {
  SRD_MAGIC_ITEMS_STAVES,
  SRD_MAGIC_ITEMS_STAVES_COUNTS,
} from './data/srd-magic-items-staves';
import {
  SRD_MAGIC_ITEMS_POTIONS_RARE,
  SRD_MAGIC_ITEMS_POTIONS_RARE_COUNTS,
} from './data/srd-magic-items-potions-rare';
import {
  SRD_MAGIC_ITEMS_RODS,
  SRD_MAGIC_ITEMS_RODS_COUNTS,
} from './data/srd-magic-items-rods';
import {
  SRD_MAGIC_ITEMS_ARMOR_RARE,
  SRD_MAGIC_ITEMS_ARMOR_RARE_COUNTS,
} from './data/srd-magic-items-armor-rare';
import {
  SRD_MAGIC_ITEMS_SWORDS,
  SRD_MAGIC_ITEMS_SWORDS_COUNTS,
} from './data/srd-magic-items-swords';
import {
  SRD_MAGIC_ITEMS_BLUDGEONING,
  SRD_MAGIC_ITEMS_BLUDGEONING_COUNTS,
} from './data/srd-magic-items-bludgeoning';
import {
  SRD_MAGIC_ITEMS_BLADES,
  SRD_MAGIC_ITEMS_BLADES_COUNTS,
} from './data/srd-magic-items-blades';
import {
  SRD_MAGIC_ITEMS_WEAPONS_MISC,
  SRD_MAGIC_ITEMS_WEAPONS_MISC_COUNTS,
} from './data/srd-magic-items-weapons-misc';
import {
  SRD_MAGIC_ITEMS_CLOAKS,
  SRD_MAGIC_ITEMS_CLOAKS_COUNTS,
} from './data/srd-magic-items-cloaks';

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

  // 2. Collecter les modules SRD-sourced (C.1 → C.7 = chantier C complet).
  const srdEntries: SrdMagicItemEntry[] = [
    ...SRD_MAGIC_ITEMS_POTIONS,
    ...SRD_MAGIC_ITEMS_WONDROUS,
    ...SRD_MAGIC_ITEMS_RINGS_AMULETS,
    ...SRD_MAGIC_ITEMS_WEAPONS,
    ...SRD_MAGIC_ITEMS_ARMOR_SHIELDS,
    ...SRD_MAGIC_ITEMS_UTILITY,
    ...SRD_MAGIC_ITEMS_RELIQUAT,
    ...SRD_MAGIC_ITEMS_RINGS_RARE,
    ...SRD_MAGIC_ITEMS_WANDS,
    ...SRD_MAGIC_ITEMS_STAVES,
    ...SRD_MAGIC_ITEMS_POTIONS_RARE,
    ...SRD_MAGIC_ITEMS_RODS,
    ...SRD_MAGIC_ITEMS_ARMOR_RARE,
    ...SRD_MAGIC_ITEMS_SWORDS,
    ...SRD_MAGIC_ITEMS_BLUDGEONING,
    ...SRD_MAGIC_ITEMS_BLADES,
    ...SRD_MAGIC_ITEMS_WEAPONS_MISC,
    ...SRD_MAGIC_ITEMS_CLOAKS,
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
      const next = toJsonEntry(override);
      // Les modules SRD portent le texte + Harmonisation, PAS la couche
      // mécanique `effects[]` (enrichissement séparé). On la préserve donc
      // depuis l'entrée existante quand l'override n'en fournit pas — sinon
      // un re-run de l'extracteur effacerait silencieusement les effects
      // (régression attrapée par tests/1B-magic-effects-backfill.test.ts).
      if (item.effects !== undefined && next.effects === undefined) {
        next.effects = item.effects;
      }
      return next;
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
  if (SRD_MAGIC_ITEMS_RELIQUAT_COUNTS.total !== SRD_MAGIC_ITEMS_RELIQUAT.length) {
    throw new Error('[extract-srd-magic-items] PARSE STRICT FAIL — compteur reliquat désynchronisé');
  }
  if (SRD_MAGIC_ITEMS_RELIQUAT_COUNTS.common !== 1 || SRD_MAGIC_ITEMS_RELIQUAT_COUNTS.uncommon !== 7) {
    throw new Error(
      `[extract-srd-magic-items] PARSE STRICT FAIL — reliquat C.7 attendu 1 common + 7 uncommon, trouvé ${SRD_MAGIC_ITEMS_RELIQUAT_COUNTS.common} + ${SRD_MAGIC_ITEMS_RELIQUAT_COUNTS.uncommon}.`,
    );
  }
  if (SRD_MAGIC_ITEMS_RINGS_RARE_COUNTS.total !== SRD_MAGIC_ITEMS_RINGS_RARE.length) {
    throw new Error('[extract-srd-magic-items] PARSE STRICT FAIL — compteur rings-rare désynchronisé');
  }
  if (
    SRD_MAGIC_ITEMS_RINGS_RARE_COUNTS.rare !== 9 ||
    SRD_MAGIC_ITEMS_RINGS_RARE_COUNTS.veryRare !== 3 ||
    SRD_MAGIC_ITEMS_RINGS_RARE_COUNTS.legendary !== 5
  ) {
    throw new Error(
      `[extract-srd-magic-items] PARSE STRICT FAIL — rings-rare D29.1 attendu 9 rare + 3 very rare + 5 legendary, trouvé ${SRD_MAGIC_ITEMS_RINGS_RARE_COUNTS.rare} + ${SRD_MAGIC_ITEMS_RINGS_RARE_COUNTS.veryRare} + ${SRD_MAGIC_ITEMS_RINGS_RARE_COUNTS.legendary}.`,
    );
  }
  if (SRD_MAGIC_ITEMS_WANDS_COUNTS.total !== SRD_MAGIC_ITEMS_WANDS.length) {
    throw new Error('[extract-srd-magic-items] PARSE STRICT FAIL — compteur wands désynchronisé');
  }
  if (
    SRD_MAGIC_ITEMS_WANDS_COUNTS.uncommon !== 5 ||
    SRD_MAGIC_ITEMS_WANDS_COUNTS.rare !== 7 ||
    SRD_MAGIC_ITEMS_WANDS_COUNTS.veryRare !== 1
  ) {
    throw new Error(
      `[extract-srd-magic-items] PARSE STRICT FAIL — wands D29.2 attendu 5 uncommon + 7 rare + 1 very rare, trouvé ${SRD_MAGIC_ITEMS_WANDS_COUNTS.uncommon} + ${SRD_MAGIC_ITEMS_WANDS_COUNTS.rare} + ${SRD_MAGIC_ITEMS_WANDS_COUNTS.veryRare}.`,
    );
  }
  if (SRD_MAGIC_ITEMS_STAVES_COUNTS.total !== SRD_MAGIC_ITEMS_STAVES.length) {
    throw new Error('[extract-srd-magic-items] PARSE STRICT FAIL — compteur staves désynchronisé');
  }
  if (
    SRD_MAGIC_ITEMS_STAVES_COUNTS.uncommon !== 1 ||
    SRD_MAGIC_ITEMS_STAVES_COUNTS.rare !== 5 ||
    SRD_MAGIC_ITEMS_STAVES_COUNTS.veryRare !== 5 ||
    SRD_MAGIC_ITEMS_STAVES_COUNTS.legendary !== 1
  ) {
    throw new Error(
      `[extract-srd-magic-items] PARSE STRICT FAIL — staves D29.3 attendu 1 uncommon + 5 rare + 5 very rare + 1 legendary, trouvé ${SRD_MAGIC_ITEMS_STAVES_COUNTS.uncommon} + ${SRD_MAGIC_ITEMS_STAVES_COUNTS.rare} + ${SRD_MAGIC_ITEMS_STAVES_COUNTS.veryRare} + ${SRD_MAGIC_ITEMS_STAVES_COUNTS.legendary}.`,
    );
  }

  if (SRD_MAGIC_ITEMS_POTIONS_RARE_COUNTS.total !== SRD_MAGIC_ITEMS_POTIONS_RARE.length) {
    throw new Error('[extract-srd-magic-items] PARSE STRICT FAIL — compteur potions-rare désynchronisé');
  }
  if (
    SRD_MAGIC_ITEMS_POTIONS_RARE_COUNTS.rare !== 7 ||
    SRD_MAGIC_ITEMS_POTIONS_RARE_COUNTS.veryRare !== 3
  ) {
    throw new Error(
      `[extract-srd-magic-items] PARSE STRICT FAIL — potions-rare D29.4 attendu 7 rare + 3 very rare, trouvé ${SRD_MAGIC_ITEMS_POTIONS_RARE_COUNTS.rare} + ${SRD_MAGIC_ITEMS_POTIONS_RARE_COUNTS.veryRare}.`,
    );
  }

  if (SRD_MAGIC_ITEMS_RODS_COUNTS.total !== SRD_MAGIC_ITEMS_RODS.length) {
    throw new Error('[extract-srd-magic-items] PARSE STRICT FAIL — compteur rods désynchronisé');
  }
  if (
    SRD_MAGIC_ITEMS_RODS_COUNTS.rare !== 1 ||
    SRD_MAGIC_ITEMS_RODS_COUNTS.veryRare !== 3 ||
    SRD_MAGIC_ITEMS_RODS_COUNTS.legendary !== 1 ||
    SRD_MAGIC_ITEMS_RODS_COUNTS.attuned !== 4
  ) {
    throw new Error(
      `[extract-srd-magic-items] PARSE STRICT FAIL — rods D29.5 attendu 1 rare + 3 very rare + 1 legendary + 4 attuned, trouvé ${SRD_MAGIC_ITEMS_RODS_COUNTS.rare} + ${SRD_MAGIC_ITEMS_RODS_COUNTS.veryRare} + ${SRD_MAGIC_ITEMS_RODS_COUNTS.legendary} + ${SRD_MAGIC_ITEMS_RODS_COUNTS.attuned}.`,
    );
  }
  if (SRD_MAGIC_ITEMS_ARMOR_RARE_COUNTS.total !== SRD_MAGIC_ITEMS_ARMOR_RARE.length) {
    throw new Error('[extract-srd-magic-items] PARSE STRICT FAIL — compteur armor-rare désynchronisé');
  }
  if (
    SRD_MAGIC_ITEMS_ARMOR_RARE_COUNTS.rare !== 6 ||
    SRD_MAGIC_ITEMS_ARMOR_RARE_COUNTS.veryRare !== 6 ||
    SRD_MAGIC_ITEMS_ARMOR_RARE_COUNTS.legendary !== 2
  ) {
    throw new Error(
      `[extract-srd-magic-items] PARSE STRICT FAIL — armor-rare D29.6 attendu 6 rare + 6 very rare + 2 legendary, trouvé ${SRD_MAGIC_ITEMS_ARMOR_RARE_COUNTS.rare} + ${SRD_MAGIC_ITEMS_ARMOR_RARE_COUNTS.veryRare} + ${SRD_MAGIC_ITEMS_ARMOR_RARE_COUNTS.legendary}.`,
    );
  }

  if (SRD_MAGIC_ITEMS_SWORDS_COUNTS.total !== SRD_MAGIC_ITEMS_SWORDS.length) {
    throw new Error('[extract-srd-magic-items] PARSE STRICT FAIL — compteur swords désynchronisé');
  }
  if (
    SRD_MAGIC_ITEMS_SWORDS_COUNTS.rare !== 4 ||
    SRD_MAGIC_ITEMS_SWORDS_COUNTS.veryRare !== 2 ||
    SRD_MAGIC_ITEMS_SWORDS_COUNTS.legendary !== 1 ||
    SRD_MAGIC_ITEMS_SWORDS_COUNTS.attuned !== 7
  ) {
    throw new Error(
      `[extract-srd-magic-items] PARSE STRICT FAIL — swords D29.7 attendu 4 rare + 2 very rare + 1 legendary + 7 attuned, trouvé ${SRD_MAGIC_ITEMS_SWORDS_COUNTS.rare} + ${SRD_MAGIC_ITEMS_SWORDS_COUNTS.veryRare} + ${SRD_MAGIC_ITEMS_SWORDS_COUNTS.legendary} + ${SRD_MAGIC_ITEMS_SWORDS_COUNTS.attuned}.`,
    );
  }

  if (SRD_MAGIC_ITEMS_BLUDGEONING_COUNTS.total !== SRD_MAGIC_ITEMS_BLUDGEONING.length) {
    throw new Error('[extract-srd-magic-items] PARSE STRICT FAIL — compteur bludgeoning désynchronisé');
  }
  if (
    SRD_MAGIC_ITEMS_BLUDGEONING_COUNTS.rare !== 4 ||
    SRD_MAGIC_ITEMS_BLUDGEONING_COUNTS.veryRare !== 1 ||
    SRD_MAGIC_ITEMS_BLUDGEONING_COUNTS.legendary !== 1 ||
    SRD_MAGIC_ITEMS_BLUDGEONING_COUNTS.attuned !== 5
  ) {
    throw new Error(
      `[extract-srd-magic-items] PARSE STRICT FAIL — bludgeoning D29.8 attendu 4 rare + 1 very rare + 1 legendary + 5 attuned, trouvé ${SRD_MAGIC_ITEMS_BLUDGEONING_COUNTS.rare} + ${SRD_MAGIC_ITEMS_BLUDGEONING_COUNTS.veryRare} + ${SRD_MAGIC_ITEMS_BLUDGEONING_COUNTS.legendary} + ${SRD_MAGIC_ITEMS_BLUDGEONING_COUNTS.attuned}.`,
    );
  }

  if (SRD_MAGIC_ITEMS_BLADES_COUNTS.total !== SRD_MAGIC_ITEMS_BLADES.length) {
    throw new Error('[extract-srd-magic-items] PARSE STRICT FAIL — compteur blades désynchronisé');
  }
  if (
    SRD_MAGIC_ITEMS_BLADES_COUNTS.rare !== 1 ||
    SRD_MAGIC_ITEMS_BLADES_COUNTS.veryRare !== 2 ||
    SRD_MAGIC_ITEMS_BLADES_COUNTS.legendary !== 3 ||
    SRD_MAGIC_ITEMS_BLADES_COUNTS.attuned !== 5
  ) {
    throw new Error(
      `[extract-srd-magic-items] PARSE STRICT FAIL — blades D29.9 attendu 1 rare + 2 very rare + 3 legendary + 5 attuned, trouvé ${SRD_MAGIC_ITEMS_BLADES_COUNTS.rare} + ${SRD_MAGIC_ITEMS_BLADES_COUNTS.veryRare} + ${SRD_MAGIC_ITEMS_BLADES_COUNTS.legendary} + ${SRD_MAGIC_ITEMS_BLADES_COUNTS.attuned}.`,
    );
  }

  if (SRD_MAGIC_ITEMS_WEAPONS_MISC_COUNTS.total !== SRD_MAGIC_ITEMS_WEAPONS_MISC.length) {
    throw new Error('[extract-srd-magic-items] PARSE STRICT FAIL — compteur weapons-misc désynchronisé');
  }
  if (
    SRD_MAGIC_ITEMS_WEAPONS_MISC_COUNTS.rare !== 3 ||
    SRD_MAGIC_ITEMS_WEAPONS_MISC_COUNTS.veryRare !== 3 ||
    SRD_MAGIC_ITEMS_WEAPONS_MISC_COUNTS.attuned !== 2
  ) {
    throw new Error(
      `[extract-srd-magic-items] PARSE STRICT FAIL — weapons-misc D29.10 attendu 3 rare + 3 very rare + 2 attuned, trouvé ${SRD_MAGIC_ITEMS_WEAPONS_MISC_COUNTS.rare} + ${SRD_MAGIC_ITEMS_WEAPONS_MISC_COUNTS.veryRare} + ${SRD_MAGIC_ITEMS_WEAPONS_MISC_COUNTS.attuned}.`,
    );
  }

  if (SRD_MAGIC_ITEMS_CLOAKS_COUNTS.total !== SRD_MAGIC_ITEMS_CLOAKS.length) {
    throw new Error('[extract-srd-magic-items] PARSE STRICT FAIL — compteur cloaks désynchronisé');
  }
  if (
    SRD_MAGIC_ITEMS_CLOAKS_COUNTS.rare !== 6 ||
    SRD_MAGIC_ITEMS_CLOAKS_COUNTS.veryRare !== 3 ||
    SRD_MAGIC_ITEMS_CLOAKS_COUNTS.legendary !== 1 ||
    SRD_MAGIC_ITEMS_CLOAKS_COUNTS.attuned !== 9
  ) {
    throw new Error(
      `[extract-srd-magic-items] PARSE STRICT FAIL — cloaks D29.11 attendu 6 rare + 3 very rare + 1 legendary + 9 attuned, trouvé ${SRD_MAGIC_ITEMS_CLOAKS_COUNTS.rare} + ${SRD_MAGIC_ITEMS_CLOAKS_COUNTS.veryRare} + ${SRD_MAGIC_ITEMS_CLOAKS_COUNTS.legendary} + ${SRD_MAGIC_ITEMS_CLOAKS_COUNTS.attuned}.`,
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
      `${srdEntries.length} SRD-sourced (C.1 → C.7 = chantier C complet ; ${replacedIds.size} remplacées + ${
        srdEntries.length - replacedIds.size
      } nouvelles).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
