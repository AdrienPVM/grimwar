/**
 * scripts/extract-srd-ancestries.ts (plan 13.7 §0.4)
 *
 * Enrichit `public/data/ancestries.json` avec `options` par ascendance à
 * sous-choix SRD 5.2.1 :
 *   - dragonborn → dragonAncestries (10)
 *   - tiefling   → tieflingLegacies (3)
 *   - elf        → elfLineages (3)
 *   - gnome      → gnomeLineages (2)
 *   - goliath    → giantAncestries (6)
 *   - human      → versatileFeatIds (4) + skillfulOptions (18)
 *   - autres (dwarf/halfling/orc) → options: {} (pas de sous-choix L1 SRD)
 *
 * Pattern : déterministe (tri par id), idempotent, parse strict.
 *
 * Run : `pnpm tsx scripts/extract-srd-ancestries.ts`
 */
import { readFile, writeFile } from 'node:fs/promises';

import {
  ANCESTRY_COMMON_SPELL_IDS,
  DRAGON_ANCESTRIES,
  ELF_LINEAGES,
  GIANT_ANCESTRIES,
  GNOME_LINEAGES,
  HUMAN_SKILLFUL_OPTIONS,
  HUMAN_VERSATILE_FEAT_IDS,
  SRD_ANCESTRIES_COUNTS,
  TIEFLING_LEGACIES,
} from './data/srd-ancestries-l1';

const ANCESTRIES_PATH = 'public/data/ancestries.json';

interface AncestryJsonEntry {
  id: string;
  options?: Record<string, unknown>;
  [k: string]: unknown;
}

function optionsForAncestry(id: string): Record<string, unknown> {
  switch (id) {
    case 'dragonborn':
      return { dragonAncestries: DRAGON_ANCESTRIES };
    case 'tiefling':
      return { tieflingLegacies: TIEFLING_LEGACIES };
    case 'elf':
      return { elfLineages: ELF_LINEAGES };
    case 'gnome':
      return { gnomeLineages: GNOME_LINEAGES };
    case 'goliath':
      return { giantAncestries: GIANT_ANCESTRIES };
    case 'human':
      return {
        versatileFeatIds: HUMAN_VERSATILE_FEAT_IDS,
        skillfulOptions: HUMAN_SKILLFUL_OPTIONS,
      };
    default:
      return {};
  }
}

async function main(): Promise<void> {
  const raw = await readFile(ANCESTRIES_PATH, 'utf-8');
  const ancestries = JSON.parse(raw) as AncestryJsonEntry[];
  if (!Array.isArray(ancestries)) {
    throw new Error(`[extract-srd-ancestries] ${ANCESTRIES_PATH} doit être un tableau`);
  }

  const EXPECTED_IDS = [
    'dragonborn',
    'dwarf',
    'elf',
    'gnome',
    'goliath',
    'halfling',
    'human',
    'orc',
    'tiefling',
  ];
  for (const expected of EXPECTED_IDS) {
    if (!ancestries.some((a) => a.id === expected)) {
      throw new Error(
        `[extract-srd-ancestries] PARSE STRICT FAIL — ascendance "${expected}" absente du bundle.`,
      );
    }
  }

  const enriched = ancestries.map((a) => {
    const next: AncestryJsonEntry = { ...a, options: optionsForAncestry(a.id) };
    // Idempotence : on repart sans un éventuel `commonSpellIds` antérieur (un id
    // retiré de la map doit disparaître du JSON, pas persister via le spread).
    delete next.commonSpellIds;
    const common = ANCESTRY_COMMON_SPELL_IDS[a.id];
    if (common && common.length > 0) {
      next.commonSpellIds = common;
    }
    return next;
  });

  // Vérification compteurs SRD attendus pour chaque ascendance à sous-choix.
  const dragon = enriched.find((a) => a.id === 'dragonborn');
  const dragonOpts = (dragon?.options as Record<string, unknown>)?.dragonAncestries;
  if (!Array.isArray(dragonOpts) || dragonOpts.length !== SRD_ANCESTRIES_COUNTS.dragonAncestries) {
    throw new Error(
      `[extract-srd-ancestries] PARSE STRICT FAIL — dragonAncestries attendu ${SRD_ANCESTRIES_COUNTS.dragonAncestries}, trouvé ${Array.isArray(dragonOpts) ? dragonOpts.length : 'non-array'}.`,
    );
  }

  // Tri déterministe par id.
  enriched.sort((a, b) => a.id.localeCompare(b.id));

  const next = JSON.stringify(enriched, null, 2) + '\n';
  await writeFile(ANCESTRIES_PATH, next, 'utf-8');

  console.log(
    `[extract-srd-ancestries] OK — ${enriched.length} ascendances enrichies (Drakéide ${SRD_ANCESTRIES_COUNTS.dragonAncestries} dragons, Tieffelin ${SRD_ANCESTRIES_COUNTS.tieflingLegacies} héritages, Elfe ${SRD_ANCESTRIES_COUNTS.elfLineages} lignages, Gnome ${SRD_ANCESTRIES_COUNTS.gnomeLineages} lignages, Goliath ${SRD_ANCESTRIES_COUNTS.giantAncestries} ascendances, Humain ${SRD_ANCESTRIES_COUNTS.humanVersatile} Origin Feats + ${SRD_ANCESTRIES_COUNTS.humanSkillful} skills).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
